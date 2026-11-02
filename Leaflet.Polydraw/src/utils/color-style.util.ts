export type RgbColor = [number, number, number];

export interface PolygonColorTheme {
  color: string;
  fillColor: string;
}

export interface MarkerColorTheme {
  backgroundColor: string;
  borderColor: string;
}

export const DRAW_LAYER_COLOR_PALETTE = [
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#3b82f6',
  '#4f46e5',
  '#8b5cf6',
  '#fca5a5',
  '#fdba74',
  '#fde047',
  '#86efac',
  '#93c5fd',
  '#a5b4fc',
  '#c4b5fd',
  '#b91c1c',
  '#c2410c',
  '#a16207',
  '#15803d',
  '#1d4ed8',
  '#4338ca',
  '#6d28d9',
] as const;

export function normalizeHexColor(value: string | undefined, fallback: string): string {
  if (!value) {
    return fallback;
  }

  const trimmed = value.trim();
  if (/^#[0-9a-f]{6}$/i.test(trimmed)) {
    return trimmed.toLowerCase();
  }
  if (/^#[0-9a-f]{3}$/i.test(trimmed)) {
    const [, r, g, b] = trimmed.toLowerCase();
    return `#${r}${r}${g}${g}${b}${b}`;
  }

  return fallback;
}

export function parseHexColor(value: string, fallback = '#50622b'): RgbColor {
  const normalized = normalizeHexColor(value, fallback);
  return [
    Number.parseInt(normalized.slice(1, 3), 16),
    Number.parseInt(normalized.slice(3, 5), 16),
    Number.parseInt(normalized.slice(5, 7), 16),
  ];
}

export function toHexColor([red, green, blue]: RgbColor): string {
  return `#${[red, green, blue]
    .map((channel) => Math.min(255, Math.max(0, channel)).toString(16).padStart(2, '0'))
    .join('')}`;
}

export function darkenHexColor(color: string, factor: number): string {
  const rgb = parseHexColor(color);
  return toHexColor(rgb.map((channel) => Math.round(channel * factor)) as RgbColor);
}

export function lightenHexColor(color: string, amount: number): string {
  const clampedAmount = Math.min(1, Math.max(0, amount));
  const rgb = parseHexColor(color);
  return toHexColor(
    rgb.map((channel) => Math.round(channel + (255 - channel) * clampedAmount)) as RgbColor,
  );
}

export function createPolygonColorTheme(fillColor: string): PolygonColorTheme {
  const normalizedFillColor = normalizeHexColor(fillColor, '#50622b');
  return {
    color: darkenHexColor(normalizedFillColor, 0.55),
    fillColor: normalizedFillColor,
  };
}

export function createMarkerColorTheme(fillColor: string, borderColor?: string): MarkerColorTheme {
  const polygonTheme = createPolygonColorTheme(fillColor);
  return {
    backgroundColor: lightenHexColor(polygonTheme.fillColor, 0.65),
    borderColor: normalizeHexColor(borderColor, polygonTheme.color),
  };
}
