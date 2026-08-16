import type { CSSProperties } from 'react';
import { profileIconUrl, rarityInfo, RARITIES } from '../api/catalog';
import type {
  Champion,
  Chroma,
  CollectionMode,
  CollectionSort,
  CollectionView,
  Flair,
  Loot,
  Offer,
  Profile,
  Skin,
  Wallet,
} from '../model/types';

type AssetUrl = (path: string | null | undefined) => string;
type OpenSkin = (skin: Skin, chromaId?: number | null) => void;
type Mastery = { points: number; level?: number };
type CssVars = CSSProperties & Record<`--${string}`, string | undefined>;
const cssVars = (vars: Record<`--${string}`, string | undefined>) => vars as CssVars;

const titleCase = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s);

/* ------------------------------------------------------------------ */

export function Header({
  profile,
  lastSyncAt,
  flair,
}: {
  profile: Profile | null;
  lastSyncAt: string | null;
  flair: Flair | null;
}) {
  return (
    <header className="header">
      {profile?.profileIconId != null && (
        <img className="header__icon" src={profileIconUrl(profile.profileIconId)} alt="" />
      )}
      <div>
        <h1 className="header__name">
          {profile ? profile.gameName : 'Skinfolio'}
          {profile?.tagLine && <span className="header__tag"> #{profile.tagLine}</span>}
        </h1>
        <div className="header__meta">
          {profile ? `Nivel ${profile.level}` : 'Colección de skins'}
          {lastSyncAt && (
            <>
              <span className="dot" aria-hidden="true">
                ◆
              </span>
              Sincronizado {relativeTime(lastSyncAt)}
            </>
          )}
          {flair && (
            <>
              <span className="dot" aria-hidden="true">
                ◆
              </span>
              Honor {flair.honorLevel}
              {flair.challengeLevel && (
                <span className="header__flair-muted">
                  {' '}
                  · Retos {titleCase(flair.challengeLevel)}
                </span>
              )}
            </>
          )}
        </div>
      </div>
      <div className="header__spacer" />
    </header>
  );
}

export function relativeTime(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'ahora mismo';
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `hace ${hours} h`;
  return `hace ${Math.round(hours / 24)} días`;
}

/* ------------------------------------------------------------------ */

export function StatsVault({
  ownedCount,
  totalCount,
  chromasOwned,
  chromasTotal,
  byRarity,
  loot,
  collectionValueRp = 0,
  pricedOwnedCount = 0,
  wallet = null,
}: {
  ownedCount: number;
  totalCount: number;
  chromasOwned: number;
  chromasTotal: number;
  byRarity: Map<string, { owned: number; total: number }>;
  loot: Loot | null;
  collectionValueRp?: number;
  pricedOwnedCount?: number;
  wallet?: Wallet | null;
}) {
  const pct = totalCount ? Math.round((ownedCount / totalCount) * 1000) / 10 : 0;
  const chests = loot?.chests?.reduce((n, c) => n + c.count, 0) ?? null;
  const permanents = loot?.skinPermanents?.length ?? 0;
  return (
    <section className="vault" aria-label="Resumen de la colección">
      <div className="vault__row">
        <div>
          <div className="vault__label">Skins en la colección</div>
          <div className="vault__count">
            {ownedCount}
            <small>
              {' '}
              / {totalCount} · {pct}%
            </small>
          </div>
        </div>
        <div className="vault__extra">
          {collectionValueRp > 0 && (
            <div className="vault__value">
              <div className="vault__value-rp">≈ {collectionValueRp.toLocaleString('es')} RP</div>
              <div className="vault__value-sub">valor de tienda de {pricedOwnedCount} skins</div>
            </div>
          )}
          <div>
            <strong>{chromasOwned}</strong>
            {chromasTotal ? ` / ${chromasTotal}` : ''} chromas
          </div>
          {loot && (
            <div>
              <strong>{loot.skinShards?.length ?? 0}</strong> fragmentos
              {permanents > 0 && (
                <>
                  {' '}
                  · <strong>{permanents}</strong> skins por activar
                </>
              )}
              {chests != null && chests > 0 && (
                <>
                  {' '}
                  · <strong>{chests}</strong> cofres
                </>
              )}
            </div>
          )}
          {wallet && (
            <div className="vault__wallet">
              {wallet.RP} RP · {wallet.blueEssence.toLocaleString('es')} EA
            </div>
          )}
        </div>
      </div>
      <div
        className="vault__bar"
        role="progressbar"
        aria-label="Progreso de la colección de skins"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={`${ownedCount} de ${totalCount} skins (${pct}%)`}
      >
        <div className="vault__bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="gems">
        {Object.entries(RARITIES).map(([key, r]) => {
          const t = byRarity.get(key);
          if (!t || t.total === 0) return null;
          return (
            <span className="gem" key={key} style={cssVars({ '--stone': r.color })}>
              <span className="gem__stone" aria-hidden="true" />
              <span className="gem__count">
                {t.owned}
                <span className="gem__label">/{t.total}</span>
              </span>
              <span className="gem__label">{r.label}</span>
            </span>
          );
        })}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

const VIEWS: [CollectionView, string][] = [
  ['all', 'Todo'],
  ['owned', 'Poseído'],
  ['missing', 'Me falta'],
];

const TABS: [CollectionMode, string][] = [
  ['skins', 'Skins'],
  ['chromas', 'Chromas'],
  ['ofertas', 'Ofertas'],
  ['otros', 'Otros'],
  ['actividad', 'Actividad'],
];

export function Controls({
  mode,
  onMode,
  query,
  onQuery,
  view,
  onView,
  sort,
  onSort,
  rarities,
  onToggleRarity,
  flags,
  onToggleFlag,
  offersCount = 0,
}: {
  mode: CollectionMode;
  onMode: (mode: CollectionMode) => void;
  query: string;
  onQuery: (query: string) => void;
  view: CollectionView;
  onView: (view: CollectionView) => void;
  sort: CollectionSort;
  onSort: (sort: CollectionSort) => void;
  rarities: Set<string>;
  onToggleRarity: (rarity: string) => void;
  flags: { legacy: boolean; withChromas: boolean };
  onToggleFlag: (flag: 'legacy' | 'withChromas') => void;
  offersCount?: number;
}) {
  const showFilters = mode === 'skins' || mode === 'chromas';
  const showSearch = showFilters || mode === 'otros';
  const searchLabel =
    mode === 'otros'
      ? 'Buscar ward, emote o icono'
      : mode === 'chromas'
        ? 'Buscar chroma, skin o campeón'
        : 'Buscar skin o campeón';
  return (
    <>
      {/* Solo esta fila es sticky: en móvil los chips ocupan 3-4 filas y
          fijarlos también se comía media pantalla al hacer scroll. */}
      <div className="controls">
        <div className="controls__row">
          <div className="tabs" role="group" aria-label="Tipo de colección">
            {TABS.map(([value, label]) => (
              <button
                key={value}
                className={`tab ${mode === value ? 'tab--active' : ''}`}
                aria-pressed={mode === value}
                onClick={() => onMode(value)}
              >
                {label}
                {value === 'ofertas' && offersCount > 0 && (
                  <span className="tab__badge" aria-hidden="true">
                    {offersCount}
                  </span>
                )}
              </button>
            ))}
          </div>
          {showSearch && (
            <input
              className="controls__search"
              type="search"
              placeholder={searchLabel}
              value={query}
              onChange={(e) => onQuery(e.target.value)}
              aria-label={searchLabel}
            />
          )}
          {showFilters && (
            <select
              className="controls__sort"
              value={sort}
              onChange={(e) => onSort(e.target.value as CollectionSort)}
              aria-label="Ordenar campeones"
            >
              <option value="mastery">Por maestría</option>
              <option value="completion">Más completos</option>
              <option value="alpha">Alfabético</option>
            </select>
          )}
        </div>
      </div>

      {showFilters && (
        <div className="controls__row controls__row--filters">
          {VIEWS.map(([value, label]) => (
            <button
              key={value}
              className={`chip ${view === value ? 'chip--active' : ''}`}
              aria-pressed={view === value}
              onClick={() => onView(value)}
            >
              {label}
            </button>
          ))}

          <span className="controls__divider" aria-hidden="true" />

          {Object.entries(RARITIES).map(([key, r]) => (
            <button
              key={key}
              className={`chip chip--gem ${rarities.has(key) ? 'chip--active' : ''}`}
              style={cssVars({ '--stone': r.color })}
              aria-pressed={rarities.has(key)}
              onClick={() => onToggleRarity(key)}
              title={`Rareza: ${r.label}`}
            >
              <span className="chip__stone" aria-hidden="true" />
              {r.label}
            </button>
          ))}

          <span className="controls__divider" aria-hidden="true" />

          <button
            className={`chip ${flags.legacy ? 'chip--active' : ''}`}
            aria-pressed={flags.legacy}
            onClick={() => onToggleFlag('legacy')}
            title="Solo skins Legacy / de legado"
          >
            <span aria-hidden="true">⌛</span> Legacy
          </button>
          {mode === 'skins' && (
            <button
              className={`chip ${flags.withChromas ? 'chip--active' : ''}`}
              aria-pressed={flags.withChromas}
              onClick={() => onToggleFlag('withChromas')}
              title="Solo skins que existen con chromas en el catálogo (los tengas o no)"
            >
              <span aria-hidden="true">◈</span> Tiene chromas
            </button>
          )}
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */

function LockIcon() {
  return (
    <svg
      className="skin__lock"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <rect x="4" y="10" width="16" height="11" rx="1.5" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

export function SkinCard({
  skin,
  owned,
  chromasOwned,
  assetUrl,
  onOpen,
  offer = null,
}: {
  skin: Skin;
  owned: boolean;
  chromasOwned: number;
  assetUrl: AssetUrl;
  onOpen: OpenSkin;
  offer?: Offer | null;
}) {
  const rarity = rarityInfo(skin.rarity);
  // El estado (poseída, rareza, chromas) solo se ve por color/candado: hay que
  // decirlo también en el nombre accesible para lectores de pantalla.
  const label =
    `${skin.name}, ${rarity.label}${skin.isLegacy ? ', Legacy' : ''}, ` +
    `${owned ? 'en tu colección' : 'no poseída'}` +
    (offer
      ? `, en oferta a ${offer.saleRp} RP, antes ${offer.rp} RP, ${offer.discount}% de descuento`
      : '') +
    (skin.chromaTotal > 0 ? `, ${chromasOwned} de ${skin.chromaTotal} chromas` : '');
  return (
    <article
      className={`skin ${owned ? 'skin--owned' : 'skin--locked'}`}
      title={`${skin.name} · ${rarity.label}${skin.isLegacy ? ' · Legacy' : ''}${owned ? '' : ' · no poseída'}`}
      role="button"
      tabIndex={0}
      aria-label={label}
      onClick={() => onOpen(skin)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(skin);
        }
      }}
    >
      {skin.image && <img className="skin__img" src={assetUrl(skin.image)} alt="" loading="lazy" />}
      <div className="skin__veil" />
      {!owned && <LockIcon />}
      {skin.chromaTotal > 0 && (
        <span className="skin__chromas">
          ◈ {chromasOwned}/{skin.chromaTotal}
        </span>
      )}
      {offer && (
        <div className="skin__price">
          <span className="skin__price-sale">{offer.saleRp} RP</span>
          <span className="skin__price-was">{offer.rp} RP</span>
          <span className="skin__price-tag">-{offer.discount}%</span>
        </div>
      )}
      <div className="skin__name">
        <span
          className="skin__gem"
          style={cssVars({ '--stone': rarity.color })}
          aria-hidden="true"
        />
        {skin.name}
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ */

export function ChampionSection({
  champion,
  skins,
  ownedCount,
  total,
  ownedSkinIds,
  chromasBySkin,
  mastery,
  assetUrl,
  onOpen,
}: {
  champion: Champion;
  skins: Skin[];
  ownedCount: number;
  total: number;
  ownedSkinIds: Set<number>;
  chromasBySkin: Map<number, number>;
  mastery?: Mastery;
  assetUrl: AssetUrl;
  onOpen: OpenSkin;
}) {
  // ownedCount/total llegan calculados sobre TODAS las skins del campeón,
  // no sobre las filtradas: así "completo" no se enciende al filtrar por "Poseído".
  const complete = ownedCount === total && total > 0;
  return (
    <section className="champ">
      <div className="champ__head">
        <h2 className={`champ__name ${complete ? 'champ__name--complete' : ''}`}>
          {champion.name}
        </h2>
        <span className="champ__progress">
          {ownedCount}/{total}
          {complete ? ' · completo' : ''}
        </span>
        {mastery && mastery.points > 0 && (
          <span className="champ__mastery">
            M{mastery.level ?? '?'} · {mastery.points.toLocaleString('es')} pts
          </span>
        )}
      </div>
      <div className="grid">
        {skins.map((s) => (
          <SkinCard
            key={s.id}
            skin={s}
            owned={ownedSkinIds.has(s.id)}
            chromasOwned={chromasBySkin.get(s.id) ?? 0}
            assetUrl={assetUrl}
            onOpen={onOpen}
          />
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Vista de chromas: una carta por skin, con sus chromas como gemas    */

function ChromaStone({
  chroma,
  owned,
  onOpen,
}: {
  chroma: Chroma;
  owned: boolean;
  onOpen: () => void;
}) {
  const [c0, c1] = [chroma.colors[0], chroma.colors[1] ?? chroma.colors[0]];
  return (
    <button
      className={`chroma ${owned ? 'chroma--owned' : 'chroma--locked'}`}
      style={cssVars({ '--c0': c0, '--c1': c1 })}
      title={`${chroma.name}${owned ? '' : ' · no poseído'} — ver en grande`}
      aria-label={`${chroma.name}, ${owned ? 'poseído' : 'no poseído'}`}
      onClick={onOpen}
    >
      <span className="chroma__stone" aria-hidden="true" />
      <span className="chroma__name">{chroma.name}</span>
    </button>
  );
}

export function ChromaCard({
  skin,
  skinOwned,
  chromas,
  ownedChromaIds,
  assetUrl,
  onOpen,
}: {
  skin: Skin;
  skinOwned: boolean;
  chromas: Chroma[];
  ownedChromaIds: Set<number>;
  assetUrl: AssetUrl;
  onOpen: OpenSkin;
}) {
  const ownedCount = chromas.reduce((n, c) => n + (ownedChromaIds.has(c.id) ? 1 : 0), 0);
  const rarity = rarityInfo(skin.rarity);
  return (
    <article className={`chromacard ${ownedCount > 0 ? 'chromacard--lit' : ''}`}>
      <button
        className="chromacard__thumb"
        onClick={() => onOpen(skin)}
        title={`Ver ${skin.name} en grande`}
      >
        {skin.image && <img src={assetUrl(skin.image)} alt="" loading="lazy" />}
      </button>
      <div className="chromacard__body">
        <div className="chromacard__title">
          <span
            className="skin__gem"
            style={cssVars({ '--stone': rarity.color })}
            aria-hidden="true"
          />
          <span className="chromacard__name">{skin.name}</span>
          <span className="chromacard__count">
            {ownedCount}/{chromas.length}
          </span>
        </div>
        <div className="chromacard__stones">
          {chromas.map((c) => (
            <ChromaStone
              key={c.id}
              chroma={c}
              owned={ownedChromaIds.has(c.id)}
              onOpen={() => onOpen(skin, c.id)}
            />
          ))}
        </div>
        {!skinOwned && <div className="chromacard__note">Skin no poseída</div>}
      </div>
    </article>
  );
}

export function ChromaSection({
  champion,
  entries,
  ownedCount,
  total,
  ownedChromaIds,
  ownedSkinIds,
  mastery,
  assetUrl,
  onOpen,
}: {
  champion: Champion;
  entries: { skin: Skin; chromas: Chroma[] }[];
  ownedCount: number;
  total: number;
  ownedChromaIds: Set<number>;
  ownedSkinIds: Set<number>;
  mastery?: Mastery;
  assetUrl: AssetUrl;
  onOpen: OpenSkin;
}) {
  // ownedCount/total vienen del total real del campeón (sin filtros), ver ChampionSection.
  const complete = ownedCount === total && total > 0;
  return (
    <section className="champ">
      <div className="champ__head">
        <h2 className={`champ__name ${complete ? 'champ__name--complete' : ''}`}>
          {champion.name}
        </h2>
        <span className="champ__progress">
          {ownedCount}/{total} chromas{complete ? ' · completo' : ''}
        </span>
        {mastery && mastery.points > 0 && (
          <span className="champ__mastery">
            M{mastery.level ?? '?'} · {mastery.points.toLocaleString('es')} pts
          </span>
        )}
      </div>
      <div className="chromagrid">
        {entries.map(({ skin, chromas }) => (
          <ChromaCard
            key={skin.id}
            skin={skin}
            skinOwned={ownedSkinIds.has(skin.id)}
            chromas={chromas}
            ownedChromaIds={ownedChromaIds}
            assetUrl={assetUrl}
            onOpen={onOpen}
          />
        ))}
      </div>
    </section>
  );
}
