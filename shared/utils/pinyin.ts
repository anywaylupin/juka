/**
 * Folds tone marked pinyin down to the letters someone actually types.
 *
 * `shí jiān` becomes `shijian`, so typing `shijian` finds it.
 * This is the same job `deriveCardFields` does on the server through pinyin-pro, but it has to exist here too: a signed out card never reaches the server, and local storage would otherwise hold a search column the server would never have written.
 *
 * The naive version, lowercase and drop everything outside a-z, is wrong and was shipped once: it deletes accented vowels outright rather than folding them, so `xué xí` came out as `xux` and no amount of typing `xuexi` would find 学习.
 * Decomposing first is what makes the accent separable from the letter underneath it.
 */
export function tonelessPinyin(pinyin: string): string {
  return (
    pinyin
      // ü is a letter in its own right here, not a u wearing an accent, and the convention when typing is to write it v.
      // Mapped before decomposition, which would otherwise strip the diaeresis and leave a bare u.
      .replaceAll(/[üǖǘǚǜ]/gi, 'v')
      // Separates each vowel from its tone mark, so the mark can be dropped without taking the vowel with it.
      .normalize('NFD')
      .replaceAll(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replaceAll(/[^a-z]/g, '')
  );
}

/** Characters, not bytes: 时间 is two, and so is what the column stores. */
export function countSyllables(hanzi: string): number {
  return [...hanzi].filter((character) => /\p{Script=Han}/u.test(character)).length;
}

/** The combining mark each tone leaves after Unicode decomposition. */
const TONE_MARKS: Record<string, 1 | 2 | 3 | 4> = { '̄': 1, '́': 2, '̌': 3, '̀': 4 };

/**
 * The tone of each syllable in a marked reading, 5 for the neutral tone.
 *
 * Read from the marks rather than looked up, so it agrees with whatever reading the card shows.
 * One entry per space separated syllable, which lines up with the characters for the readings the dictionary writes.
 */
export function tonesOf(pinyin: string): Array<1 | 2 | 3 | 4 | 5> {
  return pinyin
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((syllable) => {
      for (const mark of syllable.normalize('NFD')) {
        const tone = TONE_MARKS[mark];
        if (tone) {
          return tone;
        }
      }
      return 5;
    });
}
