import { supabaseEnvironment } from '../../../shared/config/supabase';
import type { Flair, Loot, Match, Offer, Ownership, Profile, Wallet } from '../model/types';

type PriceEntry = Offer;
type PriceRow = {
  skin_id?: number | null;
  rp?: number | null;
  sale_rp?: number | null;
  discount?: number;
  sale_ends_at?: string | null;
  owned?: boolean;
};
type MatchRow = {
  game_id?: string | number;
  played_at?: string;
  queue_id?: number;
  duration_s?: number;
  champion_id?: number;
  win?: boolean;
  kills?: number;
  deaths?: number;
  assists?: number;
};
type ProfileRow = {
  game_name?: string;
  tag_line?: string;
  level?: number;
  profile_icon_id?: number;
  flair?: Flair | null;
};
type WalletRow = { RP?: number; lol_blue_essence?: number };
type OwnedSkinRow = { skin_id: number };
type OwnedChromaRow = { chroma_id: number; skin_id: number };
type MasteryRow = { champion_id: number; points: number; level?: number };
type SyncRow = {
  ran_at?: string;
  stats?: { skinsOwned?: number } | null;
  loot?: Loot | null;
  wallet?: WalletRow | null;
};
type CosmeticRow = { item_type: string; item_id: number };
type EventRow = { item_type: string; item_id: number; acquired_at: string };
class SupabaseRestError extends Error {
  constructor(
    public status: number,
    public code: string | null,
    path: string,
  ) {
    super(`Supabase → HTTP ${status} en ${path}`);
    this.name = 'SupabaseRestError';
  }
}

// Lectura de la colección desde Supabase (anon key, solo lectura garantizada por RLS).
// Desde el collector v0.3 el ownership incluye además:
//  - wallet ({RP, lol_blue_essence}) y flair (honor/retos) del jugador.
//  - Valoración de la colección en RP (collectionValueRp / pricedOwnedCount).
//  - offers: skins en oferta activa (rebaja con fecha de fin en el futuro).
//  - matches: últimas partidas jugadas.
//  - cosmetics: wards/emotes/iconos poseídos.
//  - events: historial de adquisiciones (no iniciales).
//  - syncHistory: evolución de skins/chromas a lo largo del tiempo.
// Las tablas nuevas pueden no existir todavía (migración sin aplicar): sus
// lecturas fallan de forma segura (null/[]) sin romper el ownership base.

const URL = supabaseEnvironment.url;
const KEY = supabaseEnvironment.publishableKey;

async function q<T extends object>(pathAndQuery: string, range?: string): Promise<T[]> {
  const headers: Record<string, string> = { apikey: KEY, Authorization: `Bearer ${KEY}` };
  if (range) {
    headers.Range = range;
    headers['Range-Unit'] = 'items';
  }
  const res = await fetch(`${URL.replace(/\/+$/, '')}/rest/v1/${pathAndQuery}`, { headers });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { code?: string } | null;
    throw new SupabaseRestError(res.status, body?.code ?? null, pathAndQuery);
  }
  return res.json() as Promise<T[]>;
}

/** Lectura paginada (Supabase corta en 1000 filas por defecto). */
async function qAll<T extends object>(pathAndQuery: string, pageSize = 1000): Promise<T[]> {
  const rows: T[] = [];
  for (let offset = 0; ; offset += pageSize) {
    const page = await q<T>(pathAndQuery, `${offset}-${offset + pageSize - 1}`);
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
}

type OptionalResult<T> = { data: T | null; warning: string | null };

async function optional<T>(promise: Promise<T>): Promise<OptionalResult<T>> {
  try {
    return { data: await promise, warning: null };
  } catch (error) {
    if (error instanceof SupabaseRestError && ['42P01', 'PGRST205'].includes(error.code ?? '')) {
      return { data: null, warning: null };
    }
    return {
      data: null,
      warning: error instanceof Error ? error.message : 'Error desconocido de Supabase',
    };
  }
}

// ── Normalizadores: convierten filas de Supabase (snake_case) en el modelo de UI. ──────

const normalizePrice = (r: PriceRow): PriceEntry => ({
  skinId: r.skin_id ?? null,
  rp: r.rp ?? null,
  saleRp: r.sale_rp ?? null,
  discount: r.discount ?? 0,
  saleEndsAt: r.sale_ends_at ?? null,
  owned: Boolean(r.owned),
});

const normalizeMatch = (m: MatchRow): Match => ({
  gameId: m.game_id ?? '',
  playedAt: m.played_at ?? '',
  queueId: Number(m.queue_id ?? 0),
  durationS: Number(m.duration_s ?? 0),
  championId: Number(m.champion_id ?? 0),
  win: Boolean(m.win),
  kills: Number(m.kills ?? 0),
  deaths: Number(m.deaths ?? 0),
  assists: Number(m.assists ?? 0),
});

const normalizeProfile = (profile: ProfileRow | null): Profile | null =>
  profile
    ? {
        gameName: String(profile.game_name ?? ''),
        tagLine: String(profile.tag_line ?? ''),
        level: Number(profile.level ?? 0),
        profileIconId: Number(profile.profile_icon_id ?? 0),
      }
    : null;

const normalizeWallet = (wallet: WalletRow | null): Wallet | null =>
  wallet
    ? {
        RP: Number(wallet.RP ?? 0),
        blueEssence: Number(wallet.lol_blue_essence ?? 0),
      }
    : null;

/** A partir de precios normalizados: valor de la colección y ofertas activas. */
function priceDerived(entries: PriceEntry[]) {
  let collectionValueRp = 0;
  let pricedOwnedCount = 0;
  for (const e of entries) {
    if (e.owned && e.rp != null) {
      collectionValueRp += e.rp;
      pricedOwnedCount += 1;
    }
  }
  const now = Date.now();
  const offers = entries
    .filter((e) => e.saleEndsAt != null && new Date(e.saleEndsAt).getTime() > now)
    // No poseídas primero, luego mayor descuento.
    .sort((a, b) => Number(a.owned) - Number(b.owned) || b.discount - a.discount);
  return { collectionValueRp, pricedOwnedCount, offers };
}

/** Ordena partidas por fecha desc y recorta a las 12 más recientes. */
const topMatches = (list: Match[]): Match[] =>
  list
    .slice()
    .sort((a, b) => new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime())
    .slice(0, 12);

/** Filas de owned_cosmetics → { wards, emotes, icons } como Sets de ids. */
const cosmeticsFromRows = (rows: CosmeticRow[] | null) => {
  const wards = new Set<number>(),
    emotes = new Set<number>(),
    icons = new Set<number>();
  for (const r of rows ?? []) {
    if (r.item_type === 'ward') wards.add(r.item_id);
    else if (r.item_type === 'emote') emotes.add(r.item_id);
    else if (r.item_type === 'icon') icons.add(r.item_id);
  }
  return { wards, emotes, icons };
};

/** Reads the required collection plus optional, migration-dependent sections. */
export async function fetchOwnership(): Promise<{
  ownership: Ownership | null;
  warning: string | null;
}> {
  if (!supabaseEnvironment.configured) return { ownership: null, warning: null };

  const [
    profiles,
    skins,
    chromas,
    mastery,
    lastRun,
    prices,
    matchesRaw,
    cosmeticsRows,
    eventsRaw,
    syncRows,
  ] = await Promise.all([
    q<ProfileRow>('profiles?select=*&order=updated_at.desc&limit=1'),
    qAll<OwnedSkinRow>('owned_skins?select=skin_id'),
    qAll<OwnedChromaRow>('owned_chromas?select=chroma_id,skin_id'),
    qAll<MasteryRow>('mastery?select=champion_id,level,points'),
    q<SyncRow>('sync_runs?select=ran_at,stats,loot,wallet&order=ran_at.desc&limit=1'),
    optional(qAll<PriceRow>('skin_prices?select=*')),
    optional(q<MatchRow>('matches?select=*&order=played_at.desc&limit=12')),
    optional(qAll<CosmeticRow>('owned_cosmetics?select=item_type,item_id')),
    optional(
      q<EventRow>(
        'ownership_events?select=item_type,item_id,acquired_at&is_initial=eq.false&order=acquired_at.desc&limit=60',
      ),
    ),
    optional(qAll<SyncRow>('sync_runs?select=stats&order=ran_at.asc')),
  ]);

  const chromasBySkin = new Map();
  for (const c of chromas) chromasBySkin.set(c.skin_id, (chromasBySkin.get(c.skin_id) ?? 0) + 1);

  const priceEntries = (prices.data ?? []).map(normalizePrice);
  const { collectionValueRp, pricedOwnedCount, offers } = priceDerived(priceEntries);

  const matches = topMatches((matchesRaw.data ?? []).map(normalizeMatch));

  const events = (eventsRaw.data ?? []).map((e) => ({
    itemType: e.item_type,
    itemId: e.item_id,
    acquiredAt: e.acquired_at,
  }));

  const syncHistory = (syncRows.data ?? [])
    .filter((r): r is SyncRow & { stats: { skinsOwned: number } } => r.stats?.skinsOwned != null)
    .map((r) => ({
      skinsOwned: r.stats.skinsOwned,
    }));

  const profile = normalizeProfile(profiles[0] ?? null);

  const warnings = [prices, matchesRaw, cosmeticsRows, eventsRaw, syncRows]
    .map((result) => result.warning)
    .filter((warning): warning is string => Boolean(warning));

  return {
    ownership: {
      profile,
      ownedSkinIds: new Set(skins.map((r) => r.skin_id)),
      ownedChromaIds: new Set(chromas.map((r) => r.chroma_id)),
      chromasOwned: chromas.length,
      chromasBySkin,
      masteryByChampion: new Map<number, { points: number; level?: number }>(
        mastery.map((m) => [m.champion_id, { points: m.points, level: m.level }]),
      ),
      lastSyncAt: lastRun[0]?.ran_at ?? null,
      loot: lastRun[0]?.loot ?? null,
      // ── Datos v0.3 ──
      wallet: normalizeWallet(lastRun[0]?.wallet ?? null),
      flair: profiles[0]?.flair ?? null,
      collectionValueRp,
      pricedOwnedCount,
      offers,
      matches,
      cosmetics: cosmeticsFromRows(cosmeticsRows.data),
      events,
      syncHistory,
    },
    warning: warnings.length
      ? `No se pudieron leer algunos datos opcionales (${warnings.join('; ')}).`
      : null,
  };
}
