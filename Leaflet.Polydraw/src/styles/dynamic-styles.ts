import type { PolydrawConfig } from '../types/polydraw-interfaces';

export function injectDynamicStyles(config: PolydrawConfig): void {
  const style = document.createElement('style');
  style.innerHTML = `
    .leaflet-control a { background-color: ${config.styles.ui.controlButton.backgroundColor}; color: ${config.styles.ui.controlButton.color}; display: flex; align-items: center; justify-content: center; }
    .leaflet-control a:hover { background-color: ${config.styles.ui.controlButtonHover.backgroundColor}; }
    .leaflet-control a.active { background-color: ${config.styles.ui.controlButtonActive.backgroundColor}; color: ${config.styles.ui.controlButtonActive.color}; }
    .polydraw-indicator-active { background-color: ${config.styles.ui.indicatorActive.backgroundColor} !important; }
    .crosshair-cursor-enabled { cursor: crosshair !important; }
    .crosshair-cursor-enabled * { cursor: crosshair !important; }
    .leaflet-polydraw-p2p-marker { background-color: ${config.styles.ui.p2pMarker.backgroundColor}; border: 2px solid ${config.styles.ui.p2pMarker.borderColor}; border-radius: 50%; box-sizing: border-box; }
    .leaflet-polydraw-p2p-first-marker { position: relative; }
    .leaflet-polydraw-p2p-first-marker:hover { transform: scale(1.5); transition: all 0.2s ease; }
    .leaflet-polydraw-p2p-first-marker-ready[data-p2p-mode="add"]:hover { background-color: ${config.styles.ui.p2pClosingMarker.color}; border-color: ${config.styles.ui.p2pClosingMarker.color}; cursor: pointer; }
    .leaflet-polydraw-p2p-first-marker-ready[data-p2p-mode="subtract"]:hover { background-color: ${config.styles.ui.dragSubtract.color}; border-color: ${config.styles.ui.dragSubtract.color}; cursor: pointer; }
  `;
  document.head.appendChild(style);
}
