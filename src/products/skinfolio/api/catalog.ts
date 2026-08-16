import type { Catalog } from '../model/types';

type RawChampion = { id: number; name: string };
type RawSkin = {
  id: number;
  name: string;
  rarity?: string;
  isBase?: boolean;
  isLegacy?: boolean;
  loadScreenPath?: string;
  tilePath?: string;
  splashPath?: string;
  uncenteredSplashPath?: string;
  chromas?: Array<{ id: number; name?: string; colors?: string[]; chromaPath?: string }>;
};
type RawWard = { id: number; name: string; wardImagePath: string };
type RawEmote = { id: number; name?: string; inventoryIcon: string };
type RawIcon = { id: number; title?: string; imagePath: string };

// Catálogo público de skins y campeones desde Community Dragon.
// El catálogo NO vive en nuestra base de datos: aquí está siempre al día
// con el último parche y las imágenes se sirven desde su CDN.

const BASE = 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default';

/** Convierte rutas tipo "/lol-game-data/assets/v1/..." en URLs absolutas del CDN. */
export function assetUrl(path: string | null | undefined) {
  if (!path) return '';
  return BASE + path.toLowerCase().replace(/^\/lol-game-data\/assets/, '');
}

export function profileIconUrl(id: number | null | undefined) {
  return id == null ? '' : `${BASE}/v1/profile-icons/${id}.jpg`;
}

export function championIconUrl(id: number | null | undefined) {
  return id == null ? '' : `${BASE}/v1/champion-icons/${id}.png`;
}

export const RARITIES = {
  kNoRarity: { label: 'Estándar', color: 'var(--r-standard)' },
  kEpic: { label: 'Épica', color: 'var(--r-epic)' },
  kLegendary: { label: 'Legendaria', color: 'var(--r-legendary)' },
  kMythic: { label: 'Mítica', color: 'var(--r-mythic)' },
  kUltimate: { label: 'Definitiva', color: 'var(--r-ultimate)' },
  kExalted: { label: 'Exaltada', color: 'var(--r-exalted)' },
  kTranscendent: { label: 'Trascendente', color: 'var(--r-transcendent)' },
};

export function rarityInfo(key: string) {
  return RARITIES[key as keyof typeof RARITIES] ?? RARITIES.kNoRarity;
}

/**
 * Descarga y normaliza el catálogo.
 * @returns {{ champions: Array<{id,name}>, skinsByChampion: Map<number, Array>, skinById: Map<number, object>, totals: object }}
 */
export async function fetchCatalog(): Promise<Catalog> {
  const [skinsRes, champsRes] = await Promise.all([
    fetch(`${BASE}/v1/skins.json`),
    fetch(`${BASE}/v1/champion-summary.json`),
  ]);
  if (!skinsRes.ok || !champsRes.ok)
    throw new Error('No se pudo descargar el catálogo de Community Dragon');

  const skinsRaw = (await skinsRes.json()) as Record<string, RawSkin>; // objeto { [skinId]: skin }
  const champsRaw = (await champsRes.json()) as RawChampion[]; // array [{ id, name, alias }]

  const champions = champsRaw
    .filter((c) => c.id > 0)
    .map((c) => ({ id: c.id, name: c.name }))
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));

  const skinsByChampion: Catalog['skinsByChampion'] = new Map(champions.map((c) => [c.id, []]));
  const skinById: Catalog['skinById'] = new Map();
  const chromaById: Catalog['chromaById'] = new Map(); // chromaId → { skin, chroma } (línea temporal, modal)
  const championById = new Map(champions.map((c) => [c.id, c]));

  for (const raw of Object.values(skinsRaw)) {
    if (raw.isBase) continue; // la skin base no cuenta para la colección
    const championId = Math.floor(raw.id / 1000);
    if (!skinsByChampion.has(championId)) continue;
    const skin = {
      id: raw.id,
      name: raw.name,
      rarity: raw.rarity ?? 'kNoRarity',
      isLegacy: raw.isLegacy ?? false,
      image: raw.loadScreenPath || raw.tilePath || raw.splashPath || null,
      splash: raw.splashPath || raw.uncenteredSplashPath || null,
      chromaTotal: raw.chromas?.length ?? 0,
      chromas: (raw.chromas ?? []).map((c) => ({
        id: c.id,
        name:
          (c.name ?? '').replace(raw.name, '').replace(/[()]/g, '').trim() ||
          c.name ||
          `Chroma ${c.id}`,
        colors: c.colors?.length ? c.colors : ['#5b5a56', '#5b5a56'],
        image: c.chromaPath || null,
      })),
    };
    skinsByChampion.get(championId)!.push(skin);
    skinById.set(skin.id, skin);
    for (const c of skin.chromas) chromaById.set(c.id, { skin, chroma: c });
  }
  for (const list of skinsByChampion.values()) list.sort((a, b) => a.id - b.id);

  return {
    champions,
    championById,
    skinsByChampion,
    skinById,
    chromaById,
    totals: { skins: skinById.size },
  };
}

/**
 * Catálogo de cosméticos (wards, emotes, iconos). Se carga bajo demanda
 * — solo cuando se abre la pestaña Otros — y se cachea la promesa.
 */
let cosmeticsCatalogPromise: Promise<{
  wards: Map<number, { id: number; name: string; image: string }>;
  emotes: Map<number, { id: number; name: string; image: string }>;
  icons: Map<number, { id: number; name: string; image: string }>;
}> | null = null;
export function fetchCosmeticsCatalog() {
  cosmeticsCatalogPromise ??= (async () => {
    const get = <T>(f: string): Promise<T[]> =>
      fetch(`${BASE}/v1/${f}.json`).then((r) => {
        if (!r.ok) throw new Error(`No se pudo descargar ${f}`);
        return r.json() as Promise<T[]>;
      });
    const [wards, emotes, icons] = await Promise.all([
      get<RawWard>('ward-skins'),
      get<RawEmote>('summoner-emotes'),
      get<RawIcon>('summoner-icons'),
    ]);
    return {
      wards: new Map(wards.map((w) => [w.id, { id: w.id, name: w.name, image: w.wardImagePath }])),
      emotes: new Map(
        emotes.map((e) => [
          e.id,
          { id: e.id, name: e.name || `Emote ${e.id}`, image: e.inventoryIcon },
        ]),
      ),
      icons: new Map(
        icons.map((i) => [
          i.id,
          { id: i.id, name: i.title || `Icono ${i.id}`, image: i.imagePath },
        ]),
      ),
    };
  })();
  return cosmeticsCatalogPromise;
}
