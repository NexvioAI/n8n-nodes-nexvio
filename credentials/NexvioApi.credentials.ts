import type {
  IAuthenticateGeneric,
  ICredentialTestRequest,
  ICredentialType,
  INodeProperties,
} from "n8n-workflow"
import { nexvioDashboardUrlField } from "../shared/credential-fields"
import { nexvioCredentialIcon } from "../shared/nexvio-icon"

export class NexvioApi implements ICredentialType {
  name = "nexvioApi"

  displayName = "Nexvio API"

  icon = nexvioCredentialIcon

  documentationUrl = "https://www.nexvio.ai/integrations/n8n"

  properties: INodeProperties[] = [
    nexvioDashboardUrlField,
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
      baseURL: '={{$credentials.dashboardUrl.replace(/\\/+$/, "")}}',
      url: "/api/n8n/me",
    },
  }
}
