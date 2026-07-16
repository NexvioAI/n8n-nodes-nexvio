/* eslint-disable @n8n/community-nodes/no-restricted-imports -- test runner imports */
import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { NexvioApi } from "../credentials/NexvioApi.credentials"
import { NexvioOAuth2Api } from "../credentials/NexvioOAuth2Api.credentials"
import {
  NEXVIO_DASHBOARD_BASE_URL,
  NEXVIO_OAUTH_AUTHORIZATION_URL,
  NEXVIO_OAUTH_TOKEN_URL,
} from "../shared/oauth-config"

describe("Nexvio credentials", () => {
  it("uses the config dashboard URL for OAuth auth endpoints and tests", () => {
    const oauth = new NexvioOAuth2Api()
    const names = oauth.properties.map((property) => property.name)

    assert.ok(!names.includes("dashboardUrl"))
    assert.equal(oauth.properties.find((property) => property.name === "authUrl")?.default, NEXVIO_OAUTH_AUTHORIZATION_URL)
    assert.equal(
      oauth.properties.find((property) => property.name === "accessTokenUrl")?.default,
      NEXVIO_OAUTH_TOKEN_URL,
    )
    assert.equal(oauth.test.request.baseURL, NEXVIO_DASHBOARD_BASE_URL)
  })

  it("uses the config dashboard URL for API key credential tests", () => {
    const api = new NexvioApi()
    const names = api.properties.map((property) => property.name)

    assert.ok(!names.includes("dashboardUrl"))
    assert.ok(names.includes("apiKey"))
    assert.equal(api.test.request.baseURL, NEXVIO_DASHBOARD_BASE_URL)
  })
})
