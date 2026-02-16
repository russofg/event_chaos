export type ExternalAIProvider = 'YI' | 'OPENAI' | 'GEMINI';

export interface AIRuntimeEnv {
  VITE_YI_API_KEY?: string;
  VITE_OPENAI_API_KEY?: string;
  VITE_GEMINI_API_KEY?: string;
}

export interface AIRuntimeConfig {
  mode: 'LOCAL_ONLY' | 'EXTERNAL_OPTIONAL';
  provider: ExternalAIProvider | null;
  hasApiKey: boolean;
}

const INVALID_KEYS = new Set([
  '',
  'PLACEHOLDER_API_KEY',
  'YOUR_API_KEY',
  'CHANGE_ME'
]);

const normalizeKey = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

const hasUsableKey = (value: unknown): boolean => {
  const normalized = normalizeKey(value);
  if (!normalized) return false;
  return !INVALID_KEYS.has(normalized.toUpperCase());
};

const getRuntimeEnv = (): AIRuntimeEnv => {
  const env = (import.meta as ImportMeta & { env?: AIRuntimeEnv }).env || {};
  return {
    VITE_YI_API_KEY: env.VITE_YI_API_KEY,
    VITE_OPENAI_API_KEY: env.VITE_OPENAI_API_KEY,
    VITE_GEMINI_API_KEY: env.VITE_GEMINI_API_KEY
  };
};

export const resolveAIRuntimeConfig = (env: AIRuntimeEnv): AIRuntimeConfig => {
  if (hasUsableKey(env.VITE_YI_API_KEY)) {
    return { mode: 'EXTERNAL_OPTIONAL', provider: 'YI', hasApiKey: true };
  }
  if (hasUsableKey(env.VITE_OPENAI_API_KEY)) {
    return { mode: 'EXTERNAL_OPTIONAL', provider: 'OPENAI', hasApiKey: true };
  }
  if (hasUsableKey(env.VITE_GEMINI_API_KEY)) {
    return { mode: 'EXTERNAL_OPTIONAL', provider: 'GEMINI', hasApiKey: true };
  }
  return { mode: 'LOCAL_ONLY', provider: null, hasApiKey: false };
};

export const getAIRuntimeConfig = (envOverrides: AIRuntimeEnv = {}): AIRuntimeConfig => {
  const runtimeEnv = getRuntimeEnv();
  return resolveAIRuntimeConfig({
    ...runtimeEnv,
    ...envOverrides
  });
};

export const isExternalAIRuntimeEnabled = (envOverrides: AIRuntimeEnv = {}): boolean => {
  return getAIRuntimeConfig(envOverrides).mode === 'EXTERNAL_OPTIONAL';
};
