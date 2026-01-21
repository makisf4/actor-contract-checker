import { applyCors } from './_lib/cors';
import { getEnvConfig } from './_lib/env';

const MAX_USER_CONTENT_LENGTH = 200000;
const UPSTREAM_TIMEOUT_MS = 20000;
const RATE_LIMIT_WINDOW_MS = 60000;
const RATE_LIMIT_MAX = 30;
const DEFAULT_MODEL = 'gpt-4o-mini';
const ALLOWED_MODELS = new Set(['gpt-4o-mini', 'gpt-4.1-mini', 'gpt-4.1']);

// Best-effort rate limiting (serverless instances may reset)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function setSecurityHeaders(res: any): void {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Frame-Options', 'DENY');
}

function sendJson(res: any, status: number, data: unknown): void {
  setSecurityHeaders(res);
  res.status(status).json(data);
}

function isValidMessage(message: any): message is { role: string; content: string } {
  return !!message && typeof message.role === 'string' && typeof message.content === 'string';
}

function getClientIp(req: any): string {
  const forwarded = req?.headers?.['x-forwarded-for'];
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0].split(',')[0].trim() || 'unknown';
  }
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim() || 'unknown';
  }
  return 'unknown';
}

function checkRateLimit(ip: string): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const existing = rateLimitStore.get(ip);
  let entry = existing;
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };
  }
  entry.count += 1;
  rateLimitStore.set(ip, entry);
  if (entry.count > RATE_LIMIT_MAX) {
    const retryAfter = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
    return { ok: false, retryAfter };
  }
  return { ok: true, retryAfter: 0 };
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

  const ip = getClientIp(req);
  const rateLimit = checkRateLimit(ip);
  if (!rateLimit.ok) {
    res.setHeader('Retry-After', String(rateLimit.retryAfter));
    sendJson(res, 429, { error: 'rate_limited' });
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

  let modelToUse = model;
  if (!ALLOWED_MODELS.has(model)) {
    modelToUse = DEFAULT_MODEL;
    res.setHeader('X-Model-Overridden', '1');
  }

  const maxUserLength = messages
    .filter(message => message.role === 'user')
    .reduce((max: number, message: any) => Math.max(max, message.content.length), 0);

  if (maxUserLength > MAX_USER_CONTENT_LENGTH) {
    sendJson(res, 413, { error: 'payload_too_large' });
    return;
  }

  const payload: Record<string, unknown> = {
    model: modelToUse,
    messages,
  };

  if (typeof temperature === 'number') {
    payload.temperature = temperature;
  }

  const { apiKey, apiUrl } = envResult.config.openai;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  let upstream: Response;
  try {
    upstream = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error?.name === 'AbortError') {
      sendJson(res, 504, { error: 'upstream_timeout' });
      return;
    }
    sendJson(res, 502, { error: 'upstream_error' });
    return;
  } finally {
    clearTimeout(timeoutId);
  }

  const upstreamBody = await upstream.text();

  if (!upstream.ok) {
    try {
      const parsed = JSON.parse(upstreamBody);
      sendJson(res, upstream.status, parsed);
    } catch {
      sendJson(res, upstream.status, { error: 'upstream_error' });
    }
    return;
  }

  setSecurityHeaders(res);
  const contentType = upstream.headers.get('content-type');
  if (contentType) {
    res.setHeader('Content-Type', contentType);
  }

  res.status(upstream.status).send(upstreamBody);
}
