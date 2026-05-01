import { describe, expect, it } from 'vitest';
import { clampGlobalPosition } from './App';

describe('clampGlobalPosition', () => {
  it('clamps to lower bound', () => {
    expect(clampGlobalPosition(-20)).toBe(0);
  });

  it('clamps to upper bound', () => {
    expect(clampGlobalPosition(3025)).toBe(3000);
  });

  it('rounds to nearest integer while preserving range', () => {
    expect(clampGlobalPosition(1499.6)).toBe(1500);
  });
});