import { describe, it, expect } from 'vitest';
import { deepMerge } from '../../src/utils/config-merge.util';
import type { PolydrawConfig } from '../../src/types/polydraw-interfaces';
import { defaultConfig } from '../../src/config';

/* eslint-disable @typescript-eslint/no-explicit-any */
describe('deepMerge', () => {
  describe('Basic primitives', () => {
    it('should merge boolean values', () => {
      const target = { flag: true };
      const source = { flag: false };
      const result = deepMerge(target, source);
      expect(result.flag).toBe(false);
    });

    it('should merge number values', () => {
      const target = { count: 10 };
      const source = { count: 20 };
      const result = deepMerge(target, source);
      expect(result.count).toBe(20);
    });

    it('should merge string values', () => {
      const target = { name: 'default' };
      const source = { name: 'custom' };
      const result = deepMerge(target, source);
      expect(result.name).toBe('custom');
    });
  });

  describe('Arrays', () => {
    it('should replace arrays entirely (not merge)', () => {
      const target = { items: [1, 2, 3] };
      const source = { items: [4, 5] };
      const result = deepMerge(target, source);
      expect(result.items).toEqual([4, 5]);
    });

    it('should handle empty arrays', () => {
      const target = { items: [1, 2, 3] };
      const source = { items: [] };
      const result = deepMerge(target, source);
      expect(result.items).toEqual([]);
    });
  });

  describe('Nested objects', () => {
    it('should merge nested objects recursively', () => {
      const target = { settings: { theme: 'dark', fontSize: 14 } };
      const source = { settings: { theme: 'light' } };
      const result = deepMerge(target, source as any);
      expect(result.settings).toEqual({ theme: 'light', fontSize: 14 });
    });

    it('should merge deeply nested objects', () => {
      const target = {
        a: {
          b: {
            c: 1,
          },
        },
      };
      const source = {
        a: {
          b: {
            d: 2,
          },
        },
      };
      const result = deepMerge(target, source as any);
      expect(result.a.b).toEqual({ c: 1, d: 2 });
    });

    it('should create missing nested objects', () => {
      const target: any = { a: {} };
      const source = { a: { b: { c: 1 } } };
      const result = deepMerge(target, source);
      expect((result.a as any).b.c).toBe(1);
    });
  });

  describe('Multiple sources', () => {
    it('should merge multiple sources in order', () => {
      const target = { value: 0 };
      const source1 = { value: 1 };
      const source2 = { value: 2 };
      const result = deepMerge(target, source1, source2);
      expect(result.value).toBe(2); // Last source wins
    });

    it('should handle multiple sources with different keys', () => {
      const target = {};
      const source1 = { a: 1 };
      const source2 = { b: 2 };
      const result = deepMerge(target, source1, source2);
      expect(result).toEqual({ a: 1, b: 2 });
    });

    it('should merge nested objects from multiple sources', () => {
      const target = { settings: { theme: 'default' } };
      const source1 = { settings: { fontSize: 12 } };
      const source2 = { settings: { theme: 'custom' } };
      const result = deepMerge(target, source1 as any, source2 as any);
      expect(result.settings).toEqual({ theme: 'custom', fontSize: 12 });
    });
  });

  describe('Undefined values', () => {
    it('should not overwrite with undefined', () => {
      const target = { value: 'keep' };
      const source = { value: undefined };
      const result = deepMerge(target, source);
      expect(result.value).toBe('keep');
    });

    it('should overwrite with null', () => {
      const target = { value: 'keep' };
      const source = { value: null };
      const result = deepMerge(target, source as any);
      expect(result.value).toBe(null);
    });
  });

  describe('Real PolydrawConfig scenarios', () => {
    it('should merge modes configuration correctly', () => {
      const target: any = {
        modes: {
          draw: true,
          subtract: true,
          deleteAll: true,
          p2p: true,
          attachElbow: true,
          dragElbow: true,
          dragPolygons: true,
          edgeDeletion: true,
        },
      };
      const source = {
        modes: {
          draw: false,
          subtract: false,
        },
      };
      const result = deepMerge(target, source as any);
      expect(result.modes).toEqual({
        draw: false,
        subtract: false,
        deleteAll: true,
        p2p: true,
        attachElbow: true,
        dragElbow: true,
        dragPolygons: true,
        edgeDeletion: true,
      });
    });

    it('should merge marker configuration deeply', () => {
      const target: any = {
        markers: {
          deleteMarker: true,
          infoMarker: true,
          menuMarker: true,
          coordsTitle: true,
          zIndexOffset: 0,
          markerIcon: {
            styleClasses: ['class1'],
            zIndexOffset: null,
          },
        },
      };
      const source = {
        markers: {
          zIndexOffset: 100,
          markerIcon: {
            styleClasses: ['custom-class'],
          },
        },
      };
      const result = deepMerge(target, source as any);
      expect(result.markers?.zIndexOffset).toBe(100);
      expect(result.markers?.markerIcon?.zIndexOffset).toBe(null);
      expect(result.markers?.markerIcon?.styleClasses).toEqual(['custom-class']);
      expect(result.markers?.deleteMarker).toBe(true);
    });

    it('should merge colors configuration with nested objects', () => {
      const target: any = {
        colors: {
          dragPolygons: {
            subtract: '#D9460F',
          },
          p2p: {
            closingMarker: '#4CAF50',
          },
          polygon: {
            border: '#50622b',
            fill: '#b4cd8a',
          },
        },
      };
      const source = {
        colors: {
          polygon: {
            fill: '#custom-color',
          },
        },
      };
      const result = deepMerge(target, source as any);
      expect(result.colors?.polygon?.border).toBe('#50622b');
      expect(result.colors?.polygon?.fill).toBe('#custom-color');
      expect(result.colors?.dragPolygons?.subtract).toBe('#D9460F');
    });

    it('should handle empty source objects', () => {
      const target: any = {
        mergePolygons: true,
        modes: { draw: true },
      };
      const source: Partial<PolydrawConfig> = {};
      const result = deepMerge(target, source);
      expect(result.mergePolygons).toBe(true);
      expect(result.modes?.draw).toBe(true);
    });

    it('should handle null sources gracefully', () => {
      const target = { value: 'keep' };
      const result = deepMerge(target, null as any, undefined as any);
      expect(result.value).toBe('keep');
    });
  });

  describe('Edge cases', () => {
    it('should return target when no sources provided', () => {
      const target = { value: 1 };
      const result = deepMerge(target);
      expect(result).toBe(target);
    });

    it('should mutate the target object (expected behavior)', () => {
      const target = { a: { b: 1 } };
      const source = { a: { c: 2 } };
      const result = deepMerge(target, source as any);
      expect(result).toBe(target); // Returns same object
      expect(result.a).toBe(target.a); // Nested objects are modified in place
      expect(result.a).toEqual({ b: 1, c: 2 });
    });

    it('should handle objects with null values', () => {
      const target = { nested: { value: 1 } };
      const source = { nested: null };
      const result = deepMerge(target, source as any);
      expect(result.nested).toBe(null);
    });
  });

  describe('Integration tests with full PolydrawConfig', () => {
    it('1. should merge with a complete altered config object', () => {
      const alteredConfig = {
        mergePolygons: false,
        kinks: true,
        modes: {
          draw: false,
          subtract: false,
          deleteAll: false,
          p2p: true,
          attachElbow: false,
          dragElbow: false,
          dragPolygons: true,
          edgeDeletion: false,
        },
        dragPolygons: {
          opacity: 0.5,
          dragCursor: 'grab',
          hoverCursor: 'pointer',
          markerBehavior: 'show',
          markerAnimationDuration: 300,
          modifierSubtract: {
            keys: {
              windows: 'shiftKey',
              mac: 'shiftKey',
              linux: 'shiftKey',
            },
            hideMarkersOnDrag: false,
          },
        },
      };

      const result = deepMerge(structuredClone(defaultConfig), alteredConfig as any);

      // Verify top-level changes
      expect(result.mergePolygons).toBe(false);
      expect(result.kinks).toBe(true);

      // Verify nested changes in modes
      expect(result.modes.draw).toBe(false);
      expect(result.modes.subtract).toBe(false);
      expect(result.modes.p2p).toBe(true);

      // Verify deeply nested changes in dragPolygons
      expect(result.dragPolygons.opacity).toBe(0.5);
      expect(result.dragPolygons.modifierSubtract.keys.windows).toBe('shiftKey');
      expect(result.dragPolygons.modifierSubtract.hideMarkersOnDrag).toBe(false);

      // Verify unchanged values from default
      expect(result.markers.deleteMarker).toBe(true);
      expect(result.polygonOptions.weight).toBe(2);
      expect(result.colors.polygon.border).toBe('#50622b');
    });

    it('2. should merge with a partial config object and maintain full structure', () => {
      const partialConfig = {
        modes: {
          draw: false,
        },
        markers: {
          zIndexOffset: 100,
          markerInfoIcon: {
            showArea: false,
            areaLabel: 'Custom Area Label',
          },
        },
      };

      const result = deepMerge(structuredClone(defaultConfig), partialConfig as any);

      // Verify partial changes were applied
      expect(result.modes.draw).toBe(false);
      expect(result.markers.zIndexOffset).toBe(100);
      expect(result.markers.markerInfoIcon.showArea).toBe(false);
      expect(result.markers.markerInfoIcon.areaLabel).toBe('Custom Area Label');

      // Verify other mode properties remain from default
      expect(result.modes.subtract).toBe(true);
      expect(result.modes.deleteAll).toBe(true);
      expect(result.modes.p2p).toBe(true);

      // Verify other marker properties remain from default
      expect(result.markers.deleteMarker).toBe(true);
      expect(result.markers.coordsTitle).toBe(true);
      expect(result.markers.markerInfoIcon.showPerimeter).toBe(true);
      expect(result.markers.markerInfoIcon.position).toBe(3);
    });

    it('3. should copy all properties including those not in the config', () => {
      const configWithExtraProps = {
        mergePolygons: false,
        extraProperty: 'should be included',
        modes: {
          draw: false,
          extraModeProperty: 'should be included',
        },
        extraNestedObject: {
          value: 'should be included',
        },
      };

      const result = deepMerge(structuredClone(defaultConfig), configWithExtraProps as any);

      // Verify valid properties were applied
      expect(result.mergePolygons).toBe(false);
      expect(result.modes.draw).toBe(false);

      // Verify extra properties ARE in the result (deepMerge copies all properties)
      expect((result as any).extraProperty).toBe('should be included');
      expect((result as any).extraNestedObject.value).toBe('should be included');
      expect((result.modes as any).extraModeProperty).toBe('should be included');

      // Verify default structure is still intact
      expect(result.kinks).toBe(false);
      expect(result.modes.subtract).toBe(true);
      expect(result.markers.deleteMarker).toBe(true);
    });

    it('should handle complex nested partial merge', () => {
      const complexPartial = {
        colors: {
          polygon: {
            border: '#FF0000',
          },
        },
        markers: {
          visualOptimization: {
            useDistance: false,
            thresholdDistance: 0.1,
          },
        },
        simplification: {
          simplifyTolerance: {
            tolerance: 0.001,
          },
        },
      };

      const result = deepMerge(structuredClone(defaultConfig), complexPartial as any);

      // Verify deeply nested partial changes
      expect(result.colors.polygon.border).toBe('#FF0000');
      expect(result.colors.polygon.fill).toBe('#b4cd8a'); // Unchanged

      expect(result.markers.visualOptimization.useDistance).toBe(false);
      expect(result.markers.visualOptimization.thresholdDistance).toBe(0.1);
      expect(result.markers.visualOptimization.sharpAngleThreshold).toBe(30); // Unchanged

      expect(result.simplification.simplifyTolerance.tolerance).toBe(0.001);
      expect(result.simplification.simplifyTolerance.highQuality).toBe(false); // Unchanged
      expect(result.simplification.dynamicMode.fractionGuard).toBe(0.9); // Unchanged
    });

    it('should merge multiple partial configs in order', () => {
      const firstPartial = {
        modes: { draw: false },
        markers: { zIndexOffset: 100 },
      };

      const secondPartial = {
        modes: { subtract: false },
        markers: { zIndexOffset: 200 },
      };

      const result = deepMerge(
        structuredClone(defaultConfig),
        firstPartial as any,
        secondPartial as any,
      );

      // Last source wins
      expect(result.modes.draw).toBe(false); // From firstPartial
      expect(result.modes.subtract).toBe(false); // From secondPartial
      expect(result.markers.zIndexOffset).toBe(200); // Last value wins

      // Other values remain from default
      expect(result.modes.deleteAll).toBe(true);
      expect(result.markers.deleteMarker).toBe(true);
    });
  });
});
