import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { beforeAll, expect, test } from 'vitest';
import { createServer } from '../src/server.js';

const client = new Client({ name: 'test', version: '0' });

beforeAll(async () => {
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([createServer().connect(a), client.connect(b)]);
});

const text = (r: Awaited<ReturnType<Client['callTool']>>) => (r.content as { type: string; text: string }[])[0]!.text;

test('tools/list returns the 6 tools', async () => {
  const { tools } = await client.listTools();
  expect(tools.map((t) => t.name).sort()).toEqual(
    ['bpjs_contributions', 'list_rules', 'payslip', 'pph21_daily', 'pph21_december', 'pph21_monthly'],
  );
});

test('payslip: gaji pokok 10.000.000, K/1, 2025-06', async () => {
  const r = await client.callTool({
    name: 'payslip',
    arguments: { components: [{ label: 'Gaji pokok', amount: 10_000_000, fixed: true }], status: 'K/1', period: '2025-06', jkkClass: 'sangatRendah' },
  });
  expect(r.isError).toBeFalsy();
  const result = JSON.parse(text(r));
  expect(result.pph21.tax).toBe(156810);
  expect(result.takeHome).toBe(9443190);
  expect(result.breakdown.length).toBeGreaterThan(0);
  expect(r.structuredContent).toEqual(result);
});

test('schema-invalid input returns isError', async () => {
  const r = await client.callTool({ name: 'pph21_monthly', arguments: { gross: 1.5, status: 'X/9', period: '2025-6' } });
  expect(r.isError).toBe(true);
});

test('core error (December payslip) returns isError with the message', async () => {
  const r = await client.callTool({
    name: 'payslip',
    arguments: { components: [{ label: 'Gaji pokok', amount: 10_000_000, fixed: true }], status: 'K/1', period: '2025-12', jkkClass: 'sangatRendah' },
  });
  expect(r.isError).toBe(true);
  expect(text(r)).toMatch(/pph21December/);
});

test('list_rules reports effectiveFrom, regulation, verification', async () => {
  const r = await client.callTool({ name: 'list_rules', arguments: {} });
  const { rules } = JSON.parse(text(r));
  expect(rules).toContainEqual({ name: 'terMonthly', effectiveFrom: '2024-01-01', regulation: 'PP 58/2023', verification: 'primary' });
  expect(rules.some((x: { verification: string }) => x.verification === 'secondary')).toBe(true);
});

// Smoke over real stdio against the built bin; skipped until `npm run build` has produced dist/.
const dist = fileURLToPath(new URL('../dist/server.js', import.meta.url));
test.skipIf(!existsSync(dist))('stdio: node dist/server.js answers tools/list', async () => {
  const stdio = new Client({ name: 'smoke', version: '0' });
  await stdio.connect(new StdioClientTransport({ command: process.execPath, args: [dist] }));
  try {
    expect((await stdio.listTools()).tools).toHaveLength(6);
  } finally {
    await stdio.close();
  }
});
