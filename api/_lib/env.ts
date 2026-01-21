type EnvError = {
  status: number;
  code: string;
  message: string;
};

type EnvConfig = {
  provider: 'openai';
  openai: {
    apiKey: string;
    apiUrl: string;
  };
};

type EnvResult =
  | { ok: true; config: EnvConfig }
  | { ok: false; error: EnvError };

const DEFAULT_PROVIDER = 'openai';
const DEFAULT_OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

function isAllowedProviderUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    const host = parsed.hostname.toLowerCase();
    const path = parsed.pathname;
    return host === 'api.openai.com' && path.startsWith('/v1/chat/completions');
  } catch {
    return false;
  }
}

export function getEnvConfig(): EnvResult {
  const providerRaw = (process.env.LLM_PROVIDER || DEFAULT_PROVIDER).toLowerCase();
  if (providerRaw !== 'openai') {
    return {
      ok: false,
      error: {
        status: 400,
        code: 'unsupported_provider',
        message: 'Unsupported LLM_PROVIDER. Supported: openai.',
      },
    };
  }

  const apiKey = process.env.OPENAI_API_KEY || '';
  if (!apiKey) {
    return {
      ok: false,
      error: {
        status: 500,
        code: 'missing_openai_api_key',
        message: 'OPENAI_API_KEY is required for provider=openai.',
      },
    };
  }

  const apiUrl = process.env.OPENAI_API_URL || DEFAULT_OPENAI_URL;
  if (!isAllowedProviderUrl(apiUrl)) {
    return {
      ok: false,
      error: {
        status: 500,
        code: 'invalid_provider_url',
        message: 'OPENAI_API_URL is not allowed.',
      },
    };
  }

  return {
    ok: true,
    config: {
      provider: 'openai',
      openai: {
        apiKey,
        apiUrl,
      },
    },
  };
}
