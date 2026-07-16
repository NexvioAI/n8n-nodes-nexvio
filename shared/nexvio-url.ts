import type { IExecuteFunctions, IHookFunctions, ILoadOptionsFunctions } from "n8n-workflow"
import { NEXVIO_DASHBOARD_BASE_URL } from "./constants"
import { assertNexvioCredentialSelected, type NexvioCredentialName } from "./nexvio-auth"

type NexvioCredentialContext = IExecuteFunctions | IHookFunctions | ILoadOptionsFunctions

export function normalizeNexvioBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, "")
}

export async function getNexvioRequestContext(ctx: NexvioCredentialContext): Promise<{
  credentialName: NexvioCredentialName
  baseUrl: string
}> {
  const credentialName = assertNexvioCredentialSelected(ctx)

  return { credentialName, baseUrl: NEXVIO_DASHBOARD_BASE_URL }
}

export function formatNexvioRequestError(error: unknown): string {
  if (error instanceof Error) {
    if (error.message.includes("without access token")) {
      return "Connect your Nexvio OAuth2 credential first (Credentials → Connect my account)."
    }

    return error.message
  }

  if (error && typeof error === "object") {
    const maybe = error as { message?: string; error?: string; error_description?: string }
    if (maybe.error_description) return maybe.error_description
    if (maybe.error) return String(maybe.error)
    if (maybe.message) return maybe.message
  }

  return "Request to Nexvio failed."
}
