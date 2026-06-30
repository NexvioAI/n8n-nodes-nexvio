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
} from "n8n-workflow"
import { NodeConnectionTypes, NodeOperationError } from "n8n-workflow"
import {
  buildDefaultFieldsForFormType,
  buildFieldsFromBuilder,
  getEnabledFormFields,
  mapFormFieldToResourceMapper,
} from "../../shared/form-fields"
import { buildFormCreateFieldProperties, readFormFieldRows } from "../../shared/form-field-builder-properties"
import { formatNexvioRequestError } from "../../shared/nexvio-url"
import { nexvioIcon } from "../../shared/nexvio-icon"
import { fetchNexvioFormById, fetchNexvioForms } from "../../shared/nexvio-forms-api"
import { nexvioHttpRequest } from "../../shared/nexvio-request"

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
    group: ["transform"],
    version: 1,
    subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
    description: "Send messages to Nexvio agents, manage contacts, tickets, and forms",
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
            name: "Ticket",
            value: "ticket",
          },
          {
            name: "Form",
            value: "form",
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
            description: "Send a message to the selected agent and get the AI reply",
            action: 'Send message to a nexvio agent',
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
        displayName: "External Conversation ID",
        name: "externalConversationId",
        type: "string",
        displayOptions: {
          show: {
            resource: ["agent"],
            operation: ["sendMessage"],
          },
        },
        default: "",
        description:
          "Stable ID for the same chat across messages (e.g. telegram:123456789). Reuse this value to continue the conversation.",
      },
      {
        displayName: "Session ID",
        name: "sessionId",
        type: "string",
        displayOptions: {
          show: {
            resource: ["agent"],
            operation: ["sendMessage"],
          },
        },
        default: "",
        description: "Optional Nexvio session ID from a previous run",
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
        displayName: "First Name",
        name: "firstName",
        type: "string",
        displayOptions: {
          show: {
            resource: ["contact"],
            operation: ["createOrUpdate"],
          },
        },
        default: "",
      },
      {
        displayName: "Last Name",
        name: "lastName",
        type: "string",
        displayOptions: {
          show: {
            resource: ["contact"],
            operation: ["createOrUpdate"],
          },
        },
        default: "",
      },
      {
        displayName: "Phone",
        name: "phone",
        type: "string",
        displayOptions: {
          show: {
            resource: ["contact"],
            operation: ["createOrUpdate"],
          },
        },
        default: "",
      },
      {
        displayName: "Company",
        name: "companyName",
        type: "string",
        displayOptions: {
          show: {
            resource: ["contact"],
            operation: ["createOrUpdate"],
          },
        },
        default: "",
      },
      {
        displayName: "Tags",
        name: "tags",
        type: "string",
        displayOptions: {
          show: {
            resource: ["contact"],
            operation: ["createOrUpdate"],
          },
        },
        default: "",
        description: "Comma-separated tags",
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
        displayName: "Description",
        name: "description",
        type: "string",
        typeOptions: {
          rows: 4,
        },
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
          { name: "Open", value: "open" },
          { name: "Pending", value: "pending" },
          { name: "Resolved", value: "resolved" },
          { name: "Closed", value: "closed" },
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
          { name: "Low", value: "low" },
          { name: "Medium", value: "medium" },
          { name: "High", value: "high" },
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
        displayName: "Requester Name",
        name: "requesterName",
        type: "string",
        displayOptions: {
          show: {
            resource: ["ticket"],
            operation: ["create"],
          },
        },
        default: "",
      },
      {
        displayName: "Requester Email",
        name: "requesterEmail",
        type: "string",
        displayOptions: {
          show: {
            resource: ["ticket"],
            operation: ["create"],
          },
        },
        default: "",
      },
      {
        displayName: "Agent Name or ID",
        name: "ticketAgentId",
        type: "options",
        typeOptions: {
          loadOptionsMethod: "getAgents",
        },
        displayOptions: {
          show: {
            resource: ["ticket"],
            operation: ["create"],
          },
        },
        default: "",
        description:
          'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
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
        displayName: "Description",
        name: "formDescription",
        type: "string",
        typeOptions: {
          rows: 2,
        },
        displayOptions: {
          show: {
            resource: ["form"],
            operation: ["create"],
          },
        },
        default: "",
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
          const response = (await nexvioHttpRequest(this, {
            method: "GET",
            url: "/api/n8n/agents",
          })) as NexvioAgentsResponse | { error?: string }

          if (response && typeof response === "object" && "error" in response && response.error) {
            throw new NodeOperationError(this.getNode(), response.error)
          }

          const agents = (response as NexvioAgentsResponse).agents ?? []

          return agents
            .filter((agent) => agent.is_enabled !== false)
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
      const resource = this.getNodeParameter("resource", itemIndex) as string
      const operation = this.getNodeParameter("operation", itemIndex) as string

      if (resource === "agent" && operation === "sendMessage") {
        const agentId = this.getNodeParameter("agentId", itemIndex) as string
        const message = this.getNodeParameter("message", itemIndex) as string
        const externalConversationId = this.getNodeParameter("externalConversationId", itemIndex) as string
        const sessionId = this.getNodeParameter("sessionId", itemIndex) as string
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

        const response = (await nexvioHttpRequest(this, {
          method: "POST",
          url: "/api/n8n/conversations/messages",
          body,
        })) as NexvioMessageResponse

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
        const firstName = this.getNodeParameter("firstName", itemIndex) as string
        const lastName = this.getNodeParameter("lastName", itemIndex) as string
        const phone = this.getNodeParameter("phone", itemIndex) as string
        const companyName = this.getNodeParameter("companyName", itemIndex) as string
        const tags = this.getNodeParameter("tags", itemIndex) as string

        const body: IDataObject = { email }
        if (firstName?.trim()) body.first_name = firstName.trim()
        if (lastName?.trim()) body.last_name = lastName.trim()
        if (phone?.trim()) body.phone = phone.trim()
        if (companyName?.trim()) body.company_name = companyName.trim()
        if (tags?.trim()) body.tags = tags.split(",").map((tag) => tag.trim()).filter(Boolean)

        const response = await nexvioHttpRequest(this, {
          method: "POST",
          url: "/api/n8n/contacts",
          body,
        })

        returnData.push({
          json: response as IDataObject,
          pairedItem: { item: itemIndex },
        })
        continue
      }

      if (resource === "ticket" && operation === "create") {
        const subject = this.getNodeParameter("subject", itemIndex) as string
        const description = this.getNodeParameter("description", itemIndex) as string
        const status = this.getNodeParameter("status", itemIndex) as string
        const priority = this.getNodeParameter("priority", itemIndex) as string
        const requesterName = this.getNodeParameter("requesterName", itemIndex) as string
        const requesterEmail = this.getNodeParameter("requesterEmail", itemIndex) as string
        const ticketAgentId = this.getNodeParameter("ticketAgentId", itemIndex) as string

        const body: IDataObject = {
          subject,
          status,
          priority,
        }

        if (description?.trim()) body.description = description.trim()
        if (requesterName?.trim()) body.requester_name = requesterName.trim()
        if (requesterEmail?.trim()) body.requester_email = requesterEmail.trim()
        if (ticketAgentId?.trim()) body.agent_id = ticketAgentId.trim()

        const response = await nexvioHttpRequest(this, {
          method: "POST",
          url: "/api/n8n/tickets",
          body,
        })

        returnData.push({
          json: response as IDataObject,
          pairedItem: { item: itemIndex },
        })
        continue
      }

      if (resource === "form" && operation === "create") {
        const formName = this.getNodeParameter("formName", itemIndex) as string
        const formDescription = this.getNodeParameter("formDescription", itemIndex) as string
        const formType = this.getNodeParameter("formType", itemIndex) as string
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

        const response = await nexvioHttpRequest(this, {
          method: "POST",
          url: "/api/n8n/forms",
          body,
        })

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

        const response = await nexvioHttpRequest(this, {
          method: "POST",
          url: "/api/n8n/forms/submissions",
          body,
        })

        returnData.push({
          json: response as IDataObject,
          pairedItem: { item: itemIndex },
        })
      }
    }

    return [returnData]
  }
}
