import { describe, it, expect } from 'vitest';
import { resolveModel } from './model';

describe('resolveModel', () => {
  it('returns env default for bare prompt', () => {
    expect(resolveModel('hello', 'claude-sonnet-4-6'))
      .toEqual({ model: 'claude-sonnet-4-6', prompt: 'hello' });
  });

  it.each([
    ['!opus debug this', 'claude-opus-4-7', 'debug this'],
    ['!sonnet hi', 'claude-sonnet-4-6', 'hi'],
    ['!haiku ping', 'claude-haiku-4-5', 'ping'],
    ['!OPUS yo', 'claude-opus-4-7', 'yo'],
  ])('strips %s', (input, model, prompt) => {
    expect(resolveModel(input, 'claude-sonnet-4-6')).toEqual({ model, prompt });
  });

  it('passes through unknown prefix', () => {
    expect(resolveModel('!gpt5 hi', 'claude-sonnet-4-6'))
      .toEqual({ model: 'claude-sonnet-4-6', prompt: '!gpt5 hi' });
  });

  it('handles bare alias with no body', () => {
    expect(resolveModel('!opus', 'claude-sonnet-4-6'))
      .toEqual({ model: 'claude-opus-4-7', prompt: '' });
  });

  it('does not strip when prefix touches a non-space char', () => {
    expect(resolveModel('!opusish thing', 'claude-sonnet-4-6'))
      .toEqual({ model: 'claude-sonnet-4-6', prompt: '!opusish thing' });
  });

  it('strips prefix followed by newline', () => {
    expect(resolveModel('!opus\nmulti\nline', 'claude-sonnet-4-6'))
      .toEqual({ model: 'claude-opus-4-7', prompt: 'multi\nline' });
  });

  it('honors caller-supplied envDefault over module default', () => {
    expect(resolveModel('plain', 'claude-opus-4-7'))
      .toEqual({ model: 'claude-opus-4-7', prompt: 'plain' });
  });
});
