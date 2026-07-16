import type {
  IDataObject,
  IHookFunctions,
  ILoadOptionsFunctions,
  INodePropertyOptions,
  IWebhookFunctions,
  IWebhookResponseData,
  INodeType,
  INodeTypeDescription,
  JsonObject,
} from "n8n-workflow"
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from "n8n-workflow"
import { nexvioApiRequest } from "../../shared/nexvio-errors"
import { fetchNexvioForms } from "../../shared/nexvio-forms-api"
import { formatNexvioRequestError } from "../../shared/nexvio-url"
import { nexvioIcon } from "../../shared/nexvio-icon"
import { buildNexvioTriggerItem } from "../../shared/nexvio-trigger-payload"

type HookCreateResponse = {
  id: string
}

type NexvioHooksResponse = {
  hooks: Array<{
    id: string
    url: string
    event: string
    formId?: string | null
  }>
}

export class NexvioTrigger implements INodeType {
  description: INodeTypeDescription = {
    displayName: "Nexvio Trigger",
    name: "nexvioTrigger",
    icon: nexvioIcon,
    group: ["trigger"],
    version: 1,
    subtitle: '={{$parameter["event"]}}',
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
        displayName: "Trigger On",
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
          const forms = await fetchNexvioForms(this)

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
        const webhookUrl = this.getNodeWebhookUrl("default")
        const event = this.getNodeParameter("event") as string
        const formId = (this.getNodeParameter("formId", "") as string)?.trim()

        const response = (await nexvioApiRequest(this, {
          method: "GET",
          url: "/api/n8n/hooks",
        })) as NexvioHooksResponse

        const match = (response.hooks ?? []).find((hook) => {
          if (hook.url !== webhookUrl || hook.event !== event) {
            return false
          }
          if (event === "forms.submission.created" && formId) {
            return hook.formId === formId
          }
          return true
        })

        if (!match) {
          return false
        }

        const webhookData = this.getWorkflowStaticData("node")
        webhookData.webhookId = match.id
        return true
      },
      async create(this: IHookFunctions): Promise<boolean> {
        const webhookData = this.getWorkflowStaticData("node")
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

        try {
          const response = (await nexvioApiRequest(this, {
            method: "POST",
            url: "/api/n8n/hooks",
            body,
          })) as HookCreateResponse

          webhookData.webhookId = response.id
          return true
        } catch (error) {
          delete webhookData.webhookId
          throw error
        }
      },
      async delete(this: IHookFunctions): Promise<boolean> {
        const webhookData = this.getWorkflowStaticData("node") as {
          webhookId?: string
        }

        if (!webhookData.webhookId) {
          return true
        }

        try {
          await nexvioApiRequest(this, {
            method: "DELETE",
            url: `/api/n8n/hooks/${webhookData.webhookId}`,
          })
        } catch (error) {
          const statusCode =
            error && typeof error === "object" && "httpCode" in error
              ? Number((error as { httpCode?: string | number }).httpCode)
              : undefined

          if (statusCode !== 404) {
            throw new NodeApiError(this.getNode(), error as JsonObject, {
              message: formatNexvioRequestError(error),
            })
          }
        }

        delete webhookData.webhookId
        return true
      },
    },
  }

  async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
    const bodyData = this.getBodyData() as IDataObject
    const headers = this.getHeaderData() as IDataObject

    return {
      workflowData: [this.helpers.returnJsonArray([buildNexvioTriggerItem(bodyData, headers)])],
    }
  }
}
