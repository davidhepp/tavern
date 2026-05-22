## Hard rules

You MUST follow these rules before making any code changes.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

<!-- BEGIN:package-agent-rules -->

# Package manager

Use `bun` only.

Allowed:

- `bun install`
- `bun add`
- `bun remove`
- `bun run <script>`
- `bunx <command>`

Forbidden:

- `npm`
- `npx`
- `yarn`
- `pnpm`

For one-off CLI commands, use `bunx`, not `npx`.

# Dev server

Do not run the dev server unless explicitly requested.

Forbidden unless explicitly asked:

- `bun dev`
- `bun run dev`
- `next dev`

<!-- END:package-agent-rules -->
