/* eslint-disable @n8n/community-nodes/no-restricted-imports -- test runner imports */
import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { Nexvio } from "../nodes/Nexvio/Nexvio.node"
import { NexvioTrigger } from "../nodes/NexvioTrigger/NexvioTrigger.node"
import { buildNexvioTriggerItem } from "../shared/nexvio-trigger-payload"

describe("Nexvio node metadata", () => {
  it("covers all documented actions with n8n-style action labels", () => {
    const node = new Nexvio()
    const operations = node.description.properties.filter((property) => property.name === "operation")
    const actions = operations.flatMap((property) =>
      (property.options ?? [])
        .map((option) => ("action" in option ? option.action : undefined))
        .filter((action): action is string => typeof action === "string"),
    )

    assert.deepEqual(actions.sort(), [
      "Create a form",
      "Create a ticket",
      "Create or update a contact",
      "Send a message to a nexvio agent",
      "Submit a form",
    ])
  })

  it("exposes expected resources", () => {
    const node = new Nexvio()
    const resource = node.description.properties.find((property) => property.name === "resource")
    const values = (resource?.options ?? []).map((option) => ("value" in option ? option.value : null))

    assert.deepEqual(values, ["agent", "contact", "ticket", "form"])
  })
})

describe("Nexvio Trigger metadata", () => {
  it("supports all four webhook events", () => {
    const trigger = new NexvioTrigger()
    const event = trigger.description.properties.find((property) => property.name === "event")
    const values = (event?.options ?? []).map((option) => ("value" in option ? option.value : null))

    assert.deepEqual(values, [
      "contacts.created",
      "tickets.created",
      "forms.created",
      "forms.submission.created",
    ])
  })
})

describe("buildNexvioTriggerItem", () => {
  it("prefers the delivery header event id and preserves webhook headers", () => {
    const item = buildNexvioTriggerItem(
      { eventId: "body-id", eventType: "contacts.created", payload: { id: "1" } },
      {
        "x-nexvio-event-id": "header-id",
        "x-nexvio-signature": "sig",
        "x-nexvio-timestamp": "123",
        "x-nexvio-event-type": "contacts.created",
        "x-nexvio-delivery-attempt": "1",
      },
    )

    assert.equal(item.eventId, "header-id")
    assert.deepEqual(item._webhookHeaders, {
      "x-nexvio-signature": "sig",
      "x-nexvio-timestamp": "123",
      "x-nexvio-event-id": "header-id",
      "x-nexvio-event-type": "contacts.created",
      "x-nexvio-delivery-attempt": "1",
    })
  })

  it("falls back to body eventId when the header is missing", () => {
    const item = buildNexvioTriggerItem({ eventId: "body-id" }, {})
    assert.equal(item.eventId, "body-id")
  })
})
