/* eslint-disable @n8n/community-nodes/no-restricted-imports -- test runner imports */
import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { formatNexvioRequestError, getNexvioRequestContext, normalizeNexvioBaseUrl } from "../shared/nexvio-url"
import { NEXVIO_DASHBOARD_BASE_URL } from "../shared/oauth-config"

describe("normalizeNexvioBaseUrl", () => {
  it("trims and strips trailing slashes", () => {
    assert.equal(normalizeNexvioBaseUrl(" https://app.nexvio.ai/ "), "https://app.nexvio.ai")
    assert.equal(normalizeNexvioBaseUrl("https://custom.example.com///"), "https://custom.example.com")
  })
})

describe("formatNexvioRequestError", () => {
  it("maps missing access token errors to a connect hint", () => {
    assert.equal(
      formatNexvioRequestError(new Error("Credential without access token")),
      "Connect your Nexvio OAuth2 credential first (Credentials → Connect my account).",
    )
  })

  it("prefers OAuth error_description when present", () => {
    assert.equal(
      formatNexvioRequestError({ error: "invalid_grant", error_description: "Code expired" }),
      "Code expired",
    )
  })

  it("falls back to a generic message", () => {
    assert.equal(formatNexvioRequestError(null), "Request to Nexvio failed.")
  })
})

describe("getNexvioRequestContext", () => {
  it("always uses the config dashboard URL", async () => {
    const ctx = {
      getNode: () => ({
        credentials: { nexvioOAuth2Api: { id: "cred_1" } },
      }),
    }

    const result = await getNexvioRequestContext(ctx as never)
    assert.deepEqual(result, {
      credentialName: "nexvioOAuth2Api",
      baseUrl: NEXVIO_DASHBOARD_BASE_URL,
    })
  })
})
