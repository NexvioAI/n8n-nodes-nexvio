# n8n-nodes-nexvio

Community n8n node for [Nexvio](https://nexvio.ai) agents, contacts, tickets, forms, and automation triggers.

Full setup guide: [Nexvio n8n integration](https://docs.nexvio.ai/developer-guides/n8n-integration)

## Installation

> **Not on npm yet.** Clone this repo and use `npm run dev`, or install from the Nexvio monorepo submodule at `apps-vendor/n8n-nodes-nexvio`.

When published, install from n8n → **Settings → Community Nodes** → `n8n-nodes-nexvio`.

## Setup (development)

1. Install dependencies: `npm ci`
2. Build: `npm run build`
3. Optional: copy `.env.example` → `.env` and set `NEXVIO_OAUTH_CLIENT_ID` for local OAuth dev
4. Local dev with n8n: `npm run dev`

Requires Node **≥ 22.22** (see `.nvmrc`).

## Credentials

### Nexvio OAuth2 API (recommended)

- **Dashboard URL** — default `https://app.nexvio.ai` (change for self-hosted dashboard)
- **Client ID** — same value as `N8N_CLIENT_ID` in your Nexvio dashboard `.env`
- PKCE is used; no client secret in the node

### Nexvio API (API key)

- **Dashboard URL** — e.g. `https://app.nexvio.ai`
- **API Key** — team API key (`nex_...`)

Credential test calls `GET /api/n8n/me`.

## Nodes

### Nexvio (Action)

| Resource | Operation | API |
|----------|-----------|-----|
| Agent | Send Message | `POST /api/n8n/conversations/messages` |
| Contact | Create or Update | `POST /api/n8n/contacts` |
| Ticket | Create | `POST /api/n8n/tickets` |
| Form | Create | `POST /api/n8n/forms` |
| Form | Submit | `POST /api/n8n/forms/submissions` |

**Form → Create** — pick a form type; each type has its own editable field list (Label, Type, Placeholder, Required).

**Form → Submit** — select a form, then map values in **Field Values** (loads fields from the API) or use JSON mode.

**Send Message** — pass a stable **External Conversation ID** so Nexvio reuses the same chat session.

### Nexvio Trigger

| Event | When it fires |
|-------|----------------|
| New Contact | `contacts.created` |
| New Ticket | `tickets.created` |
| New Form Created | `forms.created` |
| New Form Submission | `forms.submission.created` |

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start n8n with this node loaded |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run lint` | Lint the package |

## Repository

Standalone repo: [github.com/NexvioAI/n8n-nodes-nexvio](https://github.com/NexvioAI/n8n-nodes-nexvio)

Also vendored as a git submodule in the [Nexvio monorepo](https://github.com/NexvioAI/nexvio-widget) at `apps-vendor/n8n-nodes-nexvio`.

## License

MIT
