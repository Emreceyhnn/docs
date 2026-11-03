import { fireEvent, render, screen } from '@testing-library/react';
import { createPortal } from 'react-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AppWrapper } from '@/tests/utils';

import { EmojiPicker } from '../EmojiPicker';

describe('EmojiPicker keys', () => {
  const onDocumentKeyDown = vi.fn();

  // Frimousse measures its list, jsdom has no ResizeObserver.
  beforeEach(() => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {
          // noop
        }
        unobserve() {
          // noop
        }
        disconnect() {
          // noop
        }
      },
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.removeEventListener('keydown', onDocumentKeyDown);
    onDocumentKeyDown.mockReset();
  });

  // Frimousse only listens on `document`, like the doc tree, whose items stop
  // the keys of what is portalled out of them.
  const renderInStoppingAncestor = () => {
    document.addEventListener('keydown', onDocumentKeyDown);

    render(
      <div onKeyDown={(event) => event.stopPropagation()}>
        {createPortal(
          <EmojiPicker onClickOutside={vi.fn()} onEmojiSelect={vi.fn()} />,
          document.body,
        )}
      </div>,
      { wrapper: AppWrapper },
    );

    return screen.getByRole('searchbox', { name: 'Search' });
  };

  it('hands the keys over to the document despite an ancestor stopping them', () => {
    const search = renderInStoppingAncestor();

    fireEvent.keyDown(search, { key: 'ArrowDown' });

    expect(onDocumentKeyDown).toHaveBeenCalledTimes(1);
    expect(onDocumentKeyDown.mock.calls[0][0]).toMatchObject({
      key: 'ArrowDown',
    });
  });

  it('keeps the default action prevented by the document', () => {
    const search = renderInStoppingAncestor();
    onDocumentKeyDown.mockImplementation((event: KeyboardEvent) =>
      event.preventDefault(),
    );

    // fireEvent returns false when the default action was prevented
    expect(fireEvent.keyDown(search, { key: 'Enter' })).toBe(false);
  });
});
