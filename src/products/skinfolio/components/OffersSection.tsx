import type { Catalog, Offer, Skin } from '../model/types';
import { SkinCard } from './CollectionParts';

type AssetUrl = (path: string | null | undefined) => string;
type OpenSkin = (skin: Skin, chromaId?: number | null) => void;

/* ------------------------------------------------------------------ */
/* Ofertas: rejilla de skins en promoción, reutiliza SkinCard          */

export function OffersSection({
  offers,
  catalog,
  ownedSkinIds,
  chromasBySkin,
  assetUrl,
  onOpen,
}: {
  offers: Offer[];
  catalog: Catalog;
  ownedSkinIds: Set<number>;
  chromasBySkin: Map<number, number>;
  assetUrl: AssetUrl;
  onOpen: OpenSkin;
}) {
  if (offers.length === 0) {
    return (
      <div className="empty">
        No hay datos de ofertas todavía. Sincroniza con el collector v0.3 para traer los precios de
        la tienda.
      </div>
    );
  }
  // Las ofertas llegan preordenadas (no poseídas primero, luego mayor descuento).
  const resolved = offers.flatMap((offer) => {
    const skin = offer.skinId == null ? undefined : catalog.skinById.get(offer.skinId);
    return skin ? [{ offer, skin }] : [];
  });
  const maxEnds = offers.reduce((max, o) => {
    const t = o.saleEndsAt ? new Date(o.saleEndsAt).getTime() : 0;
    return t > max ? t : max;
  }, 0);
  return (
    <section className="offers">
      <div className="section-head">
        <h2 className="section-head__title">Ofertas de la tienda</h2>
        {maxEnds > 0 && (
          <span className="section-head__sub">
            terminan {new Date(maxEnds).toLocaleDateString('es')}
          </span>
        )}
      </div>
      <div className="grid">
        {resolved.map(({ offer, skin }) => (
          <SkinCard
            key={offer.skinId}
            skin={skin}
            owned={ownedSkinIds.has(skin.id)}
            chromasOwned={chromasBySkin.get(skin.id) ?? 0}
            assetUrl={assetUrl}
            onOpen={onOpen}
            offer={offer}
          />
        ))}
      </div>
    </section>
  );
}
