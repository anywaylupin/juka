import { describe, expect, it } from 'vitest';
import { normaliseCard, normaliseCards, normaliseGroups } from '../shared/utils/normalise';

/**
 * Local storage has no migrations, so this is the migration.
 * Every shape here is one a real browser could be holding from an earlier release.
 */
describe('normaliseCard', () => {
  it('fills in groupIds for a card written before groups existed', () => {
    /*
     * The exact crash this exists for: CardFace called .map on groupIds, which was undefined on every card written before migration 0007, and a component that cannot render its props takes the page down with it.
     */
    const card = normaliseCard(
      {
        id: -1,
        hanzi: '时间',
        pinyin: 'shí jiān',
        translation: 'time',
        pos: 'noun',
        rating: 3
      },
      -99
    );

    expect(card?.groupIds).toEqual([]);
  });

  it('keeps the groups a card does have', () => {
    expect(normaliseCard({ hanzi: '学习', groupIds: [-1, -2] }, -1)?.groupIds).toEqual([-1, -2]);
  });

  it('drops group ids that are not numbers', () => {
    // Hand-edited storage, or a half-written array from a failed save.
    expect(normaliseCard({ hanzi: '学习', groupIds: ['-1', null, 2, Number.NaN] }, -1)?.groupIds).toEqual([2]);
  });

  it('recomputes the derived columns rather than trusting them', () => {
    /*
     * A card written by the version with the broken pinyin folding holds pinyinPlain "xux", so typing xuexi would never find it again.
     * Recomputing on read repairs it without the user doing anything.
     */
    const card = normaliseCard(
      {
        hanzi: '学习',
        pinyin: 'xué xí',
        pinyinPlain: 'xux',
        syllables: 99
      },
      -1
    );

    expect(card?.pinyinPlain).toBe('xuexi');
    expect(card?.syllables).toBe(2);
  });

  it('refuses a card with no word on it', () => {
    // Everything else is recoverable. A card with no hanzi is not a card.
    expect(normaliseCard({ translation: 'time' }, -1)).toBeNull();
    expect(normaliseCard({ hanzi: '   ' }, -1)).toBeNull();
    expect(normaliseCard(null, -1)).toBeNull();
    expect(normaliseCard('nonsense', -1)).toBeNull();
  });

  it('gives every other field a default', () => {
    const card = normaliseCard({ hanzi: '就' }, -7);

    expect(card).toMatchObject({
      id: -7,
      hanzi: '就',
      pinyin: '',
      hanViet: null,
      translation: '',
      pos: null,
      rating: 0,
      notes: null,
      groupIds: []
    });
    expect(card?.createdAt).toBeTruthy();
  });

  it('clamps a rating that is out of range or the wrong type', () => {
    expect(normaliseCard({ hanzi: '就', rating: 99 }, -1)?.rating).toBe(5);
    expect(normaliseCard({ hanzi: '就', rating: -4 }, -1)?.rating).toBe(0);
    expect(normaliseCard({ hanzi: '就', rating: 'good' }, -1)?.rating).toBe(0);
  });

  it('drops a part of speech that is not in the closed list', () => {
    expect(normaliseCard({ hanzi: '就', pos: 'gerundive' }, -1)?.pos).toBeNull();
    expect(normaliseCard({ hanzi: '就', pos: 'adverb' }, -1)?.pos).toBe('adverb');
  });
});

describe('normaliseCards', () => {
  it('keeps what it can read and drops what it cannot', () => {
    const cards = normaliseCards([{ hanzi: '时间' }, null, { translation: 'no hanzi here' }, { hanzi: '学习' }]);

    expect(cards.map((card) => card.hanzi)).toEqual(['时间', '学习']);
  });

  it('treats anything that is not an array as an empty box', () => {
    for (const stored of [null, undefined, {}, 'nonsense', 42]) {
      expect(normaliseCards(stored)).toEqual([]);
    }
  });
});

describe('normaliseGroups', () => {
  it('replaces a colour that is not a hex colour', () => {
    // This value lands straight in a style binding, so it is checked.
    expect(normaliseGroups([{ id: -1, name: 'HSK 1', colour: 'red' }])[0]?.colour).toBe('#8c7f76');
    expect(normaliseGroups([{ id: -1, name: 'HSK 1', colour: '#2e9153' }])[0]?.colour).toBe('#2e9153');
  });

  it('refuses a group with no name', () => {
    expect(
      normaliseGroups([
        { id: -1, name: '  ' },
        { id: -2, name: 'Verbs' }
      ])
    ).toHaveLength(1);
  });
});
