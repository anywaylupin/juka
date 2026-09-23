import { describe, expect, it } from 'vitest';
import { PART_OF_SPEECH_LIST, normalizePartOfSpeech } from '../shared/constants/pos';

describe('normalizePartOfSpeech', () => {
  it('passes every value in the closed list straight through', () => {
    for (const value of PART_OF_SPEECH_LIST) {
      expect(normalizePartOfSpeech(value)).toBe(value);
    }
  });

  it('is case and whitespace insensitive, because a model reply is neither', () => {
    expect(normalizePartOfSpeech('  Noun ')).toBe('noun');
    expect(normalizePartOfSpeech('VERB')).toBe('verb');
  });

  it('maps the abbreviations a model reaches for when it ignores the menu', () => {
    expect(normalizePartOfSpeech('n.')).toBe('noun');
    expect(normalizePartOfSpeech('adj')).toBe('adjective');
    expect(normalizePartOfSpeech('measure word')).toBe('measure');
    expect(normalizePartOfSpeech('classifier')).toBe('measure');
    expect(normalizePartOfSpeech('chengyu')).toBe('idiom');
    // Chinese grammar calls these stative verbs, English grammar calls them adjectives, and the interface only has room for one of the two.
    expect(normalizePartOfSpeech('stative verb')).toBe('adjective');
  });

  it('drops anything outside the list rather than storing free text', () => {
    expect(normalizePartOfSpeech('gerundive')).toBeNull();
    expect(normalizePartOfSpeech('a noun, usually')).toBeNull();
    expect(normalizePartOfSpeech('')).toBeNull();
    expect(normalizePartOfSpeech(null)).toBeNull();
    expect(normalizePartOfSpeech(undefined)).toBeNull();
  });
});
