import { applyCors } from './_lib/cors';
import { getEnvConfig } from './_lib/env';

const MAX_USER_CONTENT_LENGTH = 200000;

function sendJson(res: any, status: number, data: unknown): void {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.status(status).json(data);
}

function isValidMessage(message: any): message is { role: string; content: string } {
  return !!message && typeof message.role === 'string' && typeof message.content === 'string';
}

export default async function handler(req: any, res: any): Promise<void> {
  applyCors(req, res);

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'method_not_allowed' });
    return;
  }

  const envResult = getEnvConfig();
  if (!envResult.ok) {
    sendJson(res, envResult.error.status, { error: envResult.error.code, message: envResult.error.message });
    return;
  }

  let body: any = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      sendJson(res, 400, { error: 'invalid_json' });
      return;
    }
  }

  const model = body?.model;
  const messages = body?.messages;
  const temperature = body?.temperature;

  if (typeof model !== 'string' || !Array.isArray(messages) || messages.length === 0) {
    sendJson(res, 400, { error: 'invalid_payload' });
    return;
  }

  if (!messages.every(isValidMessage)) {
    sendJson(res, 400, { error: 'invalid_messages' });
    return;
  }

  const maxUserLength = messages
    .filter(message => message.role === 'user')
    .reduce((max: number, message: any) => Math.max(max, message.content.length), 0);

  if (maxUserLength > MAX_USER_CONTENT_LENGTH) {
    sendJson(res, 413, { error: 'payload_too_large' });
    return;
  }

  const payload: Record<string, unknown> = {
    model,
    messages,
  };

  if (typeof temperature === 'number') {
    payload.temperature = temperature;
  }

  const { apiKey, apiUrl } = envResult.config.openai;

  const upstream = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  const upstreamBody = await upstream.text();

  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  const contentType = upstream.headers.get('content-type');
  if (contentType) {
    res.setHeader('Content-Type', contentType);
  }

  res.status(upstream.status).send(upstreamBody);
}
