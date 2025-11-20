import * as L from 'leaflet';
import { PolydrawConfig } from './types/polydraw-interfaces';
import { leafletAdapter } from './compatibility/leaflet-adapter';
import type { EventManager } from './managers/event-manager';
import type { HistoryManager } from './managers/history-manager';
import iconPolydraw2Svg from './icons/icon-polydraw2.svg?raw';
import iconP2PSubtractSvg from './icons/icon-p2p-subtract.svg?raw';
import iconDrawSvg from './icons/icon-draw.svg?raw';
import iconSubtractSvg from './icons/icon-subtract.svg?raw';
import iconP2PDrawSvg from './icons/icon-p2p-draw.svg?raw';
import iconEraseSvg from './icons/icon-erase.svg?raw';
import iconCollapseSvg from './icons/icon-collapse.svg?raw';
import iconUndoSvg from './icons/icon-undo.svg?raw';
import iconRedoSvg from './icons/icon-redo.svg?raw';

const sanitizeSvg = (svg: string): string =>
  svg
    .replace(/<\?xml[^>]*\?>\s*/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .trim();

const icons = {
  activate: sanitizeSvg(iconPolydraw2Svg),
  draw: sanitizeSvg(iconDrawSvg),
  subtract: sanitizeSvg(iconSubtractSvg),
  p2p: sanitizeSvg(iconP2PDrawSvg),
  p2pSubtract: sanitizeSvg(iconP2PSubtractSvg),
  erase: sanitizeSvg(iconEraseSvg),
  collapse: sanitizeSvg(iconCollapseSvg),
  undo: sanitizeSvg(iconUndoSvg),
  redo: sanitizeSvg(iconRedoSvg),
};

const setButtonIcon = (button: HTMLAnchorElement, svgMarkup: string): void => {
  button.innerHTML = svgMarkup;
  const svgElement = button.querySelector('svg');
  if (!svgElement) return;

  svgElement.setAttribute('width', '24');
  svgElement.setAttribute('height', '24');
  (svgElement as unknown as HTMLElement).style.pointerEvents = 'none';

  svgElement.querySelectorAll('*').forEach((el) => {
    (el as HTMLElement).style.pointerEvents = 'none';
  });
};

/**
 * Creates the button elements for the Polydraw control.
 * @param container The main container element.
 * @param subContainer The sub-container for additional buttons.
 * @param onActivateToggle Callback for activate button.
 * @param onDrawClick Callback for draw button.
 * @param onSubtractClick Callback for subtract button.
 * @param onEraseClick Callback for erase button.
 * @param onStartClick Callback for start button.
 * @param onHoleClick Callback for hole button.
 */
export function createButtons(
  container: HTMLElement,
  subContainer: HTMLElement,
  config: PolydrawConfig,
  onActivateToggle: () => void,
  onDrawClick: () => void,
  onSubtractClick: () => void,
  onEraseClick: () => void,
  onPointToPointClick: () => void,
  onPointToPointSubtractClick: () => void,
  onUndoClick: () => void,
  onRedoClick: () => void,
  eventManager: EventManager,
  historyManager: HistoryManager,
) {
  const activate = leafletAdapter.domUtil.create(
    'a',
    'icon-activate',
    container,
  ) as HTMLAnchorElement;
  activate.href = '#';
  activate.title = 'Activate';
  setButtonIcon(activate, icons.activate);
  activate.dataset.activeIcon = icons.activate;
  activate.dataset.collapsedIcon = icons.collapse;

  L.DomEvent.on(activate, 'mousedown', L.DomEvent.stopPropagation);
  L.DomEvent.on(activate, 'touchstart', L.DomEvent.stopPropagation);
  L.DomEvent.on(activate, 'click', L.DomEvent.stop).on(activate, 'click', onActivateToggle);

  if (config.modes.draw) {
    const draw = leafletAdapter.domUtil.create('a', 'icon-draw', subContainer) as HTMLAnchorElement;
    draw.href = '#';
    draw.title = 'Draw';
    setButtonIcon(draw, icons.draw);
    L.DomEvent.on(draw, 'mousedown', L.DomEvent.stopPropagation);
    L.DomEvent.on(draw, 'touchstart', L.DomEvent.stopPropagation);
    L.DomEvent.on(draw, 'click', L.DomEvent.stopPropagation);
    L.DomEvent.on(draw, 'click', L.DomEvent.stop);
    L.DomEvent.on(draw, 'click', onDrawClick);
  }

  if (config.modes.subtract) {
    const subtract = leafletAdapter.domUtil.create(
      'a',
      'icon-subtract',
      subContainer,
    ) as HTMLAnchorElement;
    subtract.href = '#';
    subtract.title = 'Subtract';
    setButtonIcon(subtract, icons.subtract);
    L.DomEvent.on(subtract, 'mousedown', L.DomEvent.stopPropagation);
    L.DomEvent.on(subtract, 'touchstart', L.DomEvent.stopPropagation);
    L.DomEvent.on(subtract, 'click', L.DomEvent.stopPropagation);
    L.DomEvent.on(subtract, 'click', L.DomEvent.stop);
    L.DomEvent.on(subtract, 'click', onSubtractClick);
  }

  if (config.modes.p2p) {
    const p2p = leafletAdapter.domUtil.create('a', 'icon-p2p', subContainer) as HTMLAnchorElement;
    p2p.href = '#';
    p2p.title = 'Point to Point';
    setButtonIcon(p2p, icons.p2p);
    L.DomEvent.on(p2p, 'mousedown', L.DomEvent.stopPropagation);
    L.DomEvent.on(p2p, 'touchstart', L.DomEvent.stopPropagation);
    L.DomEvent.on(p2p, 'click', L.DomEvent.stopPropagation);
    L.DomEvent.on(p2p, 'click', L.DomEvent.stop);
    L.DomEvent.on(p2p, 'click', onPointToPointClick);
  }

  if (config.modes.p2pSubtract) {
    const p2pSubtract = leafletAdapter.domUtil.create(
      'a',
      'icon-p2p-subtract',
      subContainer,
    ) as HTMLAnchorElement;
    p2pSubtract.href = '#';
    p2pSubtract.title = 'Point to Point Subtract';
    setButtonIcon(p2pSubtract, icons.p2pSubtract);
    L.DomEvent.on(p2pSubtract, 'mousedown', L.DomEvent.stopPropagation);
    L.DomEvent.on(p2pSubtract, 'touchstart', L.DomEvent.stopPropagation);
    L.DomEvent.on(p2pSubtract, 'click', L.DomEvent.stopPropagation);
    L.DomEvent.on(p2pSubtract, 'click', L.DomEvent.stop);
    L.DomEvent.on(p2pSubtract, 'click', onPointToPointSubtractClick);
  }

  if (config.modes.deleteAll) {
    const erase = leafletAdapter.domUtil.create(
      'a',
      'icon-erase',
      subContainer,
    ) as HTMLAnchorElement;
    erase.href = '#';
    erase.title = 'Erase All';
    setButtonIcon(erase, icons.erase);
    L.DomEvent.on(erase, 'mousedown', L.DomEvent.stopPropagation);
    L.DomEvent.on(erase, 'touchstart', L.DomEvent.stopPropagation);
    L.DomEvent.on(erase, 'click', L.DomEvent.stopPropagation);
    L.DomEvent.on(erase, 'click', L.DomEvent.stop);
    L.DomEvent.on(erase, 'click', onEraseClick);
  }

  // Undo button - always available
  const undo = leafletAdapter.domUtil.create('a', 'icon-undo', subContainer) as HTMLAnchorElement;
  undo.href = '#';
  undo.title = 'Undo (Ctrl+Z / Cmd+Z)';
  setButtonIcon(undo, icons.undo);
  L.DomEvent.on(undo, 'mousedown', L.DomEvent.stopPropagation);
  L.DomEvent.on(undo, 'touchstart', L.DomEvent.stopPropagation);
  L.DomEvent.on(undo, 'click', L.DomEvent.stopPropagation);
  L.DomEvent.on(undo, 'click', L.DomEvent.stop);
  L.DomEvent.on(undo, 'click', onUndoClick);

  // Redo button - always available
  const redo = leafletAdapter.domUtil.create('a', 'icon-redo', subContainer) as HTMLAnchorElement;
  redo.href = '#';
  redo.title = 'Redo (Ctrl+Y / Cmd+Y)';
  setButtonIcon(redo, icons.redo);
  L.DomEvent.on(redo, 'mousedown', L.DomEvent.stopPropagation);
  L.DomEvent.on(redo, 'touchstart', L.DomEvent.stopPropagation);
  L.DomEvent.on(redo, 'click', L.DomEvent.stopPropagation);
  L.DomEvent.on(redo, 'click', L.DomEvent.stop);
  L.DomEvent.on(redo, 'click', onRedoClick);

  // Update button states based on history state
  const updateHistoryButtonStates = (canUndo: boolean, canRedo: boolean) => {
    if (canUndo) {
      undo.style.opacity = '1';
      undo.style.pointerEvents = 'auto';
    } else {
      undo.style.opacity = '0.3';
      undo.style.pointerEvents = 'none';
    }

    if (canRedo) {
      redo.style.opacity = '1';
      redo.style.pointerEvents = 'auto';
    } else {
      redo.style.opacity = '0.3';
      redo.style.pointerEvents = 'none';
    }
  };

  // Listen to history changes and update button states automatically
  eventManager.on('polydraw:history:changed', (data) => {
    updateHistoryButtonStates(data.canUndo, data.canRedo);
  });

  eventManager.on('polydraw:history:undo', (data) => {
    updateHistoryButtonStates(data.canUndo, data.canRedo);
  });

  eventManager.on('polydraw:history:redo', (data) => {
    updateHistoryButtonStates(data.canUndo, data.canRedo);
  });

  // Initialize button states
  updateHistoryButtonStates(historyManager.canUndo(), historyManager.canRedo());

  // Debug buttons to test autoAddPolygon(s)

  // const start = L.DomUtil.create('a', 'icon-start', subContainer);
  // start.href = '#';
  // start.title = 'Start';
  // start.innerHTML = '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><polygon points="5,5 5,15 15,10" /></svg>';
  // if (onStartClick) {
  //   L.DomEvent.on(start, 'click', L.DomEvent.stop).on(start, 'click', onStartClick);
  // }

  // const hole = L.DomUtil.create('a', 'icon-hole', subContainer);
  // hole.href = '#';
  // hole.title = 'Hole';
  // hole.innerHTML = '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="10" cy="10" r="7" /><circle cx="10" cy="10" r="3" fill="white" /></svg>';
  // if (onHoleClick) {
  //   L.DomEvent.on(hole, 'click', L.DomEvent.stop).on(hole, 'click', onHoleClick);
  // }
}
