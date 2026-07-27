import type {
  IDataObject,
  IExecuteFunctions,
  ILoadOptionsFunctions,
  INodeExecutionData,
  INodePropertyOptions,
  INodeType,
  INodeTypeDescription,
  ResourceMapperFields,
  ResourceMapperValue,
  JsonObject,
} from "n8n-workflow"
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from "n8n-workflow"
import {
  buildDefaultFieldsForFormType,
  buildFieldsFromBuilder,
  getEnabledFormFields,
  mapFormFieldToResourceMapper,
} from "../../shared/form-fields"
import { buildFormCreateFieldProperties, readFormFieldRows } from "../../shared/form-field-builder-properties"
import { nexvioApiRequest } from "../../shared/nexvio-errors"
import { formatNexvioRequestError } from "../../shared/nexvio-url"
import { nexvioIcon } from "../../shared/nexvio-icon"
import { fetchNexvioFormById, fetchNexvioForms } from "../../shared/nexvio-forms-api"
import { isValidEmail } from "../../shared/validation"

type NexvioAgent = {
  id: string
  name: string
  is_enabled?: boolean
}

type NexvioAgentsResponse = {
  agents: NexvioAgent[]
}

type NexvioMessageResponse = {
  session_id: string
  external_conversation_id: string | null
  is_new_session: boolean
  reply: string
  model: string
  agent_id: string
}

export class Nexvio implements INodeType {
  description: INodeTypeDescription = {
    displayName: "Nexvio",
    name: "nexvio",
    icon: nexvioIcon,
    group: ["output"],
    version: 1,
    subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
    description: "Send messages to Nexvio AI agents and manage contacts, tickets, and forms",
    defaults: {
      name: "Nexvio",
    },
    usableAsTool: true,
    inputs: [NodeConnectionTypes.Main],
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
    properties: [
      {
        displayName: "Authentication",
        name: "authentication",
        type: "options",
        options: [
          {
            name: "API Key",
            value: "apiKey",
          },
          {
            name: "OAuth2 (Recommended)",
            value: "oAuth2",
          },
        ],
        default: "oAuth2",
      },
      {
        displayName: "Resource",
        name: "resource",
        type: "options",
        noDataExpression: true,
        options: [
          {
            name: "Agent",
            value: "agent",
          },
          {
            name: "Contact",
            value: "contact",
          },
          {
            name: "Form",
            value: "form",
          },
          {
            name: "Ticket",
            value: "ticket",
          },
        ],
        default: "agent",
      },
      {
        displayName: "Operation",
        name: "operation",
        type: "options",
        noDataExpression: true,
        displayOptions: {
          show: {
            resource: ["agent"],
          },
        },
        options: [
          {
            name: "Send Message",
            value: "sendMessage",
            description: "Send a message to a pre-configured Nexvio AI agent and get its reply. The agent's AI model, memory, knowledge base, and context are all managed in Nexvio — no AI setup required in n8n.",
            action: "Send a message to a nexvio agent",
          },
        ],
        default: "sendMessage",
      },
      {
        displayName: "Operation",
        name: "operation",
        type: "options",
        noDataExpression: true,
        displayOptions: {
          show: {
            resource: ["contact"],
          },
        },
        options: [
          {
            name: "Create or Update",
            value: "createOrUpdate",
            description: "Create or update a contact by email",
            action: "Create or update a contact",
          },
        ],
        default: "createOrUpdate",
      },
      {
        displayName: "Operation",
        name: "operation",
        type: "options",
        noDataExpression: true,
        displayOptions: {
          show: {
            resource: ["ticket"],
          },
        },
        options: [
          {
            name: "Create",
            value: "create",
            description: "Create a support ticket",
            action: "Create a ticket",
          },
        ],
        default: "create",
      },
      {
        displayName: "Operation",
        name: "operation",
        type: "options",
        noDataExpression: true,
        displayOptions: {
          show: {
            resource: ["form"],
          },
        },
        options: [
          {
            name: "Create",
            value: "create",
            description: "Create a new form",
            action: "Create a form",
          },
          {
            name: "Submit",
            value: "submit",
            description: "Submit data to an existing form",
            action: "Submit a form",
          },
        ],
        default: "create",
      },
      {
        displayName: "Agent Name or ID",
        name: "agentId",
        type: "options",
        required: true,
        typeOptions: {
          loadOptionsMethod: "getAgents",
        },
        displayOptions: {
          show: {
            resource: ["agent"],
            operation: ["sendMessage"],
          },
        },
        default: "",
        description:
          'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
      },
      {
        displayName: "Message",
        name: "message",
        type: "string",
        required: true,
        typeOptions: {
          rows: 4,
        },
        displayOptions: {
          show: {
            resource: ["agent"],
            operation: ["sendMessage"],
          },
        },
        default: "",
        description: "The message to send to the agent",
      },
      {
        displayName: "Additional Fields",
        name: "agentAdditionalFields",
        type: "collection",
        placeholder: "Add Field",
        default: {},
        displayOptions: {
          show: {
            resource: ["agent"],
            operation: ["sendMessage"],
          },
        },
        options: [
          {
            displayName: "External Conversation ID",
            name: "externalConversationId",
            type: "string",
            default: "",
            description:
              "Stable ID for the same chat across messages (e.g. telegram:123456789). Reuse this value to continue the conversation.",
          },
          {
            displayName: "Session ID",
            name: "sessionId",
            type: "string",
            default: "",
            description: "Optional Nexvio session ID from a previous run",
          },
        ],
      },
      {
        displayName: "Start New Session",
        name: "forceNewSession",
        type: "boolean",
        displayOptions: {
          show: {
            resource: ["agent"],
            operation: ["sendMessage"],
          },
        },
        default: false,
        description: "Whether to ignore existing session keys and start a fresh chat",
      },
      {
        displayName: "Email",
        name: "email",
        type: "string",
        placeholder: "jane@example.com",
        required: true,
        displayOptions: {
          show: {
            resource: ["contact"],
            operation: ["createOrUpdate"],
          },
        },
        default: "",
      },
      {
        displayName: "Additional Fields",
        name: "contactAdditionalFields",
        type: "collection",
        placeholder: "Add Field",
        default: {},
        displayOptions: {
          show: {
            resource: ["contact"],
            operation: ["createOrUpdate"],
          },
        },
        options: [
          {
            displayName: "Company",
            name: "companyName",
            type: "string",
            default: "",
          },
          {
            displayName: "First Name",
            name: "firstName",
            type: "string",
            default: "",
          },
          {
            displayName: "Last Name",
            name: "lastName",
            type: "string",
            default: "",
          },
          {
            displayName: "Phone",
            name: "phone",
            type: "string",
            default: "",
          },
          {
            displayName: "Tags",
            name: "tags",
            type: "string",
            default: "",
            description: "Comma-separated tags",
          },
        ],
      },
      {
        displayName: "Subject",
        name: "subject",
        type: "string",
        required: true,
        displayOptions: {
          show: {
            resource: ["ticket"],
            operation: ["create"],
          },
        },
        default: "",
      },
      {
        displayName: "Status",
        name: "status",
        type: "options",
        options: [
          { name: "Closed", value: "closed" },
          { name: "Open", value: "open" },
          { name: "Pending", value: "pending" },
          { name: "Resolved", value: "resolved" },
        ],
        displayOptions: {
          show: {
            resource: ["ticket"],
            operation: ["create"],
          },
        },
        default: "open",
      },
      {
        displayName: "Priority",
        name: "priority",
        type: "options",
        options: [
          { name: "High", value: "high" },
          { name: "Low", value: "low" },
          { name: "Medium", value: "medium" },
          { name: "Urgent", value: "urgent" },
        ],
        displayOptions: {
          show: {
            resource: ["ticket"],
            operation: ["create"],
          },
        },
        default: "medium",
      },
      {
        displayName: "Additional Fields",
        name: "ticketAdditionalFields",
        type: "collection",
        placeholder: "Add Field",
        default: {},
        displayOptions: {
          show: {
            resource: ["ticket"],
            operation: ["create"],
          },
        },
        options: [
          {
            displayName: "Agent Name or ID",
            name: "ticketAgentId",
            type: "options",
            typeOptions: {
              loadOptionsMethod: "getAgents",
            },
            default: "",
            description:
              'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
          },
          {
            displayName: "Description",
            name: "description",
            type: "string",
            typeOptions: {
              rows: 4,
            },
            default: "",
          },
          {
            displayName: "Requester Email",
            name: "requesterEmail",
            type: "string",
            default: "",
          },
          {
            displayName: "Requester Name",
            name: "requesterName",
            type: "string",
            default: "",
          },
        ],
      },
      {
        displayName: "Form Name",
        name: "formName",
        type: "string",
        required: true,
        displayOptions: {
          show: {
            resource: ["form"],
            operation: ["create"],
          },
        },
        default: "",
      },
      {
        displayName: "Additional Fields",
        name: "formAdditionalFields",
        type: "collection",
        placeholder: "Add Field",
        default: {},
        displayOptions: {
          show: {
            resource: ["form"],
            operation: ["create"],
          },
        },
        options: [
          {
            displayName: "Description",
            name: "formDescription",
            type: "string",
            typeOptions: {
              rows: 2,
            },
            default: "",
          },
        ],
      },
      {
        displayName: "Form Type",
        name: "formType",
        type: "options",
        options: [
          { name: "Contact", value: "contact" },
          { name: "Custom", value: "custom" },
          { name: "Feedback", value: "feedback" },
          { name: "Lead", value: "lead" },
          { name: "Survey", value: "survey" },
        ],
        displayOptions: {
          show: {
            resource: ["form"],
            operation: ["create"],
          },
        },
        default: "lead",
        description: "Each form type has its own field list below with starter fields",
      },
      ...buildFormCreateFieldProperties(),
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
            resource: ["form"],
            operation: ["submit"],
          },
        },
        default: "",
        description:
          'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
      },
      {
        displayName: "Submission Input",
        name: "submissionInputMode",
        type: "options",
        options: [
          {
            name: "Form Fields",
            value: "fields",
            description: "Map values to the selected form fields",
          },
          {
            name: "JSON",
            value: "json",
            description: "Provide submission_data as a JSON object",
          },
        ],
        displayOptions: {
          show: {
            resource: ["form"],
            operation: ["submit"],
          },
        },
        default: "fields",
      },
      {
        displayName: "Field Values",
        name: "submissionFields",
        type: "resourceMapper",
        noDataExpression: true,
        required: true,
        typeOptions: {
          loadOptionsDependsOn: ["formId"],
          resourceMapper: {
            resourceMapperMethod: "getFormSubmissionFields",
            mode: "add",
            addAllFields: true,
            fieldWords: {
              singular: "Field",
              plural: "Fields",
            },
            noFieldsError: "Select a form first, then refresh the field list",
          },
        },
        displayOptions: {
          show: {
            resource: ["form"],
            operation: ["submit"],
            submissionInputMode: ["fields"],
          },
        },
        default: {
          mappingMode: "defineBelow",
          value: null,
          matchingColumns: [],
          schema: [],
          attemptToConvertTypes: false,
          convertFieldsToString: false,
        },
        description: "Select a form above, then map a value for each field",
      },
      {
        displayName: "Submission Data (JSON)",
        name: "submissionDataJson",
        type: "json",
        required: true,
        displayOptions: {
          show: {
            resource: ["form"],
            operation: ["submit"],
            submissionInputMode: ["json"],
          },
        },
        default: "{}",
        description: "JSON object with form field IDs as keys and submitted values",
      },
    ],
  }

  methods = {
    loadOptions: {
      async getAgents(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
        try {
          const response = (await nexvioApiRequest(this, {
            method: "GET",
            url: "/api/n8n/agents",
          }, undefined)) as NexvioAgentsResponse | { error?: string }

          if (response && typeof response === "object" && "error" in response && response.error) {
            throw new NodeOperationError(this.getNode(), response.error)
          }

          const agents = (response as NexvioAgentsResponse).agents ?? []

          return agents
            .filter((agent) => agent.is_enabled !== false)
            .sort((left, right) => left.name.localeCompare(right.name))
            .map((agent) => ({
              name: agent.name,
              value: agent.id,
            }))
        } catch (error) {
          throw new NodeOperationError(this.getNode(), formatNexvioRequestError(error))
        }
      },
      async getForms(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
        const forms = await fetchNexvioForms(this)

        return forms
          .filter((form) => form.is_enabled !== false)
          .sort((left, right) => left.name.localeCompare(right.name))
          .map((form) => ({
            name: form.name,
            value: form.id,
          }))
      },
    },
    resourceMapping: {
      async getFormSubmissionFields(this: ILoadOptionsFunctions): Promise<ResourceMapperFields> {
        const formId = this.getNodeParameter("formId", "") as string

        if (!formId?.trim()) {
          return {
            fields: [],
            emptyFieldsNotice: "Select a form first to load its fields",
          }
        }

        const form = await fetchNexvioFormById(this, formId.trim())
        const fields = getEnabledFormFields(form).map(mapFormFieldToResourceMapper)

        if (!fields.length) {
          return {
            fields: [],
            emptyFieldsNotice: "This form has no enabled fields",
          }
        }

        return { fields }
      },
    },
  }

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData()
    const returnData: INodeExecutionData[] = []

    for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
      try {
        const resource = this.getNodeParameter("resource", itemIndex) as string
        const operation = this.getNodeParameter("operation", itemIndex) as string

        if (resource === "agent" && operation === "sendMessage") {
          const agentId = this.getNodeParameter("agentId", itemIndex) as string
          const message = this.getNodeParameter("message", itemIndex) as string
          const agentAdditional = this.getNodeParameter("agentAdditionalFields", itemIndex, {}) as IDataObject
          const externalConversationId = agentAdditional.externalConversationId as string | undefined
          const sessionId = agentAdditional.sessionId as string | undefined
          const forceNewSession = this.getNodeParameter("forceNewSession", itemIndex) as boolean

          const body: IDataObject = {
            agent_id: agentId,
            message,
            force_new_session: forceNewSession,
          }

          if (externalConversationId?.trim()) {
            body.external_conversation_id = externalConversationId.trim()
          }

          if (sessionId?.trim()) {
            body.session_id = sessionId.trim()
          }

          const response = (await nexvioApiRequest(
            this,
            {
              method: "POST",
              url: "/api/n8n/conversations/messages",
              body,
            },
            itemIndex,
          )) as NexvioMessageResponse

          returnData.push({
            json: {
              ...response,
              message,
              agent_id: agentId,
            },
            pairedItem: { item: itemIndex },
          })
          continue
        }

        if (resource === "contact" && operation === "createOrUpdate") {
          const email = this.getNodeParameter("email", itemIndex) as string
          if (!isValidEmail(email)) {
            throw new NodeOperationError(this.getNode(), "Invalid email address", {
              description: `The email address '${email}' in the 'email' field is not valid`,
              itemIndex,
            })
          }

          const contactAdditional = this.getNodeParameter("contactAdditionalFields", itemIndex, {}) as IDataObject
          const firstName = contactAdditional.firstName as string | undefined
          const lastName = contactAdditional.lastName as string | undefined
          const phone = contactAdditional.phone as string | undefined
          const companyName = contactAdditional.companyName as string | undefined
          const tags = contactAdditional.tags as string | undefined

          const body: IDataObject = { email: email.trim() }
          if (firstName?.trim()) body.first_name = firstName.trim()
          if (lastName?.trim()) body.last_name = lastName.trim()
          if (phone?.trim()) body.phone = phone.trim()
          if (companyName?.trim()) body.company_name = companyName.trim()
          if (tags?.trim()) body.tags = tags.split(",").map((tag) => tag.trim()).filter(Boolean)

          const response = await nexvioApiRequest(
            this,
            {
              method: "POST",
              url: "/api/n8n/contacts",
              body,
            },
            itemIndex,
          )

          returnData.push({
            json: response as IDataObject,
            pairedItem: { item: itemIndex },
          })
          continue
        }

        if (resource === "ticket" && operation === "create") {
          const subject = this.getNodeParameter("subject", itemIndex) as string
          const status = this.getNodeParameter("status", itemIndex) as string
          const priority = this.getNodeParameter("priority", itemIndex) as string
          const ticketAdditional = this.getNodeParameter("ticketAdditionalFields", itemIndex, {}) as IDataObject
          const description = ticketAdditional.description as string | undefined
          const requesterName = ticketAdditional.requesterName as string | undefined
          const requesterEmail = ticketAdditional.requesterEmail as string | undefined
          const ticketAgentId = ticketAdditional.ticketAgentId as string | undefined

          const body: IDataObject = {
            subject,
            status,
            priority,
          }

          if (description?.trim()) body.description = description.trim()
          if (requesterName?.trim()) body.requester_name = requesterName.trim()
          if (requesterEmail?.trim()) body.requester_email = requesterEmail.trim()
          if (ticketAgentId?.trim()) body.agent_id = ticketAgentId.trim()

          const response = await nexvioApiRequest(
            this,
            {
              method: "POST",
              url: "/api/n8n/tickets",
              body,
            },
            itemIndex,
          )

          returnData.push({
            json: response as IDataObject,
            pairedItem: { item: itemIndex },
          })
          continue
        }

        if (resource === "form" && operation === "create") {
          const formName = this.getNodeParameter("formName", itemIndex) as string
          const formType = this.getNodeParameter("formType", itemIndex) as string
          const formAdditional = this.getNodeParameter("formAdditionalFields", itemIndex, {}) as IDataObject
          const formDescription = formAdditional.formDescription as string | undefined
          const rows = readFormFieldRows((name, index) => this.getNodeParameter(name, index), itemIndex, formType)

          const fields =
            rows.length > 0
              ? (buildFieldsFromBuilder(rows) as unknown as IDataObject[])
              : (buildDefaultFieldsForFormType(formType) as unknown as IDataObject[])

          const body: IDataObject = {
            name: formName,
            form_type: formType,
            fields,
          }

          if (formDescription?.trim()) {
            body.description = formDescription.trim()
          }

          const response = await nexvioApiRequest(
            this,
            {
              method: "POST",
              url: "/api/n8n/forms",
              body,
            },
            itemIndex,
          )

          returnData.push({
            json: response as IDataObject,
            pairedItem: { item: itemIndex },
          })
          continue
        }

        if (resource === "form" && operation === "submit") {
          const formId = this.getNodeParameter("formId", itemIndex) as string
          const submissionInputMode = this.getNodeParameter("submissionInputMode", itemIndex) as string

          let submissionData: IDataObject

          if (submissionInputMode === "json") {
            submissionData = this.getNodeParameter("submissionDataJson", itemIndex) as IDataObject
          } else {
            const submissionFields = this.getNodeParameter("submissionFields", itemIndex) as ResourceMapperValue
            submissionData = (submissionFields?.value ?? {}) as IDataObject
          }

          const body: IDataObject = {
            form_id: formId,
            submission_data: submissionData,
          }

          const response = await nexvioApiRequest(
            this,
            {
              method: "POST",
              url: "/api/n8n/forms/submissions",
              body,
            },
            itemIndex,
          )

          returnData.push({
            json: response as IDataObject,
            pairedItem: { item: itemIndex },
          })
        }
      } catch (error) {
        if (this.continueOnFail()) {
          const message = error instanceof Error ? error.message : formatNexvioRequestError(error)
          returnData.push({
            json: { error: message },
            pairedItem: { item: itemIndex },
          })
          continue
        }

        throw new NodeApiError(this.getNode(), error as JsonObject, {
          message: formatNexvioRequestError(error),
          itemIndex,
        })
      }
    }

    return [returnData]
  }
}
