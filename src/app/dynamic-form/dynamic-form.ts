import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { Subscription, debounceTime } from 'rxjs';
import { defaultsOf, disabledFieldDrift } from '../models/form-diff';
import { DisabledFieldDrift, FormField, FormSchema } from '../models/form-schema';
import { FormChannelService } from '../services/form-channel.service';
import { FormSchemaService } from '../services/form-schema.service';

type DynamicFormGroup = FormGroup<Record<string, FormControl<unknown>>>;

@Component({
  selector: 'app-dynamic-form',
  imports: [ReactiveFormsModule],
  templateUrl: './dynamic-form.html',
  styleUrl: './dynamic-form.css',
})
export class DynamicForm {
  private readonly schemaService = inject(FormSchemaService);
  protected readonly channel = inject(FormChannelService);

  protected readonly fields = signal<FormField[]>([]);
  protected readonly form = signal<DynamicFormGroup | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly submitting = signal(false);
  protected readonly submittedAt = signal<string | null>(null);
  /** Disabled fields whose values changed in API A since the form was loaded. */
  protected readonly drift = signal<DisabledFieldDrift[]>([]);

  private valueChanges?: Subscription;

  constructor() {
    this.channel.connect();
    inject(DestroyRef).onDestroy(() => {
      this.valueChanges?.unsubscribe();
      this.channel.disconnect();
    });
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.drift.set([]);
    this.schemaService.getSchema().subscribe({
      next: (schema) => {
        this.build(schema);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Could not load the form definition.');
        this.loading.set(false);
      },
    });
  }

  protected submit(): void {
    const form = this.form();
    if (!form) return;
    if (form.invalid) {
      form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.error.set(null);
    // Re-read API A so disabled values can be checked against what the backend holds now.
    this.schemaService.getSchema().subscribe({
      next: (latest) => {
        const drift = disabledFieldDrift(form.getRawValue(), latest);
        if (drift.length) {
          this.drift.set(drift);
          this.submitting.set(false);
        } else {
          this.send();
        }
      },
      error: () => {
        this.error.set('Could not verify the form against the server.');
        this.submitting.set(false);
      },
    });
  }

  /** Submits despite the warning, keeping the values the user saw. */
  protected submitAnyway(): void {
    this.drift.set([]);
    this.submitting.set(true);
    this.send();
  }

  protected isInvalid(name: string): boolean {
    const control = this.form()?.controls[name];
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  private send(): void {
    const form = this.form();
    if (!form) return;
    this.schemaService.submit(form.getRawValue()).subscribe({
      next: (res) => {
        this.submittedAt.set(res.receivedAt);
        this.submitting.set(false);
      },
      error: () => {
        this.error.set('Submitting the form failed.');
        this.submitting.set(false);
      },
    });
  }

  private build(schema: FormSchema): void {
    const controls: Record<string, FormControl<unknown>> = {};
    for (const field of schema.fields) {
      controls[field.name] = new FormControl<unknown>(
        { value: field.default_value, disabled: field.disable },
        { validators: validatorsFor(field) },
      );
    }
    const form: DynamicFormGroup = new FormGroup(controls);

    this.valueChanges?.unsubscribe();
    this.channel.setDefaults(defaultsOf(schema.fields));
    // getRawValue() so disabled and hidden fields are sent too.
    this.valueChanges = form.valueChanges
      .pipe(debounceTime(300))
      .subscribe(() => this.channel.sendChange(form.getRawValue()));

    this.submittedAt.set(null);
    this.fields.set(schema.fields);
    this.form.set(form);
  }
}

function validatorsFor(field: FormField): ValidatorFn[] {
  const validators: ValidatorFn[] = [];
  if (field.required) {
    validators.push(field.type === 'checkbox' ? Validators.requiredTrue : Validators.required);
  }
  if (field.type === 'email') validators.push(Validators.email);
  return validators;
}
