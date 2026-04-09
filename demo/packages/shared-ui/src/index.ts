import type { DemoTarget, MapScenario } from '@polydraw-demo/shared-content';

const sharedStyles = `
  :root {
    color-scheme: light;
    --page-bg: #ecf1f5;
    --page-bg-strong: #dde5eb;
    --surface: rgba(255, 255, 255, 0.78);
    --surface-strong: rgba(255, 255, 255, 0.92);
    --surface-soft: rgba(246, 249, 252, 0.72);
    --surface-inverse: rgba(18, 24, 32, 0.82);
    --ink: #13202c;
    --muted: #566576;
    --line: rgba(19, 32, 44, 0.12);
    --line-strong: rgba(19, 32, 44, 0.22);
    --accent: #1f6a55;
    --accent-strong: #184e3f;
    --accent-soft: color-mix(in srgb, var(--accent) 16%, white);
    --danger: #aa4d2f;
    --shadow-lg: 0 24px 60px rgba(19, 32, 44, 0.14);
    --shadow-md: 0 16px 34px rgba(19, 32, 44, 0.12);
    --radius-xl: 28px;
    --radius-lg: 22px;
    --radius-md: 16px;
    --radius-sm: 12px;
    --font-sans: "Avenir Next", "Frutiger", "Segoe UI", sans-serif;
    --font-display: "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif;
  }

  @media (prefers-color-scheme: dark) {
    :root {
      color-scheme: dark;
      --page-bg: #0f1720;
      --page-bg-strong: #18232f;
      --surface: rgba(15, 23, 32, 0.72);
      --surface-strong: rgba(18, 27, 38, 0.9);
      --surface-soft: rgba(28, 38, 50, 0.72);
      --surface-inverse: rgba(239, 244, 248, 0.9);
      --ink: #eef4f8;
      --muted: #a9b5c2;
      --line: rgba(238, 244, 248, 0.11);
      --line-strong: rgba(238, 244, 248, 0.22);
      --accent-soft: color-mix(in srgb, var(--accent) 22%, #0f1720);
      --shadow-lg: 0 24px 60px rgba(0, 0, 0, 0.32);
      --shadow-md: 0 16px 34px rgba(0, 0, 0, 0.26);
    }
  }

  .demo-shell,
  .demo-shell :where([class^="demo-"], [class*=" demo-"]) {
    box-sizing: border-box;
  }

  html,
  body {
    margin: 0;
    min-height: 100%;
    background:
      radial-gradient(circle at top left, color-mix(in srgb, var(--accent) 18%, transparent), transparent 32%),
      radial-gradient(circle at top right, rgba(118, 153, 189, 0.16), transparent 28%),
      linear-gradient(180deg, var(--page-bg) 0%, var(--page-bg-strong) 100%);
    color: var(--ink);
    font-family: var(--font-sans);
  }

  body {
    min-height: 100vh;
  }

  a {
    color: inherit;
    text-decoration: none;
  }

  button,
  summary {
    font: inherit;
  }

  .demo-shell {
    min-height: 100vh;
    padding: 24px;
  }

  .demo-frame {
    max-width: 1480px;
    margin: 0 auto;
    display: grid;
    gap: 22px;
  }

  .demo-hero,
  .demo-map-panel {
    border: 1px solid var(--line);
    background: var(--surface);
    box-shadow: var(--shadow-lg);
  }

  .demo-launch-frame {
    max-width: 1240px;
  }

  .demo-launch-stage {
    min-height: calc(100vh - 48px);
    overflow: hidden;
    border: 1px solid color-mix(in srgb, var(--line-strong) 74%, transparent);
    border-radius: 12px;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.12), transparent 22%),
      color-mix(in srgb, var(--surface-strong) 95%, transparent);
    box-shadow: 0 24px 64px rgba(19, 32, 44, 0.1);
    display: grid;
    grid-template-columns: minmax(0, 1.2fr) minmax(360px, 0.8fr);
  }

  .demo-launch-copy {
    padding: clamp(28px, 4vw, 56px);
    display: grid;
    align-content: start;
    gap: 28px;
  }

  .demo-launch-head {
    display: grid;
    gap: 26px;
  }

  .demo-launch-context {
    display: grid;
    gap: 10px;
    width: fit-content;
    padding: 14px 16px;
    border: 1px solid color-mix(in srgb, var(--accent) 22%, var(--line-strong));
    border-radius: 8px;
    background: color-mix(in srgb, var(--accent-soft) 44%, var(--surface-strong));
  }

  .demo-launch-source {
    display: inline-flex;
    align-items: baseline;
    gap: 10px;
    width: fit-content;
    color: var(--muted);
    font-size: 14px;
    line-height: 1.4;
  }

  .demo-launch-source-label {
    text-transform: uppercase;
    letter-spacing: 0.14em;
    font-size: 11px;
    font-weight: 700;
  }

  .demo-launch-source-value {
    color: var(--ink);
    font-weight: 600;
  }

  .demo-launch-context-copy {
    margin: 0;
    max-width: 34rem;
    color: var(--muted);
    font-size: 14px;
    line-height: 1.6;
  }

  .demo-launch-title {
    margin: 0;
    font-family: var(--font-display);
    font-size: clamp(34px, 4vw, 46px);
    line-height: 0.94;
    letter-spacing: -0.06em;
  }

  .demo-launch-copy-text {
    margin: 0;
    max-width: 36rem;
    color: var(--muted);
    font-size: 19px;
    line-height: 1.7;
  }

  .demo-launch-notes {
    display: grid;
    gap: 16px;
    width: min(100%, 40rem);
  }

  .demo-launch-note {
    position: relative;
    display: grid;
    gap: 6px;
    padding-left: 18px;
  }

  .demo-launch-note::before {
    content: "";
    position: absolute;
    left: 0;
    top: 0.8em;
    width: 8px;
    height: 1px;
    background: color-mix(in srgb, var(--accent) 70%, var(--line-strong));
  }

  .demo-launch-note-label {
    margin: 0;
    font-size: 14px;
    font-weight: 700;
    letter-spacing: -0.01em;
    color: var(--ink);
  }

  .demo-launch-note-value {
    margin: 0;
    color: var(--muted);
    font-size: 15px;
    line-height: 1.65;
  }

  .demo-launch-runtimes {
    display: grid;
    background: color-mix(in srgb, var(--surface-soft) 84%, transparent);
    border-left: 1px solid var(--line);
  }

  .demo-launch-runtime {
    padding: 32px;
    display: grid;
    align-content: start;
    gap: 14px;
  }

  .demo-launch-runtime + .demo-launch-runtime {
    border-top: 1px solid var(--line);
  }

  .demo-launch-runtime-badge {
    text-transform: uppercase;
    letter-spacing: 0.14em;
    font-size: 11px;
    font-weight: 700;
    color: var(--accent-strong);
  }

  .demo-launch-runtime-title {
    margin: 0;
    font-family: var(--font-display);
    font-size: clamp(34px, 4vw, 46px);
    line-height: 0.96;
    letter-spacing: -0.05em;
  }

  .demo-launch-runtime-copy,
  .demo-launch-runtime-summary {
    margin: 0;
    line-height: 1.6;
  }

  .demo-launch-runtime-copy {
    color: var(--ink);
    font-size: 15px;
  }

  .demo-launch-runtime-summary {
    color: var(--muted);
  }

  .demo-launch-link {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    width: fit-content;
    margin-top: 8px;
    min-height: 46px;
    padding: 12px 18px;
    border: 1px solid color-mix(in srgb, var(--accent) 84%, black);
    border-radius: 8px;
    background: var(--accent);
    box-shadow: 0 10px 24px rgba(19, 32, 44, 0.12);
    color: #f7fbf9;
    font-weight: 700;
    letter-spacing: -0.01em;
    transition:
      transform 180ms ease,
      background 180ms ease,
      border-color 180ms ease,
      box-shadow 180ms ease;
  }

  .demo-launch-link::after {
    content: "→";
    transition: transform 180ms ease;
  }

  .demo-launch-link:hover {
    background: color-mix(in srgb, var(--accent) 80%, black);
    border-color: color-mix(in srgb, var(--accent) 72%, black);
    box-shadow: 0 14px 28px rgba(19, 32, 44, 0.16);
    transform: translateY(-1px);
  }

  .demo-launch-link:hover::after {
    transform: translateX(4px);
  }

  .demo-route-frame {
    min-height: calc(100vh - 48px);
    gap: 12px;
    grid-template-rows: auto minmax(0, 1fr);
    position: relative;
  }

  .demo-route-header,
  .demo-map-panel {
    border: 1px solid var(--line);
    background: var(--surface);
    box-shadow: var(--shadow-lg);
  }

  .demo-route-header {
    position: relative;
    z-index: 20;
    overflow: visible;
    border-radius: 12px;
    padding: 16px 18px;
    display: grid;
    gap: 14px;
  }

  .demo-route-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 14px;
    flex-wrap: wrap;
  }

  .demo-route-meta {
    min-width: 0;
    display: grid;
    gap: 10px;
  }

  .demo-route-bar {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .demo-route-actions {
    display: flex;
    align-items: flex-start;
    justify-content: flex-end;
    gap: 8px;
    flex-wrap: wrap;
  }

  .demo-route-label,
  .demo-status-label {
    text-transform: uppercase;
    letter-spacing: 0.11em;
    font-size: 11px;
    font-weight: 700;
  }

  .demo-route-label {
    display: inline-flex;
    align-items: center;
    min-height: 32px;
    padding: 7px 12px;
    border-radius: 8px;
    border: 1px solid var(--line);
    background: color-mix(in srgb, var(--surface-soft) 92%, transparent);
    color: var(--accent-strong);
  }

  .demo-route-copy,
  .demo-scenario-intro,
  .demo-scenario-card p,
  .demo-status-copy {
    margin: 0;
    color: var(--muted);
    line-height: 1.58;
  }

  .demo-route-copy {
    max-width: 62ch;
    font-size: 14px;
  }

  .demo-route-bottom {
    display: grid;
    gap: 14px;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: start;
  }

  .demo-route-scenarios {
    position: relative;
    min-width: 0;
    display: grid;
    gap: 8px;
  }

  .demo-route-scenarios-bar {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    flex-wrap: wrap;
  }

  .demo-route-drawers {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    flex-wrap: wrap;
  }

  .demo-current-scenario {
    min-width: 0;
    display: grid;
    gap: 4px;
  }

  .demo-current-scenario-title {
    font-size: 15px;
    font-weight: 700;
    letter-spacing: -0.01em;
  }

  .demo-bullet-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 10px;
  }

  .demo-bullet-list li {
    position: relative;
    padding-left: 18px;
    color: var(--muted);
    line-height: 1.55;
  }

  .demo-bullet-list li::before {
    content: "";
    position: absolute;
    left: 0;
    top: 0.72em;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--accent);
    transform: translateY(-50%);
  }

  .demo-back-link,
  .demo-action-link,
  .demo-scenario-button,
  .demo-scenario-toggle,
  .demo-feature-toggle,
  .demo-feature-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    min-height: 46px;
    padding: 12px 18px;
    border-radius: 8px;
    border: 1px solid var(--line-strong);
    transition: background 180ms ease, border-color 180ms ease, box-shadow 180ms ease, color 180ms ease;
  }

  .demo-scenario-button {
    background: var(--accent);
    color: #f8fbfd;
    cursor: pointer;
  }

  .demo-scenario-button:hover,
  .demo-feature-button:hover {
    background: var(--accent-strong);
    box-shadow: var(--shadow-md);
  }

  .demo-back-link,
  .demo-action-link,
  .demo-scenario-toggle,
  .demo-feature-toggle {
    background: var(--surface-soft);
    color: var(--ink);
    cursor: pointer;
  }

  .demo-back-link:hover,
  .demo-action-link:hover,
  .demo-scenario-toggle:hover,
  .demo-feature-toggle:hover,
  .demo-scenario-drawer[open] .demo-scenario-toggle,
  .demo-feature-drawer[open] .demo-feature-toggle {
    background: var(--surface-strong);
    border-color: color-mix(in srgb, var(--accent) 38%, var(--line-strong));
  }

  .demo-scenario-toggle,
  .demo-feature-toggle {
    list-style: none;
    font-weight: 700;
  }

  .demo-scenario-toggle::-webkit-details-marker,
  .demo-feature-toggle::-webkit-details-marker {
    display: none;
  }

  .demo-scenario-toggle::after,
  .demo-feature-toggle::after {
    content: "+";
    font-size: 20px;
    line-height: 1;
  }

  .demo-scenario-drawer[open] .demo-scenario-toggle::after,
  .demo-feature-drawer[open] .demo-feature-toggle::after {
    content: "-";
  }

  .demo-map-panel {
    position: relative;
    overflow: hidden;
    border-radius: 12px;
    min-height: 0;
    height: 100%;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.08), transparent 24%),
      color-mix(in srgb, var(--surface-strong) 74%, transparent);
    isolation: isolate;
  }

  .demo-map {
    width: 100%;
    min-height: 0;
    height: 100%;
    background: #cfd9d2;
  }

  .demo-map .leaflet-overlay-pane > svg.leaflet-zoom-animated,
  .demo-map .leaflet-pane > svg.leaflet-zoom-animated {
    width: auto !important;
    height: auto !important;
  }

  .demo-map .leaflet-pane > svg path.leaflet-interactive,
  .demo-map svg.leaflet-image-layer.leaflet-interactive path {
    pointer-events: auto !important;
  }

  .demo-map .leaflet-pane > svg path.leaflet-interactive {
    cursor: grab;
  }

  .demo-map.leaflet-dragging .leaflet-pane > svg path.leaflet-interactive,
  .demo-map .leaflet-dragging .leaflet-pane > svg path.leaflet-interactive {
    cursor: grabbing;
  }

  .demo-map .demo-edit-handle {
    background-color: #eef5da;
    box-shadow:
      0 0 0 2px color-mix(in srgb, var(--accent) 56%, #2d3f33),
      0 6px 14px rgba(19, 32, 44, 0.24);
    width: 14px !important;
    height: 14px !important;
    margin-left: -7px !important;
    margin-top: -7px !important;
  }

  .demo-map .demo-edit-handle.polygon-marker-faded {
    opacity: 0.48;
    width: 10px !important;
    height: 10px !important;
    margin-left: -5px !important;
    margin-top: -5px !important;
  }

  .demo-map .demo-edit-handle.polygon-marker-faded:hover {
    opacity: 0.9;
  }

  .demo-scenario-drawer {
    position: relative;
  }

  .demo-feature-drawer {
    position: relative;
  }

  .demo-scenario-drawer-body {
    position: absolute;
    top: calc(100% + 12px);
    left: 0;
    z-index: 60;
    width: min(420px, calc(100vw - 56px));
    max-height: min(68vh, 640px);
    overflow: auto;
    display: grid;
    gap: 12px;
    padding: 12px;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: color-mix(in srgb, var(--surface-strong) 94%, transparent);
    box-shadow: var(--shadow-md);
  }

  .demo-scenario-intro {
    font-size: 14px;
  }

  .demo-feature-drawer-body {
    position: absolute;
    top: calc(100% + 12px);
    left: 0;
    z-index: 60;
    width: min(380px, calc(100vw - 56px));
    max-height: min(68vh, 640px);
    overflow: auto;
    display: grid;
    gap: 12px;
    padding: 12px;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: color-mix(in srgb, var(--surface-strong) 94%, transparent);
    box-shadow: var(--shadow-md);
  }

  .demo-feature-intro,
  .demo-feature-empty,
  .demo-feature-card-copy {
    margin: 0;
    color: var(--muted);
    line-height: 1.58;
  }

  .demo-feature-intro,
  .demo-feature-empty {
    font-size: 14px;
  }

  .demo-feature-list {
    display: grid;
    gap: 8px;
  }

  .demo-feature-card {
    display: grid;
    gap: 10px;
    padding: 12px;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: color-mix(in srgb, var(--surface-soft) 88%, transparent);
  }

  .demo-feature-card-title {
    margin: 0;
    font-size: 15px;
    font-weight: 700;
    letter-spacing: -0.01em;
  }

  .demo-feature-card-copy {
    font-size: 14px;
  }

  .demo-feature-button {
    width: 100%;
    background: var(--accent);
    color: #f8fbfd;
    cursor: pointer;
  }

  .demo-route-stats {
    display: grid;
    gap: 8px;
    grid-template-columns: repeat(3, 112px);
  }

  .demo-runtime-item {
    width: 112px;
    border-radius: 8px;
    border: 1px solid var(--line);
    background: color-mix(in srgb, var(--surface-soft) 92%, transparent);
    padding: 10px 12px;
  }

  .demo-status-label {
    display: block;
    margin-bottom: 5px;
    color: var(--muted);
  }

  .demo-status-value {
    display: block;
    font-size: 16px;
    font-weight: 700;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .demo-scenarios {
    display: grid;
    gap: 8px;
  }

  .demo-scenario-card {
    display: grid;
    gap: 10px;
    padding: 12px;
    border-radius: 8px;
    border: 1px solid var(--line);
    background: color-mix(in srgb, var(--surface-soft) 88%, transparent);
  }

  .demo-scenario-name {
    margin: 0;
    font-size: 15px;
    font-weight: 700;
    letter-spacing: -0.01em;
  }

  .demo-scenario-button {
    width: 100%;
  }

  .demo-feature-dialog {
    width: min(860px, calc(100vw - 32px));
    max-width: 860px;
    max-height: min(88vh, 920px);
    margin: auto;
    padding: 0;
    border: 0;
    border-radius: 12px;
    background: transparent;
    color: inherit;
  }

  .demo-feature-dialog::backdrop {
    background: rgba(12, 18, 24, 0.5);
    backdrop-filter: blur(6px);
  }

  .demo-feature-dialog-shell {
    display: grid;
    gap: 16px;
    padding: 18px;
    border: 1px solid var(--line);
    border-radius: 12px;
    background: color-mix(in srgb, var(--surface-strong) 96%, transparent);
    box-shadow: var(--shadow-lg);
  }

  .demo-feature-dialog-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 14px;
  }

  .demo-feature-dialog-kicker {
    margin: 0 0 6px;
    text-transform: uppercase;
    letter-spacing: 0.11em;
    font-size: 11px;
    font-weight: 700;
    color: var(--muted);
  }

  .demo-feature-dialog-title {
    margin: 0;
    font-family: var(--font-display);
    font-size: clamp(24px, 3vw, 32px);
    line-height: 1;
    letter-spacing: -0.04em;
  }

  .demo-feature-dialog-close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 40px;
    min-height: 40px;
    padding: 0 12px;
    border: 1px solid var(--line-strong);
    border-radius: 8px;
    background: var(--surface-soft);
    color: var(--ink);
    cursor: pointer;
  }

  .demo-feature-dialog-close:hover {
    background: var(--surface-strong);
    border-color: color-mix(in srgb, var(--accent) 38%, var(--line-strong));
  }

  .demo-feature-dialog-meta {
    display: grid;
    gap: 8px;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  }

  .demo-feature-dialog-meta-item {
    display: grid;
    gap: 5px;
    padding: 12px;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: color-mix(in srgb, var(--surface-soft) 92%, transparent);
  }

  .demo-feature-dialog-meta-label {
    text-transform: uppercase;
    letter-spacing: 0.11em;
    font-size: 11px;
    font-weight: 700;
    color: var(--muted);
  }

  .demo-feature-dialog-meta-value {
    font-size: 15px;
    font-weight: 700;
    line-height: 1.45;
    word-break: break-word;
  }

  .demo-feature-dialog-sections {
    display: grid;
    gap: 12px;
  }

  .demo-feature-dialog-section {
    display: grid;
    gap: 8px;
  }

  .demo-feature-dialog-section-title {
    margin: 0;
    font-size: 14px;
    font-weight: 700;
    letter-spacing: -0.01em;
  }

  .demo-feature-dialog-code {
    margin: 0;
    padding: 14px;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: color-mix(in srgb, var(--surface-soft) 94%, transparent);
    color: var(--ink);
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 12px;
    line-height: 1.6;
    white-space: pre-wrap;
    overflow: auto;
  }

  @media (max-width: 980px) {
    .demo-shell {
      padding: 14px;
    }

    .demo-map-panel,
    .demo-map {
      min-height: 72vh;
      height: 72vh;
    }

    .demo-route-frame {
      min-height: calc(100vh - 28px);
    }

    .demo-route-header {
      padding: 14px;
    }

    .demo-route-bottom {
      grid-template-columns: 1fr;
    }

    .demo-route-actions {
      width: 100%;
      justify-content: flex-end;
    }

    .demo-route-stats {
      grid-template-columns: repeat(2, 112px);
    }

    .demo-scenario-drawer-body {
      width: min(100%, calc(100vw - 40px));
      max-height: min(60vh, 520px);
    }

    .demo-feature-drawer-body {
      width: min(100%, calc(100vw - 40px));
      max-height: min(60vh, 520px);
    }

    .demo-feature-dialog {
      width: min(100vw - 16px, 860px);
    }

    .demo-feature-dialog-shell {
      padding: 14px;
    }

    .demo-launch-stage {
      min-height: auto;
      grid-template-columns: 1fr;
    }

    .demo-launch-copy {
      padding: 24px 22px;
      gap: 26px;
    }

    .demo-launch-runtimes {
      border-left: 0;
      border-top: 1px solid var(--line);
    }

    .demo-launch-runtime {
      padding: 22px;
    }

    .demo-launch-notes {
      width: 100%;
    }
  }
`;

const ensureStyles = () => {
  if (document.getElementById('polydraw-public-demo-styles')) {
    return;
  }
  const style = document.createElement('style');
  style.id = 'polydraw-public-demo-styles';
  style.textContent = sharedStyles;
  document.head.appendChild(style);
};

const listMarkup = (items: string[], className: string) =>
  `<ul class="${className}">${items.map((item) => `<li>${item}</li>`).join('')}</ul>`;

export const mountSharedStyles = (accent?: string) => {
  ensureStyles();
  if (accent) {
    document.documentElement.style.setProperty('--accent', accent);
  }
};

type FeatureInspectionDialogPayload = {
  title: string;
  layerId?: string;
  geometryType?: string;
  latLngs: unknown;
  geoJsonCoordinates: unknown;
  metadata?: Record<string, unknown>;
};

const formatInspectionValue = (value: unknown, emptyFallback: string) => {
  if (value == null) {
    return emptyFallback;
  }

  if (typeof value === 'string') {
    return value.trim().length > 0 ? value : emptyFallback;
  }

  try {
    const formatted = JSON.stringify(value, null, 2);
    return formatted ?? emptyFallback;
  } catch {
    return emptyFallback;
  }
};

const ensureFeatureDialog = () => {
  const dialog = document.querySelector<HTMLDialogElement>('[data-feature-dialog]');
  if (!dialog) {
    return null;
  }

  if (dialog.dataset.bound === 'true') {
    return dialog;
  }

  dialog.dataset.bound = 'true';

  dialog.querySelector<HTMLElement>('[data-action="close-feature-dialog"]')?.addEventListener('click', () => {
    dialog.close();
  });

  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) {
      dialog.close();
    }
  });

  return dialog;
};

export const showFeatureInspectionDialog = (payload: FeatureInspectionDialogPayload) => {
  const dialog = ensureFeatureDialog();
  if (!dialog) {
    return;
  }

  dialog.querySelector<HTMLElement>('[data-state="feature-dialog-title"]')!.textContent = payload.title;
  dialog.querySelector<HTMLElement>('[data-state="feature-dialog-layer"]')!.textContent =
    payload.layerId || 'default';
  dialog.querySelector<HTMLElement>('[data-state="feature-dialog-geometry"]')!.textContent =
    payload.geometryType || 'Polygon';
  dialog.querySelector<HTMLElement>('[data-state="feature-dialog-latlngs"]')!.textContent =
    formatInspectionValue(payload.latLngs, '[]');
  dialog.querySelector<HTMLElement>('[data-state="feature-dialog-geojson"]')!.textContent =
    formatInspectionValue(payload.geoJsonCoordinates, '[]');
  dialog.querySelector<HTMLElement>('[data-state="feature-dialog-metadata"]')!.textContent =
    payload.metadata && Object.keys(payload.metadata).length > 0
      ? formatInspectionValue(payload.metadata, 'No feature metadata')
      : 'No feature metadata';

  if (typeof dialog.showModal === 'function') {
    if (dialog.open) {
      dialog.close();
    }
    dialog.showModal();
    return;
  }

  dialog.setAttribute('open', '');
};

export const closeFeatureInspectionDialog = () => {
  const dialog = document.querySelector<HTMLDialogElement>('[data-feature-dialog]');
  if (!dialog) {
    return;
  }

  if (typeof dialog.close === 'function' && dialog.open) {
    dialog.close();
    return;
  }

  dialog.removeAttribute('open');
};

export type FeatureInspectionListEntry = {
  id: string;
  title: string;
  summary: string;
  actionLabel?: string;
};

export const renderFeatureInspectionList = (entries: FeatureInspectionListEntry[]) => {
  if (entries.length === 0) {
    return '<p class="demo-feature-empty">No features on the map yet. Load a scenario to inspect coordinates and metadata.</p>';
  }

  return `
    <div class="demo-feature-list">
      ${entries
        .map(
          (entry) => `
            <section class="demo-feature-card">
              <h3 class="demo-feature-card-title">${entry.title}</h3>
              <p class="demo-feature-card-copy">${entry.summary}</p>
              <button class="demo-feature-button" type="button" data-feature-id="${entry.id}">${entry.actionLabel || 'View details'}</button>
            </section>
          `,
        )
        .join('')}
    </div>
  `;
};

export const renderWrapperPage = (options: {
  sourceMode?: string;
  sourceSummary?: string;
  title: string;
  subtitle: string;
  targets: Array<DemoTarget & { href: string }>;
}) => {
  const { sourceMode, sourceSummary, title, subtitle, targets } = options;
  return `
    <div class="demo-shell">
      <div class="demo-frame demo-launch-frame">
        <section class="demo-launch-stage">
          <div class="demo-launch-copy">
            <div class="demo-launch-head">
              ${sourceMode
                ? `
                  <div class="demo-launch-context">
                    <div class="demo-launch-source">
                      <span class="demo-launch-source-label">Using</span>
                      <span class="demo-launch-source-value">${sourceMode}</span>
                    </div>
                    ${sourceSummary ? `<p class="demo-launch-context-copy">${sourceSummary}</p>` : ''}
                  </div>
                `
                : ''}
              <h1 class="demo-launch-title">${title}</h1>
              <p class="demo-launch-copy-text">${subtitle}</p>
              <div class="demo-launch-notes" aria-label="Demo notes">
                <section class="demo-launch-note">
                  <h2 class="demo-launch-note-label">Scenarios</h2>
                  <p class="demo-launch-note-value">Both runtime routes load the same curated workflows. You are comparing runtime behavior, not different demo content.</p>
                </section>
                <section class="demo-launch-note">
                  <h2 class="demo-launch-note-label">Package API</h2>
                  <p class="demo-launch-note-value">Each route exercises the same Polydraw surface. The Leaflet version underneath is the part that changes.</p>
                </section>
                <section class="demo-launch-note">
                  <h2 class="demo-launch-note-label">Decision</h2>
                  <p class="demo-launch-note-value">Use Leaflet 1.9.x to confirm the current stable line. Use Leaflet 2.x when you want to evaluate the forward path.</p>
                </section>
              </div>
            </div>
          </div>
          <div class="demo-launch-runtimes">
          ${targets
            .map(
              (target) => `
                <article class="demo-launch-runtime">
                  <span class="demo-launch-runtime-badge">${target.badge}</span>
                  <h2 class="demo-launch-runtime-title">${target.title}</h2>
                  <p class="demo-launch-runtime-copy">${target.compatibility}</p>
                  <p class="demo-launch-runtime-summary">${target.summary}</p>
                  <a class="demo-launch-link" href="${target.href}">Open ${target.title}</a>
                </article>
              `,
            )
            .join('')}
          </div>
        </section>
      </div>
    </div>
  `;
};

export const renderMapDemoPage = (options: {
  routeLabel: string;
  subtitle: string;
  homeHref: string;
  homeLabel: string;
  scenarios: MapScenario[];
}) => {
  const { routeLabel, subtitle, homeHref, homeLabel, scenarios } = options;
  return `
    <div class="demo-shell">
      <div class="demo-frame demo-route-frame">
        <section class="demo-route-header">
          <div class="demo-route-top">
            <div class="demo-route-meta">
              <div class="demo-route-bar">
                <span class="demo-route-label">${routeLabel}</span>
              </div>
              <p class="demo-route-copy">${subtitle}</p>
            </div>
            <div class="demo-route-actions">
              <a class="demo-back-link" href="${homeHref}">${homeLabel}</a>
              <button class="demo-action-link" type="button" data-action="reset">Reset Map</button>
            </div>
          </div>
          <div class="demo-route-bottom">
            <div class="demo-route-scenarios">
              <div class="demo-route-scenarios-bar">
                <div class="demo-route-drawers">
                  <details class="demo-scenario-drawer">
                    <summary class="demo-scenario-toggle">Scenarios</summary>
                    <div class="demo-scenario-drawer-body">
                      <p class="demo-scenario-intro">Load a curated workflow, then use the built-in toolbar to draw, edit, clone, subtract, and inspect runtime behavior.</p>
                      <div class="demo-scenarios">
                        ${scenarios
                          .map(
                            (scenario) => `
                              <section class="demo-scenario-card">
                                <h2 class="demo-scenario-name">${scenario.title}</h2>
                                <p>${scenario.summary}</p>
                                ${listMarkup(scenario.bullets, 'demo-bullet-list')}
                                <button class="demo-scenario-button" type="button" data-scenario-id="${scenario.id}">Load ${scenario.title}</button>
                              </section>
                            `,
                          )
                          .join('')}
                      </div>
                    </div>
                  </details>
                  <details class="demo-feature-drawer">
                    <summary class="demo-feature-toggle">Inspect features</summary>
                    <div class="demo-feature-drawer-body">
                      <p class="demo-feature-intro">Choose a feature from the current map state. The map will highlight it and the inspector will open with coordinates and metadata.</p>
                      <div data-state="feature-list"></div>
                    </div>
                  </details>
                </div>
                <div class="demo-current-scenario">
                  <div class="demo-current-scenario-title" data-state="scenario-title">Waiting for scenario</div>
                  <p class="demo-status-copy" data-state="scenario-summary">Choose a scenario to load a curated Polydraw workflow.</p>
                </div>
              </div>
            </div>
            <div class="demo-route-stats">
              <div class="demo-runtime-item">
                <span class="demo-status-label">Features</span>
                <span class="demo-status-value" data-state="feature-count">0</span>
              </div>
              <div class="demo-runtime-item">
                <span class="demo-status-label">Layers</span>
                <span class="demo-status-value" data-state="layer-count">0</span>
              </div>
              <div class="demo-runtime-item">
                <span class="demo-status-label">Active</span>
                <span class="demo-status-value" data-state="active-layer">default</span>
              </div>
            </div>
          </div>
        </section>
        <section class="demo-map-panel">
          <div id="demo-map" class="demo-map"></div>
        </section>
        <dialog class="demo-feature-dialog" data-feature-dialog>
          <div class="demo-feature-dialog-shell">
            <div class="demo-feature-dialog-head">
              <div>
                <p class="demo-feature-dialog-kicker">Feature inspection</p>
                <h2 class="demo-feature-dialog-title" data-state="feature-dialog-title">Feature</h2>
              </div>
              <button class="demo-feature-dialog-close" type="button" data-action="close-feature-dialog" aria-label="Close feature dialog">Close</button>
            </div>
            <div class="demo-feature-dialog-meta">
              <div class="demo-feature-dialog-meta-item">
                <span class="demo-feature-dialog-meta-label">Layer</span>
                <span class="demo-feature-dialog-meta-value" data-state="feature-dialog-layer">default</span>
              </div>
              <div class="demo-feature-dialog-meta-item">
                <span class="demo-feature-dialog-meta-label">Geometry</span>
                <span class="demo-feature-dialog-meta-value" data-state="feature-dialog-geometry">Polygon</span>
              </div>
            </div>
            <div class="demo-feature-dialog-sections">
              <section class="demo-feature-dialog-section">
                <h3 class="demo-feature-dialog-section-title">Lat / Lng rings</h3>
                <pre class="demo-feature-dialog-code" data-state="feature-dialog-latlngs">[]</pre>
              </section>
              <section class="demo-feature-dialog-section">
                <h3 class="demo-feature-dialog-section-title">GeoJSON coordinates</h3>
                <pre class="demo-feature-dialog-code" data-state="feature-dialog-geojson">[]</pre>
              </section>
              <section class="demo-feature-dialog-section">
                <h3 class="demo-feature-dialog-section-title">Metadata</h3>
                <pre class="demo-feature-dialog-code" data-state="feature-dialog-metadata">No feature metadata</pre>
              </section>
            </div>
          </div>
        </dialog>
      </div>
    </div>
  `;
};
