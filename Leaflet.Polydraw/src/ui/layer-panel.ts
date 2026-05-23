import * as L from 'leaflet';
import type { LayerManager } from '../managers/layer-manager';
import type { EventManager } from '../managers/event-manager';
import { applySvgIcon } from '../utils/svg-icon.util';
import gripVerticalSvg from '../icons/icon-grip-vertical.svg?raw';
import eyeVisibleSvg from '../icons/icon-visual-optimization-hide.svg?raw';
import eyeHiddenSvg from '../icons/icon-visual-optimization-show.svg?raw';
import eraseSvg from '../icons/icon-erase.svg?raw';
import layerToggleIconSvg from '../icons/icon-layer-toggle.svg?raw';

const colorizeWhiteSvg = (svg: string): string => svg.replace(/#(?:fff|ffffff)/gi, 'currentColor');

const icons = {
  grip: gripVerticalSvg.trim(),
  eyeVisible: colorizeWhiteSvg(eyeVisibleSvg.trim()),
  eyeHidden: colorizeWhiteSvg(eyeHiddenSvg.trim()),
  delete: eraseSvg.trim(),
  toggle: layerToggleIconSvg.trim(),
};

export interface LayerPanelControl extends L.Control {
  refresh(): void;
}

/**
 * Creates a lightweight UI control for layer visibility/activation.
 * The returned control exposes `refresh()` for state updates without re-creating
 * the Leaflet control instance.
 */
export function createLayerPanel(
  layerManager: LayerManager,
  eventManager: EventManager,
): LayerPanelControl {
  let isLayerPanelCollapsed = false;
  let container: HTMLElement | null = null;
  let draggedLayerId: string | null = null;
  let pendingRenderWhileDragging = false;

  const renderPanel = () => {
    if (!container) {
      return;
    }
    if (draggedLayerId) {
      pendingRenderWhileDragging = true;
      return;
    }

    container.innerHTML = '';

    const layers = layerManager.getPanelLayers();
    const activeLayerId = layerManager.getActiveLayerId();

    if (draggedLayerId && !layers.some((layer) => layer.id === draggedLayerId)) {
      draggedLayerId = null;
    }

    container.classList.toggle('polydraw-layer-panel-collapsed', isLayerPanelCollapsed);

    const header = L.DomUtil.create('div', 'polydraw-layer-header', container);

    const headerTitle = L.DomUtil.create('span', 'polydraw-layer-header-title', header);
    headerTitle.textContent = 'Layers';

    const headerCount = L.DomUtil.create('span', 'polydraw-layer-header-count', header);
    headerCount.textContent = String(layers.length);

    const headerToggle = L.DomUtil.create('button', 'polydraw-layer-header-toggle', header);
    headerToggle.setAttribute('type', 'button');
    headerToggle.setAttribute(
      'aria-label',
      isLayerPanelCollapsed ? 'Expand layer panel' : 'Collapse layer panel',
    );
    headerToggle.setAttribute('title', isLayerPanelCollapsed ? 'Expand layers' : 'Collapse layers');
    applySvgIcon(headerToggle, icons.toggle);
    headerToggle.classList.toggle('is-collapsed', isLayerPanelCollapsed);

    headerToggle.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      isLayerPanelCollapsed = !isLayerPanelCollapsed;
      renderPanel();
    });

    if (isLayerPanelCollapsed) {
      return;
    }

    const clearDragClasses = () => {
      if (!container) {
        return;
      }
      const rows = container.querySelectorAll('.polydraw-layer-row');
      rows.forEach((row) => {
        row.classList.remove('polydraw-layer-row-dragging');
        row.classList.remove('polydraw-layer-row-drag-over');
      });
    };
    const flushPendingRender = () => {
      if (!pendingRenderWhileDragging) {
        return;
      }
      pendingRenderWhileDragging = false;
      renderPanel();
    };

    const resolveDraggedLayerId = (event?: DragEvent): string | null => {
      const fromTransfer = event?.dataTransfer?.getData('text/plain')?.trim();
      if (fromTransfer) {
        return fromTransfer;
      }
      return draggedLayerId;
    };

    layers.forEach((layer) => {
      const displayName = layer.label?.trim() ? layer.label : layer.id;
      const row = L.DomUtil.create('div', 'polydraw-layer-row', container ?? undefined);
      row.setAttribute('tabindex', '0');
      row.setAttribute('role', 'button');
      row.setAttribute('draggable', layer.id === 'default' ? 'false' : 'true');
      row.setAttribute('aria-label', `Activate layer ${displayName}`);
      row.setAttribute('data-layer-id', layer.id);
      if (layer.id === activeLayerId) {
        row.classList.add('polydraw-layer-row-active');
      }
      if (!layer.visible) {
        row.classList.add('polydraw-layer-hidden');
      }

      if (layer.id !== 'default') {
        const grip = L.DomUtil.create('span', 'polydraw-layer-grip', row);
        grip.setAttribute('aria-hidden', 'true');
        applySvgIcon(grip, icons.grip);
      } else {
        const gripSpacer = L.DomUtil.create('span', 'polydraw-layer-grip-spacer', row);
        gripSpacer.setAttribute('aria-hidden', 'true');
      }

      const colorIndicator = L.DomUtil.create('span', 'polydraw-layer-color-indicator', row);
      (colorIndicator as HTMLElement).style.backgroundColor = layer.color;

      const layerName = L.DomUtil.create('span', 'polydraw-layer-name', row);
      layerName.textContent = displayName;
      layerName.setAttribute('title', displayName);

      const visibilityButton = L.DomUtil.create(
        'button',
        'polydraw-layer-btn polydraw-layer-visibility',
        row,
      );
      visibilityButton.setAttribute('type', 'button');
      visibilityButton.setAttribute('title', layer.visible ? 'Hide layer' : 'Show layer');
      visibilityButton.setAttribute(
        'aria-label',
        layer.visible ? `Hide layer ${displayName}` : `Show layer ${displayName}`,
      );
      applySvgIcon(visibilityButton, layer.visible ? icons.eyeVisible : icons.eyeHidden);
      if (!layer.visible) {
        visibilityButton.classList.add('polydraw-layer-visibility-hidden');
      }
      visibilityButton.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        layerManager.setLayerVisibility(layer.id, !layer.visible);
      });

      if (layer.id !== 'default') {
        const deleteButton = L.DomUtil.create(
          'button',
          'polydraw-layer-btn polydraw-layer-delete',
          row,
        );
        deleteButton.setAttribute('type', 'button');
        deleteButton.setAttribute('title', 'Delete layer');
        deleteButton.setAttribute('aria-label', `Delete layer ${displayName}`);
        applySvgIcon(deleteButton, icons.delete);
        deleteButton.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          eventManager.emit('polydraw:layer:delete-requested', { layerId: layer.id });
        });
      } else {
        const spacer = L.DomUtil.create('span', 'polydraw-layer-btn-spacer', row);
        spacer.setAttribute('aria-hidden', 'true');
      }

      row.addEventListener('click', () => {
        layerManager.setActiveLayer(layer.id);
      });
      row.addEventListener('keydown', (event: KeyboardEvent) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          layerManager.setActiveLayer(layer.id);
        }
      });

      if (layer.id !== 'default') {
        row.addEventListener('dragstart', (event: DragEvent) => {
          draggedLayerId = layer.id;
          row.classList.add('polydraw-layer-row-dragging');
          if (event.dataTransfer) {
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/plain', layer.id);
          }
        });

        row.addEventListener('dragend', () => {
          draggedLayerId = null;
          clearDragClasses();
          flushPendingRender();
        });
      }

      row.addEventListener('dragover', (event: DragEvent) => {
        const sourceLayerId = resolveDraggedLayerId(event);
        if (!sourceLayerId || sourceLayerId === layer.id || layer.id === 'default') {
          return;
        }
        event.preventDefault();
        row.classList.add('polydraw-layer-row-drag-over');
        if (event.dataTransfer) {
          event.dataTransfer.dropEffect = 'move';
        }
      });

      row.addEventListener('dragleave', () => {
        row.classList.remove('polydraw-layer-row-drag-over');
      });

      row.addEventListener('drop', (event: DragEvent) => {
        const sourceLayerId = resolveDraggedLayerId(event);
        if (!sourceLayerId || sourceLayerId === layer.id || layer.id === 'default') {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        eventManager.emit('polydraw:layer:reorder-requested', {
          layerId: sourceLayerId,
          targetLayerId: layer.id,
        });
        draggedLayerId = null;
        clearDragClasses();
        flushPendingRender();
      });
    });
  };

  const LayerPanelControlClass = L.Control.extend({
    options: {
      position: 'topright' as L.ControlPosition,
    },

    onAdd(): HTMLElement {
      container = L.DomUtil.create('div', 'leaflet-bar polydraw-layer-panel');
      container.setAttribute('data-polydraw', 'layer-panel');
      L.DomEvent.disableClickPropagation(container);
      L.DomEvent.disableScrollPropagation(container);
      L.DomEvent.on(container, 'mousedown', L.DomEvent.stopPropagation);
      L.DomEvent.on(container, 'touchstart', L.DomEvent.stopPropagation);
      L.DomEvent.on(container, 'dragstart', L.DomEvent.stopPropagation);
      L.DomEvent.on(container, 'dragover', L.DomEvent.stopPropagation);
      L.DomEvent.on(container, 'drop', L.DomEvent.stopPropagation);

      renderPanel();

      return container;
    },

    onRemove(): void {
      if (!container) {
        return;
      }
      L.DomEvent.off(container, 'mousedown', L.DomEvent.stopPropagation);
      L.DomEvent.off(container, 'touchstart', L.DomEvent.stopPropagation);
      L.DomEvent.off(container, 'dragstart', L.DomEvent.stopPropagation);
      L.DomEvent.off(container, 'dragover', L.DomEvent.stopPropagation);
      L.DomEvent.off(container, 'drop', L.DomEvent.stopPropagation);
      container = null;
      draggedLayerId = null;
      pendingRenderWhileDragging = false;
    },
  });

  const panel = new LayerPanelControlClass() as unknown as LayerPanelControl;
  panel.refresh = () => {
    renderPanel();
  };
  return panel;
}
