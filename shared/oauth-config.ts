/**
 * Public OAuth client ID for the n8n community node (PKCE — no client secret in the node).
 * Must match N8N_CLIENT_ID in the Nexvio dashboard .env.
 */
export const NEXVIO_OAUTH_CLIENT_ID = "ef0c7ae157f12653775ac6b332254757"

// Single dashboard base URL used by OAuth, API-key verification, and node requests.
export const NEXVIO_DEFAULT_DASHBOARD_URL = "https://app.nexvio.ai/"

export const NEXVIO_DASHBOARD_BASE_URL = NEXVIO_DEFAULT_DASHBOARD_URL.replace(/\/+$/, "")

export const NEXVIO_OAUTH_AUTHORIZATION_URL = `${NEXVIO_DASHBOARD_BASE_URL}/api/n8n/oauth/authorize`

export const NEXVIO_OAUTH_TOKEN_URL = `${NEXVIO_DASHBOARD_BASE_URL}/api/n8n/oauth/token`
