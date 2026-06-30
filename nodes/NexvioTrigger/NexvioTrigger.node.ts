import type {
  IDataObject,
  IHookFunctions,
  ILoadOptionsFunctions,
  INodePropertyOptions,
  IWebhookFunctions,
  IWebhookResponseData,
  INodeType,
  INodeTypeDescription,
} from "n8n-workflow"
import { NodeConnectionTypes, NodeOperationError } from "n8n-workflow"
import { formatNexvioRequestError } from "../../shared/nexvio-url"
import { nexvioIcon } from "../../shared/nexvio-icon"
import { nexvioHttpRequest } from "../../shared/nexvio-request"

type HookCreateResponse = {
  id: string
}

type NexvioFormsResponse = {
  forms: Array<{
    id: string
    name: string
    is_enabled?: boolean
  }>
}

export class NexvioTrigger implements INodeType {
  description: INodeTypeDescription = {
    displayName: "Nexvio Trigger",
    name: "nexvioTrigger",
    icon: nexvioIcon,
    group: ["trigger"],
    version: 1,
    description: "Starts the workflow when a new contact, ticket, or form event occurs in Nexvio",
    defaults: {
      name: "Nexvio Trigger",
    },
    usableAsTool: true,
    inputs: [],
    outputs: [NodeConnectionTypes.Main],
    credentials: [
      {
        name: "nexvioOAuth2Api",
        required: true,
        displayOptions: {
          show: {
            authentication: ["oAuth2"],
          },
        },
      },
      {
        name: "nexvioApi",
        required: true,
        displayOptions: {
          show: {
            authentication: ["apiKey"],
          },
        },
      },
    ],
    webhooks: [
      {
        name: "default",
        httpMethod: "POST",
        responseMode: "onReceived",
        path: "webhook",
      },
    ],
    properties: [
      {
        displayName: "Authentication",
        name: "authentication",
        type: "options",
        options: [
          {
            name: "OAuth2 (Recommended)",
            value: "oAuth2",
          },
          {
            name: "API Key",
            value: "apiKey",
          },
        ],
        default: "oAuth2",
      },
      {
        displayName: "Event",
        name: "event",
        type: "options",
        options: [
          {
            name: "New Contact",
            value: "contacts.created",
            description: "Triggers when a new contact is created",
          },
          {
            name: "New Ticket",
            value: "tickets.created",
            description: "Triggers when a new ticket is created",
          },
          {
            name: "New Form Created",
            value: "forms.created",
            description: "Triggers when a new form is created",
          },
          {
            name: "New Form Submission",
            value: "forms.submission.created",
            description: "Triggers when the selected form is submitted",
          },
        ],
        default: "contacts.created",
        required: true,
      },
      {
        displayName: "Form Name or ID",
        name: "formId",
        type: "options",
        required: true,
        typeOptions: {
          loadOptionsMethod: "getForms",
        },
        displayOptions: {
          show: {
            event: ["forms.submission.created"],
          },
        },
        default: "",
        description:
          'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
      },
    ],
  }

  methods = {
    loadOptions: {
      async getForms(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
        try {
          const response = (await nexvioHttpRequest(this, {
            method: "GET",
            url: "/api/n8n/forms",
          })) as NexvioFormsResponse | { error?: string }

          if (response && typeof response === "object" && "error" in response && response.error) {
            throw new NodeOperationError(this.getNode(), response.error)
          }

          const forms = (response as NexvioFormsResponse).forms ?? []

          return forms
            .filter((form) => form.is_enabled !== false)
            .map((form) => ({
              name: form.name,
              value: form.id,
            }))
        } catch (error) {
          throw new NodeOperationError(this.getNode(), formatNexvioRequestError(error))
        }
      },
    },
  }

  webhookMethods = {
    default: {
      async checkExists(this: IHookFunctions): Promise<boolean> {
        const webhookData = this.getWorkflowStaticData("node")
        return webhookData.webhookId !== undefined
      },
      async create(this: IHookFunctions): Promise<boolean> {
        const webhookUrl = this.getNodeWebhookUrl("default")
        const event = this.getNodeParameter("event") as string
        const formId = this.getNodeParameter("formId", "") as string

        const body: IDataObject = {
          hookUrl: webhookUrl,
          event,
        }

        if (event === "forms.submission.created") {
          if (!formId?.trim()) {
            throw new NodeOperationError(this.getNode(), "Form is required for New Form Submission triggers")
          }
          body.formId = formId.trim()
        }

        const response = (await nexvioHttpRequest(this, {
          method: "POST",
          url: "/api/n8n/hooks",
          body,
        })) as HookCreateResponse

        const webhookData = this.getWorkflowStaticData("node")
        webhookData.webhookId = response.id
        return true
      },
      async delete(this: IHookFunctions): Promise<boolean> {
        const webhookData = this.getWorkflowStaticData("node") as {
          webhookId?: string
        }

        if (webhookData.webhookId) {
          await nexvioHttpRequest(this, {
            method: "DELETE",
            url: `/api/n8n/hooks/${webhookData.webhookId}`,
          })

          delete webhookData.webhookId
        }

        return true
      },
    },
  }

  async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
    const bodyData = this.getBodyData() as IDataObject
    return {
      workflowData: [this.helpers.returnJsonArray([bodyData])],
    }
  }
}
