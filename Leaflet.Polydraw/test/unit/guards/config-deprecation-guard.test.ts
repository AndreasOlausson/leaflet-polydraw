import { describe, it, expect, vi, beforeEach } from 'vitest';
import { warnIfUsingDeprecatedConfiguration } from '../../../src/guards/config-deprecation-guard';
import type { PolydrawConfig } from '../../../src/types/polydraw-interfaces';

/* eslint-disable @typescript-eslint/no-explicit-any */
describe('warnIfUsingDeprecatedConfiguration', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should not warn when a clean v2 config is passed', () => {
    const warnSpy = vi.spyOn(console, 'warn');
    const config: Partial<PolydrawConfig> = {
      tools: { draw: true, subtract: true, p2p: true, p2pSubtract: true, clone: true, erase: true },
    };

    warnIfUsingDeprecatedConfiguration(config);

    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('should not mutate config when no deprecated keys are present', () => {
    const config: Partial<PolydrawConfig> = {
      tools: { draw: false, subtract: true, p2p: true, p2pSubtract: true, clone: true, erase: true },
    };
    const original = structuredClone(config);

    warnIfUsingDeprecatedConfiguration(config);

    expect(config).toEqual(original);
  });

  describe('Legacy modes.* tool toggles', () => {
    it('should warn when legacy modes.draw is passed', () => {
      const warnSpy = vi.spyOn(console, 'warn');
      const config = { modes: { draw: false } } as any;

      warnIfUsingDeprecatedConfiguration(config);

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('`config.modes.*` tool toggles are deprecated'),
      );
    });

    it('should migrate modes.draw: false to tools.draw: false', () => {
      vi.spyOn(console, 'warn');
      const config = { modes: { draw: false } } as any;

      warnIfUsingDeprecatedConfiguration(config);

      expect(config.tools.draw).toBe(false);
    });

    it('should migrate modes.subtract: false to tools.subtract: false', () => {
      vi.spyOn(console, 'warn');
      const config = { modes: { subtract: false } } as any;

      warnIfUsingDeprecatedConfiguration(config);

      expect(config.tools.subtract).toBe(false);
    });

    it('should migrate modes.p2p: false to tools.p2p: false', () => {
      vi.spyOn(console, 'warn');
      const config = { modes: { p2p: false } } as any;

      warnIfUsingDeprecatedConfiguration(config);

      expect(config.tools.p2p).toBe(false);
    });

    it('should migrate modes.p2pSubtract: false to tools.p2pSubtract: false', () => {
      vi.spyOn(console, 'warn');
      const config = { modes: { p2pSubtract: false } } as any;

      warnIfUsingDeprecatedConfiguration(config);

      expect(config.tools.p2pSubtract).toBe(false);
    });

    it('should migrate modes.deleteAll: false to tools.erase: false', () => {
      vi.spyOn(console, 'warn');
      const config = { modes: { deleteAll: false } } as any;

      warnIfUsingDeprecatedConfiguration(config);

      expect(config.tools.erase).toBe(false);
    });

    it('should migrate modes.clonePolygons: false to tools.clone: false', () => {
      vi.spyOn(console, 'warn');
      const config = { modes: { clonePolygons: false } } as any;

      warnIfUsingDeprecatedConfiguration(config);

      expect(config.tools.clone).toBe(false);
    });

    it('should not overwrite explicitly set tools values', () => {
      vi.spyOn(console, 'warn');
      const config = {
        modes: { draw: false },
        tools: { draw: true },
      } as any;

      warnIfUsingDeprecatedConfiguration(config);

      expect(config.tools.draw).toBe(true);
    });

    it('should migrate multiple legacy keys at once', () => {
      vi.spyOn(console, 'warn');
      const config = {
        modes: { draw: false, deleteAll: false, clonePolygons: false },
      } as any;

      warnIfUsingDeprecatedConfiguration(config);

      expect(config.tools.draw).toBe(false);
      expect(config.tools.erase).toBe(false);
      expect(config.tools.clone).toBe(false);
    });
  });

  describe('Deprecated markers.visualOptimization keys', () => {
    it('should warn when deprecated visualOptimization keys are present', () => {
      const warnSpy = vi.spyOn(console, 'warn');
      const config = {
        markers: {
          visualOptimization: { useAngles: true },
        },
      } as any;

      warnIfUsingDeprecatedConfiguration(config);

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('`markers.visualOptimization` is deprecated'),
      );
    });

    it('should warn for useBoundingBox', () => {
      const warnSpy = vi.spyOn(console, 'warn');
      const config = {
        markers: {
          visualOptimization: { useBoundingBox: false },
        },
      } as any;

      warnIfUsingDeprecatedConfiguration(config);

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('`markers.visualOptimization` is deprecated'),
      );
    });

    it('should warn for thresholdDistance', () => {
      const warnSpy = vi.spyOn(console, 'warn');
      const config = {
        markers: {
          visualOptimization: { thresholdDistance: 0.5 },
        },
      } as any;

      warnIfUsingDeprecatedConfiguration(config);

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('`markers.visualOptimization` is deprecated'),
      );
    });
  });

  it('should fire all 4 warnings independently when multiple deprecated categories are present', () => {
    const warnSpy = vi.spyOn(console, 'warn');
    const config = {
      modes: { draw: false },
      markers: { visualOptimization: { useAngles: true } },
      polygonCreation: { algorithm: 'buffer' },
      colors: { polyline: '#ff0000' },
    } as any;

    warnIfUsingDeprecatedConfiguration(config);

    expect(warnSpy).toHaveBeenCalledTimes(4);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('`config.modes.*` tool toggles are deprecated'));
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('`markers.visualOptimization` is deprecated'));
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('`polygonCreation.algorithm: "buffer"` is deprecated'),
    );
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('`polyLineOptions`'));
  });

  describe('Legacy boundingBox -> polygonTools.bbox', () => {
    it('should warn when top-level boundingBox is present', () => {
      const warnSpy = vi.spyOn(console, 'warn');
      const config = { boundingBox: { addMidPointMarkers: false } } as any;

      warnIfUsingDeprecatedConfiguration(config);

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('`config.boundingBox` is deprecated'),
      );
    });

    it('should migrate boundingBox.addMidPointMarkers to polygonTools.bbox.addMidPointMarkers', () => {
      vi.spyOn(console, 'warn');
      const config = { boundingBox: { addMidPointMarkers: false } } as any;

      warnIfUsingDeprecatedConfiguration(config);

      expect(config.polygonTools.bbox.addMidPointMarkers).toBe(false);
    });

    it('should not overwrite explicitly set polygonTools.bbox.addMidPointMarkers', () => {
      vi.spyOn(console, 'warn');
      const config = {
        boundingBox: { addMidPointMarkers: false },
        polygonTools: { bbox: { addMidPointMarkers: true } },
      } as any;

      warnIfUsingDeprecatedConfiguration(config);

      expect(config.polygonTools.bbox.addMidPointMarkers).toBe(true);
    });
  });

  describe('Legacy bezier -> polygonTools.bezier', () => {
    it('should warn when top-level bezier is present', () => {
      const warnSpy = vi.spyOn(console, 'warn');
      const config = { bezier: { resolution: 5000 } } as any;

      warnIfUsingDeprecatedConfiguration(config);

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('`config.bezier` is deprecated'),
      );
    });

    it('should migrate all bezier properties to polygonTools.bezier', () => {
      vi.spyOn(console, 'warn');
      const config = {
        bezier: {
          resolution: 5000,
          sharpness: 0.5,
          resampleMultiplier: 5,
          maxNodes: 500,
          visualOptimizationLevel: 8,
          ghostMarkers: true,
        },
      } as any;

      warnIfUsingDeprecatedConfiguration(config);

      expect(config.polygonTools.bezier.resolution).toBe(5000);
      expect(config.polygonTools.bezier.sharpness).toBe(0.5);
      expect(config.polygonTools.bezier.resampleMultiplier).toBe(5);
      expect(config.polygonTools.bezier.maxNodes).toBe(500);
      expect(config.polygonTools.bezier.visualOptimizationLevel).toBe(8);
      expect(config.polygonTools.bezier.ghostMarkers).toBe(true);
    });

    it('should not overwrite explicitly set polygonTools.bezier values', () => {
      vi.spyOn(console, 'warn');
      const config = {
        bezier: { resolution: 5000, sharpness: 0.5 },
        polygonTools: { bezier: { resolution: 9000 } },
      } as any;

      warnIfUsingDeprecatedConfiguration(config);

      expect(config.polygonTools.bezier.resolution).toBe(9000);
      expect(config.polygonTools.bezier.sharpness).toBe(0.5);
    });

    it('should not warn when polygonTools.bezier is used directly', () => {
      const warnSpy = vi.spyOn(console, 'warn');
      const config = {
        polygonTools: { bezier: { enabled: true, resolution: 5000 } },
      } as any;

      warnIfUsingDeprecatedConfiguration(config);

      expect(warnSpy).not.toHaveBeenCalled();
    });
  });

  describe('Legacy maxHistorySize -> history.maxSize', () => {
    it('should warn when top-level maxHistorySize is present', () => {
      const warnSpy = vi.spyOn(console, 'warn');
      const config = { maxHistorySize: 100 } as any;

      warnIfUsingDeprecatedConfiguration(config);

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('`config.maxHistorySize` is deprecated'),
      );
    });

    it('should migrate maxHistorySize to history.maxSize', () => {
      vi.spyOn(console, 'warn');
      const config = { maxHistorySize: 100 } as any;

      warnIfUsingDeprecatedConfiguration(config);

      expect(config.history.maxSize).toBe(100);
    });

    it('should not overwrite explicitly set history.maxSize', () => {
      vi.spyOn(console, 'warn');
      const config = {
        maxHistorySize: 100,
        history: { maxSize: 75 },
      } as any;

      warnIfUsingDeprecatedConfiguration(config);

      expect(config.history.maxSize).toBe(75);
    });

    it('should not warn when history.maxSize is used instead', () => {
      const warnSpy = vi.spyOn(console, 'warn');
      const config = { history: { maxSize: 100 } } as any;

      warnIfUsingDeprecatedConfiguration(config);

      expect(warnSpy).not.toHaveBeenCalled();
    });
  });

  describe('Legacy style keys -> styles.*', () => {
    it('should warn when polyLineOptions is present', () => {
      const warnSpy = vi.spyOn(console, 'warn');
      const config = { polyLineOptions: { weight: 3, opacity: 0.8 } } as any;

      warnIfUsingDeprecatedConfiguration(config);

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('`polyLineOptions`'),
      );
    });

    it('should warn when colors is present', () => {
      const warnSpy = vi.spyOn(console, 'warn');
      const config = { colors: { polyline: '#ff0000' } } as any;

      warnIfUsingDeprecatedConfiguration(config);

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('are deprecated in v2'),
      );
    });

    it('should migrate polyLineOptions to styles.polyline', () => {
      vi.spyOn(console, 'warn');
      const config = { polyLineOptions: { weight: 3, opacity: 0.8 } } as any;

      warnIfUsingDeprecatedConfiguration(config);

      expect(config.styles.polyline.weight).toBe(3);
      expect(config.styles.polyline.opacity).toBe(0.8);
    });

    it('should migrate subtractLineOptions to styles.subtractLine', () => {
      vi.spyOn(console, 'warn');
      const config = { subtractLineOptions: { weight: 4 } } as any;

      warnIfUsingDeprecatedConfiguration(config);

      expect(config.styles.subtractLine.weight).toBe(4);
    });

    it('should migrate polygonOptions to styles.polygon', () => {
      vi.spyOn(console, 'warn');
      const config = { polygonOptions: { weight: 5, fillOpacity: 0.3, smoothFactor: 0.5, noClip: false } } as any;

      warnIfUsingDeprecatedConfiguration(config);

      expect(config.styles.polygon.weight).toBe(5);
      expect(config.styles.polygon.fillOpacity).toBe(0.3);
      expect(config.styles.polygon.smoothFactor).toBe(0.5);
      expect(config.styles.polygon.noClip).toBe(false);
    });

    it('should migrate holeOptions to styles.hole', () => {
      vi.spyOn(console, 'warn');
      const config = { holeOptions: { weight: 3, fillOpacity: 0.6 } } as any;

      warnIfUsingDeprecatedConfiguration(config);

      expect(config.styles.hole.weight).toBe(3);
      expect(config.styles.hole.fillOpacity).toBe(0.6);
    });

    it('should migrate colors.polyline to styles.polyline.color', () => {
      vi.spyOn(console, 'warn');
      const config = { colors: { polyline: '#ff0000' } } as any;

      warnIfUsingDeprecatedConfiguration(config);

      expect(config.styles.polyline.color).toBe('#ff0000');
    });

    it('should migrate colors.polygon to styles.polygon.color and fillColor', () => {
      vi.spyOn(console, 'warn');
      const config = { colors: { polygon: { border: '#aaa', fill: '#bbb' } } } as any;

      warnIfUsingDeprecatedConfiguration(config);

      expect(config.styles.polygon.color).toBe('#aaa');
      expect(config.styles.polygon.fillColor).toBe('#bbb');
    });

    it('should migrate colors.hole to styles.hole.color and fillColor', () => {
      vi.spyOn(console, 'warn');
      const config = { colors: { hole: { border: '#cc0000', fill: '#ffdddd' } } } as any;

      warnIfUsingDeprecatedConfiguration(config);

      expect(config.styles.hole.color).toBe('#cc0000');
      expect(config.styles.hole.fillColor).toBe('#ffdddd');
    });

    it('should migrate colors.edgeHover to styles.ui.edgeHover.color', () => {
      vi.spyOn(console, 'warn');
      const config = { colors: { edgeHover: '#123456' } } as any;

      warnIfUsingDeprecatedConfiguration(config);

      expect(config.styles.ui.edgeHover.color).toBe('#123456');
    });

    it('should migrate colors.edgeDeletion.hover to styles.ui.edgeDeletion.color', () => {
      vi.spyOn(console, 'warn');
      const config = { colors: { edgeDeletion: { hover: '#abcdef' } } } as any;

      warnIfUsingDeprecatedConfiguration(config);

      expect(config.styles.ui.edgeDeletion.color).toBe('#abcdef');
    });

    it('should migrate colors.dragPolygons.subtract to styles.ui.dragSubtract.color', () => {
      vi.spyOn(console, 'warn');
      const config = { colors: { dragPolygons: { subtract: '#D9460F' } } } as any;

      warnIfUsingDeprecatedConfiguration(config);

      expect(config.styles.ui.dragSubtract.color).toBe('#D9460F');
    });

    it('should migrate colors.p2p.closingMarker to styles.ui.p2pClosingMarker.color', () => {
      vi.spyOn(console, 'warn');
      const config = { colors: { p2p: { closingMarker: '#4CAF50' } } } as any;

      warnIfUsingDeprecatedConfiguration(config);

      expect(config.styles.ui.p2pClosingMarker.color).toBe('#4CAF50');
    });

    it('should migrate colors.styles to styles.ui', () => {
      vi.spyOn(console, 'warn');
      const config = {
        colors: {
          styles: {
            controlButton: { backgroundColor: '#ccc', color: '#111' },
            indicatorActive: { backgroundColor: '#ffcc00' },
          },
        },
      } as any;

      warnIfUsingDeprecatedConfiguration(config);

      expect(config.styles.ui.controlButton.backgroundColor).toBe('#ccc');
      expect(config.styles.ui.indicatorActive.backgroundColor).toBe('#ffcc00');
    });

    it('should not overwrite explicitly set styles values', () => {
      vi.spyOn(console, 'warn');
      const config = {
        polyLineOptions: { weight: 5 },
        styles: { polyline: { weight: 10 } },
      } as any;

      warnIfUsingDeprecatedConfiguration(config);

      expect(config.styles.polyline.weight).toBe(10);
    });

    it('should only fire one warning for multiple legacy style keys', () => {
      const warnSpy = vi.spyOn(console, 'warn');
      const config = {
        polyLineOptions: { weight: 3 },
        polygonOptions: { weight: 4 },
        colors: { polyline: '#fff' },
      } as any;

      warnIfUsingDeprecatedConfiguration(config);

      const styleWarnings = warnSpy.mock.calls.filter(
        (call) => typeof call[0] === 'string' && call[0].includes('`polyLineOptions`'),
      );
      expect(styleWarnings).toHaveLength(1);
    });
  });

  describe('Deprecated polygonCreation.algorithm: "buffer"', () => {
    it('should warn when polygonCreation.algorithm is "buffer"', () => {
      const warnSpy = vi.spyOn(console, 'warn');
      const config = {
        polygonCreation: { algorithm: 'buffer' },
      } as any;

      warnIfUsingDeprecatedConfiguration(config);

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('`polygonCreation.algorithm: "buffer"` is deprecated'),
      );
    });

    it('should not warn when polygonCreation.algorithm is "concaveman"', () => {
      const warnSpy = vi.spyOn(console, 'warn');
      const config = {
        polygonCreation: { algorithm: 'concaveman' },
      } as any;

      warnIfUsingDeprecatedConfiguration(config);

      expect(warnSpy).not.toHaveBeenCalled();
    });
  });

  describe('Legacy defaultMode -> tools.default', () => {
    it('should warn when defaultMode is present', () => {
      const warnSpy = vi.spyOn(console, 'warn');
      const config = { defaultMode: 1 } as any;

      warnIfUsingDeprecatedConfiguration(config);

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('`config.defaultMode` is deprecated'),
      );
    });

    it('should migrate defaultMode to tools.default', () => {
      vi.spyOn(console, 'warn');
      const config = { defaultMode: 2 } as any;

      warnIfUsingDeprecatedConfiguration(config);

      expect(config.tools.default).toBe(2);
    });

    it('should not overwrite explicitly set tools.default', () => {
      vi.spyOn(console, 'warn');
      const config = { defaultMode: 2, tools: { default: 0 } } as any;

      warnIfUsingDeprecatedConfiguration(config);

      expect(config.tools.default).toBe(0);
    });
  });

  describe('Legacy dragPolygons -> interaction.drag', () => {
    it('should warn when dragPolygons is present', () => {
      const warnSpy = vi.spyOn(console, 'warn');
      const config = { dragPolygons: { opacity: 0.5 } } as any;

      warnIfUsingDeprecatedConfiguration(config);

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('`config.dragPolygons` is deprecated'),
      );
    });

    it('should migrate dragPolygons to interaction.drag', () => {
      vi.spyOn(console, 'warn');
      const config = { dragPolygons: { opacity: 0.5, dragCursor: 'grab' } } as any;

      warnIfUsingDeprecatedConfiguration(config);

      expect(config.interaction.drag.opacity).toBe(0.5);
      expect(config.interaction.drag.dragCursor).toBe('grab');
    });

    it('should not overwrite explicitly set interaction.drag', () => {
      vi.spyOn(console, 'warn');
      const config = {
        dragPolygons: { opacity: 0.5 },
        interaction: { drag: { opacity: 0.9 } },
      } as any;

      warnIfUsingDeprecatedConfiguration(config);

      expect(config.interaction.drag.opacity).toBe(0.9);
    });
  });

  describe('Legacy edgeDeletion -> interaction.edgeDeletion', () => {
    it('should warn when edgeDeletion is present', () => {
      const warnSpy = vi.spyOn(console, 'warn');
      const config = { edgeDeletion: { minVertices: 4 } } as any;

      warnIfUsingDeprecatedConfiguration(config);

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('`config.edgeDeletion` is deprecated'),
      );
    });

    it('should migrate edgeDeletion to interaction.edgeDeletion', () => {
      vi.spyOn(console, 'warn');
      const config = { edgeDeletion: { minVertices: 5 } } as any;

      warnIfUsingDeprecatedConfiguration(config);

      expect(config.interaction.edgeDeletion.minVertices).toBe(5);
    });

    it('should not overwrite explicitly set interaction.edgeDeletion', () => {
      vi.spyOn(console, 'warn');
      const config = {
        edgeDeletion: { minVertices: 5 },
        interaction: { edgeDeletion: { minVertices: 3 } },
      } as any;

      warnIfUsingDeprecatedConfiguration(config);

      expect(config.interaction.edgeDeletion.minVertices).toBe(3);
    });
  });

  describe('Legacy menuOperations -> polygonTools', () => {
    it('should warn when menuOperations is present', () => {
      const warnSpy = vi.spyOn(console, 'warn');
      const config = { menuOperations: { simplify: { enabled: true } } } as any;

      warnIfUsingDeprecatedConfiguration(config);

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('`config.menuOperations` is deprecated'),
      );
    });

    it('should migrate menuOperations to polygonTools', () => {
      vi.spyOn(console, 'warn');
      const config = { menuOperations: { simplify: { enabled: false } } } as any;

      warnIfUsingDeprecatedConfiguration(config);

      expect(config.polygonTools.simplify.enabled).toBe(false);
    });

    it('should not overwrite explicitly set polygonTools', () => {
      vi.spyOn(console, 'warn');
      const config = {
        menuOperations: { simplify: { enabled: false } },
        polygonTools: { simplify: { enabled: true } },
      } as any;

      warnIfUsingDeprecatedConfiguration(config);

      expect(config.polygonTools.simplify.enabled).toBe(true);
    });
  });
});
