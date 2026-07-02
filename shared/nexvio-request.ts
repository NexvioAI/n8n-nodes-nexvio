import type { IExecuteFunctions, IHookFunctions, ILoadOptionsFunctions } from "n8n-workflow"
import { getNexvioRequestContext } from "./nexvio-url"

type NexvioRequestContext = IExecuteFunctions | IHookFunctions | ILoadOptionsFunctions

export type NexvioRequestOptions = {
  method: "GET" | "POST" | "DELETE" | "PUT" | "PATCH"
  url: string
  body?: Record<string, unknown>
  qs?: Record<string, string>
}

export async function nexvioHttpRequest(
  ctx: NexvioRequestContext,
  options: NexvioRequestOptions,
): Promise<unknown> {
  const { credentialName, baseUrl } = await getNexvioRequestContext(ctx)

  return ctx.helpers.httpRequestWithAuthentication.call(ctx, credentialName, {
    method: options.method,
    baseURL: baseUrl,
    url: options.url,
    body: options.body,
    qs: options.qs,
    json: true,
  })
}
