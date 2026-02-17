import { describe, expect, it } from 'vitest';
import { getUIButtonClasses } from '../utils/uiSystem';

describe('UI System Regressions', () => {
  it('returns base/variant/state classes for active buttons', () => {
    const primary = getUIButtonClasses({ variant: 'primary', disabled: false });
    const danger = getUIButtonClasses({ variant: 'danger', disabled: false });

    expect(primary.base).toBe('aaa-btn');
    expect(primary.variant).toBe('aaa-btn-primary');
    expect(primary.state).toBe('aaa-btn-interactive');

    expect(danger.variant).toBe('aaa-btn-danger');
    expect(danger.state).toBe('aaa-btn-interactive');
  });

  it('returns disabled state class when button is disabled', () => {
    const neutralDisabled = getUIButtonClasses({ variant: 'neutral', disabled: true });

    expect(neutralDisabled.base).toBe('aaa-btn');
    expect(neutralDisabled.variant).toBe('aaa-btn-neutral');
    expect(neutralDisabled.state).toBe('aaa-btn-disabled');
  });
});
