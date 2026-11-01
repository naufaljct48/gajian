import { expect, test } from 'vitest';
import { VERSION } from '../src/server.js';

test('re-exports core VERSION', () => {
  expect(VERSION).toBe('0.0.0');
});
