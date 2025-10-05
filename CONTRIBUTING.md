# Contributing Guide

Thanks for your interest in improving Persistent Terminal MCP Server! This
project follows a light-weight process so contributions remain easy to make and
review.

## Project Setup
1. Fork and clone the repository.
2. Install dependencies with `npm install`.
3. Build once to generate `dist/`: `npm run build`.
4. Run the TypeScript sources during development with `npm run dev` or
   `npm run dev:rest`.

## Testing Checklist
- `npm run test:tools` exercises all MCP tools end-to-end.
- `npm run test:fixes` validates recent bug/regression scenarios.
- Feel free to add Jest test cases under `src/__tests__/`.

## Coding Guidelines
- TypeScript, strict mode, ES Modules.
- Keep functions small and add comments only when behaviour is non-obvious.
- Prefer `async`/`await` over raw promise chains.
- Validate all external input with `zod` schemas.

## Commit & PR Process
1. Format commit messages using the conventional style (e.g. `feat:`, `fix:`,
   `docs:`) when possible.
2. Reference related issues or discussions in the PR description.
3. Include screenshots or terminal output for UI/CLI facing changes when they
   help reviewers understand the impact.
4. Ensure `npm run build` finishes cleanly; delete any generated artefacts or
   temporary files before submitting a PR.

## Communication
Questions, feature ideas, or bug reports are always welcome in the GitHub issue
tracker. For larger proposals, open an issue first so we can agree on the
approach before you start coding.

Happy hacking!
