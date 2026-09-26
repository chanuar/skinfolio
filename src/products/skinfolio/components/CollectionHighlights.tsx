import { rarityInfo, assetUrl } from '../api/catalog';
import type { collectionHighlights } from '../model/collection';
import type { Skin } from '../model/types';

export type Discovery = 'almost' | 'recent' | 'offers';
type Highlights = ReturnType<typeof collectionHighlights>;

export function CollectionShowcase({
  featured,
  onOpen,
}: {
  featured: Highlights['featured'];
  onOpen: (skin: Skin) => void;
}) {
  if (!featured.length) return null;
  return (
    <section className="showcase" aria-labelledby="showcase-title">
      <div className="showcase__heading">
        <h2 id="showcase-title">Las joyas de la colección</h2>
        <p>Skins de tus campeones con más maestría</p>
      </div>
      <div className="showcase__grid">
        {featured.map(({ champ, skin }, index) => (
          <button
            className="showcase__card"
            key={skin.id}
            onClick={() => onOpen(skin)}
            aria-label={`Explorar ${skin.name}`}
          >
            <img
              src={assetUrl(skin.splash || skin.image)}
              alt=""
              fetchPriority={index === 0 ? 'high' : 'auto'}
              onError={(event) => {
                event.currentTarget.hidden = true;
              }}
            />
            <span className="showcase__number" aria-hidden="true">
              0{index + 1}
            </span>
            <span className="showcase__caption">
              <span>
                {champ.name} · {rarityInfo(skin.rarity).label}
              </span>
              <strong>{skin.name}</strong>
              <span className="showcase__explore">
                Ver skin <span aria-hidden="true">↗</span>
              </span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

export function CollectionDiscoveries({
  highlights,
  selected,
  onSelect,
}: {
  highlights: Highlights;
  selected: Discovery | null;
  onSelect: (value: Discovery) => void;
}) {
  const { almostComplete, recentIds, favouriteOffers } = highlights;
  const missing = almostComplete[0];
  const choices: { value: Discovery; title: string; count: number; text: string }[] = [
    {
      value: 'almost',
      title: 'A una skin de completar',
      count: almostComplete.length,
      text: missing
        ? `${missing.champ.name}: ${missing.ownedCount} de ${missing.total}. Descubre cuál falta.`
        : 'Tus próximas colecciones completas aparecerán aquí.',
    },
    {
      value: 'recent',
      title: 'Últimas incorporaciones',
      count: recentIds.length,
      text: recentIds.length
        ? 'Vuelve a ver las últimas skins que se han sumado a tu colección.'
        : 'Aparecerán cuando haya nuevas adquisiciones registradas.',
    },
    {
      value: 'offers',
      title: 'Ofertas para tus mains',
      count: favouriteOffers.length,
      text: favouriteOffers.length
        ? 'Skins que te faltan de tus cinco campeones con más maestría.'
        : 'Ahora no hay ofertas de skins que te falten para tus cinco campeones con más maestría.',
    },
  ];
  return (
    <nav className="discoveries" aria-label="Descubre tu colección">
      {choices.map(({ value, title, count, text }) => (
        <button
          type="button"
          key={value}
          className="discovery"
          disabled={!count}
          aria-pressed={selected === value}
          onClick={() => onSelect(value)}
        >
          <span className="discovery__top">
            <strong>{title}</strong>
            <span className="discovery__count">{count}</span>
          </span>
          <span>{text}</span>
          <span className="discovery__action">
            {count ? 'Explorar selección ↗' : 'Sin novedades'}
          </span>
        </button>
      ))}
    </nav>
  );
}
