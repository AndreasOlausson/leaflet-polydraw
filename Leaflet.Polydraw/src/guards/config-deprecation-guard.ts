import type { PolydrawConfig } from '../types/polydraw-interfaces';

interface LegacyToolKeys {
  draw?: boolean;
  subtract?: boolean;
  deleteAll?: boolean;
  p2p?: boolean;
  p2pSubtract?: boolean;
  clonePolygons?: boolean;
}

const LEGACY_TO_TOOLS_MAP: Record<keyof LegacyToolKeys, keyof PolydrawConfig['tools']> = {
  draw: 'draw',
  subtract: 'subtract',
  p2p: 'p2p',
  p2pSubtract: 'p2pSubtract',
  deleteAll: 'erase',
  clonePolygons: 'clone',
};

export function warnIfUsingDeprecatedConfiguration(config: Partial<PolydrawConfig>): void {
  if (!config) {
    return;
  }

  // --- Legacy modes.* tool toggles -> tools.* migration ---
  const legacyToolKeys = config.modes as LegacyToolKeys | undefined;

  if (legacyToolKeys) {
    const foundKeys = (Object.keys(LEGACY_TO_TOOLS_MAP) as (keyof LegacyToolKeys)[]).filter(
      (key) => legacyToolKeys[key] !== undefined,
    );

    if (foundKeys.length > 0) {
      console.warn(
        '[Leaflet.Polydraw] `config.modes.*` tool toggles are deprecated in v2. Use `config.tools.*` (draw/subtract/p2p/clone/erase) instead.',
      );

      // Migrate legacy values onto config.tools
      if (!config.tools) {
        config.tools = {} as PolydrawConfig['tools'];
      }
      for (const legacyKey of foundKeys) {
        const newKey = LEGACY_TO_TOOLS_MAP[legacyKey];
        // Only migrate if the new key hasn't been explicitly set
        if (config.tools[newKey] === undefined) {
          (config.tools[newKey] as boolean) = legacyToolKeys[legacyKey]!;
        }
      }
    }
  }

  // --- Deprecated markers.visualOptimization keys ---
  const visualOptimization = (config.markers?.visualOptimization ?? {}) as Record<string, unknown>;
  const deprecatedVisualOptimizationKeys =
    Object.prototype.hasOwnProperty.call(visualOptimization, 'useAngles') ||
    Object.prototype.hasOwnProperty.call(visualOptimization, 'useBoundingBox') ||
    Object.prototype.hasOwnProperty.call(visualOptimization, 'useDistance') ||
    Object.prototype.hasOwnProperty.call(visualOptimization, 'thresholdBoundingBox') ||
    Object.prototype.hasOwnProperty.call(visualOptimization, 'thresholdDistance') ||
    Object.prototype.hasOwnProperty.call(visualOptimization, 'sharpAngleThreshold');

  if (deprecatedVisualOptimizationKeys) {
    console.warn(
      '[Leaflet.Polydraw] `markers.visualOptimization` is deprecated. Prefer `visualOptimizationLevel` when adding predefined polygons.',
    );
  }

  // --- Legacy top-level maxHistorySize -> history.maxSize ---
  const legacyMaxHistorySize = (config as Record<string, unknown>).maxHistorySize;
  if (typeof legacyMaxHistorySize === 'number') {
    console.warn(
      '[Leaflet.Polydraw] `config.maxHistorySize` is deprecated in v2. Use `config.history.maxSize` instead.',
    );

    if (!config.history) {
      config.history = {} as PolydrawConfig['history'];
    }
    if (config.history.maxSize === undefined) {
      config.history.maxSize = legacyMaxHistorySize;
    }
  }

  // --- Legacy top-level boundingBox -> polygonTools.bbox ---
  const legacyBoundingBox = (config as Record<string, unknown>).boundingBox as
    | { addMidPointMarkers?: boolean }
    | undefined;
  if (legacyBoundingBox && typeof legacyBoundingBox.addMidPointMarkers === 'boolean') {
    console.warn(
      '[Leaflet.Polydraw] `config.boundingBox` is deprecated in v2. Use `config.polygonTools.bbox` instead.',
    );

    if (!config.polygonTools) {
      config.polygonTools = {} as PolydrawConfig['polygonTools'];
    }
    if (!config.polygonTools.bbox) {
      config.polygonTools.bbox = {} as PolydrawConfig['polygonTools']['bbox'];
    }
    if (config.polygonTools.bbox.addMidPointMarkers === undefined) {
      config.polygonTools.bbox.addMidPointMarkers = legacyBoundingBox.addMidPointMarkers;
    }
  }

  // --- Legacy top-level bezier -> polygonTools.bezier ---
  const legacyBezier = (config as Record<string, unknown>).bezier as
    | {
        resolution?: number;
        sharpness?: number;
        resampleMultiplier?: number;
        maxNodes?: number;
        visualOptimizationLevel?: number;
        ghostMarkers?: boolean;
      }
    | undefined;
  if (
    legacyBezier &&
    (legacyBezier.resolution !== undefined ||
      legacyBezier.sharpness !== undefined ||
      legacyBezier.resampleMultiplier !== undefined ||
      legacyBezier.maxNodes !== undefined ||
      legacyBezier.visualOptimizationLevel !== undefined ||
      legacyBezier.ghostMarkers !== undefined)
  ) {
    console.warn(
      '[Leaflet.Polydraw] `config.bezier` is deprecated in v2. Use `config.polygonTools.bezier` instead.',
    );

    if (!config.polygonTools) {
      config.polygonTools = {} as PolydrawConfig['polygonTools'];
    }
    if (!config.polygonTools.bezier) {
      config.polygonTools.bezier = {} as PolydrawConfig['polygonTools']['bezier'];
    }
    const target = config.polygonTools.bezier;
    for (const key of Object.keys(legacyBezier) as (keyof typeof legacyBezier)[]) {
      if (
        legacyBezier[key] !== undefined &&
        (target as Record<string, unknown>)[key] === undefined
      ) {
        (target as Record<string, unknown>)[key] = legacyBezier[key];
      }
    }
  }

  // --- Deprecated buffer polygon creation method ---
  const rawAlgorithm = (config as Record<string, unknown>).polygonCreation as
    | { algorithm?: unknown }
    | undefined;
  if (rawAlgorithm?.algorithm === 'buffer') {
    console.warn(
      '[Leaflet.Polydraw] `polygonCreation.algorithm: "buffer"` is deprecated and no longer supported. Falling back to "concaveman". Use "concaveman" or "direct" instead.',
    );
  }

  // --- Legacy style keys -> styles.* migration ---
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = config as Record<string, any>;

  const hasLegacyPolyLineOptions = raw.polyLineOptions !== undefined;
  const hasLegacySubtractLineOptions = raw.subtractLineOptions !== undefined;
  const hasLegacyPolygonOptions = raw.polygonOptions !== undefined;
  const hasLegacyHoleOptions = raw.holeOptions !== undefined;
  const hasLegacyColors = raw.colors !== undefined;

  if (
    hasLegacyPolyLineOptions ||
    hasLegacySubtractLineOptions ||
    hasLegacyPolygonOptions ||
    hasLegacyHoleOptions ||
    hasLegacyColors
  ) {
    console.warn(
      '[Leaflet.Polydraw] `polyLineOptions`, `subtractLineOptions`, `polygonOptions`, `holeOptions`, and `colors` are deprecated in v2. Use the unified `config.styles` block instead.',
    );

    // Ensure styles exists on config for migration
    if (!config.styles) {
      config.styles = {} as PolydrawConfig['styles'];
    }
    const styles = config.styles;

    // Migrate polyLineOptions -> styles.polyline
    if (hasLegacyPolyLineOptions) {
      if (!styles.polyline) {
        styles.polyline = {} as PolydrawConfig['styles']['polyline'];
      }
      const src = raw.polyLineOptions;
      if (src.weight !== undefined && styles.polyline.weight === undefined)
        styles.polyline.weight = src.weight;
      if (src.opacity !== undefined && styles.polyline.opacity === undefined)
        styles.polyline.opacity = src.opacity;
    }

    // Migrate subtractLineOptions -> styles.subtractLine
    if (hasLegacySubtractLineOptions) {
      if (!styles.subtractLine) {
        styles.subtractLine = {} as PolydrawConfig['styles']['subtractLine'];
      }
      const src = raw.subtractLineOptions;
      if (src.weight !== undefined && styles.subtractLine.weight === undefined)
        styles.subtractLine.weight = src.weight;
      if (src.opacity !== undefined && styles.subtractLine.opacity === undefined)
        styles.subtractLine.opacity = src.opacity;
    }

    // Migrate polygonOptions -> styles.polygon
    if (hasLegacyPolygonOptions) {
      if (!styles.polygon) {
        styles.polygon = {} as PolydrawConfig['styles']['polygon'];
      }
      const src = raw.polygonOptions;
      if (src.weight !== undefined && styles.polygon.weight === undefined)
        styles.polygon.weight = src.weight;
      if (src.opacity !== undefined && styles.polygon.opacity === undefined)
        styles.polygon.opacity = src.opacity;
      if (src.fillOpacity !== undefined && styles.polygon.fillOpacity === undefined)
        styles.polygon.fillOpacity = src.fillOpacity;
      if (src.smoothFactor !== undefined && styles.polygon.smoothFactor === undefined)
        styles.polygon.smoothFactor = src.smoothFactor;
      if (src.noClip !== undefined && styles.polygon.noClip === undefined)
        styles.polygon.noClip = src.noClip;
    }

    // Migrate holeOptions -> styles.hole
    if (hasLegacyHoleOptions) {
      if (!styles.hole) {
        styles.hole = {} as PolydrawConfig['styles']['hole'];
      }
      const src = raw.holeOptions;
      if (src.weight !== undefined && styles.hole.weight === undefined)
        styles.hole.weight = src.weight;
      if (src.opacity !== undefined && styles.hole.opacity === undefined)
        styles.hole.opacity = src.opacity;
      if (src.fillOpacity !== undefined && styles.hole.fillOpacity === undefined)
        styles.hole.fillOpacity = src.fillOpacity;
    }

    // Migrate colors -> distribute across styles
    if (hasLegacyColors) {
      const colors = raw.colors;

      // colors.polyline -> styles.polyline.color
      if (colors.polyline !== undefined) {
        if (!styles.polyline) styles.polyline = {} as PolydrawConfig['styles']['polyline'];
        if (styles.polyline.color === undefined) styles.polyline.color = colors.polyline;
      }

      // colors.subtractLine -> styles.subtractLine.color
      if (colors.subtractLine !== undefined) {
        if (!styles.subtractLine)
          styles.subtractLine = {} as PolydrawConfig['styles']['subtractLine'];
        if (styles.subtractLine.color === undefined)
          styles.subtractLine.color = colors.subtractLine;
      }

      // colors.polygon -> styles.polygon.color / .fillColor
      if (colors.polygon) {
        if (!styles.polygon) styles.polygon = {} as PolydrawConfig['styles']['polygon'];
        if (colors.polygon.border !== undefined && styles.polygon.color === undefined)
          styles.polygon.color = colors.polygon.border;
        if (colors.polygon.fill !== undefined && styles.polygon.fillColor === undefined)
          styles.polygon.fillColor = colors.polygon.fill;
      }

      // colors.hole -> styles.hole.color / .fillColor
      if (colors.hole) {
        if (!styles.hole) styles.hole = {} as PolydrawConfig['styles']['hole'];
        if (colors.hole.border !== undefined && styles.hole.color === undefined)
          styles.hole.color = colors.hole.border;
        if (colors.hole.fill !== undefined && styles.hole.fillColor === undefined)
          styles.hole.fillColor = colors.hole.fill;
      }

      // colors.styles.* -> styles.ui.*
      if (colors.styles) {
        if (!styles.ui) styles.ui = {} as PolydrawConfig['styles']['ui'];
        const uiSrc = colors.styles;
        const ui = styles.ui;
        if (uiSrc.controlButton && !ui.controlButton) ui.controlButton = uiSrc.controlButton;
        if (uiSrc.controlButtonHover && !ui.controlButtonHover)
          ui.controlButtonHover = uiSrc.controlButtonHover;
        if (uiSrc.controlButtonActive && !ui.controlButtonActive)
          ui.controlButtonActive = uiSrc.controlButtonActive;
        if (uiSrc.indicatorActive && !ui.indicatorActive)
          ui.indicatorActive = uiSrc.indicatorActive;
        if (uiSrc.p2pMarker && !ui.p2pMarker) ui.p2pMarker = uiSrc.p2pMarker;
      }

      // colors.p2p.closingMarker -> styles.ui.p2pClosingMarker.color
      if (colors.p2p?.closingMarker !== undefined) {
        if (!styles.ui) styles.ui = {} as PolydrawConfig['styles']['ui'];
        if (!styles.ui.p2pClosingMarker)
          styles.ui.p2pClosingMarker = { color: colors.p2p.closingMarker };
      }

      // colors.edgeHover -> styles.ui.edgeHover.color
      if (colors.edgeHover !== undefined) {
        if (!styles.ui) styles.ui = {} as PolydrawConfig['styles']['ui'];
        if (!styles.ui.edgeHover) styles.ui.edgeHover = { color: colors.edgeHover };
      }

      // colors.edgeDeletion.hover -> styles.ui.edgeDeletion.color
      if (colors.edgeDeletion?.hover !== undefined) {
        if (!styles.ui) styles.ui = {} as PolydrawConfig['styles']['ui'];
        if (!styles.ui.edgeDeletion) styles.ui.edgeDeletion = { color: colors.edgeDeletion.hover };
      }

      // colors.dragPolygons.subtract -> styles.ui.dragSubtract.color
      if (colors.dragPolygons?.subtract !== undefined) {
        if (!styles.ui) styles.ui = {} as PolydrawConfig['styles']['ui'];
        if (!styles.ui.dragSubtract)
          styles.ui.dragSubtract = { color: colors.dragPolygons.subtract };
      }
    }
  }

  // --- Legacy defaultMode -> tools.default ---
  if (raw.defaultMode !== undefined) {
    console.warn(
      '[Leaflet.Polydraw] `config.defaultMode` is deprecated in v2. Use `config.tools.default` instead.',
    );
    if (!config.tools) {
      config.tools = {} as PolydrawConfig['tools'];
    }
    if ((config.tools as unknown as Record<string, unknown>).default === undefined) {
      (config.tools as unknown as Record<string, unknown>).default = raw.defaultMode;
    }
  }

  // --- Legacy dragPolygons -> interaction.drag ---
  if (raw.dragPolygons !== undefined) {
    console.warn(
      '[Leaflet.Polydraw] `config.dragPolygons` is deprecated in v2. Use `config.interaction.drag` instead.',
    );
    if (!config.interaction) {
      config.interaction = {} as PolydrawConfig['interaction'];
    }
    if (!config.interaction.drag) {
      config.interaction.drag = raw.dragPolygons;
    }
  }

  // --- Legacy edgeDeletion -> interaction.edgeDeletion ---
  if (raw.edgeDeletion !== undefined) {
    console.warn(
      '[Leaflet.Polydraw] `config.edgeDeletion` is deprecated in v2. Use `config.interaction.edgeDeletion` instead.',
    );
    if (!config.interaction) {
      config.interaction = {} as PolydrawConfig['interaction'];
    }
    if (!config.interaction.edgeDeletion) {
      config.interaction.edgeDeletion = raw.edgeDeletion;
    }
  }

  // --- Legacy menuOperations -> polygonTools ---
  if (raw.menuOperations !== undefined) {
    console.warn(
      '[Leaflet.Polydraw] `config.menuOperations` is deprecated in v2. Use `config.polygonTools` instead.',
    );
    if (!config.polygonTools) {
      config.polygonTools = raw.menuOperations;
    }
  }
}
