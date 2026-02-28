import * as L from 'leaflet';
import type { EventManager } from './event-manager';
import type {
  LayerSnapshot,
  LayerInteraction,
  LayerPanelVisibility,
} from '../types/polydraw-interfaces';

export interface LayerState {
  id: string;
  label?: string;
  color: string;
  visible: boolean;
  interaction: LayerInteraction;
  panel: LayerPanelVisibility;
  metadata: Record<string, unknown>;
  featureGroups: L.FeatureGroup[];
}

export interface LayerCreateOptions {
  label?: string;
  color?: string;
  visible?: boolean;
  interaction?: LayerInteraction;
  panel?: LayerPanelVisibility;
  metadata?: Record<string, unknown>;
}

export type SetActiveLayerResult = 'activated' | 'already-active' | 'not-found' | 'not-visible';

/**
 * Manages polygon layers and feature-group assignments.
 * Keeps a default layer and supports active-layer scoping for interactions.
 */
export class LayerManager {
  private readonly eventManager: EventManager;
  private layers = new Map<string, LayerState>();
  private featureGroupToLayer = new WeakMap<L.FeatureGroup, string>();
  private activeLayerId = 'default';
  private defaultColor: string;

  constructor(eventManager: EventManager, defaultColor: string) {
    this.eventManager = eventManager;
    this.defaultColor = LayerManager.normalizeColor(defaultColor);
    this.ensureDefaultLayer();
  }

  getLayerCount(): number {
    return this.layers.size;
  }

  getAllLayers(): LayerState[] {
    return Array.from(this.layers.values()).map((layer) => this.cloneLayerState(layer));
  }

  getPanelLayers(): LayerState[] {
    return this.getAllLayers().filter((layer) => layer.panel !== 'hidden');
  }

  getPanelLayerCount(): number {
    let count = 0;
    for (const layer of this.layers.values()) {
      if (layer.panel !== 'hidden') {
        count += 1;
      }
    }
    return count;
  }

  getLayer(layerId: string): LayerState | undefined {
    const layer = this.layers.get(this.normalizeLayerId(layerId));
    return layer ? this.cloneLayerState(layer) : undefined;
  }

  getActiveLayerId(): string {
    return this.activeLayerId;
  }

  getActiveLayer(): LayerState | undefined {
    return this.getLayer(this.activeLayerId);
  }

  getOrCreateLayer(layerId: string, colorOrOptions?: string | LayerCreateOptions): LayerState {
    const normalizedId = this.normalizeLayerId(layerId);
    const existing = this.layers.get(normalizedId);
    if (existing) {
      return this.cloneLayerState(this.layers.get(normalizedId)!);
    }

    const options: LayerCreateOptions =
      typeof colorOrOptions === 'string' ? { color: colorOrOptions } : colorOrOptions || {};

    const layer: LayerState = {
      id: normalizedId,
      label: options.label,
      color: options.color
        ? LayerManager.normalizeColor(options.color, this.defaultColor)
        : this.defaultColor,
      visible: options.visible !== false,
      interaction: this.normalizeInteraction(options.interaction),
      panel: this.normalizePanel(options.panel),
      metadata: this.cloneMetadata(options.metadata),
      featureGroups: [],
    };
    this.layers.set(normalizedId, layer);
    this.eventManager.emit('polydraw:layer:created', {
      layerId: layer.id,
      color: layer.color,
    });
    return this.cloneLayerState(layer);
  }

  setActiveLayer(layerId: string): boolean {
    return this.setActiveLayerWithResult(layerId) === 'activated';
  }

  setActiveLayerWithResult(layerId: string): SetActiveLayerResult {
    const normalizedId = this.normalizeLayerId(layerId);
    const targetLayer = this.layers.get(normalizedId);
    if (!targetLayer) {
      return 'not-found';
    }
    if (normalizedId === this.activeLayerId) {
      return 'already-active';
    }
    if (!targetLayer.visible) {
      return 'not-visible';
    }

    const previousLayerId = this.activeLayerId;
    this.activeLayerId = normalizedId;
    this.eventManager.emit('polydraw:layer:activated', {
      layerId: normalizedId,
      previousLayerId,
    });
    return 'activated';
  }

  setLayerVisibility(layerId: string, visible: boolean): boolean {
    const layer = this.layers.get(this.normalizeLayerId(layerId));
    if (!layer || layer.visible === visible) {
      return false;
    }

    // Keep at least one visible active layer.
    if (!visible && layer.id === this.activeLayerId) {
      const fallbackLayerId = this.getFirstVisibleLayerId(layer.id);
      if (!fallbackLayerId) {
        return false;
      }
      this.setActiveLayer(fallbackLayerId);
    }

    layer.visible = visible;
    this.eventManager.emit('polydraw:layer:visibility', {
      layerId: layer.id,
      visible,
    });
    return true;
  }

  setLayerColor(layerId: string, color: string): boolean {
    const layer = this.layers.get(this.normalizeLayerId(layerId));
    const normalizedColor = LayerManager.normalizeColor(color, layer?.color ?? this.defaultColor);
    if (!layer || layer.color === normalizedColor) {
      return false;
    }

    layer.color = normalizedColor;
    layer.featureGroups.forEach((featureGroup) => {
      const styleColorOverride = (
        featureGroup as unknown as {
          _polydrawMetadata?: { styleOverrides?: { color?: string } };
        }
      )._polydrawMetadata?.styleOverrides?.color;
      featureGroup.eachLayer((layerItem: L.Layer) => {
        if (layerItem instanceof L.Polygon && !(layerItem instanceof L.Rectangle)) {
          layerItem.setStyle({ color: styleColorOverride ?? normalizedColor });
        }
      });
    });

    this.eventManager.emit('polydraw:layer:colorChanged', {
      layerId: layer.id,
      color: layer.color,
    });
    return true;
  }

  setLayerLabel(layerId: string, label?: string): boolean {
    const layer = this.layers.get(this.normalizeLayerId(layerId));
    if (!layer) {
      return false;
    }

    const normalizedLabel = typeof label === 'string' ? label.trim() : undefined;
    const nextLabel = normalizedLabel && normalizedLabel.length > 0 ? normalizedLabel : undefined;
    if (layer.label === nextLabel) {
      return false;
    }

    layer.label = nextLabel;
    return true;
  }

  setLayerInteraction(layerId: string, interaction: LayerInteraction): boolean {
    const layer = this.layers.get(this.normalizeLayerId(layerId));
    if (!layer) {
      return false;
    }
    const normalized = this.normalizeInteraction(interaction);
    if (layer.interaction === normalized) {
      return false;
    }
    layer.interaction = normalized;
    return true;
  }

  setLayerPanelVisibility(layerId: string, panel: LayerPanelVisibility): boolean {
    const layer = this.layers.get(this.normalizeLayerId(layerId));
    if (!layer) {
      return false;
    }
    const normalized = this.normalizePanel(panel);
    if (layer.panel === normalized) {
      return false;
    }
    layer.panel = normalized;
    return true;
  }

  setLayerMetadata(layerId: string, metadata?: Record<string, unknown>): boolean {
    const layer = this.layers.get(this.normalizeLayerId(layerId));
    if (!layer) {
      return false;
    }
    layer.metadata = this.cloneMetadata(metadata);
    return true;
  }

  isLayerEditable(layerId: string): boolean {
    const layer = this.layers.get(this.normalizeLayerId(layerId));
    if (!layer) {
      return true;
    }
    return layer.interaction === 'editable';
  }

  isFeatureGroupEditable(featureGroup: L.FeatureGroup): boolean {
    const interactionOverride = (
      featureGroup as unknown as { _polydrawMetadata?: { interactionOverride?: LayerInteraction } }
    )._polydrawMetadata?.interactionOverride;
    if (interactionOverride) {
      return interactionOverride === 'editable';
    }

    const layerId = this.getLayerForFeatureGroup(featureGroup);
    if (!layerId) {
      return true;
    }
    return this.isLayerEditable(layerId);
  }

  /**
   * Reorder layers by moving layerId to the drop index of targetLayerId.
   * This mirrors list drag/drop behavior used in the layer panel.
   */
  moveLayer(layerId: string, targetLayerId: string): boolean {
    const sourceId = this.normalizeLayerId(layerId);
    const targetId = this.normalizeLayerId(targetLayerId);
    if (sourceId === targetId) {
      return false;
    }
    if (sourceId === 'default' || targetId === 'default') {
      return false;
    }
    if (!this.layers.has(sourceId) || !this.layers.has(targetId)) {
      return false;
    }

    const layerOrder = Array.from(this.layers.keys());
    const sourceIndex = layerOrder.indexOf(sourceId);
    const targetIndex = layerOrder.indexOf(targetId);
    if (sourceIndex < 0 || targetIndex < 0) {
      return false;
    }

    const [moved] = layerOrder.splice(sourceIndex, 1);
    layerOrder.splice(targetIndex, 0, moved);

    const reordered = new Map<string, LayerState>();
    for (const id of layerOrder) {
      const layer = this.layers.get(id);
      if (layer) {
        reordered.set(id, layer);
      }
    }
    this.layers = reordered;

    this.eventManager.emit('polydraw:layer:reordered', {
      layerId: sourceId,
      targetLayerId: targetId,
      orderedLayerIds: layerOrder,
    });
    return true;
  }

  assignFeatureGroupToLayer(featureGroup: L.FeatureGroup, layerId: string): boolean {
    const targetId = this.normalizeLayerId(layerId);
    if (!this.layers.has(targetId)) {
      return false;
    }

    const currentLayerId = this.getLayerForFeatureGroup(featureGroup);
    if (currentLayerId) {
      const currentLayer = this.layers.get(currentLayerId);
      if (currentLayer) {
        currentLayer.featureGroups = currentLayer.featureGroups.filter((fg) => fg !== featureGroup);
      }
    }

    const targetLayer = this.layers.get(targetId)!;
    if (!targetLayer.featureGroups.includes(featureGroup)) {
      targetLayer.featureGroups.push(featureGroup);
    }
    this.featureGroupToLayer.set(featureGroup, targetId);

    const metadata = (featureGroup as unknown as { _polydrawMetadata?: { layerId?: string } })
      ._polydrawMetadata;
    if (metadata) {
      metadata.layerId = targetId;
    }
    return true;
  }

  removeFeatureGroupFromLayer(featureGroup: L.FeatureGroup): void {
    const layerId = this.getLayerForFeatureGroup(featureGroup);
    if (!layerId) {
      return;
    }

    const layer = this.layers.get(layerId);
    if (layer) {
      layer.featureGroups = layer.featureGroups.filter((fg) => fg !== featureGroup);
    }
    this.featureGroupToLayer.delete(featureGroup);
  }

  getLayerForFeatureGroup(featureGroup: L.FeatureGroup): string | undefined {
    const mapped = this.featureGroupToLayer.get(featureGroup);
    if (mapped) {
      return mapped;
    }

    for (const [layerId, layer] of this.layers.entries()) {
      if (layer.featureGroups.includes(featureGroup)) {
        this.featureGroupToLayer.set(featureGroup, layerId);
        return layerId;
      }
    }
    return undefined;
  }

  getFeatureGroupsForLayer(layerId: string): L.FeatureGroup[] {
    const layer = this.layers.get(this.normalizeLayerId(layerId));
    return layer ? [...layer.featureGroups] : [];
  }

  isInActiveLayer(featureGroup: L.FeatureGroup): boolean {
    const layerId = this.getLayerForFeatureGroup(featureGroup);
    if (!layerId) {
      return true;
    }
    return layerId === this.activeLayerId;
  }

  deleteLayer(layerId: string): L.FeatureGroup[] {
    const normalizedId = this.normalizeLayerId(layerId);
    if (normalizedId === 'default') {
      return [];
    }

    const layer = this.layers.get(normalizedId);
    if (!layer) {
      return [];
    }

    const removedFeatureGroups = [...layer.featureGroups];
    removedFeatureGroups.forEach((fg) => {
      this.featureGroupToLayer.delete(fg);
    });
    this.layers.delete(normalizedId);

    if (this.activeLayerId === normalizedId) {
      const fallbackLayerId = this.getFirstVisibleLayerId(normalizedId);
      if (fallbackLayerId) {
        this.setActiveLayer(fallbackLayerId);
      } else {
        this.activeLayerId = 'default';
      }
    }

    this.eventManager.emit('polydraw:layer:deleted', {
      layerId: normalizedId,
      removedFeatureGroups,
    });
    return removedFeatureGroups;
  }

  clear(defaultColor?: string): void {
    if (defaultColor) {
      this.defaultColor = LayerManager.normalizeColor(defaultColor, this.defaultColor);
    }
    this.layers = new Map();
    this.featureGroupToLayer = new WeakMap();
    this.activeLayerId = 'default';
    this.ensureDefaultLayer();
  }

  captureLayerSnapshot(featureGroups: L.FeatureGroup[]): LayerSnapshot {
    const featureIndexMap = new Map<L.FeatureGroup, number>();
    featureGroups.forEach((featureGroup, index) => {
      featureIndexMap.set(featureGroup, index);
    });

    return {
      layers: this.getAllLayers().map((layer) => ({
        id: layer.id,
        label: layer.label,
        color: layer.color,
        visible: layer.visible,
        interaction: layer.interaction,
        panel: layer.panel,
        metadata: this.cloneMetadata(layer.metadata),
        featureIndices: layer.featureGroups
          .map((featureGroup) => featureIndexMap.get(featureGroup))
          .filter((index): index is number => typeof index === 'number'),
      })),
      activeLayerId: this.activeLayerId,
    };
  }

  restoreFromLayerSnapshot(snapshot: LayerSnapshot, featureGroups: L.FeatureGroup[]): void {
    this.clear();

    if (!snapshot || !Array.isArray(snapshot.layers)) {
      return;
    }

    snapshot.layers.forEach((entry) => {
      const layerId = this.normalizeLayerId(entry.id);
      const existing = this.layers.get(layerId);
      if (!existing) {
        this.layers.set(layerId, {
          id: layerId,
          label: typeof entry.label === 'string' ? entry.label : undefined,
          color: entry.color ? LayerManager.normalizeColor(entry.color) : this.defaultColor,
          visible: entry.visible !== false,
          interaction: this.normalizeInteraction(entry.interaction),
          panel: this.normalizePanel(entry.panel),
          metadata: this.cloneMetadata(entry.metadata),
          featureGroups: [],
        });
      } else {
        existing.label = typeof entry.label === 'string' ? entry.label : undefined;
        existing.color = entry.color ? LayerManager.normalizeColor(entry.color) : existing.color;
        existing.visible = entry.visible !== false;
        existing.interaction = this.normalizeInteraction(entry.interaction);
        existing.panel = this.normalizePanel(entry.panel);
        existing.metadata = this.cloneMetadata(entry.metadata);
      }
    });

    this.ensureDefaultLayer();

    snapshot.layers.forEach((entry) => {
      const layerId = this.normalizeLayerId(entry.id);
      const layer = this.layers.get(layerId);
      if (!layer) {
        return;
      }
      entry.featureIndices.forEach((featureIndex) => {
        const featureGroup = featureGroups[featureIndex];
        if (!featureGroup) {
          return;
        }
        if (!layer.featureGroups.includes(featureGroup)) {
          layer.featureGroups.push(featureGroup);
        }
        this.featureGroupToLayer.set(featureGroup, layerId);
      });
    });

    const desiredActive = this.normalizeLayerId(snapshot.activeLayerId || 'default');
    const desiredLayer = this.layers.get(desiredActive);
    if (desiredLayer && desiredLayer.visible) {
      this.activeLayerId = desiredActive;
      return;
    }

    const fallbackLayerId = this.getFirstVisibleLayerId();
    if (fallbackLayerId) {
      this.activeLayerId = fallbackLayerId;
      return;
    }

    // Defensive fallback: keep at least one visible active layer after restore.
    const defaultLayer = this.layers.get('default');
    if (defaultLayer) {
      defaultLayer.visible = true;
    }
    this.activeLayerId = 'default';
  }

  private ensureDefaultLayer(): void {
    if (!this.layers.has('default')) {
      this.layers.set('default', {
        id: 'default',
        color: this.defaultColor,
        visible: true,
        interaction: 'editable',
        panel: 'visible',
        metadata: {},
        featureGroups: [],
      });
    }
  }

  private getFirstVisibleLayerId(excludeLayerId?: string): string | undefined {
    for (const layer of this.layers.values()) {
      if (layer.id === excludeLayerId) {
        continue;
      }
      if (layer.visible) {
        return layer.id;
      }
    }
    return undefined;
  }

  private normalizeLayerId(layerId: string): string {
    const normalized = (layerId || '').trim();
    return normalized.length > 0 ? normalized : 'default';
  }

  private cloneLayerState(layer: LayerState): LayerState {
    return {
      id: layer.id,
      label: layer.label,
      color: layer.color,
      visible: layer.visible,
      interaction: layer.interaction,
      panel: layer.panel,
      metadata: this.cloneMetadata(layer.metadata),
      featureGroups: [...layer.featureGroups],
    };
  }

  private normalizeInteraction(interaction?: LayerInteraction): LayerInteraction {
    if (interaction === 'readonly' || interaction === 'static') {
      return interaction;
    }
    return 'editable';
  }

  private normalizePanel(panel?: LayerPanelVisibility): LayerPanelVisibility {
    return panel === 'hidden' ? 'hidden' : 'visible';
  }

  private cloneMetadata(metadata?: Record<string, unknown>): Record<string, unknown> {
    if (!metadata) {
      return {};
    }
    return { ...metadata };
  }

  /**
   * Normalize hex colors to "#rrggbb".
   * Accepts "f00", "#f00", "ff0000", "#ff0000". Returns fallback when invalid.
   */
  static normalizeColor(input: string, fallback = '#50622b'): string {
    const trimmed = (input || '').trim();
    let hex = trimmed.replace(/^#/, '');

    if (hex.length === 3) {
      hex = `${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`;
    }

    if (!/^[0-9a-fA-F]{6}$/.test(hex)) {
      return fallback;
    }

    return `#${hex.toLowerCase()}`;
  }
}
