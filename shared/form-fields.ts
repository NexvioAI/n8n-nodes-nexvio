import { randomUUID } from "node:crypto"
import type { ResourceMapperField } from "n8n-workflow"

export type NexvioFormField = {
  id: string
  type: string
  label: string
  placeholder?: string
  required?: boolean
  enabled?: boolean
  options?: Array<{ id: string; label: string; value: string }>
}

export type NexvioForm = {
  id: string
  name: string
  is_enabled?: boolean
  fields?: NexvioFormField[]
}

export type NexvioFormsResponse = {
  forms: NexvioForm[]
}

export type FormFieldBuilderRow = {
  label: string
  type: string
  required: boolean
  placeholder?: string
}

function createFieldId(label: string): string {
  const slug = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
  return slug || `field_${randomUUID().slice(0, 8)}`
}

export function buildDefaultFieldsForFormType(formType: string): NexvioFormField[] {
  const emailField: NexvioFormField = {
    id: "email",
    type: "email",
    label: "Email",
    placeholder: "Enter your email",
    required: true,
    enabled: true,
  }

  switch (formType) {
    case "lead":
      return [
        emailField,
        {
          id: "name",
          type: "text",
          label: "Name",
          placeholder: "Enter your name",
          required: false,
          enabled: true,
        },
      ]
    case "contact":
      return [
        emailField,
        {
          id: "name",
          type: "text",
          label: "Name",
          placeholder: "Enter your name",
          required: true,
          enabled: true,
        },
        {
          id: "phone",
          type: "phone",
          label: "Phone",
          placeholder: "Enter your phone number",
          required: false,
          enabled: true,
        },
      ]
    case "survey":
      return [
        {
          id: "rating",
          type: "rating",
          label: "Rating",
          required: true,
          enabled: true,
        },
        {
          id: "feedback",
          type: "textarea",
          label: "Feedback",
          placeholder: "Share your feedback",
          required: false,
          enabled: true,
        },
      ]
    case "feedback":
      return [
        {
          id: "rating",
          type: "rating",
          label: "Rating",
          required: true,
          enabled: true,
        },
        {
          id: "comment",
          type: "textarea",
          label: "Comment",
          placeholder: "Tell us more",
          required: true,
          enabled: true,
        },
      ]
    default:
      return [emailField]
  }
}

export function defaultBuilderRowsForFormType(formType: string): FormFieldBuilderRow[] {
  return buildDefaultFieldsForFormType(formType).map((field) => ({
    label: field.label,
    type: field.type,
    required: field.required === true,
    placeholder: field.placeholder ?? "",
  }))
}

export function buildFieldsFromBuilder(rows: FormFieldBuilderRow[]): NexvioFormField[] {
  const usedIds = new Set<string>()

  return rows.map((row) => {
    let id = createFieldId(row.label)
    while (usedIds.has(id)) {
      id = `${id}_${usedIds.size + 1}`
    }
    usedIds.add(id)

    return {
      id,
      type: row.type,
      label: row.label.trim(),
      placeholder: row.placeholder?.trim() || undefined,
      required: row.required,
      enabled: true,
    }
  })
}

function mapNexvioFieldType(type: string): ResourceMapperField["type"] {
  switch (type) {
    case "number":
    case "rating":
      return "number"
    case "checkboxes":
      return "array"
    default:
      return "string"
  }
}

export function mapFormFieldToResourceMapper(field: NexvioFormField): ResourceMapperField {
  return {
    id: field.id,
    displayName: field.required ? `${field.label} *` : field.label,
    defaultMatch: field.enabled !== false,
    required: field.required === true,
    display: field.enabled !== false,
    type: mapNexvioFieldType(field.type),
    options: field.options?.map((option) => ({
      name: option.label,
      value: option.value,
    })),
  }
}

export function getEnabledFormFields(form: NexvioForm | undefined): NexvioFormField[] {
  return (form?.fields ?? []).filter((field) => field.enabled !== false)
}
