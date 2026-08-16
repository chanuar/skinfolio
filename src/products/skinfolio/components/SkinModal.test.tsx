import { cleanup, fireEvent, render } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { SkinModal } from './SkinModal';
import type { Skin } from '../model/types';

const skin: Skin = {
  id: 1,
  name: 'Ahri',
  rarity: 'epic',
  isLegacy: false,
  image: null,
  splash: null,
  chromaTotal: 0,
  chromas: [],
};

afterEach(() => cleanup());

it('opens natively and restores focus after cancel closes the parent', () => {
  const showModalDescriptor = Object.getOwnPropertyDescriptor(
    HTMLDialogElement.prototype,
    'showModal',
  );
  const closeDescriptor = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'close');
  const showModal = vi.fn(function (this: HTMLDialogElement) {
    this.open = true;
  });
  const close = vi.fn(function (this: HTMLDialogElement) {
    this.open = false;
  });
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value: showModal,
  });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value: close });

  const opener = document.createElement('button');
  document.body.append(opener);
  opener.focus();

  function Harness() {
    const [open, setOpen] = useState(true);
    return open ? (
      <SkinModal
        skin={skin}
        initialChromaId={null}
        skinOwned={false}
        ownedChromaIds={new Set()}
        assetUrl={() => '/skin.png'}
        onClose={() => setOpen(false)}
      />
    ) : null;
  }

  try {
    const { container } = render(<Harness />);
    const dialog = container.querySelector('dialog');
    expect(dialog).not.toBeNull();
    expect(showModal).toHaveBeenCalledOnce();

    const cancel = new Event('cancel', { bubbles: true, cancelable: true });
    fireEvent(dialog!, cancel);

    expect(cancel.defaultPrevented).toBe(true);
    expect(close).toHaveBeenCalledOnce();
    expect(container.querySelector('dialog')).toBeNull();
    expect(document.activeElement).toBe(opener);
  } finally {
    if (showModalDescriptor) {
      Object.defineProperty(HTMLDialogElement.prototype, 'showModal', showModalDescriptor);
    } else {
      delete (HTMLDialogElement.prototype as Partial<HTMLDialogElement>).showModal;
    }
    if (closeDescriptor) {
      Object.defineProperty(HTMLDialogElement.prototype, 'close', closeDescriptor);
    } else {
      delete (HTMLDialogElement.prototype as Partial<HTMLDialogElement>).close;
    }
    opener.remove();
  }
});
