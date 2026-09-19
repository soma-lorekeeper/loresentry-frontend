<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Pencil

For Pencil or UI design requests, use the Pencil MCP running in this project's Dev Container, or the Pencil desktop app (`open -a /Applications/Pen.app docs/design/lorekeeper.pen`) with its MCP. `.pen` files are encrypted: read them only through Pencil, never with plain file reads. Check the official Pencil documentation before editing `.pen` files; do not guess unsupported behavior.

Design tokens come from `lorekeeper.lib.pen` variables: sync them with `node scripts/sync-pencil.mjs`, then run `pnpm tokens`. Never edit `src/design-system/tokens/tokens.css` or `tokens.ts` by hand.
