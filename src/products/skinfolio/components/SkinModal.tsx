import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, SyntheticEvent } from 'react';
import { rarityInfo } from '../api/catalog';
import type { Skin } from '../model/types';

type AssetUrl = (path: string | null | undefined) => string;
type CssVars = CSSProperties & Record<`--${string}`, string | undefined>;
const cssVars = (vars: Record<`--${string}`, string | undefined>) => vars as CssVars;

/* ------------------------------------------------------------------ */
/* Modal: splash en grande + galería de chromas                        */

export function SkinModal({
  skin,
  initialChromaId,
  skinOwned,
  ownedChromaIds,
  assetUrl,
  onClose,
  position = 0,
  total = 1,
  onNavigate,
}: {
  skin: Skin;
  initialChromaId: number | null;
  skinOwned: boolean;
  ownedChromaIds: Set<number>;
  assetUrl: AssetUrl;
  onClose: () => void;
  position?: number;
  total?: number;
  onNavigate?: (direction: -1 | 1) => void;
}) {
  const [selection, setSelection] = useState({ skinId: skin.id, chromaId: initialChromaId });
  const selectedId = selection.skinId === skin.id ? selection.chromaId : initialChromaId;
  const [failedSources, setFailedSources] = useState<Set<string>>(() => new Set());
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    openerRef.current = document.activeElement as HTMLElement | null;
    const card = openerRef.current?.closest('.skin, .chromacard, .showcase__card');
    const origin = card?.getBoundingClientRect();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog?.showModal();
    let animation: Animation | undefined;
    if (
      dialog &&
      origin?.width &&
      dialog.animate &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      const target = dialog.getBoundingClientRect();
      animation = dialog.animate(
        [
          {
            transform: `translate(${origin.x + origin.width / 2 - target.x - target.width / 2}px, ${origin.y + origin.height / 2 - target.y - target.height / 2}px) scale(${Math.min(1, origin.width / target.width)})`,
            opacity: 0.25,
          },
          { transform: 'none', opacity: 1 },
        ],
        { duration: 240, easing: 'cubic-bezier(.2,.8,.2,1)' },
      );
    }
    return () => {
      animation?.cancel();
      if (dialog?.open) dialog.close();
      document.body.style.overflow = overflow;
      openerRef.current?.focus({ preventScroll: true });
    };
  }, []);

  const closeParent = () => {
    dialogRef.current?.close();
    onClose();
  };
  const handleCancel = (event: SyntheticEvent<HTMLDialogElement>) => {
    event.preventDefault();
    closeParent();
  };

  const rarity = rarityInfo(skin.rarity);
  const chroma = selectedId != null ? skin.chromas.find((c) => c.id === selectedId) : null;
  const showChromaRender = chroma?.image && !failedSources.has(assetUrl(chroma.image));
  const bigSrc = showChromaRender ? assetUrl(chroma.image) : assetUrl(skin.splash || skin.image);
  const selectedOwned = chroma ? ownedChromaIds.has(chroma.id) : skinOwned;
  const ownedChromaCount = skin.chromas.reduce((n, c) => n + (ownedChromaIds.has(c.id) ? 1 : 0), 0);

  return (
    <dialog
      ref={dialogRef}
      className="modal"
      aria-label={skin.name}
      onCancel={handleCancel}
      onKeyDown={(event) => {
        if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
        if (event.key === 'ArrowLeft' && position > 0) {
          event.preventDefault();
          onNavigate?.(-1);
        }
        if (event.key === 'ArrowRight' && position < total - 1) {
          event.preventDefault();
          onNavigate?.(1);
        }
      }}
      onClick={(e) => e.target === e.currentTarget && closeParent()}
    >
      <button className="modal__close" type="button" onClick={closeParent} aria-label="Cerrar">
        ✕
      </button>

      <div className={`modal__img-wrap ${showChromaRender ? 'modal__img-wrap--render' : ''}`}>
        <img
          key={bigSrc}
          className="modal__img"
          src={bigSrc}
          alt={chroma ? `${skin.name} — chroma ${chroma.name}` : skin.name}
          onError={() => setFailedSources((sources) => new Set([...sources, bigSrc]))}
        />
      </div>

      <div className="modal__info">
        <div className="modal__title">
          <span
            className="skin__gem"
            style={cssVars({ '--stone': rarity.color })}
            aria-hidden="true"
          />
          <h3 className="modal__name">
            {skin.name}
            {chroma && <span className="modal__chroma-name"> · {chroma.name}</span>}
          </h3>
          <span className={`pill ${selectedOwned ? 'pill--owned' : 'pill--locked'}`}>
            {selectedOwned ? 'En tu colección' : chroma ? 'No poseído' : 'No poseída'}
          </span>
        </div>

        {skin.chromas.length > 0 && (
          <>
            <div className="modal__sub">
              Chromas · {ownedChromaCount}/{skin.chromas.length} desbloqueados
            </div>
            <div className="modal__stones">
              <button
                className={`stone stone--original ${selectedId === null ? 'stone--selected' : ''}`}
                onClick={() => {
                  setFailedSources(new Set());
                  setSelection({ skinId: skin.id, chromaId: null });
                }}
                title="Skin original"
                aria-pressed={selectedId === null}
              >
                <span className="stone__shape" />
                <span className="stone__label">Original</span>
              </button>
              {skin.chromas.map((c) => {
                const owned = ownedChromaIds.has(c.id);
                return (
                  <button
                    key={c.id}
                    className={`stone ${owned ? 'stone--owned' : 'stone--locked'} ${selectedId === c.id ? 'stone--selected' : ''}`}
                    style={cssVars({ '--c0': c.colors[0], '--c1': c.colors[1] ?? c.colors[0] })}
                    onClick={() => {
                      setFailedSources(new Set());
                      setSelection({ skinId: skin.id, chromaId: c.id });
                    }}
                    title={`${c.name}${owned ? '' : ' · no poseído'}`}
                    aria-label={`${c.name}, ${owned ? 'poseído' : 'no poseído'}`}
                    aria-pressed={selectedId === c.id}
                  >
                    <span className="stone__shape" />
                    <span className="stone__label">{c.name}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
      {total > 1 && (
        <nav className="modal__navigation" aria-label="Navegar entre skins">
          <button
            type="button"
            disabled={position <= 0}
            onClick={() => onNavigate?.(-1)}
            aria-label="Skin anterior"
          >
            ← <span>Anterior</span>
          </button>
          <span role="status" aria-live="polite">
            {position + 1} / {total}
            <span className="sr-only"> · {skin.name}</span>
          </span>
          <button
            type="button"
            disabled={position >= total - 1}
            onClick={() => onNavigate?.(1)}
            aria-label="Skin siguiente"
          >
            <span>Siguiente</span> →
          </button>
        </nav>
      )}
    </dialog>
  );
}
