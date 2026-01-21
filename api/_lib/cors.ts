type CorsOptions = {
  origin?: string | null;
};

const allowedOriginPatterns: Array<RegExp> = [
  /^http:\/\/localhost(?::\d+)?$/i,
  /^http:\/\/127\.0\.0\.1(?::\d+)?$/i,
  /^https?:\/\/.*\.expo\.dev$/i,
  /^https?:\/\/.*\.exp\.direct$/i,
  /^exp:\/\/.*$/i,
  /^exps:\/\/.*$/i,
];

function isAllowedOrigin(origin: string): boolean {
  return allowedOriginPatterns.some(pattern => pattern.test(origin));
}

export function applyCors(req: any, res: any, options: CorsOptions = {}): void {
  const origin = options.origin ?? req?.headers?.origin ?? '';
  const allowAny = !origin;
  const allowed = allowAny || isAllowedOrigin(origin);

  if (allowAny) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  } else if (allowed) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', 'null');
  }

  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
}
