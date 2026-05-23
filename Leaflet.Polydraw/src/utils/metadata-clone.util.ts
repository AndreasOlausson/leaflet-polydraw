export function cloneMetadataValue<T>(value: T): T {
  if (value === null || value === undefined) {
    return value;
  }

  try {
    return structuredClone(value);
  } catch {
    return cloneMetadataFallback(value);
  }
}

function cloneMetadataFallback<T>(value: T, seen = new WeakMap<object, unknown>()): T {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (value instanceof Date) {
    return new Date(value.getTime()) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => cloneMetadataFallback(item, seen)) as T;
  }

  if (seen.has(value)) {
    return seen.get(value) as T;
  }

  const clone: Record<string, unknown> = {};
  seen.set(value, clone);

  Object.entries(value as Record<string, unknown>).forEach(([key, item]) => {
    clone[key] = cloneMetadataFallback(item, seen);
  });

  return clone as T;
}
