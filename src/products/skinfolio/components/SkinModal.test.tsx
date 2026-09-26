import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
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

beforeEach(() => {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value() {
      this.open = true;
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value() {
      this.open = false;
    },
  });
});
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

it('navigates by buttons and arrows and resets the chroma when the skin changes', () => {
  const onNavigate = vi.fn();
  const props = {
    skin: { ...skin, chromas: [{ id: 11, name: 'Azul', colors: [], image: '/blue' }] },
    initialChromaId: 11,
    skinOwned: true,
    ownedChromaIds: new Set([11]),
    assetUrl: (path: string | null | undefined) => path || '/skin.png',
    onClose: vi.fn(),
    position: 0,
    total: 3,
    onNavigate,
  };
  const { rerender } = render(<SkinModal {...props} />);
  expect(screen.getByRole('button', { name: 'Skin anterior' })).toBeDisabled();
  fireEvent.keyDown(screen.getByRole('dialog'), { key: 'ArrowLeft' });
  expect(onNavigate).not.toHaveBeenCalled();
  fireEvent.keyDown(screen.getByRole('dialog'), { key: 'ArrowRight' });
  expect(onNavigate).toHaveBeenLastCalledWith(1);
  fireEvent.error(screen.getByRole('img'));
  expect(screen.getByRole('img')).toHaveAttribute('src', '/skin.png');
  fireEvent.error(screen.getByRole('img'));
  expect(screen.getByRole('img')).toHaveAttribute('src', '/skin.png');
  rerender(
    <SkinModal
      {...props}
      skin={{ ...skin, id: 2, name: 'Braum' }}
      initialChromaId={null}
      position={1}
    />,
  );
  expect(screen.getByRole('dialog', { name: 'Braum' })).not.toHaveTextContent('Azul');
  expect(screen.getByRole('status')).toHaveTextContent('2 / 3');
  fireEvent.click(screen.getByRole('button', { name: 'Skin anterior' }));
  expect(onNavigate).toHaveBeenLastCalledWith(-1);
  rerender(<SkinModal {...props} position={2} />);
  expect(screen.getByRole('button', { name: 'Skin siguiente' })).toBeDisabled();
});
