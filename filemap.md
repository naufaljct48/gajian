# filemap

- `CLAUDE.md` — agent rules and commands
- `docs/SPEC.md` — goals, architecture, public API, sources
- `docs/PLAN.md` — task list and status
- `packages/gajian/` — core library (zero deps)
- `packages/gajian/src/rules/` — dated, cited rule data (TER, PTKP, Pasal 17, BPJS)
- `packages/gajian-mcp/` — MCP server over the core
- `skills/gajian/SKILL.md` — Agent Skill
- `package.json` — workspace root, build/test/typecheck scripts
- `tsconfig.base.json` — shared strict NodeNext compiler options
- `vitest.config.ts` — runs `packages/*/test/**/*.test.ts`
- `LICENSE` — MIT
- `packages/gajian/src/index.ts` — core public API entry
- `packages/gajian/test/index.test.ts` — core VERSION test
- `packages/gajian-mcp/src/server.ts` — MCP server entry (bin, placeholder)
- `packages/gajian-mcp/test/server.test.ts` — MCP placeholder test
