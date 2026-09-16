import { describe, expect, it } from 'vitest';
import { countSyllables, tonelessPinyin } from '../shared/utils/pinyin';

describe('tonelessPinyin', () => {
  it('folds tone marks down to the letters someone types', () => {
    expect(tonelessPinyin('shí jiān')).toBe('shijian');
    expect(tonelessPinyin('xué xí')).toBe('xuexi');
    expect(tonelessPinyin('péng you')).toBe('pengyou');
    expect(tonelessPinyin('tú shū guǎn')).toBe('tushuguan');
  });

  it('does not delete the vowel along with its accent', () => {
    /*
     * The regression this exists for: lowercasing and dropping everything
     * outside a-z removes an accented vowel outright, so xué xí came out as
     * xux and typing xuexi found nothing.
     */
    for (const vowel of [
      'ā',
      'á',
      'ǎ',
      'à',
      'ē',
      'é',
      'ě',
      'è',
      'ī',
      'í',
      'ǐ',
      'ì',
      'ō',
      'ó',
      'ǒ',
      'ò',
      'ū',
      'ú',
      'ǔ',
      'ù'
    ]) {
      expect(tonelessPinyin(vowel)).toHaveLength(1);
    }
  });

  it('writes u-umlaut as v, the way it is typed', () => {
    expect(tonelessPinyin('nǚ')).toBe('nv');
    expect(tonelessPinyin('lǜ')).toBe('lv');
    expect(tonelessPinyin('ü')).toBe('v');
  });

  it('drops spaces, punctuation and case', () => {
    expect(tonelessPinyin('  Shí  Jiān  ')).toBe('shijian');
    expect(tonelessPinyin("r'ér")).toBe('rer');
  });

  it('returns an empty string rather than failing on nothing', () => {
    expect(tonelessPinyin('')).toBe('');
    expect(tonelessPinyin('   ')).toBe('');
  });
});

describe('countSyllables', () => {
  it('counts Han characters only', () => {
    expect(countSyllables('时间')).toBe(2);
    expect(countSyllables('图书馆')).toBe(3);
    expect(countSyllables('就')).toBe(1);
  });

  it('ignores anything that is not a Han character', () => {
    expect(countSyllables('时间 (time)')).toBe(2);
    expect(countSyllables('abc')).toBe(0);
  });
});
