import type { IExecuteFunctions, IHookFunctions, ILoadOptionsFunctions } from "n8n-workflow"

type NexvioCredentialContext = IExecuteFunctions | IHookFunctions | ILoadOptionsFunctions

export type NexvioCredentialName = "nexvioOAuth2Api" | "nexvioApi"

export function getNexvioCredentialName(ctx: NexvioCredentialContext): NexvioCredentialName {
  const node = ctx.getNode()

  if (node.credentials?.nexvioOAuth2Api) {
    return "nexvioOAuth2Api"
  }

  if (node.credentials?.nexvioApi) {
    return "nexvioApi"
  }

  const authType = ctx.getNodeParameter("authentication", 0, "oAuth2") as string
  return authType === "apiKey" ? "nexvioApi" : "nexvioOAuth2Api"
}

export function assertNexvioCredentialSelected(ctx: NexvioCredentialContext): NexvioCredentialName {
  const node = ctx.getNode()

  if (node.credentials?.nexvioOAuth2Api) {
    return "nexvioOAuth2Api"
  }

  if (node.credentials?.nexvioApi) {
    return "nexvioApi"
  }

  throw new Error("Select a Nexvio credential on this node before loading options.")
}
