import { describe, expect, it } from 'vitest';

import { CALLOUT_EMOJIS } from '@/docs/doc-editor/components/custom-blocks/CalloutBlock';

import { createResolveEmojiData, highlightEmojis } from '../emojiData';

const options = { signal: new AbortController().signal };

describe('createResolveEmojiData', () => {
  it('loads the bundled data of the locale, localized', async () => {
    const data = await createResolveEmojiData()('fr', options);

    expect(data.categories.length).toBeGreaterThan(0);
    expect(data.emojis.find(({ emoji }) => emoji === '😀')?.label).toBe(
      'Visage rieur',
    );
  });

  it('lists the highlighted emojis in a first category', async () => {
    const data = await createResolveEmojiData({
      label: 'Callout',
      emojis: CALLOUT_EMOJIS,
    })('en', options);

    expect(data.categories[0]).toEqual({ index: 0, label: 'Callout' });
    const highlighted = data.emojis.filter(({ category }) => category === 0);
    // An emoji missing from the data would silently vanish from the picker
    expect(highlighted).toHaveLength(CALLOUT_EMOJIS.length);
  });

  it('stops when the picker is unmounted', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      createResolveEmojiData()('en', { signal: controller.signal }),
    ).rejects.toBeDefined();
  });
});

describe('highlightEmojis', () => {
  const data = {
    locale: 'en',
    skinTones: {} as never,
    categories: [
      { index: 0, label: 'Smileys' },
      { index: 1, label: 'Nature' },
    ],
    emojis: [
      { emoji: '😀', category: 0, label: 'grinning', version: 1, tags: [] },
      { emoji: '🌳', category: 1, label: 'tree', version: 1, tags: [] },
    ],
  };

  it('shifts the other categories after the highlighted one', () => {
    const result = highlightEmojis(data, { label: 'Top', emojis: ['🌳'] });

    expect(result.categories).toEqual([
      { index: 0, label: 'Top' },
      { index: 1, label: 'Smileys' },
      { index: 2, label: 'Nature' },
    ]);
    expect(result.emojis.map(({ category }) => category)).toEqual([1, 0]);
  });
});
