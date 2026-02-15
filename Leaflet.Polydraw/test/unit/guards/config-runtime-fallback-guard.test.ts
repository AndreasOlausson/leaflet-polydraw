import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultConfig } from '../../../src/config';
import { MarkerPosition } from '../../../src/enums';
import { applyRuntimeConfigFallbacks } from '../../../src/guards/config-runtime-fallback-guard';

describe('applyRuntimeConfigFallbacks', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('keeps valid numeric marker positions without warnings', () => {
    const warnSpy = vi.spyOn(console, 'warn');
    const config = structuredClone(defaultConfig);
    config.markers.markerInfoIcon.position = 5;
    config.markers.markerMenuIcon.position = 1;
    config.markers.markerDeleteIcon.position = 3;

    applyRuntimeConfigFallbacks(config);

    expect(config.markers.markerInfoIcon.position).toBe(5);
    expect(config.markers.markerMenuIcon.position).toBe(1);
    expect(config.markers.markerDeleteIcon.position).toBe(3);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('falls back invalid marker positions to defaults and warns', () => {
    const warnSpy = vi.spyOn(console, 'warn');
    const config = structuredClone(defaultConfig);
    config.markers.markerInfoIcon.position = 999 as MarkerPosition;
    config.markers.markerMenuIcon.position = Number.NaN as MarkerPosition;
    config.markers.markerDeleteIcon.position = null as unknown as MarkerPosition;

    applyRuntimeConfigFallbacks(config);

    expect(config.markers.markerInfoIcon.position).toBe(defaultConfig.markers.markerInfoIcon.position);
    expect(config.markers.markerMenuIcon.position).toBe(defaultConfig.markers.markerMenuIcon.position);
    expect(config.markers.markerDeleteIcon.position).toBe(
      defaultConfig.markers.markerDeleteIcon.position,
    );
    expect(warnSpy).toHaveBeenCalledTimes(3);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('markers.markerInfoIcon.position'),
    );
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('markers.markerMenuIcon.position'),
    );
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('markers.markerDeleteIcon.position'),
    );
  });

  it('falls back unsupported compass value MarkerPosition.Hole', () => {
    const warnSpy = vi.spyOn(console, 'warn');
    const config = structuredClone(defaultConfig);
    config.markers.markerInfoIcon.position = MarkerPosition.Hole;

    applyRuntimeConfigFallbacks(config);

    expect(config.markers.markerInfoIcon.position).toBe(defaultConfig.markers.markerInfoIcon.position);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('markers.markerInfoIcon.position'),
    );
  });
});
