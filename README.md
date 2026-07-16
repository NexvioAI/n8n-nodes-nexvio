# n8n-nodes-nexvio

Community n8n node for [Nexvio](https://nexvio.ai) — AI agents, contacts, tickets, forms, and automation triggers.

**Integration guide:** [nexvio.ai/integrations/n8n](https://www.nexvio.ai/integrations/n8n)

## Installation

### n8n Community Nodes (recommended)

In n8n go to **Settings → Community Nodes** and install:

```
n8n-nodes-nexvio
```

### Local development

```bash
npm ci
npm run build
npm run dev
```

Requires Node **≥ 22.22**. Optional `.env` overrides: `NEXVIO_OAUTH_CLIENT_ID`, `N8N_PORT` (default `5680`).

```bash
npm test
```

## Credentials

### Nexvio OAuth2 API (recommended)

1. Add a **Nexvio OAuth2 API** credential in n8n.
2. Click **Connect my account** and approve access.
3. Your Nexvio operator must allowlist the n8n redirect URL (`N8N_OAUTH_REDIRECT_ALLOWLIST` on the dashboard), or use n8n Cloud (`*.app.n8n.cloud`).

OAuth and API calls use `https://app.nexvio.ai` from `shared/oauth-config.ts` (no Dashboard URL field in the credential UI).

### Nexvio API (API key)

1. Add a **Nexvio API** credential.
2. Enter your team API key (`nex_...`).
3. Use **Test** to verify against `GET /api/n8n/me`.

## Nodes

### Nexvio (actions)

| Resource | Operation | Required fields | Optional fields |
|----------|-----------|-----------------|-----------------|
| Agent | Send Message | Agent, Message | External Conversation ID, Session ID, Start New Session |
| Contact | Create or Update | Email | First Name, Last Name, Phone, Company, Tags |
| Ticket | Create | Subject | Status, Priority, Description, Requester, Agent |
| Form | Create | Form Name, Form Type, Form Fields | Description |
| Form | Submit | Form, Field Values or JSON | — |

Use a stable **External Conversation ID** on agent messages to keep chat sessions across workflow runs.

### Nexvio Trigger

| Trigger On | When it fires |
|------------|----------------|
| New Contact | `contacts.created` |
| New Ticket | `tickets.created` |
| New Form Created | `forms.created` |
| New Form Submission | `forms.submission.created` (requires Form) |

Webhook payloads use the Nexvio event envelope:

```json
{
  "eventId": "uuid",
  "eventType": "contacts.created",
  "occurredAt": "2026-01-01T00:00:00.000Z",
  "teamId": "team_uuid",
  "agentId": null,
  "source": "dashboard",
  "version": "2026-01-01",
  "payload": { }
}
```

Trigger output also includes `_webhookHeaders` with `x-nexvio-event-id`, `x-nexvio-signature`, and related delivery headers.

## Example workflows

### Send a message to an AI agent

1. Add **Nexvio** → Resource **Agent** → **Send Message**.
2. Select an agent and enter the user message.
3. Set **External Conversation ID** (e.g. `telegram:12345`) under **Additional Fields** for session continuity.
4. Use `$json.reply` in the next node.

### Create a contact from a form webhook

1. **Nexvio Trigger** → **Trigger On: New Form Submission**.
2. **Nexvio** → **Contact / Create or Update** with `$json.payload.submission_data.email`.

### Ticket on new contact

1. **Nexvio Trigger** → **Trigger On: New Contact**.
2. **Nexvio** → **Ticket / Create** with subject from `$json.payload.first_name`.

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start n8n with this node loaded |
| `npm run build` | Compile to `dist/` |
| `npm run lint` | Lint with n8n community rules |
| `npm test` | Run unit tests |
| `npm run release` | Bump version, tag locally, and publish from GitHub Actions |

## Publishing

n8n Creator Portal verification requires npm packages to be published from GitHub Actions with provenance.

One-time npm setup:

1. Open the package settings on npm.
2. Add a Trusted Publisher for repository `NexvioAI/n8n-nodes-nexvio`.
3. Use workflow filename `publish.yml`.

Release flow:

1. Run `npm run release` locally.
2. Push the generated tag.
3. GitHub Actions runs `.github/workflows/publish.yml`, builds the package, and publishes to npm with provenance.
4. Submit the npm package in the n8n Creator Portal for verification.

Do not republish `0.1.0`; npm versions are immutable. Publish the next version to replace the broken npm tarball that was created without `dist`.

## Repository

- [github.com/NexvioAI/n8n-nodes-nexvio](https://github.com/NexvioAI/n8n-nodes-nexvio)

## License

MIT
