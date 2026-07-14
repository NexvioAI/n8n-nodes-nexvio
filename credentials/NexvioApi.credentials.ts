import type {
  IAuthenticateGeneric,
  ICredentialTestRequest,
  ICredentialType,
  INodeProperties,
} from "n8n-workflow"
import { nexvioCredentialIcon } from "../shared/nexvio-icon"
import { NEXVIO_DASHBOARD_BASE_URL } from "../shared/oauth-config"

export class NexvioApi implements ICredentialType {
  name = "nexvioApi"

  displayName = "Nexvio API"

  icon = nexvioCredentialIcon

  documentationUrl = "https://www.nexvio.ai/integrations/n8n"

  properties: INodeProperties[] = [
    {
      displayName: "API Key",
      name: "apiKey",
      type: "string",
      typeOptions: {
        password: true,
      },
      default: "",
      description: "Your Nexvio API key (nex_...)",
    },
  ]

  authenticate: IAuthenticateGeneric = {
    type: "generic",
    properties: {
      headers: {
        Authorization: "=Bearer {{$credentials.apiKey}}",
      },
    },
  }

  test: ICredentialTestRequest = {
    request: {
      baseURL: NEXVIO_DASHBOARD_BASE_URL,
      url: "/api/n8n/me",
    },
  }
}
