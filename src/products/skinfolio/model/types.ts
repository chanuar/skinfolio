export type Champion = { id: number; name: string };
export type Chroma = { id: number; name: string; colors: string[]; image: string | null };
export type Skin = {
  id: number;
  name: string;
  rarity: string;
  isLegacy: boolean;
  image: string | null;
  splash: string | null;
  chromaTotal: number;
  chromas: Chroma[];
};

export type Catalog = {
  champions: Champion[];
  championById: Map<number, Champion>;
  skinsByChampion: Map<number, Skin[]>;
  skinById: Map<number, Skin>;
  chromaById: Map<number, { skin: Skin; chroma: Chroma }>;
  totals: { skins: number };
};

export type Profile = { gameName: string; tagLine: string; level: number; profileIconId: number };
export type Flair = { honorLevel: number | string; challengeLevel?: string | null };
export type Loot = {
  skinShards?: unknown[];
  skinPermanents?: unknown[];
  chests?: { count: number }[];
};
export type Wallet = { RP: number; blueEssence: number };
export type Offer = {
  skinId: number | null;
  rp: number | null;
  saleRp: number | null;
  discount: number;
  saleEndsAt: string | null;
  owned: boolean;
};
export type Match = {
  gameId: string | number;
  playedAt: string;
  queueId: number;
  durationS: number;
  championId: number;
  win: boolean;
  kills: number;
  deaths: number;
  assists: number;
};
export type OwnershipEvent = { itemType: string; itemId: number; acquiredAt: string };
export type SyncPoint = { skinsOwned: number };

export type Ownership = {
  profile: Profile | null;
  ownedSkinIds: Set<number>;
  ownedChromaIds: Set<number>;
  chromasOwned: number;
  chromasBySkin: Map<number, number>;
  masteryByChampion: Map<number, { points: number; level?: number }>;
  lastSyncAt: string | null;
  loot: Loot | null;
  wallet: Wallet | null;
  flair: Flair | null;
  collectionValueRp: number;
  pricedOwnedCount: number;
  offers: Offer[];
  matches: Match[];
  cosmetics: { wards: Set<number>; emotes: Set<number>; icons: Set<number> };
  events: OwnershipEvent[];
  syncHistory: SyncPoint[];
};

export type CollectionMode = 'skins' | 'chromas' | 'ofertas' | 'otros' | 'actividad';
export type CollectionView = 'all' | 'owned' | 'missing';
export type CollectionSort = 'mastery' | 'completion' | 'alpha';
export type SkinSection = { champ: Champion; skins: Skin[]; ownedCount: number; total: number };
export type ChromaSection = {
  champ: Champion;
  entries: { skin: Skin; chromas: Chroma[] }[];
  ownedCount: number;
  total: number;
};
