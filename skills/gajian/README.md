# gajian Agent Skill

Teaches an agent to get Indonesian PPh 21 / BPJS / payslip numbers from `gajian` instead of guessing.

Install: copy this `gajian` folder to `~/.claude/skills/` (all projects) or to `<project>/.claude/skills/` (one project). Other agents that read `SKILL.md` folders (Codex, Cursor) take the same folder in their skills directory.

For the tools themselves, also connect the MCP server: `claude mcp add gajian -- npx -y gajian-mcp`. Without it the skill falls back to `npx -y -p gajian node ...`.
