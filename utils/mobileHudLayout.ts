export interface MobileHudLayoutInput {
  headerHeight: number;
  faderHeight: number;
  gap?: number;
  minTop?: number;
  minBottom?: number;
  viewportHeight?: number;
  minCenterHeight?: number;
}

export interface MobileHudInsets {
  top: number;
  bottom: number;
}

const clampPositive = (value: number, fallback: number) => {
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return value;
};

export const computeMobileHudInsets = ({
  headerHeight,
  faderHeight,
  gap = 8,
  minTop = 72,
  minBottom = 132,
  viewportHeight,
  minCenterHeight = 260
}: MobileHudLayoutInput): MobileHudInsets => {
  const safeHeader = clampPositive(headerHeight, 76);
  const safeFader = clampPositive(faderHeight, 176);
  const safeGap = clampPositive(gap, 8);
  const safeMinCenterHeight = clampPositive(minCenterHeight, 260);

  let top = Math.max(minTop, Math.round(safeHeader + safeGap));
  let bottom = Math.max(minBottom, Math.round(safeFader + safeGap));

  if (Number.isFinite(viewportHeight) && (viewportHeight as number) > 0) {
    const safeViewport = viewportHeight as number;
    const maxInsetSum = Math.max(0, Math.round(safeViewport - safeMinCenterHeight));
    let overflow = top + bottom - maxInsetSum;

    if (overflow > 0) {
      const reducibleTop = Math.max(0, top - minTop);
      const topReduction = Math.min(reducibleTop, overflow);
      top -= topReduction;
      overflow -= topReduction;

      const reducibleBottom = Math.max(0, bottom - minBottom);
      const bottomReduction = Math.min(reducibleBottom, overflow);
      bottom -= bottomReduction;
    }
  }

  return {
    top,
    bottom
  };
};
