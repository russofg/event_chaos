export type UIButtonVariant = 'primary' | 'danger' | 'success' | 'neutral';

export interface UIButtonClassInput {
  variant: UIButtonVariant;
  disabled?: boolean;
}

export interface UIButtonClassOutput {
  base: string;
  variant: string;
  state: string;
}

const VARIANT_CLASS_MAP: Record<UIButtonVariant, string> = {
  primary: 'aaa-btn-primary',
  danger: 'aaa-btn-danger',
  success: 'aaa-btn-success',
  neutral: 'aaa-btn-neutral'
};

export const getUIButtonClasses = ({
  variant,
  disabled = false
}: UIButtonClassInput): UIButtonClassOutput => {
  return {
    base: 'aaa-btn',
    variant: VARIANT_CLASS_MAP[variant],
    state: disabled ? 'aaa-btn-disabled' : 'aaa-btn-interactive'
  };
};
