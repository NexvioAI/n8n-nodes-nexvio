import type { IExecuteFunctions, IHookFunctions, ILoadOptionsFunctions } from "n8n-workflow"
import { NEXVIO_DEFAULT_DASHBOARD_URL } from "./constants"
import { assertNexvioCredentialSelected, getNexvioCredentialName, type NexvioCredentialName } from "./nexvio-auth"

type NexvioCredentialContext = IExecuteFunctions | IHookFunctions | ILoadOptionsFunctions

export function normalizeNexvioBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, "")
}

async function readDashboardUrl(
  ctx: NexvioCredentialContext,
  credentialName: NexvioCredentialName,
): Promise<string> {
  const credentials = await ctx.getCredentials(credentialName)
  const dashboardUrl =
    typeof credentials.dashboardUrl === "string" ? credentials.dashboardUrl.trim() : ""

  if (!dashboardUrl) {
    return NEXVIO_DEFAULT_DASHBOARD_URL
  }

  return normalizeNexvioBaseUrl(dashboardUrl)
}

export async function getNexvioBaseUrl(ctx: NexvioCredentialContext): Promise<string> {
  const credentialName = getNexvioCredentialName(ctx)
  return readDashboardUrl(ctx, credentialName)
}

export async function getNexvioRequestContext(ctx: NexvioCredentialContext): Promise<{
  credentialName: NexvioCredentialName
  baseUrl: string
}> {
  const credentialName = assertNexvioCredentialSelected(ctx)
  const baseUrl = await readDashboardUrl(ctx, credentialName)

  return { credentialName, baseUrl }
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
