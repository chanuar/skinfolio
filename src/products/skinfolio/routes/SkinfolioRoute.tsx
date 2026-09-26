import { useDeferredValue, useMemo, useState } from 'react';
import { useLoaderData, useRevalidator, useRouteError } from 'react-router';
import { fetchCatalog, assetUrl } from '../api/catalog';
import { fetchOwnership } from '../api/ownership';
import {
  Header,
  StatsVault,
  Controls,
  ChampionSection,
  ChromaSection,
} from '../components/CollectionParts';
import { ActivitySection } from '../components/ActivitySection';
import { CosmeticsSection } from '../components/CosmeticsSection';
import { OffersSection } from '../components/OffersSection';
import { SkinModal } from '../components/SkinModal';
import {
  buildChromaSections,
  buildSkinSections,
  chromaTotal,
  rarityTotals,
} from '../model/collection';
import type {
  Catalog,
  CollectionMode,
  CollectionSort,
  CollectionView,
  Ownership,
  Skin,
} from '../model/types';

type SkinfolioRouteData = { catalog: Catalog; ownership: Ownership | null; warning: string | null };

export async function loader(): Promise<SkinfolioRouteData> {
  const [catalogResult, ownershipResult] = await Promise.allSettled([
    fetchCatalog(),
    fetchOwnership(),
  ]);
  if (catalogResult.status === 'rejected') throw catalogResult.reason;
  if (ownershipResult.status === 'rejected') {
    const message =
      ownershipResult.reason instanceof Error
        ? ownershipResult.reason.message
        : 'Error desconocido';
    return {
      catalog: catalogResult.value,
      ownership: null,
      warning: `No se pudo leer tu colección de Supabase (${message}).`,
    };
  }
  return { catalog: catalogResult.value, ...ownershipResult.value };
}

const EMPTY_OWNERSHIP: Ownership = {
  profile: null,
  ownedSkinIds: new Set(),
  ownedChromaIds: new Set(),
  chromasOwned: 0,
  chromasBySkin: new Map(),
  masteryByChampion: new Map(),
  lastSyncAt: null,
  loot: null,
  // Contrato v0.3: cartera, distinciones, valor de tienda, ofertas, partidas,
  // cosméticos, actividad e histórico de sincronizaciones.
  wallet: null,
  flair: null,
  collectionValueRp: 0,
  pricedOwnedCount: 0,
  offers: [],
  matches: [],
  cosmetics: { wards: new Set(), emotes: new Set(), icons: new Set() },
  events: [],
  syncHistory: [],
};

function App({ initialData }: { initialData: SkinfolioRouteData }) {
  const { catalog } = initialData;
  const ownership = initialData.ownership ?? EMPTY_OWNERSHIP;
  const [warn, setWarn] = useState<string | null>(initialData.warning);
  const hasOwnership = initialData.ownership !== null;

  const [mode, setMode] = useState<CollectionMode>('skins');
  const [query, setQuery] = useState('');
  // Filtrar ~1900 cartas en cada pulsación bloquea el tecleo: el input usa
  // `query` (respuesta inmediata) y las vistas usan la versión diferida.
  const deferredQuery = useDeferredValue(query);
  const [view, setView] = useState<CollectionView>('all');
  const [sort, setSort] = useState<CollectionSort>('mastery');
  const [rarities, setRarities] = useState<Set<string>>(new Set());
  const [flags, setFlags] = useState({ legacy: false, withChromas: false });
  const [modal, setModal] = useState<{ skin: Skin; chromaId: number | null } | null>(null);
  const openSkin = (skin: Skin, chromaId: number | null = null) => setModal({ skin, chromaId });
  const closeModal = () => setModal(null);

  const toggleRarity = (key: string) =>
    setRarities((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  const toggleFlag = (key: 'legacy' | 'withChromas') =>
    setFlags((prev) => ({ ...prev, [key]: !prev[key] }));

  // Totales por rareza para la estantería de gemas
  const byRarity = useMemo(() => rarityTotals(catalog, ownership), [catalog, ownership]);

  const chromasTotal = useMemo(() => chromaTotal(catalog), [catalog]);

  const filters = useMemo(
    () => ({
      query: deferredQuery,
      view,
      sort,
      rarities,
      legacy: flags.legacy,
      withChromas: flags.withChromas,
    }),
    [deferredQuery, view, sort, rarities, flags],
  );
  const skinSections = useMemo(
    () => (mode === 'skins' ? buildSkinSections(catalog, ownership, filters) : []),
    [catalog, ownership, mode, filters],
  );
  const chromaSections = useMemo(
    () => (mode === 'chromas' ? buildChromaSections(catalog, ownership, filters) : []),
    [catalog, ownership, mode, filters],
  );

  const isCollection = mode === 'skins' || mode === 'chromas';
  const sections = mode === 'skins' ? skinSections : chromaSections;

  return (
    <div className="app">
      <a className="skinfolio-skip" href="#main-content">
        Saltar al contenido
      </a>
      <main id="main-content" tabIndex={-1}>
        <p className="project-credit">
          Skinfolio · Colección de League of Legends
          <span>
            Un proyecto de <a href="https://chanuar.com">Carlos Chanuar</a>
            {' · '}
            <a href="https://github.com/chanuar/skinfolio">Ver código</a>
          </span>
        </p>
        <Header
          profile={ownership.profile}
          lastSyncAt={ownership.lastSyncAt}
          flair={ownership.flair}
        />

        {warn && (
          <div className="notice" role="alert">
            <strong>Aviso:</strong> {warn}
            <button onClick={() => setWarn(null)}>Cerrar</button>
          </div>
        )}

        {!hasOwnership && (
          <div className="notice">
            <strong>La colección personal no está disponible ahora.</strong> Puedes explorar el
            catálogo completo mientras tanto.
          </div>
        )}

        <StatsVault
          ownedCount={ownership.ownedSkinIds.size}
          totalCount={catalog.totals.skins}
          chromasOwned={ownership.chromasOwned}
          chromasTotal={chromasTotal}
          byRarity={byRarity}
          loot={ownership.loot}
          collectionValueRp={ownership.collectionValueRp}
          pricedOwnedCount={ownership.pricedOwnedCount}
          wallet={ownership.wallet}
        />

        <Controls
          mode={mode}
          onMode={setMode}
          query={query}
          onQuery={setQuery}
          view={view}
          onView={setView}
          sort={sort}
          onSort={setSort}
          rarities={rarities}
          onToggleRarity={toggleRarity}
          flags={flags}
          onToggleFlag={toggleFlag}
          offersCount={ownership.offers.length}
        />

        {isCollection && sections.length === 0 && (
          <div className="empty">
            {!hasOwnership && view !== 'all'
              ? 'La colección personal no está disponible. Elige «Todo» para explorar el catálogo.'
              : 'Nada coincide con esos filtros. Prueba con otro nombre o quita alguno.'}
          </div>
        )}

        {mode === 'skins' &&
          skinSections.map(({ champ, skins, ownedCount, total }) => (
            <ChampionSection
              key={champ.id}
              champion={champ}
              skins={skins}
              ownedCount={ownedCount}
              total={total}
              ownedSkinIds={ownership.ownedSkinIds}
              chromasBySkin={ownership.chromasBySkin}
              mastery={ownership.masteryByChampion.get(champ.id)}
              assetUrl={assetUrl}
              onOpen={openSkin}
            />
          ))}

        {mode === 'chromas' &&
          chromaSections.map(({ champ, entries, ownedCount, total }) => (
            <ChromaSection
              key={champ.id}
              champion={champ}
              entries={entries}
              ownedCount={ownedCount}
              total={total}
              ownedChromaIds={ownership.ownedChromaIds}
              ownedSkinIds={ownership.ownedSkinIds}
              mastery={ownership.masteryByChampion.get(champ.id)}
              assetUrl={assetUrl}
              onOpen={openSkin}
            />
          ))}

        {mode === 'ofertas' && (
          <OffersSection
            offers={ownership.offers}
            catalog={catalog}
            ownedSkinIds={ownership.ownedSkinIds}
            chromasBySkin={ownership.chromasBySkin}
            assetUrl={assetUrl}
            onOpen={openSkin}
          />
        )}

        {mode === 'otros' && (
          <CosmeticsSection
            cosmetics={ownership.cosmetics}
            query={deferredQuery}
            assetUrl={assetUrl}
          />
        )}

        {mode === 'actividad' && (
          <ActivitySection
            syncHistory={ownership.syncHistory}
            events={ownership.events}
            matches={ownership.matches}
            ownedCount={ownership.ownedSkinIds.size}
            catalog={catalog}
          />
        )}
      </main>

      {modal && (
        <SkinModal
          skin={modal.skin}
          initialChromaId={modal.chromaId}
          skinOwned={ownership.ownedSkinIds.has(modal.skin.id)}
          ownedChromaIds={ownership.ownedChromaIds}
          assetUrl={assetUrl}
          onClose={closeModal}
        />
      )}
    </div>
  );
}

export function Component() {
  return <App initialData={useLoaderData() as SkinfolioRouteData} />;
}

export function ErrorBoundary() {
  const error = useRouteError() as Error;
  const revalidator = useRevalidator();
  return (
    <main id="main-content" className="app" tabIndex={-1}>
      <div className="notice" role="alert">
        <strong>Algo ha fallado:</strong> {error.message}.{' '}
        <button type="button" onClick={() => revalidator.revalidate()}>
          Reintentar
        </button>
      </div>
    </main>
  );
}
