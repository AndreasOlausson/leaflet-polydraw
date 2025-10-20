import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ModeManager } from '../../src/managers/mode-manager';
import { EventManager } from '../../src/managers/event-manager';
import { DrawMode } from '../../src/enums';
import type { PolydrawConfig } from '../../src/types/polydraw-interfaces';
import { createMockConfig } from './utils/mock-factory';

describe('ModeManager', () => {
  let modeManager: ModeManager;
  let eventManager: EventManager;
  let config: PolydrawConfig;

  beforeEach(() => {
    // Create mock EventManager
    eventManager = {
      emit: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      eventListeners: new Map(),
    } as any;

    // Create mock config using factory
    config = createMockConfig({
      modes: {
        dragPolygons: true,
        dragElbow: false,
      },
    }) as PolydrawConfig;

    modeManager = new ModeManager(config, eventManager);
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
    // Create a specific config for this test where dragElbow is enabled
    const testConfig = {
      ...config,
      modes: { ...config.modes, dragElbow: true },
    };
    const managerWithDrag = new ModeManager(testConfig, eventManager);

    // Go into a drawing mode first
    managerWithDrag.updateStateForMode(DrawMode.Add);
    expect(managerWithDrag.getCurrentMode()).toBe(DrawMode.Add);

    // Transition back to Off mode
    managerWithDrag.updateStateForMode(DrawMode.Off);
    expect(managerWithDrag.getCurrentMode()).toBe(DrawMode.Off);
    expect(managerWithDrag.isInOffMode()).toBe(true);
    expect(managerWithDrag.isInDrawingMode()).toBe(false);
    // This should now pass because we enabled it in the config for this test
    expect(managerWithDrag.canPerformAction('markerDrag')).toBe(true);
    expect(managerWithDrag.shouldShowCrosshairCursor()).toBe(false);
  });

  it('should respect config options for initial state', () => {
    const customConfig = {
      ...config,
      modes: { ...config.modes, dragPolygons: false, dragElbow: false },
    };
    const manager = new ModeManager(customConfig, eventManager);
    expect(manager.canPerformAction('polygonDrag')).toBe(false);
    expect(manager.canPerformAction('markerDrag')).toBe(false);
  });
});
