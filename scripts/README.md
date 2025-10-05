# Helper Scripts

These scripts are optional utilities that make it easier to debug the MCP
server locally:

- `list-tools.mjs` – start the MCP server over stdio and print the available
  tool names.
- `list-tools-details.mjs` – same as above, but dumps the full tool metadata.
- `test-persistent-terminal.mjs` – creates a terminal in `test/`, runs a few
  commands (`pwd`, `ls`), inspects stats, and cleans up.

Run them with `node` from the repository root, for example:

```bash
node scripts/list-tools.mjs
```

Each script launches its own MCP server instance, so no additional processes are
required beforehand.
