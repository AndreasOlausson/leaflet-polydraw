import { describe, it, expect, beforeEach } from 'vitest';
import { ModeManager } from '../src/managers/mode-manager';
import { DrawMode } from '../src/enums';
import type { PolydrawConfig } from '../src/types/polydraw-interfaces';
import defaultConfig from '../src/config.json';

describe('ModeManager', () => {
  let modeManager: ModeManager;
  const config: PolydrawConfig = {
    ...defaultConfig,
    visualOptimizationLevel: 0,
    dragPolygons: {
      ...defaultConfig.dragPolygons,
      enabled: (defaultConfig.dragPolygons as any).enabled ?? true,
    },
    units: {
      metric: true,
      imperial: false,
    },
    precision: {
      area: 2,
      perimeter: 2,
    },
    polygonOptions: {
      ...defaultConfig.polygonOptions,
      weight: 3,
      opacity: 1,
      fillOpacity: 0.5,
    },
    markers: {
      ...defaultConfig.markers,
      markerIcon: {
        ...defaultConfig.markers.markerIcon,
        styleClasses: defaultConfig.markers.markerIcon.styleClasses as string[],
        zIndexOffset: defaultConfig.markers.markerIcon.zIndexOffset ?? undefined,
      },
      markerMenuIcon: {
        ...defaultConfig.markers.markerMenuIcon,
        styleClasses: defaultConfig.markers.markerMenuIcon.styleClasses as string[],
        zIndexOffset: defaultConfig.markers.markerMenuIcon.zIndexOffset ?? undefined,
      },
      markerDeleteIcon: {
        ...defaultConfig.markers.markerDeleteIcon,
        styleClasses: defaultConfig.markers.markerDeleteIcon.styleClasses as string[],
        zIndexOffset: defaultConfig.markers.markerDeleteIcon.zIndexOffset ?? undefined,
      },
      markerInfoIcon: {
        ...defaultConfig.markers.markerInfoIcon,
        styleClasses: defaultConfig.markers.markerInfoIcon.styleClasses as string[],
        zIndexOffset: defaultConfig.markers.markerInfoIcon.zIndexOffset ?? undefined,
      },
      holeIcon: {
        ...defaultConfig.markers.holeIcon,
        styleClasses: defaultConfig.markers.holeIcon.styleClasses as string[],
        zIndexOffset: defaultConfig.markers.holeIcon.zIndexOffset ?? undefined,
      },
    },
  } as PolydrawConfig;

  beforeEach(() => {
    modeManager = new ModeManager(config);
  });

  it('should initialize in Off mode', () => {
    expect(modeManager.getCurrentMode()).toBe(DrawMode.Off);
    expect(modeManager.isInOffMode()).toBe(true);
    expect(modeManager.isInDrawingMode()).toBe(false);
  });

  it('should transition to Add mode correctly', () => {
    modeManager.updateStateForMode(DrawMode.Add);
    expect(modeManager.getCurrentMode()).toBe(DrawMode.Add);
    expect(modeManager.isInDrawingMode()).toBe(true);
    expect(modeManager.canPerformAction('markerDrag')).toBe(false);
    expect(modeManager.shouldShowCrosshairCursor()).toBe(true);
  });

  it('should transition to Subtract mode correctly', () => {
    modeManager.updateStateForMode(DrawMode.Subtract);
    expect(modeManager.getCurrentMode()).toBe(DrawMode.Subtract);
    expect(modeManager.isInDrawingMode()).toBe(true);
    expect(modeManager.canPerformAction('polygonDrag')).toBe(false);
    expect(modeManager.shouldShowCrosshairCursor()).toBe(true);
  });

  it('should transition to PointToPoint mode correctly', () => {
    modeManager.updateStateForMode(DrawMode.PointToPoint);
    expect(modeManager.getCurrentMode()).toBe(DrawMode.PointToPoint);
    expect(modeManager.isInDrawingMode()).toBe(true);
    expect(modeManager.canPerformAction('mapDrag')).toBe(false);
    expect(modeManager.shouldShowCrosshairCursor()).toBe(true);
  });

  it('should return to Off mode from a drawing mode', () => {
    // Go into a drawing mode first
    modeManager.updateStateForMode(DrawMode.Add);
    expect(modeManager.getCurrentMode()).toBe(DrawMode.Add);

    // Transition back to Off mode
    modeManager.updateStateForMode(DrawMode.Off);
    expect(modeManager.getCurrentMode()).toBe(DrawMode.Off);
    expect(modeManager.isInOffMode()).toBe(true);
    expect(modeManager.isInDrawingMode()).toBe(false);
    expect(modeManager.canPerformAction('markerDrag')).toBe(true);
    expect(modeManager.shouldShowCrosshairCursor()).toBe(false);
  });

  it('should respect config options for initial state', () => {
    const customConfig = {
      ...config,
      modes: { ...config.modes, dragPolygons: false, dragElbow: false },
    };
    const manager = new ModeManager(customConfig);
    expect(manager.canPerformAction('polygonDrag')).toBe(false);
    expect(manager.canPerformAction('markerDrag')).toBe(false);
  });
});
