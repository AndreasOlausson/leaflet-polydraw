export function deepMerge<T>(target: T, ...sources: Partial<T>[]): T {
  if (!sources.length) return target;

  for (const source of sources) {
    if (!source) continue;

    for (const key in source) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sourceValue: any = (source as any)[key];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const targetValue: any = (target as any)[key];

      if (sourceValue && typeof sourceValue === 'object' && !Array.isArray(sourceValue)) {
        // Se till att målfacket är ett objekt innan rekursion
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const base: any =
          targetValue && typeof targetValue === 'object' && !Array.isArray(targetValue)
            ? targetValue
            : {};
        // Rekursiv merge
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (target as any)[key] = deepMerge(base, sourceValue);
      } else if (sourceValue !== undefined) {
        // Primitiv eller array: skriv över direkt
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (target as any)[key] = sourceValue;
      }
    }
  }

  return target;
}
