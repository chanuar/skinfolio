import { championIconUrl } from '../api/catalog';
import type { Catalog, Match, OwnershipEvent, SyncPoint } from '../model/types';
import { relativeTime } from './CollectionParts';

/* ------------------------------------------------------------------ */
/* Actividad: evolución + adquisiciones + últimas partidas             */

const QUEUES: Record<number, string> = {
  420: 'Solo/Dúo',
  440: 'Flex',
  450: 'ARAM',
  400: 'Normal',
  430: 'Normal',
  490: 'Partida rápida',
  700: 'Clash',
  900: 'URF',
  1700: 'Arena',
  1900: 'URF',
};

function Sparkline({ points, current }: { points: SyncPoint[]; current: number }) {
  const values = points.map((p) => p.skinsOwned);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const W = 100,
    H = 48,
    pad = 4;
  const coords = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * W;
      const y = pad + (1 - (v - min) / range) * (H - pad * 2);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');
  return (
    <div className="spark">
      <svg
        className="spark__svg"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <polyline
          points={coords}
          fill="none"
          stroke="var(--gold)"
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <span className="spark__now">{current}</span>
    </div>
  );
}

function eventName(ev: OwnershipEvent, catalog: Catalog) {
  switch (ev.itemType) {
    case 'skin':
      return catalog.skinById.get(ev.itemId)?.name ?? 'Skin nueva';
    case 'champion':
      return catalog.championById.get(ev.itemId)?.name ?? 'Campeón nuevo';
    case 'chroma': {
      const c = catalog.chromaById.get(ev.itemId);
      return c ? `${c.skin.name} · chroma ${c.chroma.name}` : 'Chroma nuevo';
    }
    case 'ward':
      return 'Nuevo ward';
    case 'emote':
      return 'Nuevo emote';
    case 'icon':
      return 'Nuevo icono';
    default:
      return 'Novedad';
  }
}

export function ActivitySection({
  syncHistory,
  events,
  matches,
  ownedCount,
  catalog,
}: {
  syncHistory: SyncPoint[];
  events: OwnershipEvent[];
  matches: Match[];
  ownedCount: number;
  catalog: Catalog;
}) {
  return (
    <section className="activity">
      <div className="act-block">
        <h2 className="section-head__title">Evolución</h2>
        {syncHistory.length >= 2 ? (
          <Sparkline points={syncHistory} current={ownedCount} />
        ) : (
          <p className="act-muted">La gráfica crecerá con cada sincronización.</p>
        )}
      </div>

      <div className="act-block">
        <h2 className="section-head__title">Adquisiciones recientes</h2>
        {events.length > 0 ? (
          <ul className="acq-list">
            {events.map((ev, i) => (
              <li className="acq" key={`${ev.itemType}-${ev.itemId}-${i}`}>
                <span className="acq__bullet" aria-hidden="true">
                  ◆
                </span>
                <span className="acq__name">{eventName(ev, catalog)}</span>
                <span className="acq__time">{relativeTime(ev.acquiredAt)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="act-muted">
            Aquí aparecerá cada skin nueva que consigas a partir de ahora.
          </p>
        )}
      </div>

      <div className="act-block">
        <h2 className="section-head__title">Últimas partidas</h2>
        {matches.length > 0 ? (
          <ul className="match-list">
            {matches.map((m) => {
              const champ = catalog.championById.get(m.championId);
              const queue = QUEUES[m.queueId] ?? `Cola ${m.queueId}`;
              return (
                <li className={`match ${m.win ? 'match--win' : 'match--loss'}`} key={m.gameId}>
                  <img
                    className="match__icon"
                    src={championIconUrl(m.championId)}
                    alt=""
                    loading="lazy"
                  />
                  <div className="match__body">
                    <div className="match__line">
                      <span className="match__champ">
                        {champ?.name ?? `Campeón ${m.championId}`}
                      </span>
                      <span className="match__result">{m.win ? 'Victoria' : 'Derrota'}</span>
                    </div>
                    <div className="match__meta">
                      {queue} · {m.kills}/{m.deaths}/{m.assists} · {Math.round(m.durationS / 60)}{' '}
                      min · {relativeTime(m.playedAt)}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="act-muted">Sin partidas registradas todavía.</p>
        )}
      </div>
    </section>
  );
}
