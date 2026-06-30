import type { ICredentialType, INodeProperties } from "n8n-workflow"
import { NEXVIO_OAUTH_SCOPES } from "../shared/constants"
import {
  nexvioOAuthAuthUrlField,
  nexvioOAuthDashboardUrlField,
  nexvioOAuthTokenUrlField,
} from "../shared/credential-fields"
import { NEXVIO_OAUTH_CLIENT_ID } from "../shared/oauth-config"
import { nexvioCredentialIcon } from "../shared/nexvio-icon"

export class NexvioOAuth2Api implements ICredentialType {
  name = "nexvioOAuth2Api"

  extends = ["oAuth2Api"]

  displayName = "Nexvio OAuth2 API"

  icon = nexvioCredentialIcon

  documentationUrl = "https://www.nexvio.ai/integrations/n8n"

  properties: INodeProperties[] = [
    {
      displayName:
        "Click **Connect my account** to sign in with Nexvio. PKCE is used — no client secret. The OAuth redirect URL shown below is accepted automatically by Nexvio.",
      name: "connectNotice",
      type: "notice",
      default: "",
    },
    nexvioOAuthDashboardUrlField,
    {
      displayName: "Client ID",
      name: "clientId",
      type: "hidden",
      default: NEXVIO_OAUTH_CLIENT_ID,
    },
    {
      displayName: "Client Secret",
      name: "clientSecret",
      type: "hidden",
      typeOptions: {
        password: true,
      },
      default: "",
    },
    {
      displayName: "Grant Type",
      name: "grantType",
      type: "hidden",
      default: "pkce",
    },
    nexvioOAuthAuthUrlField,
    nexvioOAuthTokenUrlField,
    {
      displayName: "Auth URI Query Parameters",
      name: "authQueryParameters",
      type: "hidden",
      default: "",
    },
    {
      displayName: "Scope",
      name: "scope",
      type: "hidden",
      default: NEXVIO_OAUTH_SCOPES,
    },
    {
      displayName: "Authentication",
      name: "authentication",
      type: "hidden",
      default: "body",
    },
  ]
}
