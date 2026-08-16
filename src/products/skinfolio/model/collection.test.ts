import { describe, expect, it } from 'vitest';
import {
  buildChromaSections,
  buildSkinSections,
  chromaTotal,
  normalizeText,
  rarityTotals,
} from './collection';
import type { Catalog, Ownership, Skin } from './types';

const skins: Skin[] = [
  {
    id: 1,
    name: 'Corazón',
    rarity: 'epic',
    isLegacy: false,
    image: null,
    splash: null,
    chromaTotal: 1,
    chromas: [{ id: 11, name: 'Zafiro', colors: [], image: null }],
  },
  {
    id: 2,
    name: 'Antigua',
    rarity: 'mythic',
    isLegacy: true,
    image: null,
    splash: null,
    chromaTotal: 0,
    chromas: [],
  },
  {
    id: 3,
    name: 'Nueva',
    rarity: 'epic',
    isLegacy: false,
    image: null,
    splash: null,
    chromaTotal: 0,
    chromas: [],
  },
];
const champions = [
  { id: 1, name: 'Áhri' },
  { id: 2, name: 'Braum' },
];
const catalog: Catalog = {
  champions,
  championById: new Map(champions.map((champion) => [champion.id, champion])),
  skinsByChampion: new Map([
    [1, skins.slice(0, 2)],
    [2, skins.slice(2)],
  ]),
  skinById: new Map(skins.map((skin) => [skin.id, skin])),
  chromaById: new Map([[11, { skin: skins[0]!, chroma: skins[0]!.chromas[0]! }]]),
  totals: { skins: 3 },
};
const ownership: Ownership = {
  profile: null,
  ownedSkinIds: new Set([1]),
  ownedChromaIds: new Set([11]),
  chromasOwned: 1,
  chromasBySkin: new Map([[1, 1]]),
  masteryByChampion: new Map([
    [2, { points: 100 }],
    [1, { points: 10 }],
  ]),
  lastSyncAt: null,
  loot: null,
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
const filters = {
  query: '',
  view: 'all' as const,
  sort: 'alpha' as const,
  rarities: new Set<string>(),
  legacy: false,
  withChromas: false,
};

describe('Skinfolio collection model', () => {
  it('normalizes accented search', () =>
    expect(normalizeText('ÁHRI corazón')).toBe('ahri corazon'));
  it('filters owned skins', () =>
    expect(
      buildSkinSections(catalog, ownership, { ...filters, view: 'owned' }).flatMap((section) =>
        section.skins.map((skin) => skin.id),
      ),
    ).toEqual([1]));
  it('applies rarity and legacy flags', () =>
    expect(
      buildSkinSections(catalog, ownership, {
        ...filters,
        rarities: new Set(['mythic']),
        legacy: true,
      })[0]?.skins.map((skin) => skin.id),
    ).toEqual([2]));
  it('sorts mastery before completion and alphabetic alternatives', () =>
    expect(
      buildSkinSections(catalog, ownership, { ...filters, sort: 'mastery' })[0]?.champ.name,
    ).toBe('Braum'));
  it('sorts by completion ratio', () =>
    expect(
      buildSkinSections(catalog, ownership, { ...filters, sort: 'completion' })[0]?.champ.name,
    ).toBe('Áhri'));
  it('searches chroma names and derives totals', () => {
    expect(
      buildChromaSections(catalog, ownership, { ...filters, query: 'záfiro' })[0]?.entries[0]
        ?.chromas[0]?.id,
    ).toBe(11);
    expect(chromaTotal(catalog)).toBe(1);
    expect(rarityTotals(catalog, ownership).get('epic')).toEqual({ owned: 1, total: 2 });
  });
});
