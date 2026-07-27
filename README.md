# n8n-nodes-nexvio

n8n community node for [Nexvio](https://nexvio.ai) — connect your Nexvio AI agents, contacts, tickets, and forms to any n8n workflow.

**Integration guide:** [nexvio.ai/integrations/n8n](https://www.nexvio.ai/integrations/n8n)

## What is Nexvio?

Nexvio is a platform for building and deploying AI-powered customer-facing agents. Each agent is fully configured in Nexvio — including its AI model, knowledge base, memory, tools, and brand context. This node lets you interact with those agents and manage your Nexvio data directly from n8n workflows, without any AI setup required on the n8n side.

## Agent resource and n8n AI nodes

The **Agent → Send Message** operation calls an externally managed Nexvio agent through the Nexvio API. n8n acts as a client that sends a message and receives the agent reply.

This package does not provide models, memory, tools, or agent runtime behavior to n8n's AI Agent framework, so it does not use `@n8n/ai-node-sdk`. Actions are handled by the **Nexvio** node, while event-based workflows are handled separately by **Nexvio Trigger**.

## Installation

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

### OAuth2 (Recommended)

1. Add a **Nexvio OAuth2 API** credential in n8n.
2. Click **Connect my account** and approve access.
3. Your Nexvio operator must allowlist the n8n redirect URL (`N8N_OAUTH_REDIRECT_ALLOWLIST` on the dashboard), or use n8n Cloud (`*.app.n8n.cloud`).

### API Key

1. Add a **Nexvio API** credential.
2. Enter your team API key (`nex_...`).
3. Click **Test** to verify the connection.

## Nodes

### Nexvio

Use this node to take actions in Nexvio from your workflows.

| Resource | Operation | Description |
|----------|-----------|-------------|
| Agent | Send Message | Send a message to a pre-configured Nexvio AI agent and get its reply. |
| Contact | Create or Update | Create a new contact or update an existing one by email |
| Ticket | Create | Create a support ticket |
| Form | Create | Create a new form with custom fields |
| Form | Submit | Submit data to an existing form |

> **About the Agent resource:** Nexvio agents are pre-configured on the Nexvio platform with their own AI model, memory, knowledge base, tools, and brand context. The Send Message operation simply sends a message to one of your agents and returns its reply — no AI configuration is needed in n8n.

**Key fields for Agent → Send Message:**

- **Agent** — select which Nexvio agent to talk to
- **Message** — the message to send
- **External Conversation ID** *(optional)* — a stable ID (e.g. `telegram:12345`) to maintain the same conversation across multiple workflow runs
- **Session ID** *(optional)* — resume a specific Nexvio session
- **Start New Session** — force a fresh conversation, ignoring any existing session

The response includes `$json.reply` (the agent's reply), `$json.session_id`, and `$json.agent_id`.

### Nexvio Trigger

Use this node to start a workflow when something happens in Nexvio.

| Event | Fires when |
|-------|------------|
| New Contact | A contact is created |
| New Ticket | A ticket is created |
| New Form Created | A form is created |
| New Form Submission | A form receives a submission |

Webhook payloads follow the Nexvio event envelope:

```json
{
  "eventId": "uuid",
  "eventType": "contacts.created",
  "occurredAt": "2026-01-01T00:00:00.000Z",
  "teamId": "team_uuid",
  "payload": {}
}
```

The trigger output also includes `_webhookHeaders` with `x-nexvio-event-id`, `x-nexvio-signature`, and related delivery metadata.

## Example workflows

### Chat with a Nexvio AI agent

1. Add a trigger (e.g. **Webhook** or **Telegram Trigger**).
2. Add **Nexvio** → Resource **Agent** → **Send Message**.
3. Select your agent and map the incoming message to the **Message** field.
4. Set **External Conversation ID** to a stable user identifier (e.g. `telegram:{{ $json.message.from.id }}`) to maintain conversation history.
5. Use `$json.reply` in the next node to send the response back to the user.

### Create a contact from a form submission

1. **Nexvio Trigger** → **Trigger On: New Form Submission**.
2. **Nexvio** → **Contact / Create or Update** with `$json.payload.submission_data.email`.

### Auto-create a ticket when a new contact signs up

1. **Nexvio Trigger** → **Trigger On: New Contact**.
2. **Nexvio** → **Ticket / Create** with subject referencing `$json.payload.first_name`.

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start n8n with this node loaded |
| `npm run build` | Compile to `dist/` |
| `npm run lint` | Lint with n8n community rules |
| `npm test` | Run unit tests |
| `npm run release` | Bump version, tag, and publish via GitHub Actions |

## Publishing

n8n Creator Portal verification requires packages to be published from GitHub Actions with provenance.

One-time npm setup:

1. Open the package settings on npm.
2. Add a Trusted Publisher for repository `NexvioAI/n8n-nodes-nexvio`.
3. Use workflow filename `publish.yml`.

Release flow:

1. Run `npm run release` locally.
2. Push the generated tag.
3. GitHub Actions runs `.github/workflows/publish.yml`, builds and publishes to npm with provenance.
4. Submit the npm package in the n8n Creator Portal for verification.

## Repository

[github.com/NexvioAI/n8n-nodes-nexvio](https://github.com/NexvioAI/n8n-nodes-nexvio)

## License

MIT
