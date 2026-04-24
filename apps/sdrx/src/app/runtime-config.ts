declare global {
  interface Window {
    __SDR_CONFIG__?: {
      apiBaseUrl?: string;
    };
  }
}

export type RuntimeConfig = {
  apiBaseUrl: string;
};

export function getRuntimeConfig(): RuntimeConfig {
  const raw = window.__SDR_CONFIG__?.apiBaseUrl ?? '';
  const apiBaseUrl = raw.trim().replace(/\/$/, '');
  return { apiBaseUrl };
}

export {};
