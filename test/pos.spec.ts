import { describe, expect, it } from 'vitest';
import { PART_OF_SPEECH_LIST, normalisePartOfSpeech } from '../shared/constants/pos';

describe('normalisePartOfSpeech', () => {
  it('passes every value in the closed list straight through', () => {
    for (const value of PART_OF_SPEECH_LIST) {
      expect(normalisePartOfSpeech(value)).toBe(value);
    }
  });

  it('is case and whitespace insensitive, because a model reply is neither', () => {
    expect(normalisePartOfSpeech('  Noun ')).toBe('noun');
    expect(normalisePartOfSpeech('VERB')).toBe('verb');
  });

  it('maps the abbreviations a model reaches for when it ignores the menu', () => {
    expect(normalisePartOfSpeech('n.')).toBe('noun');
    expect(normalisePartOfSpeech('adj')).toBe('adjective');
    expect(normalisePartOfSpeech('measure word')).toBe('measure');
    expect(normalisePartOfSpeech('classifier')).toBe('measure');
    expect(normalisePartOfSpeech('chengyu')).toBe('idiom');
    // Chinese grammar calls these stative verbs, English grammar calls them
    // adjectives, and the interface only has room for one of the two.
    expect(normalisePartOfSpeech('stative verb')).toBe('adjective');
  });

  it('drops anything outside the list rather than storing free text', () => {
    expect(normalisePartOfSpeech('gerundive')).toBeNull();
    expect(normalisePartOfSpeech('a noun, usually')).toBeNull();
    expect(normalisePartOfSpeech('')).toBeNull();
    expect(normalisePartOfSpeech(null)).toBeNull();
    expect(normalisePartOfSpeech(undefined)).toBeNull();
  });
});
