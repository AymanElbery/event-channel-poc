import { DisabledFieldDrift, FieldChange, FormField, FormSchema, FormValues } from './form-schema';

// Treats null/undefined/'' as the same "empty" value so an untouched empty input isn't reported.
function normalize(value: unknown): string {
  return value === null || value === undefined || value === '' ? '' : JSON.stringify(value);
}

export function sameValue(a: unknown, b: unknown): boolean {
  return normalize(a) === normalize(b);
}

export function defaultsOf(fields: FormField[]): FormValues {
  return Object.fromEntries(fields.map((f) => [f.name, f.default_value]));
}

export function changedFromDefaults(defaults: FormValues, values: FormValues): FieldChange[] {
  return Object.keys(defaults)
    .filter((name) => !sameValue(defaults[name], values[name]))
    .map((name) => ({ name, defaultValue: defaults[name], currentValue: values[name] }));
}

export function disabledFieldDrift(values: FormValues, latest: FormSchema): DisabledFieldDrift[] {
  return latest.fields
    .filter((f) => f.disable && !sameValue(values[f.name], f.default_value))
    .map((f) => ({ name: f.name, label: f.label, formValue: values[f.name], latestValue: f.default_value }));
}
