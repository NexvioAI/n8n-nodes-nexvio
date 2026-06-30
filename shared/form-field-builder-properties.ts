import type { INodeProperties } from "n8n-workflow"
import { defaultBuilderRowsForFormType, type FormFieldBuilderRow } from "./form-fields"

export const N8N_FORM_TYPES = ["lead", "contact", "survey", "feedback", "custom"] as const
export type N8nFormType = (typeof N8N_FORM_TYPES)[number]

const FORM_FIELD_VALUE_PROPERTIES: INodeProperties[] = [
  {
    displayName: "Label",
    name: "label",
    type: "string",
    default: "",
    required: true,
  },
  {
    displayName: "Type",
    name: "type",
    type: "options",
    options: [
      { name: "Date", value: "date" },
      { name: "Dropdown", value: "dropdown" },
      { name: "Email", value: "email" },
      { name: "Long Text", value: "textarea" },
      { name: "Number", value: "number" },
      { name: "Phone", value: "phone" },
      { name: "Rating", value: "rating" },
      { name: "Text", value: "text" },
    ],
    default: "text",
  },
  {
    displayName: "Placeholder",
    name: "placeholder",
    type: "string",
    default: "",
  },
  {
    displayName: "Required",
    name: "required",
    type: "boolean",
    default: false,
  },
]

export function getFormFieldsParameterName(formType: string): string {
  if ((N8N_FORM_TYPES as readonly string[]).includes(formType)) {
    return `formFields_${formType}`
  }
  return "formFields_custom"
}

export function readFormFieldRows(
  getParameter: (name: string, index: number) => unknown,
  itemIndex: number,
  formType: string,
): FormFieldBuilderRow[] {
  const paramName = getFormFieldsParameterName(formType)
  const builder = getParameter(paramName, itemIndex) as { field?: FormFieldBuilderRow[] } | undefined
  return Array.isArray(builder?.field) ? builder.field : []
}

function buildFormFieldsBuilderProperty(formType: N8nFormType): INodeProperties {
  const defaultRows = defaultBuilderRowsForFormType(formType)

  return {
    displayName: "Form Fields",
    name: getFormFieldsParameterName(formType),
    type: "fixedCollection",
    typeOptions: {
      multipleValues: true,
      sortable: true,
    },
    placeholder: "Add Field",
    default: {
      field: defaultRows,
    },
    displayOptions: {
      show: {
        resource: ["form"],
        operation: ["create"],
        formType: [formType],
      },
    },
    description: "Starter fields for this form type. Use Add Field to add Label, Type, Placeholder, and Required.",
    options: [
      {
        displayName: "Field",
        name: "field",
        values: FORM_FIELD_VALUE_PROPERTIES,
      },
    ],
  }
}

export function buildFormCreateFieldProperties(): INodeProperties[] {
  return N8N_FORM_TYPES.map((formType) => buildFormFieldsBuilderProperty(formType))
}
