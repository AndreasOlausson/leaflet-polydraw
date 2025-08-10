import type { PolydrawConfig } from '../types/polydraw-interfaces';

export function injectDynamicStyles(config: PolydrawConfig): void {
  const style = document.createElement('style');
  style.innerHTML = `
    .leaflet-control a { background-color: ${config.colors.styles.controlButton.backgroundColor}; color: ${config.colors.styles.controlButton.color}; display: flex; align-items: center; justify-content: center; }
    .leaflet-control a:hover { background-color: ${config.colors.styles.controlButtonHover.backgroundColor}; }
    .leaflet-control a.active { background-color: ${config.colors.styles.controlButtonActive.backgroundColor}; color: ${config.colors.styles.controlButtonActive.color}; }
    .polydraw-indicator-active { background-color: ${config.colors.styles.indicatorActive.backgroundColor} !important; }
    .crosshair-cursor-enabled { cursor: crosshair !important; }
    .crosshair-cursor-enabled * { cursor: crosshair !important; }
    .leaflet-polydraw-p2p-marker { background-color: ${config.colors.styles.p2pMarker.backgroundColor}; border: 2px solid ${config.colors.styles.p2pMarker.borderColor}; border-radius: 50%; box-sizing: border-box; }
    .leaflet-polydraw-p2p-first-marker { position: relative; }
    .leaflet-polydraw-p2p-first-marker:hover { transform: scale(1.5); transition: all 0.2s ease; }
  `;
  document.head.appendChild(style);
}
