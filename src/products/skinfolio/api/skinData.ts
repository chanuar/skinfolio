export const CATALOG_BASE =
  'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default';

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('El catálogo tiene un formato no válido');
  return value as Record<string, unknown>;
}

function id(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0)
    throw new Error('El catálogo contiene un identificador no válido');
  return value;
}

function text(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (typeof value !== 'string') throw new Error('El catálogo contiene un texto no válido');
  return value;
}

function flag(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value !== 'boolean') throw new Error('El catálogo contiene un indicador no válido');
  return value;
}

/** Keep only fields used by the collection, validating upstream and cached responses. */
export function compactSkins(data: unknown) {
  const entries = Object.values(record(data));
  if (!entries.length) throw new Error('El catálogo está vacío');
  return Object.fromEntries(
    entries.map((entry) => {
      const skin = record(entry);
      const skinId = id(skin.id);
      const name = text(skin.name);
      if (!name) throw new Error('El catálogo contiene una skin sin nombre');
      if (skin.chromas != null && !Array.isArray(skin.chromas))
        throw new Error('El catálogo contiene chromas no válidos');
      return [
        skinId,
        {
          id: skinId,
          name,
          rarity: text(skin.rarity),
          isBase: flag(skin.isBase),
          isLegacy: flag(skin.isLegacy),
          loadScreenPath: text(skin.loadScreenPath),
          tilePath: text(skin.tilePath),
          splashPath: text(skin.splashPath),
          uncenteredSplashPath: text(skin.uncenteredSplashPath),
          chromas: (skin.chromas ?? []).map((entry: unknown) => {
            const chroma = record(entry);
            const colors = chroma.colors;
            if (
              colors != null &&
              (!Array.isArray(colors) || !colors.every((c: unknown) => typeof c === 'string'))
            )
              throw new Error('El catálogo contiene colores no válidos');
            return {
              id: id(chroma.id),
              name: text(chroma.name),
              colors: (colors ?? undefined) as string[] | undefined,
              chromaPath: text(chroma.chromaPath),
            };
          }),
        },
      ] as const;
    }),
  );
}
