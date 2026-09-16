/**
 * Folds tone marked pinyin down to the letters someone actually types.
 *
 * `shí jiān` becomes `shijian`, so typing `shijian` finds it. This is the same
 * job `deriveCardFields` does on the server through pinyin-pro, but it has to
 * exist here too: a signed out card never reaches the server, and local storage
 * would otherwise hold a search column the server would never have written.
 *
 * The naive version, lowercase and drop everything outside a-z, is wrong and
 * was shipped once: it deletes accented vowels outright rather than folding
 * them, so `xué xí` came out as `xux` and no amount of typing `xuexi` would
 * find 学习. Decomposing first is what makes the accent separable from the
 * letter underneath it.
 */
export function tonelessPinyin(pinyin: string): string {
  return (
    pinyin
      // ü is a letter in its own right here, not a u wearing an accent, and the
      // convention when typing is to write it v. Mapped before decomposition,
      // which would otherwise strip the diaeresis and leave a bare u.
      .replace(/[üǖǘǚǜ]/gi, 'v')
      // Separates each vowel from its tone mark, so the mark can be dropped
      // without taking the vowel with it.
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z]/g, '')
  );
}

/** Characters, not bytes: 时间 is two, and so is what the column stores. */
export function countSyllables(hanzi: string): number {
  return [...hanzi].filter((character) => /\p{Script=Han}/u.test(character)).length;
}
