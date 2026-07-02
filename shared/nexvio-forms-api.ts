import type { ILoadOptionsFunctions } from "n8n-workflow"
import { NodeOperationError } from "n8n-workflow"
import type { NexvioForm, NexvioFormsResponse } from "./form-fields"
import { nexvioHttpRequest } from "./nexvio-request"
import { formatNexvioRequestError } from "./nexvio-url"

export async function fetchNexvioForms(context: ILoadOptionsFunctions): Promise<NexvioForm[]> {
  try {
    const response = (await nexvioHttpRequest(context, {
      method: "GET",
      url: "/api/n8n/forms",
    })) as NexvioFormsResponse | { error?: string }

    if (response && typeof response === "object" && "error" in response && response.error) {
      throw new NodeOperationError(context.getNode(), response.error)
    }

    return (response as NexvioFormsResponse).forms ?? []
  } catch (error) {
    throw new NodeOperationError(context.getNode(), formatNexvioRequestError(error))
  }
}

export async function fetchNexvioFormById(
  context: ILoadOptionsFunctions,
  formId: string,
): Promise<NexvioForm | undefined> {
  const trimmedId = formId.trim()
  if (!trimmedId) {
    return undefined
  }

  try {
    const response = (await nexvioHttpRequest(context, {
      method: "GET",
      url: `/api/n8n/forms/${encodeURIComponent(trimmedId)}`,
    })) as NexvioForm | { error?: string }

    if (response && typeof response === "object" && "error" in response && response.error) {
      throw new NodeOperationError(context.getNode(), response.error)
    }

    if (response && typeof response === "object" && "id" in response) {
      return response as NexvioForm
    }

    return undefined
  } catch (error) {
    throw new NodeOperationError(context.getNode(), formatNexvioRequestError(error))
  }
}
