import { useEffect, useState } from 'react';
import { fetchCosmeticsCatalog } from '../api/catalog';
import { normalizeText } from '../model/collection';
import type { Ownership } from '../model/types';

type AssetUrl = (path: string | null | undefined) => string;

/* ------------------------------------------------------------------ */
/* Otros: cosméticos poseídos (wards, emotes, iconos), carga diferida  */

const COSMETIC_GROUPS: [keyof Ownership['cosmetics'], string][] = [
  ['wards', 'Wards'],
  ['emotes', 'Emotes'],
  ['icons', 'Iconos'],
];

export function CosmeticsSection({
  cosmetics,
  query,
  assetUrl,
}: {
  cosmetics: Ownership['cosmetics'];
  query: string;
  assetUrl: AssetUrl;
}) {
  const [catalog, setCatalog] = useState<Awaited<ReturnType<typeof fetchCosmeticsCatalog>> | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetchCosmeticsCatalog()
      .then((c) => {
        if (alive) setCatalog(c);
      })
      .catch((e: unknown) => {
        if (alive) setError(e instanceof Error ? e.message : 'Error desconocido');
      });
    return () => {
      alive = false;
    };
  }, []);

  if (error) {
    return (
      <div className="notice">
        <strong>No se pudo abrir el arsenal:</strong> {error}.
      </div>
    );
  }
  if (!catalog) return <div className="loading">Abriendo el arsenal…</div>;

  const q = normalizeText((query ?? '').trim());
  return (
    <section className="cosmetics">
      {COSMETIC_GROUPS.map(([type, label]) => {
        const map = catalog[type];
        const ownedIds = cosmetics[type];
        const items = [...ownedIds]
          .map((id) => map.get(id))
          .filter((it): it is NonNullable<typeof it> =>
            Boolean(it && (!q || normalizeText(it.name).includes(q))),
          );
        return (
          <div className="cos-group" key={type}>
            <div className="section-head">
              <h2 className="section-head__title">{label}</h2>
              <span className="section-head__sub">
                {ownedIds.size} / {map.size}
              </span>
            </div>
            {items.length > 0 ? (
              <div className="cos-grid">
                {items.map((it) => (
                  <figure className="cos-tile" key={it.id}>
                    <img className="cos-tile__img" src={assetUrl(it.image)} alt="" loading="lazy" />
                    <figcaption className="cos-tile__name" title={it.name}>
                      {it.name}
                    </figcaption>
                  </figure>
                ))}
              </div>
            ) : (
              <div className="cos-empty">Nada que mostrar en esta categoría.</div>
            )}
          </div>
        );
      })}
      <p className="cos-foot">Se muestran solo los que posees.</p>
    </section>
  );
}
