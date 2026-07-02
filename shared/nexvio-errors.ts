import type { IExecuteFunctions, IHookFunctions, ILoadOptionsFunctions, JsonObject } from "n8n-workflow"
import { NodeApiError } from "n8n-workflow"
import type { NexvioRequestOptions } from "./nexvio-request"
import { nexvioHttpRequest } from "./nexvio-request"
import { formatNexvioRequestError } from "./nexvio-url"

type NexvioRequestContext = IExecuteFunctions | IHookFunctions | ILoadOptionsFunctions

export async function nexvioApiRequest(
  ctx: NexvioRequestContext,
  options: NexvioRequestOptions,
  itemIndex?: number,
): Promise<unknown> {
  try {
    return await nexvioHttpRequest(ctx, options)
  } catch (error) {
    throw new NodeApiError(ctx.getNode(), error as JsonObject, {
      ...(itemIndex !== undefined ? { itemIndex } : {}),
      message: formatNexvioRequestError(error),
    })
  }
}
