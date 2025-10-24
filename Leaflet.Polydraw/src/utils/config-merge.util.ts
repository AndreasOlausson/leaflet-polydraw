export function deepMerge<T>(target: T, source: Partial<T>): T {
  // Loop keys in source
  for (const key in source) {
    const sourceValue = source[key];
    const targetValue = (target as any)[key];

    if (sourceValue && typeof sourceValue === 'object' && !Array.isArray(sourceValue)) {
      // Merge object recursively
      (target as any)[key] = deepMerge(targetValue || ({} as typeof sourceValue), sourceValue);
    } else if (sourceValue !== undefined) {
      // Copy primitive values or arrays directly
      (target as any)[key] = sourceValue;
    }
  }
  return target;
}
