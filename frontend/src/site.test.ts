import { describe, expect, it } from 'vitest';
import { stripTrailingSlash } from './site';

describe('stripTrailingSlash', () => {
  it('removes one or more trailing slashes', () => {
    expect(stripTrailingSlash('https://example.com///')).toBe('https://example.com');
  });

  it('does not alter urls without trailing slash', () => {
    expect(stripTrailingSlash('https://example.com/path')).toBe('https://example.com/path');
  });
});