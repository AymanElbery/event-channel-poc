# Event channel POC

An Angular 22 dynamic form built from a JSON schema (API A). Every form change is streamed over a WebSocket (API B).

Requires Node `>=22.22.3` or `>=24.15` (`nvm use 24`).

```bash
npm install
npm run api     # mock backend on :3000 (API A REST + API B WebSocket)
npm start       # Angular dev server on :4200, proxies /api and /ws to :3000
npm test
```

## How it works

- `FormSchemaService` (service A, `src/app/services/form-schema.service.ts`) gets `GET /api/form-schema` and posts the submitted values.
- `DynamicForm` (`src/app/dynamic-form/`) builds a reactive `FormGroup` from the fields:
  - `type`: text, email, password, number, date, textarea, select, checkbox
  - `required`: adds a validator
  - `display: false`: the field is not rendered, but its value is still sent
  - `disable`: the control is read-only
  - `default_value`: the field's starting value
- `FormChannelService` (service B, `src/app/services/form-channel.service.ts`) keeps a WebSocket open to `/ws/form-changes` and reconnects if it drops. It stores the defaults from service A. On each change (debounced 300 ms) it works out which fields differ from those defaults and sends `{ type: 'form-change', values, changes }`.
- On submit, the component fetches the schema from API A again. If any disabled field's value no longer matches API A's current `default_value`, the form isn't sent. Instead a warning appears with two buttons: **Reload latest values** or **Submit anyway**.

## Trying the warning

With the app open, change a disabled field on the mock backend, then press Submit:

```bash
curl -XPOST localhost:3000/api/form-schema/defaults \
  -H 'content-type: application/json' -d '{"name":"exchange_rate","value":3.8}'
```
