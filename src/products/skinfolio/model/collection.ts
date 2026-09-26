import type {
  Catalog,
  ChromaSection,
  CollectionSort,
  CollectionView,
  Ownership,
  Skin,
  SkinSection,
} from './types';

export function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es');
}

type Filters = {
  query: string;
  view: CollectionView;
  sort: CollectionSort;
  rarities: Set<string>;
  legacy: boolean;
  withChromas: boolean;
};

function skinPasses(skin: Skin, filters: Filters, mode: 'skins' | 'chromas') {
  if (filters.rarities.size && !filters.rarities.has(skin.rarity)) return false;
  if (filters.legacy && !skin.isLegacy) return false;
  return mode !== 'skins' || !filters.withChromas || skin.chromaTotal > 0;
}

function sortSections<
  T extends { champ: { id: number; name: string }; ownedCount: number; total: number },
>(list: T[], sort: CollectionSort, ownership: Ownership) {
  const mastery = (id: number) => ownership.masteryByChampion.get(id)?.points ?? 0;
  return list.sort((a, b) =>
    sort === 'alpha'
      ? a.champ.name.localeCompare(b.champ.name, 'es')
      : sort === 'completion'
        ? b.ownedCount / (b.total || 1) - a.ownedCount / (a.total || 1) ||
          b.ownedCount - a.ownedCount
        : mastery(b.champ.id) - mastery(a.champ.id) ||
          a.champ.name.localeCompare(b.champ.name, 'es'),
  );
}

export function buildSkinSections(
  catalog: Catalog,
  ownership: Ownership,
  filters: Filters,
): SkinSection[] {
  const query = normalizeText(filters.query.trim());
  const sections = catalog.champions
    .map((champ) => {
      const all = catalog.skinsByChampion.get(champ.id) ?? [];
      const championMatches = Boolean(query && normalizeText(champ.name).includes(query));
      let skins = all.filter(
        (skin) =>
          skinPasses(skin, filters, 'skins') &&
          (!query || championMatches || normalizeText(skin.name).includes(query)),
      );
      if (filters.view !== 'all')
        skins = skins.filter(
          (skin) => ownership.ownedSkinIds.has(skin.id) === (filters.view === 'owned'),
        );
      return {
        champ,
        skins,
        ownedCount: all.filter((skin) => ownership.ownedSkinIds.has(skin.id)).length,
        total: all.length,
      };
    })
    .filter((section) => section.skins.length);
  return sortSections(sections, filters.sort, ownership);
}

export function buildChromaSections(
  catalog: Catalog,
  ownership: Ownership,
  filters: Filters,
): ChromaSection[] {
  const query = normalizeText(filters.query.trim());
  const sections = catalog.champions
    .map((champ) => {
      const championMatches = Boolean(query && normalizeText(champ.name).includes(query));
      const all = (catalog.skinsByChampion.get(champ.id) ?? []).filter(
        (skin) => skin.chromaTotal > 0,
      );
      const entries = all.flatMap((skin) => {
        if (!skinPasses(skin, filters, 'chromas')) return [];
        let chromas = skin.chromas.filter(
          (chroma) =>
            !query ||
            championMatches ||
            normalizeText(skin.name).includes(query) ||
            normalizeText(chroma.name).includes(query),
        );
        if (filters.view !== 'all')
          chromas = chromas.filter(
            (chroma) => ownership.ownedChromaIds.has(chroma.id) === (filters.view === 'owned'),
          );
        return chromas.length ? [{ skin, chromas }] : [];
      });
      return {
        champ,
        entries,
        ownedCount: all.reduce(
          (count, skin) =>
            count + skin.chromas.filter((chroma) => ownership.ownedChromaIds.has(chroma.id)).length,
          0,
        ),
        total: all.reduce((count, skin) => count + skin.chromaTotal, 0),
      };
    })
    .filter((section) => section.entries.length);
  return sortSections(sections, filters.sort, ownership);
}

export function rarityTotals(catalog: Catalog, ownership: Ownership) {
  const totals = new Map<string, { owned: number; total: number }>();
  for (const skin of catalog.skinById.values()) {
    const current = totals.get(skin.rarity) ?? { owned: 0, total: 0 };
    current.total += 1;
    if (ownership.ownedSkinIds.has(skin.id)) current.owned += 1;
    totals.set(skin.rarity, current);
  }
  return totals;
}

export function chromaTotal(catalog: Catalog) {
  return [...catalog.skinById.values()].reduce((total, skin) => total + skin.chromaTotal, 0);
}

export function collectionHighlights(catalog: Catalog, ownership: Ownership, now = Date.now()) {
  const sections = buildSkinSections(catalog, ownership, {
    query: '',
    view: 'all',
    sort: 'mastery',
    rarities: new Set(),
    legacy: false,
    withChromas: false,
  });
  const rarityOrder = [
    'kNoRarity',
    'kEpic',
    'kLegendary',
    'kMythic',
    'kUltimate',
    'kExalted',
    'kTranscendent',
  ];
  const featured = sections
    .flatMap(({ champ, skins }) => {
      const skin = skins
        .filter((skin) => ownership.ownedSkinIds.has(skin.id) && (skin.splash || skin.image))
        .sort(
          (a, b) => rarityOrder.indexOf(b.rarity) - rarityOrder.indexOf(a.rarity) || a.id - b.id,
        )[0];
      return skin ? [{ champ, skin }] : [];
    })
    .slice(0, 3);
  const almostComplete = sections.filter(
    (section) => section.ownedCount > 0 && section.total - section.ownedCount === 1,
  );
  const recentIds = [
    ...new Set(
      [...ownership.events]
        .filter(
          (event) => event.itemType === 'skin' && Number.isFinite(Date.parse(event.acquiredAt)),
        )
        .sort((a, b) => Date.parse(b.acquiredAt) - Date.parse(a.acquiredAt))
        .map((event) => event.itemId),
    ),
  ]
    .filter((id) => ownership.ownedSkinIds.has(id) && catalog.skinById.has(id))
    .slice(0, 8);
  const favouriteSkinIds = new Set(
    sections
      .filter(({ champ }) => (ownership.masteryByChampion.get(champ.id)?.points ?? 0) > 0)
      .slice(0, 5)
      .flatMap(({ skins }) => skins.map((skin) => skin.id)),
  );
  const favouriteOffers = ownership.offers.filter(
    (offer) =>
      offer.skinId !== null &&
      favouriteSkinIds.has(offer.skinId) &&
      !ownership.ownedSkinIds.has(offer.skinId) &&
      offer.saleRp !== null &&
      offer.saleRp >= 0 &&
      (!offer.saleEndsAt || Date.parse(offer.saleEndsAt) > now),
  );
  return { featured, almostComplete, recentIds, favouriteOffers };
}
