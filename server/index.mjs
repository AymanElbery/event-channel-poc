// Mock backend for the POC.
//   API A (REST):      GET  /api/form-schema           -> form definition
//                      POST /api/form-submit           -> accepts submitted values
//                      POST /api/form-schema/defaults  -> dev helper: change a field's default_value
//   API B (WebSocket): ws://localhost:3000/ws/form-changes  -> receives form changes, replies with acks
import http from 'node:http';
import { WebSocketServer } from 'ws';

const PORT = Number(process.env.PORT ?? 3000);

const schema = {
  fields: [
    { type: 'text', label: 'Name', name: 'name', required: true, display: true, default_value: '', disable: false },
    { type: 'email', label: 'Email', name: 'email', required: true, display: true, default_value: '', disable: false },
    { type: 'number', label: 'Age', name: 'age', required: false, display: true, default_value: 30, disable: false },
    {
      type: 'select',
      label: 'Country',
      name: 'country',
      required: true,
      display: true,
      default_value: 'SA',
      disable: false,
      options: [
        { label: 'Saudi Arabia', value: 'SA' },
        { label: 'Egypt', value: 'EG' },
        { label: 'United Arab Emirates', value: 'AE' },
      ],
    },
    { type: 'date', label: 'Start date', name: 'start_date', required: false, display: true, default_value: '', disable: false },
    { type: 'textarea', label: 'Notes', name: 'notes', required: false, display: true, default_value: '', disable: false },
    { type: 'checkbox', label: 'Subscribe to newsletter', name: 'newsletter', required: false, display: true, default_value: true, disable: false },
    { type: 'text', label: 'Customer ID', name: 'customer_id', required: true, display: true, default_value: 'CUST-1001', disable: true },
    { type: 'number', label: 'Exchange rate', name: 'exchange_rate', required: true, display: true, default_value: 3.75, disable: true },
    { type: 'text', label: 'Internal reference', name: 'internal_ref', required: false, display: false, default_value: 'REF-42', disable: false },
  ],
};

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  let raw = '';
  for await (const chunk of req) raw += chunk;
  return raw ? JSON.parse(raw) : {};
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && req.url === '/api/form-schema') {
      return sendJson(res, 200, schema);
    }
    if (req.method === 'POST' && req.url === '/api/form-submit') {
      const values = await readJson(req);
      console.log('[A] submit', values);
      return sendJson(res, 200, { ok: true, receivedAt: new Date().toISOString() });
    }
    if (req.method === 'POST' && req.url === '/api/form-schema/defaults') {
      const { name, value } = await readJson(req);
      const field = schema.fields.find((f) => f.name === name);
      if (!field) return sendJson(res, 404, { error: `Unknown field "${name}"` });
      field.default_value = value;
      console.log(`[A] default_value of "${name}" is now`, value);
      return sendJson(res, 200, field);
    }
    sendJson(res, 404, { error: 'Not found' });
  } catch (err) {
    sendJson(res, 400, { error: String(err) });
  }
});

const wss = new WebSocketServer({ server, path: '/ws/form-changes' });

wss.on('connection', (socket) => {
  console.log('[B] client connected');
  socket.on('message', (data) => {
    let message;
    try {
      message = JSON.parse(data.toString());
    } catch {
      return;
    }
    const changed = (message.changes ?? []).map((c) => c.name);
    console.log('[B] form-change, fields differing from defaults:', changed);
    socket.send(JSON.stringify({ type: 'ack', receivedAt: new Date().toISOString(), changedFields: changed }));
  });
  socket.on('close', () => console.log('[B] client disconnected'));
});

server.listen(PORT, () => console.log(`Mock API listening on http://localhost:${PORT}`));
