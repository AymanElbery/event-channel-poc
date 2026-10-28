import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { App } from './app';
import { FormChannelService } from './services/form-channel.service';
import { FormSchema } from './models/form-schema';

const schema: FormSchema = {
  fields: [
    { type: 'text', label: 'Name', name: 'name', required: true, display: true, default_value: '', disable: false },
    { type: 'text', label: 'Customer ID', name: 'customer_id', required: true, display: true, default_value: 'C-1', disable: true },
    { type: 'text', label: 'Ref', name: 'ref', required: false, display: false, default_value: 'R', disable: false },
  ],
};

describe('App', () => {
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        // No real WebSocket in tests.
        { provide: FormChannelService, useValue: Object.assign(new FormChannelService(), { connect() {} }) },
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  async function render() {
    const fixture = TestBed.createComponent(App);
    http.expectOne('/api/form-schema').flush(schema);
    await fixture.whenStable();
    return fixture;
  }

  it('renders visible fields from the schema', async () => {
    const el: HTMLElement = (await render()).nativeElement;
    expect(el.querySelector('#field-name')).toBeTruthy();
    expect(el.querySelector<HTMLInputElement>('#field-customer_id')?.disabled).toBe(true);
    expect(el.querySelector('#field-ref')).toBeNull();
  });

  it('warns on submit when a disabled field changed in API A', async () => {
    const fixture = await render();
    const el: HTMLElement = fixture.nativeElement;
    const name = el.querySelector<HTMLInputElement>('#field-name')!;
    name.value = 'Ayman';
    name.dispatchEvent(new Event('input'));
    el.querySelector<HTMLButtonElement>('button[type=submit]')!.click();

    const latest = structuredClone(schema);
    latest.fields[1].default_value = 'C-2';
    http.expectOne('/api/form-schema').flush(latest);
    await fixture.whenStable();

    expect(el.querySelector('.warning')?.textContent).toContain('Customer ID');
    http.expectNone('/api/form-submit');
  });

  it('submits when disabled fields still match API A', async () => {
    const fixture = await render();
    const el: HTMLElement = fixture.nativeElement;
    const name = el.querySelector<HTMLInputElement>('#field-name')!;
    name.value = 'Ayman';
    name.dispatchEvent(new Event('input'));
    el.querySelector<HTMLButtonElement>('button[type=submit]')!.click();

    http.expectOne('/api/form-schema').flush(schema);
    const submit = http.expectOne('/api/form-submit');
    expect(submit.request.body).toEqual({ name: 'Ayman', customer_id: 'C-1', ref: 'R' });
    submit.flush({ ok: true, receivedAt: 'now' });
    await fixture.whenStable();

    expect(el.querySelector('.warning')).toBeNull();
    expect(el.querySelector('.success')?.textContent).toContain('now');
  });
});
