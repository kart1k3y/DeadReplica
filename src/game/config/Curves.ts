export type CurveType = 'linear' | 'exponential' | 'polynomial' | 'custom';

export interface CurveConfig {
  type: CurveType;
  baseMultiplier?: number;
  exponent?: number;
  rate?: number;
  factor?: number;
}

/**
 * Calculates a scaled value based on level and curve configuration.
 * All formulas are non-hardcoded and support infinite levels.
 */
export function evaluateCurve(baseValue: number, level: number, curve: CurveConfig): number {
  if (level <= 1) return baseValue;
  const levelDelta = level - 1;

  switch (curve.type) {
    case 'linear': {
      const step = curve.factor ?? 0.2;
      return baseValue * (1 + levelDelta * step);
    }
    case 'exponential': {
      const rate = curve.rate ?? 1.15;
      return baseValue * Math.pow(rate, levelDelta);
    }
    case 'polynomial': {
      const exp = curve.exponent ?? 1.5;
      const factor = curve.factor ?? 0.1;
      return baseValue * (1 + Math.pow(levelDelta, exp) * factor);
    }
    case 'custom': {
      const mult = curve.baseMultiplier ?? 1.25;
      return baseValue * (1 + Math.log2(level) * mult);
    }
    default:
      return baseValue * (1 + levelDelta * 0.15);
  }
}
