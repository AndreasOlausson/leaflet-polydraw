/**
 * Leaflet Version Detection Utility
 * Detects whether we're running with Leaflet v1.x or v2.x
 */

import * as L from 'leaflet';
import { LeafletVersion } from '../enums';

type LeafletGlobal = {
  version?: string;
  marker?: unknown;
  polyline?: unknown;
  polygon?: unknown;
  Marker?: unknown;
  Polyline?: unknown;
};

const getGlobalLeaflet = (): LeafletGlobal | undefined => {
  if (typeof globalThis === 'undefined') return undefined;
  return (globalThis as { L?: LeafletGlobal }).L;
};

const getModuleLeaflet = (): LeafletGlobal => ({
  version: Reflect.get(L, 'version') as string | undefined,
  marker: Reflect.get(L, 'marker'),
  polyline: Reflect.get(L, 'polyline'),
  polygon: Reflect.get(L, 'polygon'),
  Marker: Reflect.get(L, 'Marker'),
  Polyline: Reflect.get(L, 'Polyline'),
});

export class LeafletVersionDetector {
  private static _detectedVersion: LeafletVersion | null = null;

  /**
   * Detects the Leaflet version being used
   * @returns The detected Leaflet version
   */
  static getVersion(): LeafletVersion {
    if (this._detectedVersion) {
      return this._detectedVersion;
    }

    this._detectedVersion = this.detectVersion(getGlobalLeaflet() ?? getModuleLeaflet());
    return this._detectedVersion;
  }

  /**
   * Performs the actual version detection
   * @returns The detected Leaflet version
   */
  private static detectVersion(globalL?: LeafletGlobal): LeafletVersion {
    const resolvedGlobal = globalL ?? getGlobalLeaflet() ?? getModuleLeaflet();

    // Check for explicit version string (most reliable)
    if (resolvedGlobal.version) {
      if (resolvedGlobal.version.startsWith('2.')) {
        return LeafletVersion.V2;
      }
      if (resolvedGlobal.version.startsWith('1.')) {
        return LeafletVersion.V1;
      }
    }

    // Check for v2 indicators - factory methods should not exist
    if (typeof resolvedGlobal.marker !== 'function') {
      return LeafletVersion.V2;
    }

    // Check for v1 indicators - factory methods should exist
    if (
      typeof resolvedGlobal.marker === 'function' &&
      typeof resolvedGlobal.polyline === 'function' &&
      typeof resolvedGlobal.polygon === 'function'
    ) {
      return LeafletVersion.V1;
    }

    // Check for v2 class constructors
    if (
      resolvedGlobal.Marker &&
      typeof resolvedGlobal.Marker === 'function' &&
      resolvedGlobal.Polyline &&
      typeof resolvedGlobal.Polyline === 'function'
    ) {
      return LeafletVersion.V2;
    }

    // Default fallback to v1 for backward compatibility
    return LeafletVersion.V1;
  }

  /**
   * Checks if we're running Leaflet v1.x
   * @returns true if running v1.x
   */
  static isV1(): boolean {
    return this.getVersion() === LeafletVersion.V1;
  }

  /**
   * Checks if we're running Leaflet v2.x
   * @returns true if running v2.x
   */
  static isV2(): boolean {
    return this.getVersion() === LeafletVersion.V2;
  }

  /**
   * Resets the cached version detection (useful for testing)
   */
  static reset(): void {
    this._detectedVersion = null;
  }

  /**
   * Gets detailed version information for debugging
   * @returns Object with version details
   */
  static getVersionInfo(): {
    version: LeafletVersion;
    leafletVersion?: string;
    hasFactoryMethods: boolean;
    hasConstructors: boolean;
    globalLAvailable: boolean;
  } {
    const version = this.getVersion();

    const globalL = getGlobalLeaflet();
    const resolvedLeaflet = globalL ?? getModuleLeaflet();
    return {
      version,
      leafletVersion: resolvedLeaflet.version,
      hasFactoryMethods: typeof resolvedLeaflet.marker === 'function',
      hasConstructors: !!resolvedLeaflet.Marker && typeof resolvedLeaflet.Marker === 'function',
      globalLAvailable: !!globalL,
    };
  }
}
