/* eslint-disable @n8n/community-nodes/no-restricted-imports -- test runner imports */
import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { isValidEmail } from "../shared/validation"

describe("isValidEmail", () => {
  it("accepts normal emails", () => {
    assert.equal(isValidEmail("user@example.com"), true)
    assert.equal(isValidEmail("  user+tag@example.co.uk  "), true)
  })

  it("rejects empty and malformed values", () => {
    assert.equal(isValidEmail(""), false)
    assert.equal(isValidEmail("   "), false)
    assert.equal(isValidEmail("not-an-email"), false)
    assert.equal(isValidEmail("@missing-local.com"), false)
    assert.equal(isValidEmail("missing-domain@"), false)
  })
})
