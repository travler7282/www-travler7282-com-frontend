import { describe, expect, it } from 'vitest';
import { getWindDirectionLabel } from './wind';

describe('getWindDirectionLabel', () => {
  it('maps cardinal and intercardinal angles', () => {
    expect(getWindDirectionLabel(0)).toBe('N');
    expect(getWindDirectionLabel(45)).toBe('NE');
    expect(getWindDirectionLabel(180)).toBe('S');
    expect(getWindDirectionLabel(270)).toBe('W');
  });

  it('wraps around near 360', () => {
    expect(getWindDirectionLabel(359)).toBe('N');
  });
});