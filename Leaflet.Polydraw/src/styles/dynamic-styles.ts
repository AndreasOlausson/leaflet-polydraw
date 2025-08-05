export function injectDynamicStyles(): void {
  const style = document.createElement('style');
  style.innerHTML = `
    .leaflet-control a { background-color: #fff; color: #000; display: flex; align-items: center; justify-content: center; }
    .leaflet-control a:hover { background-color: #f4f4f4; }
    .leaflet-control a.active { background-color:rgb(128, 218, 255); color: #fff; }
    .polydraw-indicator-active { background-color: #ffcc00 !important; }
    .crosshair-cursor-enabled { cursor: crosshair !important; }
    .crosshair-cursor-enabled * { cursor: crosshair !important; }
    .leaflet-polydraw-p2p-marker { background-color: #fff; border: 2px solid #50622b; border-radius: 50%; box-sizing: border-box; }
    .leaflet-polydraw-p2p-first-marker { position: relative; }
    .leaflet-polydraw-p2p-first-marker:hover { transform: scale(1.5); transition: all 0.2s ease; }
  `;
  document.head.appendChild(style);
}
