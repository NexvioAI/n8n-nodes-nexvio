/* eslint-disable @n8n/community-nodes/no-restricted-imports -- test runner imports */
import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { assertNexvioCredentialSelected, getNexvioCredentialName } from "../shared/nexvio-auth"

describe("getNexvioCredentialName", () => {
  it("prefers explicitly attached OAuth credentials", () => {
    const ctx = {
      getNode: () => ({
        credentials: { nexvioOAuth2Api: { id: "oauth" } },
      }),
      getNodeParameter: () => "apiKey",
    }

    assert.equal(getNexvioCredentialName(ctx as never), "nexvioOAuth2Api")
  })

  it("uses authentication parameter when credentials are not attached yet", () => {
    const ctx = {
      getNode: () => ({ credentials: {} }),
      getNodeParameter: () => "apiKey",
    }

    assert.equal(getNexvioCredentialName(ctx as never), "nexvioApi")
  })
})

describe("assertNexvioCredentialSelected", () => {
  it("throws when no credential is selected", () => {
    const ctx = {
      getNode: () => ({ credentials: {} }),
    }

    assert.throws(() => assertNexvioCredentialSelected(ctx as never), /Select a Nexvio credential/)
  })
})
