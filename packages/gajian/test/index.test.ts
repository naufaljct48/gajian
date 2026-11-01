import { expect, test } from 'vitest';
import { VERSION } from '../src/index.js';

test('VERSION', () => {
  expect(VERSION).toBe('0.0.0');
});
