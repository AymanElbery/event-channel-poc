import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { FormSchema, FormValues } from '../models/form-schema';

/** Service A: loads the form definition from the backend and submits the final values. */
@Injectable({ providedIn: 'root' })
export class FormSchemaService {
  private readonly http = inject(HttpClient);

  getSchema(): Observable<FormSchema> {
    return this.http.get<FormSchema>('/api/form-schema');
  }

  submit(values: FormValues): Observable<{ ok: boolean; receivedAt: string }> {
    return this.http.post<{ ok: boolean; receivedAt: string }>('/api/form-submit', values);
  }
}
