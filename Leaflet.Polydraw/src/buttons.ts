import * as L from 'leaflet';
import { PolydrawConfig } from './types/polydraw-interfaces';
import { isTouchDevice } from './utils';
import { leafletAdapter } from './compatibility/leaflet-adapter';

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
) {
  const activate = leafletAdapter.domUtil.create(
    'a',
    'icon-activate',
    container,
  ) as HTMLAnchorElement;
  activate.href = '#';
  activate.title = 'Activate';
  activate.innerHTML =
    '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M5 17V7M5 17C3.89543 17 3 17.8954 3 19C3 20.1046 3.89543 21 5 21C6.10457 21 7 20.1046 7 19M5 17C6.10457 17 7 17.8954 7 19M5 7C6.10457 7 7 6.10457 7 5M5 7C3.89543 7 3 6.10457 3 5C3 3.89543 3.89543 3 5 3C6.10457 3 7 3.89543 7 5M7 5H17M17 5C17 6.10457 17.8954 7 19 7C20.1046 7 21 6.10457 21 5C21 3.89543 20.1046 3 19 3C17.8954 3 17 3.89543 17 5ZM7 19H17M17 19C17 20.1046 17.8954 21 19 21C20.1046 21 21 20.1046 21 19C21 17.8954 20.1046 17 19 17C17.8954 17 17 17.8954 17 19ZM17.9247 6.6737L15.1955 10.3776M15.1955 13.6223L17.9222 17.3223M16 12C16 13.1046 15.1046 14 14 14C12.8954 14 12 13.1046 12 12C12 10.8954 12.8954 10 14 10C15.1046 10 16 10.8954 16 12Z" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path> </g></svg>';

  L.DomEvent.on(activate, 'mousedown', L.DomEvent.stopPropagation);
  L.DomEvent.on(activate, 'touchstart', L.DomEvent.stopPropagation);
  L.DomEvent.on(activate, 'click', L.DomEvent.stop).on(activate, 'click', onActivateToggle);

  if (config.modes.draw) {
    const draw = leafletAdapter.domUtil.create('a', 'icon-draw', subContainer) as HTMLAnchorElement;
    draw.href = '#';
    draw.title = 'Draw';
    draw.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M15 7.49996L17.5 9.99996M7.5 20L19.25 8.24996C19.9404 7.5596 19.9404 6.44032 19.25 5.74996V5.74996C18.5596 5.0596 17.4404 5.05961 16.75 5.74996L5 17.5V20H7.5ZM7.5 20H15.8787C17.0503 20 18 19.0502 18 17.8786V17.8786C18 17.316 17.7765 16.7765 17.3787 16.3786L17 16M4.5 4.99996C6.5 2.99996 10 3.99996 10 5.99996C10 8.5 4 8.5 4 11C4 11.8759 4.53314 12.5256 5.22583 13" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path> </g></svg>';
    L.DomEvent.on(draw, 'mousedown', L.DomEvent.stopPropagation);
    L.DomEvent.on(draw, 'touchstart', L.DomEvent.stopPropagation);
    L.DomEvent.on(draw, 'click', L.DomEvent.stop).on(draw, 'click', onDrawClick);
  }

  if (config.modes.subtract) {
    const subtract = leafletAdapter.domUtil.create(
      'a',
      'icon-subtract',
      subContainer,
    ) as HTMLAnchorElement;
    subtract.href = '#';
    subtract.title = 'Subtract';
    subtract.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path fill-rule="evenodd" clip-rule="evenodd" d="M15.0722 3.9967L20.7508 9.83395L17.0544 13.5304L13.0758 17.5H21.0041V19H7.93503L4.00195 15.0669L15.0722 3.9967ZM10.952 17.5L15.4628 12.9994L11.8268 9.3634L6.12327 15.0669L8.55635 17.5H10.952Z" fill="#1F2328"></path> </g></svg>';
    L.DomEvent.on(subtract, 'mousedown', L.DomEvent.stopPropagation);
    L.DomEvent.on(subtract, 'touchstart', L.DomEvent.stopPropagation);
    L.DomEvent.on(subtract, 'click', L.DomEvent.stop).on(subtract, 'click', onSubtractClick);
  }

  if (config.modes.p2p && !isTouchDevice()) {
    const p2p = leafletAdapter.domUtil.create('a', 'icon-p2p', subContainer) as HTMLAnchorElement;
    p2p.href = '#';
    p2p.title = 'Point to Point';
    p2p.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M5 17V7M5 17C3.89543 17 3 17.8954 3 19C3 20.1046 3.89543 21 5 21C6.10457 21 7 20.1046 7 19M5 17C6.10457 17 7 17.8954 7 19M5 7C6.10457 7 7 6.10457 7 5M5 7C3.89543 7 3 6.10457 3 5C3 3.89543 3.89543 3 5 3C6.10457 3 7 3.89543 7 5M7 5H17M17 5C17 6.10457 17.8954 7 19 7C20.1046 7 21 6.10457 21 5C21 3.89543 20.1046 3 19 3C17.8954 3 17 3.89543 17 5ZM7 19H17M17 19C17 20.1046 17.8954 21 19 21C20.1046 21 21 20.1046 21 19C21 17.8954 20.1046 17 19 17C17.8954 17 17 17.8954 17 19ZM17.9247 6.6737L15.1955 10.3776M15.1955 13.6223L17.9222 17.3223M16 12C16 13.1046 15.1046 14 14 14C12.8954 14 12 13.1046 12 12C12 10.8954 12.8954 10 14 10C15.1046 10 16 10.8954 16 12Z" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path> </g></svg>';
    L.DomEvent.on(p2p, 'mousedown', L.DomEvent.stopPropagation);
    L.DomEvent.on(p2p, 'touchstart', L.DomEvent.stopPropagation);
    L.DomEvent.on(p2p, 'click', L.DomEvent.stop).on(p2p, 'click', onPointToPointClick);
  }

  if (config.modes.deleteAll) {
    const erase = leafletAdapter.domUtil.create(
      'a',
      'icon-erase',
      subContainer,
    ) as HTMLAnchorElement;
    erase.href = '#';
    erase.title = 'Erase All';
    erase.innerHTML = `<?xml version="1.0" encoding="utf-8"?>
<!-- Generator: Adobe Illustrator 21.0.2, SVG Export Plug-In . SVG Version: 6.00 Build 0)  -->
<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
	 viewBox="0 0 48 48" style="enable-background:new 0 0 48 48;" xml:space="preserve">
<style type="text/css">
	.st0{fill:#000000}
	.st1{fill:#333333;fill-opacity:0;}
</style>
<title>trash</title>
<rect class="st1" width="48" height="48"/>
<polygon class="st0" points="26.6,10 26.6,7.8 21.4,7.8 21.4,10 12.6,10 12.6,12.8 35.4,12.8 35.4,10 "/>
<path class="st0" d="M35.4,15.4H12.6v4.3h1.8V37c0,1.1,0.9,2,2,2h15.2c1.1,0,2-0.9,2-2V19.7h1.8V15.4z M19.7,34.2c0,0.5-0.4,1-1,1
	c-0.5,0-1-0.4-1-1V22.6c0-0.5,0.4-1,1-1c0.5,0,1,0.4,1,1V34.2z M25.3,33.8c0,0.7-0.6,1.3-1.3,1.3c-0.7,0-1.3-0.6-1.3-1.3V23
	c0-0.7,0.6-1.3,1.3-1.3c0.7,0,1.3,0.6,1.3,1.3V33.8z M30.3,34.2c0,0.5-0.4,1-1,1c-0.5,0-1-0.4-1-1V22.6c0-0.5,0.4-1,1-1
	c0.5,0,1,0.4,1,1V34.2z"/>
</svg>`;
    L.DomEvent.on(erase, 'mousedown', L.DomEvent.stopPropagation);
    L.DomEvent.on(erase, 'touchstart', L.DomEvent.stopPropagation);
    L.DomEvent.on(erase, 'click', L.DomEvent.stop).on(erase, 'click', onEraseClick);
  }

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
