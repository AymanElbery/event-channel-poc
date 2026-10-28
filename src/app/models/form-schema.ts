export type FieldType =
  | 'text'
  | 'email'
  | 'password'
  | 'number'
  | 'date'
  | 'textarea'
  | 'select'
  | 'checkbox';

export interface FieldOption {
  label: string;
  value: string | number;
}

export interface FormField {
  type: FieldType;
  label: string;
  name: string;
  required: boolean;
  display: boolean;
  default_value: unknown;
  disable: boolean;
  options?: FieldOption[];
}

export interface FormSchema {
  fields: FormField[];
}

export type FormValues = Record<string, unknown>;

/** A field whose current value differs from the default it was loaded with. */
export interface FieldChange {
  name: string;
  defaultValue: unknown;
  currentValue: unknown;
}

/** A disabled field whose value no longer matches what API A currently returns. */
export interface DisabledFieldDrift {
  name: string;
  label: string;
  formValue: unknown;
  latestValue: unknown;
}
