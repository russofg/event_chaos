import { describe, expect, it } from 'vitest';
import { getProceduralEventGenerationDelayMs } from '../hooks/useAIEventGenerator';
import { resolveAIRuntimeConfig } from '../utils/aiRuntime';

describe('Offline AI Runtime', () => {
  it('uses local-only mode when no API keys are configured', () => {
    const config = resolveAIRuntimeConfig({});

    expect(config).toEqual({
      mode: 'LOCAL_ONLY',
      provider: null,
      hasApiKey: false
    });
  });

  it('ignores placeholder keys and stays in local-only mode', () => {
    const config = resolveAIRuntimeConfig({
      VITE_YI_API_KEY: 'PLACEHOLDER_API_KEY',
      VITE_OPENAI_API_KEY: '  '
    });

    expect(config.mode).toBe('LOCAL_ONLY');
    expect(config.provider).toBeNull();
    expect(config.hasApiKey).toBe(false);
  });

  it('detects optional external mode when a Yi key exists', () => {
    const config = resolveAIRuntimeConfig({
      VITE_YI_API_KEY: 'yi_live_key_for_runtime_test'
    });

    expect(config.mode).toBe('EXTERNAL_OPTIONAL');
    expect(config.provider).toBe('YI');
    expect(config.hasApiKey).toBe(true);
  });

  it('keeps faster procedural delay in local-only mode', () => {
    const localDelay = getProceduralEventGenerationDelayMs(resolveAIRuntimeConfig({}));
    const externalDelay = getProceduralEventGenerationDelayMs(
      resolveAIRuntimeConfig({ VITE_YI_API_KEY: 'yi_live_key_for_runtime_test' })
    );

    expect(localDelay).toBeLessThan(externalDelay);
    expect(localDelay).toBe(120);
    expect(externalDelay).toBe(260);
  });
});
