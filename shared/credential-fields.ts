import type { INodeProperties } from "n8n-workflow"
import { NEXVIO_OAUTH_AUTHORIZATION_URL, NEXVIO_OAUTH_TOKEN_URL } from "./oauth-config"

export const nexvioOAuthAuthUrlField: INodeProperties = {
  displayName: "Authorization URL",
  name: "authUrl",
  type: "hidden",
  default: NEXVIO_OAUTH_AUTHORIZATION_URL,
}

export const nexvioOAuthTokenUrlField: INodeProperties = {
  displayName: "Access Token URL",
  name: "accessTokenUrl",
  type: "hidden",
  default: NEXVIO_OAUTH_TOKEN_URL,
}
