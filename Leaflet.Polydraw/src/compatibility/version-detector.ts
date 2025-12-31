/**
 * Leaflet Version Detection Utility
 * Detects whether we're running with Leaflet v1.x or v2.x
 */

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

    const globalL = getGlobalLeaflet();
    if (!globalL) {
      // Default to v2 when Leaflet isn't on the global scope.
      // Avoid caching so we can re-detect if L appears later.
      return LeafletVersion.V2;
    }

    this._detectedVersion = this.detectVersion(globalL);
    return this._detectedVersion;
  }

  /**
   * Performs the actual version detection
   * @returns The detected Leaflet version
   */
  private static detectVersion(globalL?: LeafletGlobal): LeafletVersion {
    const resolvedGlobal = globalL ?? getGlobalLeaflet();
    if (!resolvedGlobal) {
      // If L is not available, assume v2 (ESM import scenario)
      return LeafletVersion.V2;
    }

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
    return {
      version,
      leafletVersion: globalL?.version,
      hasFactoryMethods: typeof globalL?.marker === 'function',
      hasConstructors: !!globalL?.Marker && typeof globalL.Marker === 'function',
      globalLAvailable: !!globalL,
    };
  }
}
