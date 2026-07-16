import type { IDataObject } from "n8n-workflow"

export function buildNexvioTriggerItem(bodyData: IDataObject, headers: IDataObject): IDataObject {
  const headerEventId = headers["x-nexvio-event-id"]
  const eventId =
    typeof headerEventId === "string" && headerEventId.trim()
      ? headerEventId
      : typeof bodyData.eventId === "string"
        ? bodyData.eventId
        : undefined

  return {
    ...bodyData,
    ...(eventId ? { eventId } : {}),
    _webhookHeaders: {
      "x-nexvio-signature": headers["x-nexvio-signature"],
      "x-nexvio-timestamp": headers["x-nexvio-timestamp"],
      "x-nexvio-event-id": headers["x-nexvio-event-id"],
      "x-nexvio-event-type": headers["x-nexvio-event-type"],
      "x-nexvio-delivery-attempt": headers["x-nexvio-delivery-attempt"],
    },
  }
}
