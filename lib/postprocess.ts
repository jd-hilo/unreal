/**
 * Post-processing utilities for decision predictions
 * Includes calibration, uncertainty calculation, and probability normalization
 */

/**
 * Renormalize probabilities to sum to 1
 */
export function renormalize(probs: Record<string, number>): Record<string, number> {
  const sum = Object.values(probs).reduce((acc, val) => acc + val, 0);
  if (sum === 0) {
    // If all probabilities are 0, return uniform distribution
    const keys = Object.keys(probs);
    return Object.fromEntries(keys.map((k) => [k, 1 / keys.length]));
  }
  return Object.fromEntries(Object.entries(probs).map(([k, v]) => [k, v / sum]));
}

/**
 * Calculate entropy-based uncertainty (0 = confident, 1 = uniform/uncertain)
 * Uses Shannon entropy normalized by max entropy for uniform distribution
 */
export function entropyUncertainty(probs: Record<string, number>): number {
  const p = Object.values(probs);
  if (p.length === 0) return 1;

  // Calculate Shannon entropy: H = -Σ(p_i * log(p_i))
  const H = -p.reduce((acc, x) => {
    if (x <= 0) return acc;
    return acc + x * Math.log(x);
  }, 0);

  // Maximum entropy for uniform distribution: H_max = log(n)
  const Hmax = Math.log(p.length);

  // Normalized uncertainty: 0 = confident (low entropy), 1 = uniform (max entropy)
  return Hmax === 0 ? 0 : H / Hmax;
}

/**
 * Apply temperature scaling to probabilities
 * T < 1 makes distribution more peaked (more confident)
 * T > 1 makes distribution more uniform (less confident)
 * @param probs - Original probabilities
 * @param T - Temperature parameter (default 0.9, which slightly increases confidence)
 */
export function temperatureScale(
  probs: Record<string, number>,
  T = 0.9
): Record<string, number> {
  if (T <= 0 || T === 1) return probs;

  // Scale probabilities by 1/T power
  const scaled = Object.fromEntries(
    Object.entries(probs).map(([k, v]) => [k, Math.pow(v, 1 / T)])
  );

  // Renormalize to sum to 1
  return renormalize(scaled);
}













