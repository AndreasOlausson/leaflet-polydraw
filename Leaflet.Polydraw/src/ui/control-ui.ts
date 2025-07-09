import * as L from 'leaflet';
import { createButtons } from '../buttons';
import { DrawMode } from '../enums';
// import type { DrawModeListener } from '../core/polydraw-types';

/**
 * Manages the Leaflet control UI and button interactions
 *
 * NOTE: This file is currently unused by polydraw.ts and has been converted to a shell.
 * All functionality has been commented out but preserved for potential future use.
 * polydraw.ts handles UI control directly in the onAdd() method.
 */
export class ControlUI {
  // private map: L.Map;
  // private config: any;
  // private subContainer?: HTMLElement;
  // private drawModeListeners: DrawModeListener[] = [];

  constructor(config: any) {
    // this.config = config;
  }

  // /**
  //  * Initialize the control UI when added to the map
  //  */
  // onAdd(map: L.Map): HTMLElement {
  //   this.map = map;

  //   // Inject CSS styles
  //   this.injectStyles();

  //   // Create main container
  //   const container = L.DomUtil.create('div', 'leaflet-control leaflet-bar');
  //   container.style.display = 'flex';
  //   container.style.flexDirection = 'column-reverse';

  //   // Create sub-container for collapsible buttons
  //   this.subContainer = L.DomUtil.create('div', 'sub-buttons', container);
  //   this.subContainer.style.maxHeight = '0px';
  //   this.subContainer.style.overflow = 'hidden';
  //   this.subContainer.style.transition = 'max-height 0.3s ease';

  //   // Create button event handlers
  //   const onActivateToggle = () => this.handleActivateToggle(container);
  //   const onDrawClick = () => this.handleDrawClick();
  //   const onSubtractClick = () => this.handleSubtractClick();
  //   const onEraseClick = () => this.handleEraseClick();

  //   // Create buttons
  //   createButtons(
  //     container,
  //     this.subContainer,
  //     onActivateToggle,
  //     onDrawClick,
  //     onSubtractClick,
  //     onEraseClick,
  //   );

  //   // Add listener to update button active states based on draw mode
  //   this.addDrawModeListener((mode) => {
  //     this.updateButtonStates(container, mode);
  //   });

  //   return container;
  // }

  // /**
  //  * Add a draw mode change listener
  //  */
  // addDrawModeListener(listener: DrawModeListener): void {
  //   this.drawModeListeners.push(listener);
  // }

  // /**
  //  * Remove a draw mode change listener
  //  */
  // removeDrawModeListener(listener: DrawModeListener): void {
  //   const index = this.drawModeListeners.indexOf(listener);
  //   if (index > -1) {
  //     this.drawModeListeners.splice(index, 1);
  //   }
  // }

  // /**
  //  * Inject CSS styles into the document
  //  */
  // private injectStyles(): void {
  //   const style = document.createElement('style');
  //   style.innerHTML = `
  //     .leaflet-control a {
  //       background-color: #fff;
  //       color: #000;
  //       display: flex;
  //       align-items: center;
  //       justify-content: center;
  //     }
  //     .leaflet-control a:hover {
  //       background-color: #f4f4f4;
  //     }
  //     .leaflet-control a.active {
  //       background-color: rgb(128, 218, 255);
  //       color: #fff;
  //     }
  //     .crosshair-cursor-enabled {
  //       cursor: crosshair !important;
  //     }
  //     .crosshair-cursor-enabled * {
  //       cursor: crosshair !important;
  //     }
  //   `;
  //   document.head.appendChild(style);
  // }

  // /**
  //  * Handle activate toggle button click
  //  */
  // private handleActivateToggle(container: HTMLElement): void {
  //   const activate = container.querySelector('.icon-activate') as HTMLElement;
  //   if (L.DomUtil.hasClass(activate, 'active')) {
  //     L.DomUtil.removeClass(activate, 'active');
  //     if (this.subContainer) {
  //       this.subContainer.style.maxHeight = '0px';
  //     }
  //   } else {
  //     L.DomUtil.addClass(activate, 'active');
  //     if (this.subContainer) {
  //       this.subContainer.style.maxHeight = '250px';
  //     }
  //   }
  // }

  // /**
  //  * Handle draw button click
  //  */
  // private handleDrawClick(): void {
  //   // Emit draw mode change event
  //   this.emitDrawModeChange(DrawMode.Add);
  // }

  // /**
  //  * Handle subtract button click
  //  */
  // private handleSubtractClick(): void {
  //   // Emit draw mode change event
  //   this.emitDrawModeChange(DrawMode.Subtract);
  // }

  // /**
  //  * Handle erase button click
  //  */
  // private handleEraseClick(): void {
  //   // Emit erase all event - this will be handled externally
  //   this.emitEraseAll();
  // }

  // /**
  //  * Update button active states based on draw mode
  //  */
  // private updateButtonStates(container: HTMLElement, mode: DrawMode): void {
  //   const drawButton = container.querySelector('.icon-draw') as HTMLElement;
  //   const subtractButton = container.querySelector('.icon-subtract') as HTMLElement;

  //   if (drawButton) {
  //     drawButton.classList.toggle('active', mode === DrawMode.Add);
  //   }
  //   if (subtractButton) {
  //     subtractButton.classList.toggle('active', mode === DrawMode.Subtract);
  //   }
  // }

  // /**
  //  * Emit draw mode change event
  //  */
  // private emitDrawModeChange(mode: DrawMode): void {
  //   // This will be handled by external listeners
  //   // For now, we'll use a custom event system
  //   if (this.map) {
  //     this.map.fire('polydraw:drawmodechange', { mode });
  //   }
  // }

  // /**
  //  * Emit erase all event
  //  */
  // private emitEraseAll(): void {
  //   if (this.map) {
  //     this.map.fire('polydraw:eraseall');
  //   }
  // }

  // /**
  //  * Get the sub-container for external access
  //  */
  // getSubContainer(): HTMLElement | undefined {
  //   return this.subContainer;
  // }

  // /**
  //  * Set the map reference (for cases where it's set after construction)
  //  */
  // setMap(map: L.Map): void {
  //   this.map = map;
  // }
}
