import type { INodeProperties } from "n8n-workflow"
import { NEXVIO_DEFAULT_DASHBOARD_URL } from "./constants"

export const nexvioOAuthDashboardUrlField: INodeProperties = {
  displayName: "Dashboard URL",
  name: "dashboardUrl",
  type: "string",
  default: NEXVIO_DEFAULT_DASHBOARD_URL,
  description: "Your Nexvio dashboard base URL (e.g. https://app.nexvio.ai)",
}

export const nexvioDashboardUrlField: INodeProperties = {
  displayName: "Dashboard URL",
  name: "dashboardUrl",
  type: "string",
  default: NEXVIO_DEFAULT_DASHBOARD_URL,
  description: "Your Nexvio dashboard base URL (e.g. https://app.nexvio.ai)",
}

export const nexvioOAuthAuthUrlField: INodeProperties = {
  displayName: "Authorization URL",
  name: "authUrl",
  type: "hidden",
  default: '={{$self["dashboardUrl"].replace(/\\/+$/, "") + "/api/n8n/oauth/authorize"}}',
}

export const nexvioOAuthTokenUrlField: INodeProperties = {
  displayName: "Access Token URL",
  name: "accessTokenUrl",
  type: "hidden",
  default: '={{$self["dashboardUrl"].replace(/\\/+$/, "") + "/api/n8n/oauth/token"}}',
}
