import * as L from 'leaflet';
import type { LayerManager, LayerState } from '../managers/layer-manager';
import type { EventManager } from '../managers/event-manager';
import type { LayerPanelInitialState } from '../types/polydraw-interfaces';
import { applySvgIcon } from '../utils/svg-icon.util';
import gripVerticalSvg from '../icons/icon-grip-vertical.svg?raw';
import eyeVisibleSvg from '../icons/icon-visual-optimization-hide.svg?raw';
import eyeHiddenSvg from '../icons/icon-visual-optimization-show.svg?raw';
import eraseSvg from '../icons/icon-erase.svg?raw';
import editSvg from '../icons/icon-edit.svg?raw';
import layerToggleIconSvg from '../icons/icon-layer-toggle.svg?raw';
import mergeLayerSvg from '../icons/icon-move-to-layer.svg?raw';
import { normalizeHexColor } from '../utils/color-style.util';
import { createColorMap } from './color-map';

const colorizeWhiteSvg = (svg: string): string => svg.replace(/#(?:fff|ffffff)/gi, 'currentColor');

const icons = {
  grip: gripVerticalSvg.trim(),
  eyeVisible: colorizeWhiteSvg(eyeVisibleSvg.trim()),
  eyeHidden: colorizeWhiteSvg(eyeHiddenSvg.trim()),
  delete: eraseSvg.trim(),
  edit: editSvg.trim(),
  toggle: layerToggleIconSvg.trim(),
  merge: colorizeWhiteSvg(mergeLayerSvg.trim()),
};

export interface LayerPanelControl extends L.Control {
  refresh(options?: LayerPanelRefreshOptions): void;
}

export interface LayerPanelRefreshOptions {
  revealLayerBoundary?: boolean;
}

/**
 * Creates a lightweight UI control for layer visibility/activation.
 * The returned control exposes `refresh()` for state updates without re-creating
 * the Leaflet control instance.
 */
export function createLayerPanel(
  layerManager: LayerManager,
  eventManager: EventManager,
  initialState: LayerPanelInitialState = 'expanded',
  allowReferenceMergeSources = false,
): LayerPanelControl {
  let isLayerPanelCollapsed = initialState === 'collapsed';
  let container: HTMLElement | null = null;
  let panelBody: HTMLElement | null = null;
  let map: L.Map | null = null;
  let draggedLayerId: string | null = null;
  let pendingRenderWhileDragging = false;
  let revealLayerBoundaryWhenExpanded = false;
  let layerEditorBackdrop: HTMLDivElement | null = null;

  const closeLayerEditor = () => {
    layerEditorBackdrop?.remove();
    layerEditorBackdrop = null;
  };

  const openLayerEditor = (layer: LayerState) => {
    closeLayerEditor();

    const initialColor = normalizeHexColor(layer.color, '#50622b');
    let selectedColor = initialColor;
    let mergeMode = false;
    let selectedTargetLayerId: string | null = null;
    const targetLayers = layerManager
      .getAllLayers()
      .filter((candidate) => candidate.role === 'draw' && candidate.id !== layer.id);
    const backdrop = document.createElement('div');
    backdrop.className = 'polydraw-layer-dialog-backdrop';
    layerEditorBackdrop = backdrop;

    const dialog = document.createElement('form');
    dialog.className = 'polydraw-layer-dialog';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'polydraw-layer-dialog-title');

    const header = document.createElement('div');
    header.className = 'polydraw-layer-dialog-header';
    const backButton = document.createElement('button');
    backButton.type = 'button';
    backButton.className = 'polydraw-layer-dialog-back';
    backButton.setAttribute('aria-label', 'Back to layer settings');
    backButton.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 18 9 12l6-6"/></svg>';
    backButton.hidden = true;
    const title = document.createElement('h2');
    title.id = 'polydraw-layer-dialog-title';
    title.textContent = 'Layer settings';
    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'polydraw-layer-dialog-close';
    closeButton.setAttribute('aria-label', 'Close layer settings');
    closeButton.textContent = '\u00d7';
    header.append(backButton, title, closeButton);

    const settingsContent = document.createElement('div');
    settingsContent.className = 'polydraw-layer-dialog-settings';

    const nameLabel = document.createElement('label');
    nameLabel.className = 'polydraw-layer-dialog-field';
    const nameCaption = document.createElement('span');
    nameCaption.textContent = 'Layer name';
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.value = layer.label ?? '';
    nameInput.placeholder = layer.id;
    nameInput.maxLength = 80;
    nameInput.autocomplete = 'off';
    nameLabel.append(nameCaption, nameInput);

    const colorField = document.createElement('fieldset');
    colorField.className = 'polydraw-layer-dialog-colors';
    const colorLegend = document.createElement('legend');
    colorLegend.textContent = 'Layer color';
    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.className = 'polydraw-color-input';
    colorInput.value = initialColor;
    colorInput.setAttribute('aria-label', 'Custom layer color');
    const colorValue = document.createElement('span');
    colorValue.className = 'polydraw-layer-dialog-color-value';

    const updateColorUi = (color: string) => {
      selectedColor = normalizeHexColor(color, initialColor);
      colorInput.value = selectedColor;
      colorValue.textContent = selectedColor.toUpperCase();
      colorMap.setSelectedColor(selectedColor);
    };

    const colorMap = createColorMap({
      selectedColor: initialColor,
      ariaLabelPrefix: 'Set layer color',
      onSelect: (color) => updateColorUi(color),
    });

    const customColor = document.createElement('div');
    customColor.className = 'polydraw-layer-dialog-custom-color';
    customColor.append(colorInput, colorValue);
    colorField.append(colorLegend, colorMap.element, customColor);

    const commands = document.createElement('div');
    commands.className = 'polydraw-layer-dialog-commands';
    const sourceFeatureCount = layerManager.getFeatureGroupsForLayer(layer.id).length;
    const canMergeSource =
      layer.role === 'draw' || (layer.role === 'reference' && allowReferenceMergeSources);
    if (canMergeSource && sourceFeatureCount > 0 && targetLayers.length > 0) {
      const mergeButton = document.createElement('button');
      mergeButton.type = 'button';
      mergeButton.className = 'polydraw-layer-dialog-merge';
      mergeButton.setAttribute(
        'aria-label',
        `Merge layer ${layer.label || layer.id} into another layer`,
      );
      applySvgIcon(mergeButton, icons.merge);
      const mergeLabel = document.createElement('span');
      mergeLabel.textContent = 'Merge into…';
      mergeButton.appendChild(mergeLabel);
      commands.appendChild(mergeButton);
    }
    settingsContent.append(nameLabel, colorField, commands);

    const mergePanel = document.createElement('div');
    mergePanel.className = 'polydraw-layer-merge-panel';
    mergePanel.hidden = true;
    const mergeOptions = document.createElement('div');
    mergeOptions.className = 'polygon-layer-options polydraw-layer-merge-options';
    mergeOptions.setAttribute('role', 'radiogroup');
    mergeOptions.setAttribute('aria-label', 'Target layer');
    const mergeOptionButtons = targetLayers.map((targetLayer) => {
      const option = document.createElement('button');
      option.type = 'button';
      option.className = 'polygon-layer-option polydraw-layer-merge-option';
      option.setAttribute('role', 'radio');
      option.setAttribute('aria-checked', 'false');
      option.dataset.layerId = targetLayer.id;
      const color = document.createElement('span');
      color.className = 'polygon-layer-option-color';
      color.style.backgroundColor = targetLayer.color;
      const label = document.createElement('span');
      label.className = 'polygon-layer-option-label';
      label.textContent = targetLayer.label?.trim() || targetLayer.id;
      option.append(color, label);
      if (!targetLayer.visible) {
        const hidden = document.createElement('span');
        hidden.className = 'polygon-layer-option-state';
        hidden.textContent = 'Hidden';
        option.appendChild(hidden);
      }
      mergeOptions.appendChild(option);
      return option;
    });
    const targetStyleChoice = document.createElement('label');
    targetStyleChoice.className = 'polydraw-layer-merge-style-choice';
    const targetStyleCheckbox = document.createElement('input');
    targetStyleCheckbox.type = 'checkbox';
    targetStyleCheckbox.className = 'polydraw-layer-merge-target-style';
    const targetStyleText = document.createElement('span');
    const targetStyleLabel = document.createElement('strong');
    targetStyleLabel.textContent = 'Use target layer style';
    const targetStyleDescription = document.createElement('small');
    targetStyleDescription.textContent = 'Otherwise individual colors and opacity are preserved.';
    targetStyleText.append(targetStyleLabel, targetStyleDescription);
    targetStyleChoice.append(targetStyleCheckbox, targetStyleText);
    mergePanel.append(mergeOptions, targetStyleChoice);

    const actions = document.createElement('div');
    actions.className = 'polydraw-layer-dialog-actions';
    const cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.className =
      'polydraw-layer-dialog-cancel polydraw-dialog-button polydraw-dialog-button-secondary';
    cancelButton.textContent = 'Cancel';
    const applyButton = document.createElement('button');
    applyButton.type = 'submit';
    applyButton.className =
      'polydraw-layer-dialog-apply polydraw-dialog-button polydraw-dialog-button-primary';
    applyButton.textContent = 'Apply';
    actions.append(cancelButton, applyButton);

    const mergeActions = document.createElement('div');
    mergeActions.className = 'polydraw-layer-dialog-actions polydraw-layer-merge-actions';
    mergeActions.hidden = true;
    const mergeCancelButton = document.createElement('button');
    mergeCancelButton.type = 'button';
    mergeCancelButton.className = 'polydraw-dialog-button polydraw-dialog-button-secondary';
    mergeCancelButton.textContent = 'Cancel';
    const mergeApplyButton = document.createElement('button');
    mergeApplyButton.type = 'button';
    mergeApplyButton.className =
      'polydraw-layer-merge-apply polydraw-dialog-button polydraw-dialog-button-primary';
    mergeApplyButton.textContent = 'Merge';
    mergeApplyButton.disabled = true;
    mergeActions.append(mergeCancelButton, mergeApplyButton);

    const showSettings = () => {
      mergeMode = false;
      title.textContent = 'Layer settings';
      backButton.hidden = true;
      settingsContent.hidden = false;
      actions.hidden = false;
      mergePanel.hidden = true;
      mergeActions.hidden = true;
      nameInput.focus();
    };

    const showMergeTargets = () => {
      mergeMode = true;
      title.textContent = 'Merge layer';
      backButton.hidden = false;
      settingsContent.hidden = true;
      actions.hidden = true;
      mergePanel.hidden = false;
      mergeActions.hidden = false;
      mergeOptionButtons[0]?.focus();
    };

    const closeWithoutApply = () => closeLayerEditor();
    closeButton.addEventListener('click', closeWithoutApply);
    cancelButton.addEventListener('click', closeWithoutApply);
    mergeCancelButton.addEventListener('click', closeWithoutApply);
    backButton.addEventListener('click', showSettings);
    commands
      .querySelector('.polydraw-layer-dialog-merge')
      ?.addEventListener('click', showMergeTargets);
    mergeOptionButtons.forEach((option) => {
      option.addEventListener('click', () => {
        selectedTargetLayerId = option.dataset.layerId || null;
        mergeOptionButtons.forEach((candidate) => {
          const selected = candidate === option;
          candidate.classList.toggle('selected', selected);
          candidate.setAttribute('aria-checked', String(selected));
        });
        mergeApplyButton.disabled = selectedTargetLayerId === null;
      });
    });
    if (mergeOptionButtons.length === 1) {
      const onlyOption = mergeOptionButtons[0];
      selectedTargetLayerId = onlyOption.dataset.layerId || null;
      onlyOption.classList.add('selected');
      onlyOption.setAttribute('aria-checked', 'true');
      mergeApplyButton.disabled = selectedTargetLayerId === null;
    }
    mergeApplyButton.addEventListener('click', () => {
      if (!selectedTargetLayerId) return;
      eventManager.emit('polydraw:layer:merge-requested', {
        sourceLayerId: layer.id,
        targetLayerId: selectedTargetLayerId,
        useTargetStyle: targetStyleCheckbox.checked,
      });
      closeLayerEditor();
    });
    backdrop.addEventListener('click', (event) => {
      if (event.target === backdrop) closeWithoutApply();
    });
    colorInput.addEventListener('input', () => updateColorUi(colorInput.value));
    dialog.addEventListener('submit', (event) => {
      event.preventDefault();
      if (mergeMode) {
        mergeApplyButton.click();
        return;
      }
      eventManager.emit('polydraw:layer:update-requested', {
        layerId: layer.id,
        label: nameInput.value,
        color: selectedColor,
      });
      closeLayerEditor();
    });
    dialog.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeWithoutApply();
      }
    });

    dialog.append(header, settingsContent, mergePanel, actions, mergeActions);
    backdrop.appendChild(dialog);
    document.body.appendChild(backdrop);
    updateColorUi(initialColor);
    queueMicrotask(() => nameInput.focus());
  };

  const updateAvailableHeight = () => {
    if (!container || !map) return;

    const mapRect = map.getContainer().getBoundingClientRect();
    const panelRect = container.getBoundingClientRect();
    const topOffset = Math.max(0, panelRect.top - mapRect.top);
    const availableHeight = Math.max(0, map.getSize().y - topOffset - 44);
    container.style.setProperty('--polydraw-layer-panel-available-height', `${availableHeight}px`);
  };

  const renderPanel = (options: LayerPanelRefreshOptions = {}) => {
    if (!container) {
      return;
    }
    if (draggedLayerId) {
      pendingRenderWhileDragging = true;
      return;
    }

    const previousScrollTop = panelBody?.scrollTop ?? 0;
    const shouldRevealLayerBoundary =
      options.revealLayerBoundary === true || revealLayerBoundaryWhenExpanded;

    container.innerHTML = '';
    panelBody = null;

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
      revealLayerBoundaryWhenExpanded = shouldRevealLayerBoundary;
      updateAvailableHeight();
      return;
    }

    revealLayerBoundaryWhenExpanded = false;

    panelBody = L.DomUtil.create('div', 'polydraw-layer-panel-body', container);

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

    const drawLayers = layers.filter((layer) => layer.role === 'draw');
    const referenceLayers = layers.filter((layer) => layer.role === 'reference');

    const renderSectionHeader = (
      title: string,
      section: 'draw' | 'reference',
      detail?: string,
      allowBulkDelete = false,
    ) => {
      const sectionHeader = L.DomUtil.create('div', 'polydraw-layer-section-header', panelBody!);
      sectionHeader.setAttribute('data-layer-section', section);
      const titleEl = L.DomUtil.create('span', 'polydraw-layer-section-title', sectionHeader);
      titleEl.textContent = title;
      if (detail) {
        const detailEl = L.DomUtil.create('span', 'polydraw-layer-section-detail', sectionHeader);
        detailEl.textContent = detail;
      }

      if (allowBulkDelete) {
        const deleteButton = L.DomUtil.create(
          'button',
          'polydraw-layer-section-delete',
          sectionHeader,
        );
        deleteButton.setAttribute('type', 'button');
        deleteButton.setAttribute('title', 'Delete all reference layers');
        deleteButton.setAttribute('aria-label', 'Delete all reference layers');
        applySvgIcon(deleteButton, icons.delete);
        deleteButton.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          eventManager.emit('polydraw:layer:delete-role-requested', { role: section });
        });
      }
    };

    const renderLayerRow = (layer: LayerState): HTMLElement => {
      const displayName = layer.label?.trim() ? layer.label : layer.id;
      const row = L.DomUtil.create('div', 'polydraw-layer-row', panelBody ?? undefined);
      const isDrawLayer = layer.role === 'draw';
      row.setAttribute('tabindex', isDrawLayer ? '0' : '-1');
      row.setAttribute('role', isDrawLayer ? 'button' : 'listitem');
      row.setAttribute('draggable', layer.id === 'default' ? 'false' : 'true');
      row.setAttribute(
        'aria-label',
        isDrawLayer ? `Draw into layer ${displayName}` : `Reference layer ${displayName}`,
      );
      row.setAttribute('data-layer-id', layer.id);
      row.setAttribute('data-layer-role', layer.role);
      row.classList.add(`polydraw-layer-row-${layer.role}`);
      if (isDrawLayer && layer.id === activeLayerId) {
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
      colorIndicator.setAttribute('aria-hidden', 'true');
      (colorIndicator as HTMLElement).style.backgroundColor = layer.color;

      const layerName = L.DomUtil.create('span', 'polydraw-layer-name', row);
      layerName.textContent = displayName;
      layerName.setAttribute('title', displayName);

      const editButton = L.DomUtil.create('button', 'polydraw-layer-btn polydraw-layer-edit', row);
      editButton.setAttribute('type', 'button');
      editButton.setAttribute('title', 'Edit layer');
      editButton.setAttribute('aria-label', `Edit layer ${displayName}`);
      applySvgIcon(editButton, icons.edit);
      editButton.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        openLayerEditor(layer);
      });

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

      if (isDrawLayer) {
        row.addEventListener('click', () => {
          layerManager.setActiveLayer(layer.id);
        });
        row.addEventListener('keydown', (event: KeyboardEvent) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            layerManager.setActiveLayer(layer.id);
          }
        });
      }

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
        const sourceLayer = layerManager.getLayer(sourceLayerId);
        if (!sourceLayer || sourceLayer.role !== layer.role) {
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
        const sourceLayer = layerManager.getLayer(sourceLayerId);
        if (!sourceLayer || sourceLayer.role !== layer.role) {
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

      return row;
    };

    const activeLayer = layerManager.getActiveLayer();
    const activeDisplayName = activeLayer?.label?.trim() ? activeLayer.label : activeLayer?.id;
    renderSectionHeader(
      'Draw layers',
      'draw',
      activeDisplayName ? `drawing in ${activeDisplayName}` : undefined,
    );
    drawLayers.forEach(renderLayerRow);

    const addDrawLayerButton = L.DomUtil.create('button', 'polydraw-layer-add-draw', panelBody);
    addDrawLayerButton.setAttribute('type', 'button');
    addDrawLayerButton.setAttribute('aria-label', 'Create new draw layer');
    addDrawLayerButton.textContent = '+ New draw layer';
    addDrawLayerButton.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      eventManager.emit('polydraw:layer:create-draw-requested', {});
    });

    let firstReferenceRow: HTMLElement | null = null;
    if (referenceLayers.length > 0) {
      renderSectionHeader('Reference layers', 'reference', undefined, true);
      referenceLayers.forEach((layer, index) => {
        const row = renderLayerRow(layer);
        if (index === 0) {
          firstReferenceRow = row;
        }
      });
    }

    updateAvailableHeight();
    panelBody.scrollTop = previousScrollTop;

    if (shouldRevealLayerBoundary) {
      const boundaryEnd = firstReferenceRow ?? addDrawLayerButton;
      panelBody.scrollTop = Math.max(
        0,
        boundaryEnd.offsetTop + boundaryEnd.offsetHeight - panelBody.clientHeight,
      );
    }
  };

  class LayerPanelControlClass extends L.Control implements LayerPanelControl {
    constructor() {
      super({ position: 'topright' });
    }

    onAdd(leafletMap: L.Map): HTMLElement {
      map = leafletMap;
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
      map.on('resize', updateAvailableHeight);

      return container;
    }

    onRemove(): void {
      if (!container) {
        return;
      }
      L.DomEvent.off(container, 'mousedown', L.DomEvent.stopPropagation);
      L.DomEvent.off(container, 'touchstart', L.DomEvent.stopPropagation);
      L.DomEvent.off(container, 'dragstart', L.DomEvent.stopPropagation);
      L.DomEvent.off(container, 'dragover', L.DomEvent.stopPropagation);
      L.DomEvent.off(container, 'drop', L.DomEvent.stopPropagation);
      map?.off('resize', updateAvailableHeight);
      closeLayerEditor();
      container = null;
      panelBody = null;
      map = null;
      draggedLayerId = null;
      pendingRenderWhileDragging = false;
    }

    refresh(options?: LayerPanelRefreshOptions): void {
      renderPanel(options);
    }
  }

  return new LayerPanelControlClass();
}
