import { changedFromDefaults, disabledFieldDrift, sameValue } from './form-diff';
import { FormSchema } from './form-schema';

describe('form-diff', () => {
  it('treats empty values as equal', () => {
    expect(sameValue('', null)).toBe(true);
    expect(sameValue(undefined, '')).toBe(true);
    expect(sameValue(0, '')).toBe(false);
    expect(sameValue(3.75, 3.75)).toBe(true);
  });

  it('lists fields that differ from their defaults', () => {
    const changes = changedFromDefaults({ a: '', b: 1, c: true }, { a: 'x', b: 1, c: false });
    expect(changes).toEqual([
      { name: 'a', defaultValue: '', currentValue: 'x' },
      { name: 'c', defaultValue: true, currentValue: false },
    ]);
  });

  it('only reports drift for disabled fields', () => {
    const latest: FormSchema = {
      fields: [
        { type: 'text', label: 'A', name: 'a', required: false, display: true, default_value: 'new', disable: false },
        { type: 'number', label: 'Rate', name: 'rate', required: true, display: true, default_value: 4, disable: true },
      ],
    };
    expect(disabledFieldDrift({ a: 'old', rate: 3.75 }, latest)).toEqual([
      { name: 'rate', label: 'Rate', formValue: 3.75, latestValue: 4 },
    ]);
  });
});
