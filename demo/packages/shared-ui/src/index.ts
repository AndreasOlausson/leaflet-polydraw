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
    --wrapper-shell-bg:
      radial-gradient(circle at top left, rgba(31, 106, 85, 0.14), transparent 28%),
      radial-gradient(circle at top right, rgba(104, 145, 184, 0.18), transparent 26%),
      #eef3f7;
    --wrapper-shell-color: #13202c;
    --wrapper-body-bg: rgba(255, 255, 255, 0.92);
    --wrapper-body-border: rgba(19, 32, 44, 0.12);
    --wrapper-body-shadow: 0 24px 64px rgba(19, 32, 44, 0.16);
    --wrapper-runtime-bg: rgba(244, 248, 251, 0.92);
    --wrapper-source-bg: rgba(255, 255, 255, 0.86);
    --wrapper-source-border: rgba(19, 32, 44, 0.14);
    --wrapper-title: #13202c;
    --wrapper-text-muted: #566576;
    --wrapper-kicker: #647688;
    --wrapper-badge: #1f6a55;
    --wrapper-note-border: rgba(31, 106, 85, 0.26);
    --wrapper-link-bg: #1f6a55;
    --wrapper-link-bg-hover: #184e3f;
    --wrapper-link-border: #184e3f;
    --wrapper-link-color: #f7fbf9;
    --route-shell-bg: #f4f7fa;
    --route-topbar-bg: #18212b;
    --route-topbar-color: #eef4f8;
    --route-topbar-muted: #b7c4cf;
    --route-topbar-border: rgba(255, 255, 255, 0.08);
    --route-badge-bg: rgba(10, 39, 56, 0.6);
    --route-badge-border: rgba(76, 201, 240, 0.45);
    --route-badge-color: #92deef;
    --route-sidebar-bg: #f8fafc;
    --route-sidebar-border: rgba(19, 32, 44, 0.1);
    --route-panel-border: rgba(19, 32, 44, 0.08);
    --route-text-strong: #18212b;
    --route-text-muted: #667483;
    --route-text-soft: #526170;
    --route-card-bg: #ffffff;
    --route-card-border: rgba(19, 32, 44, 0.1);
    --route-button-bg: #eef3f7;
    --route-button-bg-hover: #e5edf3;
    --route-map-bg: #d7e1da;
    --theme-toggle-bg: rgba(255, 255, 255, 0.08);
    --theme-toggle-border: rgba(19, 32, 44, 0.16);
    --theme-toggle-color: currentColor;
    --demo-route-safe-top: env(safe-area-inset-top, 0px);
    --demo-route-topbar-height: 50px;
    --demo-mobile-info-expanded-height: min(56dvh, 420px);
    --demo-mobile-info-collapsed-height: 44px;
  }

  :root[data-theme="dark"] {
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
    --wrapper-shell-bg:
      radial-gradient(circle at top left, rgba(88, 166, 255, 0.14), transparent 30%),
      radial-gradient(circle at top right, rgba(31, 111, 88, 0.12), transparent 26%),
      #0d1117;
    --wrapper-shell-color: #dce6ef;
    --wrapper-body-bg: rgba(22, 27, 34, 0.94);
    --wrapper-body-border: rgba(148, 163, 184, 0.18);
    --wrapper-body-shadow: 0 24px 64px rgba(0, 0, 0, 0.36);
    --wrapper-runtime-bg: rgba(13, 17, 23, 0.24);
    --wrapper-source-bg: rgba(13, 17, 23, 0.34);
    --wrapper-source-border: rgba(88, 166, 255, 0.28);
    --wrapper-title: #f0f6fc;
    --wrapper-text-muted: #9fb0bf;
    --wrapper-kicker: #8ea4b8;
    --wrapper-badge: #7cc6ff;
    --wrapper-note-border: rgba(88, 166, 255, 0.28);
    --wrapper-link-bg: rgba(88, 166, 255, 0.16);
    --wrapper-link-bg-hover: rgba(88, 166, 255, 0.24);
    --wrapper-link-border: rgba(88, 166, 255, 0.42);
    --wrapper-link-color: #f0f6fc;
    --route-shell-bg: #0f1720;
    --route-topbar-bg: #18212b;
    --route-topbar-color: #eef4f8;
    --route-topbar-muted: #b7c4cf;
    --route-topbar-border: rgba(255, 255, 255, 0.08);
    --route-badge-bg: rgba(10, 39, 56, 0.6);
    --route-badge-border: rgba(76, 201, 240, 0.45);
    --route-badge-color: #92deef;
    --route-sidebar-bg: #121a23;
    --route-sidebar-border: rgba(238, 244, 248, 0.1);
    --route-panel-border: rgba(238, 244, 248, 0.08);
    --route-text-strong: #eef4f8;
    --route-text-muted: #a8b6c4;
    --route-text-soft: #c0ccd6;
    --route-card-bg: #19232f;
    --route-card-border: rgba(238, 244, 248, 0.12);
    --route-button-bg: #223142;
    --route-button-bg-hover: #2b3d51;
    --route-map-bg: #24343b;
    --theme-toggle-bg: rgba(255, 255, 255, 0.06);
    --theme-toggle-border: rgba(255, 255, 255, 0.14);
    --theme-toggle-color: #eef4f8;
  }

  .demo-shell,
  .demo-shell :where([class^="demo-"], [class*=" demo-"]),
  .demo-route-shell,
  .demo-route-shell :where([class^="demo-"], [class*=" demo-"]) {
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
    width: 14px !important;
    height: 14px !important;
    margin-left: -7px !important;
    margin-top: -7px !important;
  }

  .demo-map .demo-edit-handle:not(.hole) {
    background-color: #eef5da;
    box-shadow:
      0 0 0 2px color-mix(in srgb, var(--accent) 56%, #2d3f33),
      0 6px 14px rgba(19, 32, 44, 0.24);
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
    gap: 10px;
  }

  .demo-feature-tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .demo-feature-tab {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 34px;
    padding: 0 12px;
    border: 1px solid var(--line);
    border-radius: 999px;
    background: color-mix(in srgb, var(--surface-soft) 92%, transparent);
    color: var(--ink);
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
  }

  .demo-feature-tab:hover {
    border-color: color-mix(in srgb, var(--accent) 34%, var(--line-strong));
    background: color-mix(in srgb, var(--accent-soft) 60%, var(--surface-soft));
  }

  .demo-feature-tab[aria-pressed="true"] {
    border-color: color-mix(in srgb, var(--accent) 58%, var(--line-strong));
    background: color-mix(in srgb, var(--accent-soft) 78%, var(--surface-soft));
    color: color-mix(in srgb, var(--ink) 86%, var(--accent-strong));
  }

  .demo-feature-card {
    display: grid;
    gap: 10px;
    padding: 12px;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: color-mix(in srgb, var(--surface-soft) 88%, transparent);
  }

  .demo-feature-card-kicker {
    margin: 0;
    color: var(--muted);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
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
    grid-template-rows: auto auto auto auto minmax(0, 1fr);
    gap: 16px;
    height: min(78vh, 760px);
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

  .demo-feature-dialog-controls {
    display: grid;
    gap: 12px;
  }

  .demo-feature-dialog-field {
    display: grid;
    gap: 6px;
  }

  .demo-feature-dialog-field-label {
    text-transform: uppercase;
    letter-spacing: 0.11em;
    font-size: 11px;
    font-weight: 700;
    color: var(--muted);
  }

  .demo-feature-dialog-select {
    width: 100%;
    min-height: 42px;
    padding: 0 12px;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: color-mix(in srgb, var(--surface-soft) 94%, transparent);
    color: var(--ink);
  }

  .demo-feature-dialog-meta {
    display: grid;
    gap: 8px;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
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

  .demo-feature-dialog-tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .demo-feature-dialog-toolbar {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }

  .demo-feature-dialog-tools {
    display: inline-flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    flex-wrap: wrap;
    margin-left: auto;
  }

  .demo-feature-dialog-tab {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 34px;
    padding: 0 12px;
    border: 1px solid var(--line);
    border-radius: 999px;
    background: color-mix(in srgb, var(--surface-soft) 92%, transparent);
    color: var(--ink);
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
  }

  .demo-feature-dialog-tab:hover {
    border-color: color-mix(in srgb, var(--accent) 34%, var(--line-strong));
    background: color-mix(in srgb, var(--accent-soft) 60%, var(--surface-soft));
  }

  .demo-feature-dialog-tab[aria-pressed="true"] {
    border-color: color-mix(in srgb, var(--accent) 58%, var(--line-strong));
    background: color-mix(in srgb, var(--accent-soft) 78%, var(--surface-soft));
    color: color-mix(in srgb, var(--ink) 86%, var(--accent-strong));
  }

  .demo-feature-dialog-tool {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 34px;
    padding: 0 12px;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: color-mix(in srgb, var(--surface-soft) 92%, transparent);
    color: var(--ink);
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
  }

  .demo-feature-dialog-tool:hover {
    border-color: color-mix(in srgb, var(--accent) 34%, var(--line-strong));
    background: color-mix(in srgb, var(--accent-soft) 60%, var(--surface-soft));
  }

  .demo-feature-dialog-note {
    margin: -4px 0 0;
    color: var(--muted);
    font-size: 13px;
    line-height: 1.5;
    min-height: 1.5em;
  }

  .demo-feature-dialog-sections {
    display: grid;
    gap: 12px;
    min-height: 0;
  }

  .demo-feature-dialog-section {
    position: relative;
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    gap: 8px;
    min-height: 0;
  }

  .demo-feature-dialog-section[hidden] {
    display: none;
  }

  .demo-feature-dialog-code {
    margin: 0;
    min-height: 0;
    align-self: stretch;
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
    overscroll-behavior: contain;
    scrollbar-gutter: stable;
  }

  .demo-feature-dialog-section::after {
    content: "";
    position: absolute;
    left: 1px;
    right: 1px;
    bottom: 1px;
    height: 26px;
    border-radius: 0 0 8px 8px;
    background:
      linear-gradient(
        180deg,
        color-mix(in srgb, var(--surface-soft) 0%, transparent),
        color-mix(in srgb, var(--surface-soft) 94%, transparent)
      );
    pointer-events: none;
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
      height: min(84vh, 720px);
      padding: 14px;
    }

    .demo-feature-dialog-tools {
      width: 100%;
      margin-left: 0;
      justify-content: flex-start;
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

  .demo-wrapper-shell {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 18px;
    background: var(--wrapper-shell-bg);
    color: var(--wrapper-shell-color);
  }

  .demo-wrapper-body {
    width: min(1120px, 100%);
    display: grid;
    gap: 0;
    overflow: hidden;
    border: 1px solid var(--wrapper-body-border);
    border-radius: 10px;
    background: var(--wrapper-body-bg);
    box-shadow: var(--wrapper-body-shadow);
  }

  .demo-wrapper-copy {
    display: grid;
    align-content: start;
    gap: 16px;
    padding: clamp(20px, 3vw, 34px);
  }

  .demo-wrapper-source {
    display: grid;
    gap: 6px;
    width: fit-content;
    padding: 10px 12px;
    border: 1px solid var(--wrapper-source-border);
    border-radius: 8px;
    background: var(--wrapper-source-bg);
  }

  .demo-wrapper-source-kicker {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--wrapper-kicker);
  }

  .demo-wrapper-source-value {
    font-size: 14px;
    font-weight: 700;
    color: var(--wrapper-title);
  }

  .demo-wrapper-source-copy {
    margin: 0;
    max-width: 32rem;
    color: var(--wrapper-text-muted);
    font-size: 13px;
    line-height: 1.5;
  }

  .demo-wrapper-title {
    margin: 0;
    font-size: clamp(28px, 4vw, 40px);
    line-height: 0.98;
    letter-spacing: -0.04em;
    color: var(--wrapper-title);
  }

  .demo-wrapper-subtitle {
    margin: 0;
    max-width: 36rem;
    color: var(--wrapper-text-muted);
    font-size: 16px;
    line-height: 1.55;
  }

  .demo-wrapper-notes {
    display: grid;
    gap: 10px;
  }

  .demo-wrapper-note {
    display: grid;
    gap: 3px;
    padding-left: 12px;
    border-left: 2px solid var(--wrapper-note-border);
  }

  .demo-wrapper-note-label {
    margin: 0;
    color: var(--wrapper-title);
    font-size: 14px;
    font-weight: 700;
  }

  .demo-wrapper-note-copy {
    margin: 0;
    color: var(--wrapper-text-muted);
    font-size: 13px;
    line-height: 1.5;
  }

  .demo-wrapper-runtimes {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    background: var(--wrapper-runtime-bg);
    border-top: 1px solid var(--wrapper-body-border);
  }

  .demo-wrapper-runtime {
    display: grid;
    align-content: start;
    gap: 10px;
    padding: 22px 22px;
  }

  .demo-wrapper-runtime + .demo-wrapper-runtime {
    border-left: 1px solid var(--wrapper-body-border);
  }

  .demo-wrapper-runtime-badge {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--wrapper-badge);
  }

  .demo-wrapper-runtime-title {
    margin: 0;
    font-size: 23px;
    line-height: 1;
    letter-spacing: -0.03em;
    color: var(--wrapper-title);
  }

  .demo-wrapper-runtime-copy,
  .demo-wrapper-runtime-summary {
    margin: 0;
    color: var(--wrapper-text-muted);
    font-size: 14px;
    line-height: 1.5;
  }

  .demo-wrapper-runtime-link {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    width: fit-content;
    min-height: 38px;
    padding: 8px 14px;
    border: 1px solid var(--wrapper-link-border);
    border-radius: 8px;
    background: var(--wrapper-link-bg);
    color: var(--wrapper-link-color);
    font-weight: 700;
    transition: background 160ms ease, border-color 160ms ease, transform 160ms ease;
  }

  .demo-wrapper-runtime-link::after {
    content: "→";
  }

  .demo-wrapper-runtime-link:hover {
    background: var(--wrapper-link-bg-hover);
    border-color: var(--wrapper-link-border);
    transform: translateY(-1px);
  }

  .demo-route-shell {
    height: 100dvh;
    min-height: 100vh;
    overflow: hidden;
    background: var(--route-shell-bg);
  }

  .demo-route-topbar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 1200;
    height: calc(var(--demo-route-topbar-height) + var(--demo-route-safe-top));
    display: flex;
    align-items: center;
    gap: 12px;
    padding: var(--demo-route-safe-top) 16px 0;
    background: var(--route-topbar-bg);
    color: var(--route-topbar-color);
    border-bottom: 1px solid var(--route-topbar-border);
  }

  .demo-route-topbar-left {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
    flex: 1 1 auto;
  }

  .demo-route-topbar-info {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
    flex: 1 1 auto;
  }

  .demo-route-topbar-home {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
  }

  .demo-route-topbar-title {
    display: inline-flex;
    align-items: center;
    min-height: 32px;
    font-size: 15px;
    font-weight: 700;
    line-height: 1;
    white-space: nowrap;
  }

  .demo-route-topbar-meta {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    flex: 0 0 auto;
  }

  .demo-route-topbar-badge {
    display: inline-flex;
    align-items: center;
    min-height: 26px;
    padding: 2px 8px;
    border: 1px solid var(--route-badge-border);
    border-radius: 4px;
    background: var(--route-badge-bg);
    color: var(--route-badge-color);
    font-size: 12px;
    font-weight: 700;
    white-space: nowrap;
  }

  .demo-route-topbar-badge--source {
    border-color: rgba(238, 244, 248, 0.2);
    background: rgba(255, 255, 255, 0.05);
    color: var(--route-topbar-color);
  }

  .demo-route-topbar-copy {
    color: var(--route-topbar-muted);
    font-size: 13px;
    flex: 1 1 auto;
    min-width: 0;
    max-width: calc(100% - 36px);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .demo-route-topbar-actions {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .demo-route-scenario-drawer {
    position: relative;
  }

  .demo-route-topbar-link,
  .demo-route-topbar-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 32px;
    padding: 0 10px;
    border: 1px solid var(--theme-toggle-border);
    border-radius: 6px;
    background: var(--theme-toggle-bg);
    color: var(--theme-toggle-color);
    font-size: 13px;
    cursor: pointer;
  }

  .demo-route-topbar-link:hover,
  .demo-route-topbar-button:hover {
    background: color-mix(in srgb, var(--theme-toggle-bg) 68%, white 10%);
  }

  .demo-route-scenario-toggle {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-height: 32px;
    max-width: 240px;
    padding: 0 10px;
    border: 1px solid var(--theme-toggle-border);
    border-radius: 6px;
    background: var(--theme-toggle-bg);
    color: var(--theme-toggle-color);
    font-size: 13px;
    cursor: pointer;
    list-style: none;
  }

  .demo-route-scenario-toggle::-webkit-details-marker {
    display: none;
  }

  .demo-route-scenario-toggle:hover,
  .demo-route-scenario-drawer[open] .demo-route-scenario-toggle {
    background: color-mix(in srgb, var(--theme-toggle-bg) 68%, white 10%);
  }

  .demo-route-scenario-toggle-label {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .demo-route-scenario-toggle::after {
    content: "▾";
    flex: 0 0 auto;
    font-size: 12px;
    color: var(--route-topbar-muted);
  }

  .demo-route-scenario-drawer[open] .demo-route-scenario-toggle::after {
    content: "▴";
  }

  .demo-route-scenario-menu {
    position: absolute;
    top: calc(100% + 10px);
    right: 0;
    z-index: 1300;
    width: min(420px, calc(100vw - 32px));
    max-height: 372px;
    overflow: auto;
    display: grid;
    gap: 8px;
    padding: 12px;
    border: 1px solid var(--route-card-border);
    border-radius: 10px;
    background: color-mix(in srgb, var(--surface-strong) 97%, transparent);
    box-shadow: var(--shadow-md);
    overscroll-behavior: contain;
    scrollbar-gutter: stable;
  }

  .demo-route-scenario-menu::after {
    content: "";
    position: sticky;
    left: 0;
    bottom: 0;
    display: block;
    height: 24px;
    margin-top: -24px;
    border-radius: 0 0 8px 8px;
    background:
      linear-gradient(
        180deg,
        color-mix(in srgb, var(--surface-strong) 0%, transparent),
        color-mix(in srgb, var(--surface-strong) 97%, transparent)
      );
    pointer-events: none;
  }

  .demo-route-topbar-link--icon,
  .demo-theme-toggle--icon {
    width: 32px;
    min-width: 32px;
    min-height: 32px;
    padding: 0;
  }

  .demo-icon {
    width: 16px;
    height: 16px;
    display: inline-block;
    flex: 0 0 auto;
  }

  .demo-icon svg {
    width: 100%;
    height: 100%;
    display: block;
  }

  .demo-route-layout {
    position: fixed;
    inset: calc(var(--demo-route-topbar-height) + var(--demo-route-safe-top)) 0 0 0;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 340px;
    min-height: 0;
  }

  .demo-map-panel {
    position: relative;
    z-index: 0;
    overflow: hidden;
    height: 100%;
    min-height: 0;
    border: 0;
    box-shadow: none;
    background: var(--route-map-bg);
    border-radius: 0;
  }

  .demo-map {
    width: 100%;
    height: 100%;
    min-height: 0;
    overscroll-behavior: contain;
    touch-action: none;
  }

  .demo-sidebar {
    display: flex;
    flex-direction: column;
    z-index: 1;
    background: var(--route-sidebar-bg);
    border-left: 1px solid var(--route-sidebar-border);
    overflow-y: auto;
  }

  .demo-mobile-info-toggle {
    display: none;
  }

  .demo-sidebar-content {
    display: contents;
  }

  .demo-panel {
    padding: 14px;
    border-bottom: 1px solid var(--route-panel-border);
    background: transparent;
    box-shadow: none;
  }

  .demo-panel-title {
    margin: 0 0 10px;
    color: var(--route-text-muted);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .demo-scenario-heading {
    margin: 0;
    font-size: 18px;
    line-height: 1.2;
    letter-spacing: -0.02em;
  }

  .demo-status-copy {
    margin: 6px 0 0;
    color: var(--route-text-soft);
    font-size: 13px;
    line-height: 1.55;
  }

  .demo-state-list {
    display: grid;
    gap: 6px;
  }

  .demo-state-row {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    font-size: 13px;
  }

  .demo-state-label {
    color: var(--route-text-muted);
  }

  .demo-state-value {
    color: var(--route-text-strong);
    font-weight: 700;
    text-align: right;
  }

  .demo-scenario-list {
    display: grid;
    gap: 8px;
  }

  .demo-scenario-button {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 12px;
    border: 1px solid var(--route-card-border);
    border-radius: 6px;
    background: var(--route-card-bg);
    color: var(--route-text-strong);
    text-align: left;
    cursor: pointer;
  }

  .demo-scenario-button:hover {
    background: color-mix(in srgb, var(--route-button-bg) 72%, var(--route-card-bg));
  }

  .demo-scenario-button-label {
    display: grid;
    gap: 3px;
  }

  .demo-scenario-button-title {
    font-size: 14px;
    font-weight: 700;
  }

  .demo-scenario-button-summary {
    color: var(--route-text-muted);
    font-size: 12px;
    line-height: 1.4;
  }

  .demo-runtime-stats {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
  }

  .demo-runtime-item {
    border: 1px solid var(--route-card-border);
    border-radius: 6px;
    background: var(--route-card-bg);
    padding: 10px;
  }

  .demo-status-label {
    display: block;
    margin-bottom: 4px;
    color: var(--route-text-muted);
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .demo-status-value {
    display: block;
    color: var(--route-text-strong);
    font-size: 15px;
    font-weight: 700;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .demo-feature-intro,
  .demo-feature-empty,
  .demo-feature-card-copy {
    margin: 0;
    color: var(--route-text-muted);
    line-height: 1.5;
  }

  .demo-feature-list {
    display: grid;
    gap: 8px;
  }

  .demo-feature-card {
    display: grid;
    gap: 8px;
    padding: 10px;
    border: 1px solid var(--route-card-border);
    border-radius: 6px;
    background: var(--route-card-bg);
  }

  .demo-feature-card-title {
    margin: 0;
    font-size: 14px;
    font-weight: 700;
  }

  .demo-feature-button {
    width: 100%;
    min-height: 36px;
    border: 1px solid var(--route-card-border);
    border-radius: 6px;
    background: var(--route-button-bg);
    color: var(--route-text-strong);
    cursor: pointer;
  }

  .demo-feature-button:hover {
    background: var(--route-button-bg-hover);
  }

  .demo-theme-toggle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 38px;
    padding: 0 12px;
    border: 1px solid var(--theme-toggle-border);
    border-radius: 6px;
    background: var(--theme-toggle-bg);
    color: var(--theme-toggle-color);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
  }

  .demo-theme-toggle:hover {
    background: color-mix(in srgb, var(--theme-toggle-bg) 72%, white 12%);
  }

  .demo-wrapper-topline {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }

  @media (max-width: 960px) {
    .demo-wrapper-shell {
      padding: 12px;
    }

    .demo-wrapper-body {
      grid-template-columns: 1fr;
    }

    .demo-wrapper-runtimes {
      grid-template-columns: 1fr;
      border-top: 1px solid rgba(148, 163, 184, 0.12);
    }

    .demo-wrapper-runtime + .demo-wrapper-runtime {
      border-left: 0;
      border-top: 1px solid var(--wrapper-body-border);
    }
  }

  @media (max-width: 767px) {
    .demo-route-shell {
      --demo-route-topbar-height: 92px;
    }

    .demo-route-topbar {
      align-content: center;
      align-items: center;
      flex-wrap: wrap;
      padding: calc(var(--demo-route-safe-top) + 8px) 12px 8px;
      row-gap: 8px;
    }

    .demo-route-topbar-left {
      flex: 1 1 100%;
      min-width: 0;
    }

    .demo-route-topbar-info {
      flex-wrap: nowrap;
    }

    .demo-route-topbar-meta {
      flex: 1 1 auto;
      min-width: 0;
      flex-wrap: wrap;
      row-gap: 6px;
    }

    .demo-route-topbar-badge {
      flex: 1 1 0;
      min-width: 0;
      height: auto;
      min-height: 26px;
      line-height: 1.2;
      overflow-wrap: anywhere;
      white-space: normal;
    }

    .demo-route-topbar-actions {
      margin-left: 0;
      justify-content: flex-end;
      width: 100%;
    }

    .demo-route-topbar-copy {
      display: none;
    }

    .demo-route-scenario-menu {
      left: 50%;
      right: auto;
      width: min(100vw - 28px, 420px);
      transform: translateX(calc(50vw - 50% - 14px));
    }

    .demo-route-layout {
      position: fixed;
      inset: calc(var(--demo-route-topbar-height) + var(--demo-route-safe-top)) 0 0 0;
      min-height: 0;
      grid-template-columns: 1fr;
      grid-template-rows: minmax(0, 1fr);
    }

    .demo-map-panel {
      height: auto;
      min-height: 0;
    }

    .demo-map {
      height: 100%;
      min-height: 0;
    }

    .demo-sidebar {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 850;
      height: var(--demo-mobile-info-expanded-height);
      min-height: 0;
      max-height: none;
      border-left: 0;
      border-top: 1px solid rgba(19, 32, 44, 0.12);
      border-right: 0;
      border-bottom: 0;
      border-radius: 0;
      box-shadow: 0 -10px 28px rgba(19, 32, 44, 0.12);
      overflow: hidden;
      overscroll-behavior: contain;
    }

    .demo-route-shell[data-mobile-info="collapsed"] .demo-sidebar {
      height: var(--demo-mobile-info-collapsed-height);
    }

    .demo-mobile-info-toggle {
      width: 100%;
      min-height: var(--demo-mobile-info-collapsed-height);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 0 14px;
      border: 0;
      border-bottom: 1px solid var(--route-panel-border);
      background: var(--route-sidebar-bg);
      color: var(--route-text-strong);
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
    }

    .demo-mobile-info-toggle::after {
      content: "Collapse";
      color: var(--route-text-muted);
      font-size: 12px;
      font-weight: 600;
    }

    .demo-route-shell[data-mobile-info="collapsed"] .demo-mobile-info-toggle::after {
      content: "Expand";
    }

    .demo-sidebar-content {
      display: block;
      flex: 1 1 auto;
      min-height: 0;
      overflow-y: auto;
      overscroll-behavior: contain;
      padding-bottom: env(safe-area-inset-bottom, 0px);
    }

    .demo-route-shell[data-mobile-info="collapsed"] .demo-sidebar-content {
      display: none;
    }
  }

  @media (max-width: 399px) {
    .demo-route-topbar-title {
      display: none;
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

const THEME_STORAGE_KEY = 'polydraw-public-demo-theme';
type DemoTheme = 'light' | 'dark';

let themeToggleBound = false;
let scenarioDismissBound = false;
let mobileInfoPanelBound = false;

const readStoredTheme = (): DemoTheme | null => {
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null;
  }
};

const getSystemTheme = (): DemoTheme => {
  if (typeof window.matchMedia === 'function') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
};

const getActiveTheme = (): DemoTheme =>
  document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';

const renderSharedIcon = (name: 'back' | 'moon' | 'sun') => {
  if (name === 'back') {
    return `
      <span class="demo-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M4 10L3.29289 10.7071L2.58579 10L3.29289 9.29289L4 10ZM21 18C21 18.5523 20.5523 19 20 19C19.4477 19 19 18.5523 19 18L21 18ZM8.29289 15.7071L3.29289 10.7071L4.70711 9.29289L9.70711 14.2929L8.29289 15.7071ZM3.29289 9.29289L8.29289 4.29289L9.70711 5.70711L4.70711 10.7071L3.29289 9.29289ZM4 9L14 9L14 11L4 11L4 9ZM21 16L21 18L19 18L19 16L21 16ZM14 9C17.866 9 21 12.134 21 16L19 16C19 13.2386 16.7614 11 14 11L14 9Z"
            fill="currentColor"
          ></path>
        </svg>
      </span>
    `;
  }

  if (name === 'sun') {
    return `
      <span class="demo-icon" aria-hidden="true">
        <svg viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M58.57,25.81c-2.13-3.67-0.87-8.38,2.8-10.51c3.67-2.13,8.38-0.88,10.51,2.8l9.88,17.1c2.13,3.67,0.87,8.38-2.8,10.51 c-3.67,2.13-8.38,0.88-10.51-2.8L58.57,25.81L58.57,25.81z M120,51.17c19.01,0,36.21,7.7,48.67,20.16 C181.12,83.79,188.83,101,188.83,120c0,19.01-7.7,36.21-20.16,48.67c-12.46,12.46-29.66,20.16-48.67,20.16 c-19.01,0-36.21-7.7-48.67-20.16C58.88,156.21,51.17,139.01,51.17,120c0-19.01,7.7-36.21,20.16-48.67 C83.79,58.88,101,51.17,120,51.17L120,51.17z M158.27,81.73c-9.79-9.79-23.32-15.85-38.27-15.85c-14.95,0-28.48,6.06-38.27,15.85 c-9.79,9.79-15.85,23.32-15.85,38.27c0,14.95,6.06,28.48,15.85,38.27c9.79,9.79,23.32,15.85,38.27,15.85 c14.95,0,28.48-6.06,38.27-15.85c9.79-9.79,15.85-23.32,15.85-38.27C174.12,105.05,168.06,91.52,158.27,81.73L158.27,81.73z M113.88,7.71c0-4.26,3.45-7.71,7.71-7.71c4.26,0,7.71,3.45,7.71,7.71v19.75c0,4.26-3.45,7.71-7.71,7.71 c-4.26,0-7.71-3.45-7.71-7.71V7.71L113.88,7.71z M170.87,19.72c2.11-3.67,6.8-4.94,10.48-2.83c3.67,2.11,4.94,6.8,2.83,10.48 l-9.88,17.1c-2.11,3.67-6.8,4.94-10.48,2.83c-3.67-2.11-4.94-6.8-2.83-10.48L170.87,19.72L170.87,19.72z M214.19,58.57 c3.67-2.13,8.38-0.87,10.51,2.8c2.13,3.67,0.88,8.38-2.8,10.51l-17.1,9.88c-3.67,2.13-8.38,0.87-10.51-2.8 c-2.13-3.67-0.88-8.38,2.8-10.51L214.19,58.57L214.19,58.57z M232.29,113.88c4.26,0,7.71,3.45,7.71,7.71 c0,4.26-3.45,7.71-7.71,7.71h-19.75c-4.26,0-7.71-3.45-7.71-7.71c0-4.26,3.45-7.71,7.71-7.71H232.29L232.29,113.88z M220.28,170.87 c3.67,2.11,4.94,6.8,2.83,10.48c-2.11,3.67-6.8,4.94-10.48,2.83l-17.1-9.88c-3.67-2.11-4.94-6.8-2.83-10.48 c2.11-3.67,6.8-4.94,10.48-2.83L220.28,170.87L220.28,170.87z M181.43,214.19c2.13,3.67,0.87,8.38-2.8,10.51 c-3.67,2.13-8.38,0.88-10.51-2.8l-9.88-17.1c-2.13-3.67-0.87-8.38,2.8-10.51c3.67-2.13,8.38-0.88,10.51,2.8L181.43,214.19 L181.43,214.19z M126.12,232.29c0,4.26-3.45,7.71-7.71,7.71c-4.26,0-7.71-3.45-7.71-7.71v-19.75c0-4.26,3.45-7.71,7.71-7.71 c4.26,0,7.71,3.45,7.71,7.71V232.29L126.12,232.29z M69.13,220.28c-2.11,3.67-6.8,4.94-10.48,2.83c-3.67-2.11-4.94-6.8-2.83-10.48 l9.88-17.1c2.11-3.67,6.8-4.94,10.48-2.83c3.67,2.11,4.94,6.8,2.83,10.48L69.13,220.28L69.13,220.28z M25.81,181.43 c-3.67,2.13-8.38,0.87-10.51-2.8c-2.13-3.67-0.88-8.38,2.8-10.51l17.1-9.88c3.67-2.13,8.38-0.87,10.51,2.8 c2.13,3.67,0.88,8.38-2.8,10.51L25.81,181.43L25.81,181.43z M7.71,126.12c-4.26,0-7.71-3.45-7.71-7.71c0-4.26,3.45-7.71,7.71-7.71 h19.75c4.26,0,7.71,3.45,7.71,7.71c0,4.26-3.45,7.71-7.71,7.71H7.71L7.71,126.12z M19.72,69.13c-3.67-2.11-4.94-6.8-2.83-10.48 c2.11-3.67,6.8-4.94,10.48-2.83l17.1,9.88c3.67,2.11,4.94,6.8,2.83,10.48c-2.11,3.67-6.8,4.94-10.48,2.83L19.72,69.13L19.72,69.13z"
            fill="currentColor"
          ></path>
        </svg>
      </span>
    `;
  }

  return `
    <span class="demo-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" transform="matrix(-1, 0, 0, 1, 0, 0)">
        <path d="M14.5739 1.11056L13.7826 2.69316C13.7632 2.73186 13.7319 2.76325 13.6932 2.7826L12.1106 3.5739C11.9631 3.64761 11.9631 3.85797 12.1106 3.93167L13.6932 4.72297C13.7319 4.74233 13.7632 4.77371 13.7826 4.81241L14.5739 6.39502C14.6476 6.54243 14.858 6.54243 14.9317 6.39502L15.723 4.81241C15.7423 4.77371 15.7737 4.74232 15.8124 4.72297L17.395 3.93167C17.5424 3.85797 17.5424 3.64761 17.395 3.5739L15.8124 2.7826C15.7737 2.76325 15.7423 2.73186 15.723 2.69316L14.9317 1.11056C14.858 0.963147 14.6476 0.963148 14.5739 1.11056Z" fill="currentColor"></path>
        <path d="M19.2419 5.07223L18.4633 7.40815C18.4434 7.46787 18.3965 7.51474 18.3368 7.53464L16.0009 8.31328C15.8185 8.37406 15.8185 8.63198 16.0009 8.69276L18.3368 9.4714C18.3965 9.4913 18.4434 9.53817 18.4633 9.59789L19.2419 11.9338C19.3027 12.1161 19.5606 12.1161 19.6214 11.9338L20.4 9.59789C20.42 9.53817 20.4668 9.4913 20.5265 9.4714L22.8625 8.69276C23.0448 8.63198 23.0448 8.37406 22.8625 8.31328L20.5265 7.53464C20.4668 7.51474 20.42 7.46787 20.4 7.40815L19.6214 5.07223C19.5606 4.88989 19.3027 4.88989 19.2419 5.07223Z" fill="currentColor"></path>
        <path fill-rule="evenodd" clip-rule="evenodd" d="M10.4075 13.6642C13.2348 16.4915 17.6517 16.7363 20.6641 14.3703C20.7014 14.341 20.7385 14.3113 20.7754 14.2812C20.9148 14.1674 21.051 14.0479 21.1837 13.9226C21.2376 13.8718 21.2909 13.8201 21.3436 13.7674C21.8557 13.2552 22.9064 13.5578 22.7517 14.2653C22.6983 14.5098 22.6365 14.7517 22.5667 14.9905C22.5253 15.1321 22.4811 15.2727 22.4341 15.4122C22.4213 15.4502 22.4082 15.4883 22.395 15.5262C20.8977 19.8142 16.7886 23.0003 12 23.0003C5.92487 23.0003 1 18.0754 1 12.0003C1 7.13315 4.29086 2.98258 8.66889 1.54252L8.72248 1.52504C8.8185 1.49401 8.91503 1.46428 9.01205 1.43587C9.26959 1.36046 9.5306 1.29438 9.79466 1.23801C10.5379 1.07934 10.8418 2.19074 10.3043 2.72815C10.251 2.78147 10.1987 2.83539 10.1473 2.88989C10.0456 2.99777 9.94766 3.10794 9.8535 3.22023C9.83286 3.24485 9.8124 3.26957 9.79212 3.29439C7.32966 6.30844 7.54457 10.8012 10.4075 13.6642ZM8.99331 15.0784C11.7248 17.8099 15.6724 18.6299 19.0872 17.4693C17.4281 19.6024 14.85 21.0003 12 21.0003C7.02944 21.0003 3 16.9709 3 12.0003C3 9.09163 4.45653 6.47161 6.66058 4.81846C5.41569 8.27071 6.2174 12.3025 8.99331 15.0784Z" fill="currentColor"></path>
      </svg>
    </span>
  `;
};

const syncThemeButtons = () => {
  const nextLabel = getActiveTheme() === 'dark' ? 'Day mode' : 'Night mode';
  document.querySelectorAll<HTMLElement>('[data-action="toggle-theme"]').forEach((button) => {
    if (button.dataset.themePresentation === 'icon') {
      button.innerHTML = renderSharedIcon(getActiveTheme() === 'dark' ? 'sun' : 'moon');
    } else {
      button.textContent = nextLabel;
    }
    button.setAttribute('aria-label', `Switch to ${nextLabel.toLowerCase()}`);
    button.setAttribute('title', `Switch to ${nextLabel.toLowerCase()}`);
  });
};

const applyTheme = (theme: DemoTheme) => {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  syncThemeButtons();
};

const ensureThemeToggle = () => {
  if (themeToggleBound) {
    syncThemeButtons();
    return;
  }

  themeToggleBound = true;
  document.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }
    const button = target.closest<HTMLElement>('[data-action="toggle-theme"]');
    if (!button) {
      return;
    }
    const nextTheme = getActiveTheme() === 'dark' ? 'light' : 'dark';
    applyTheme(nextTheme);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch {
      // Ignore storage failures in private or restricted contexts.
    }
  });

  const initialTheme = readStoredTheme() ?? getSystemTheme();
  applyTheme(initialTheme);
};

const ensureScenarioDismiss = () => {
  if (scenarioDismissBound) {
    return;
  }

  scenarioDismissBound = true;
  document.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    if (target.closest('.demo-route-scenario-drawer')) {
      return;
    }

    document.querySelectorAll<HTMLDetailsElement>('.demo-route-scenario-drawer[open]').forEach((drawer) => {
      drawer.removeAttribute('open');
    });
  });
};

const scheduleLayoutResize = () => {
  // Nudge Leaflet once immediately and once after the bottom-sheet transition.
  window.dispatchEvent(new Event('resize'));
  window.setTimeout(() => {
    window.dispatchEvent(new Event('resize'));
  }, 180);
};

const ensureMobileInfoPanel = () => {
  if (mobileInfoPanelBound) {
    return;
  }

  mobileInfoPanelBound = true;
  document.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const button = target.closest<HTMLButtonElement>('[data-action="toggle-mobile-info"]');
    if (!button) {
      return;
    }

    const shell = button.closest<HTMLElement>('.demo-route-shell');
    if (!shell) {
      return;
    }

    const nextState = shell.dataset.mobileInfo === 'collapsed' ? 'expanded' : 'collapsed';
    shell.dataset.mobileInfo = nextState;
    button.setAttribute('aria-expanded', String(nextState === 'expanded'));
    scheduleLayoutResize();
  });
};

const listMarkup = (items: string[], className: string) =>
  `<ul class="${className}">${items.map((item) => `<li>${item}</li>`).join('')}</ul>`;

export const mountSharedStyles = (accent?: string) => {
  ensureStyles();
  ensureThemeToggle();
  ensureScenarioDismiss();
  ensureMobileInfoPanel();
  if (accent) {
    document.documentElement.style.setProperty('--accent', accent);
  }
};

type FeatureInspectionDialogPayload = {
  entries: FeatureInspectionDialogEntry[];
  selectedFeatureId?: string;
};

export type FeatureInspectionDialogEntry = {
  id: string;
  label?: string;
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

const isCoordinatePair = (value: unknown): value is [number, number] =>
  Array.isArray(value) &&
  value.length === 2 &&
  typeof value[0] === 'number' &&
  typeof value[1] === 'number';

const addClosingPoints = (value: unknown): unknown => {
  if (!Array.isArray(value) || value.length === 0) {
    return value;
  }

  if (value.every((entry) => isCoordinatePair(entry))) {
    const ring = value as [number, number][];
    const first = ring[0];
    const last = ring[ring.length - 1];
    if (!first || !last) {
      return ring;
    }
    if (first[0] === last[0] && first[1] === last[1]) {
      return ring;
    }
    return [...ring, [...first] as [number, number]];
  }

  return value.map((entry) => addClosingPoints(entry));
};

const copyTextToClipboard = async (value: string) => {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // Fall through to textarea fallback.
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand('copy');
    textarea.remove();
    return copied;
  } catch {
    return false;
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
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const copyButton = target.closest<HTMLButtonElement>('[data-action="copy-feature-dialog"]');
    if (copyButton) {
      const selectedEntry = getActiveFeatureDialogEntry();
      if (!selectedEntry) {
        return;
      }
      void copyTextToClipboard(getActiveFeatureDialogText(selectedEntry)).then((copied) => {
        if (!copied) {
          return;
        }
        const originalLabel = copyButton.textContent || 'Copy';
        copyButton.textContent = 'Copied';
        window.setTimeout(() => {
          copyButton.textContent = originalLabel;
        }, 1200);
      });
      return;
    }

    const toggleButton = target.closest<HTMLButtonElement>('[data-action="toggle-latlng-closing"]');
    if (toggleButton) {
      activeFeatureDialogShowClosing = !activeFeatureDialogShowClosing;
      renderFeatureDialogState(dialog);
      return;
    }

    const button = target.closest<HTMLButtonElement>('[data-feature-dialog-tab]');
    if (button?.dataset.featureDialogTab) {
      activeFeatureDialogTab = button.dataset.featureDialogTab as 'latlngs' | 'geojson' | 'metadata';
      renderFeatureDialogState(dialog);
    }
  });

  dialog.addEventListener('change', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement)) {
      return;
    }

    if (target.dataset.state !== 'feature-dialog-select') {
      return;
    }

    activeFeatureDialogSelection = target.value;
    renderFeatureDialogState(dialog);
    document.dispatchEvent(
      new CustomEvent('polydraw:feature-dialog-select', {
        detail: {
          featureId: activeFeatureDialogSelection,
        },
      }),
    );
  });

  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) {
      dialog.close();
    }
  });

  return dialog;
};

let activeFeatureDialogEntries: FeatureInspectionDialogEntry[] = [];
let activeFeatureDialogSelection: string | undefined;
let activeFeatureDialogTab: 'latlngs' | 'geojson' | 'metadata' = 'latlngs';
let activeFeatureDialogShowClosing = false;

const getActiveFeatureDialogEntry = () =>
  activeFeatureDialogEntries.find((entry) => entry.id === activeFeatureDialogSelection) ??
  activeFeatureDialogEntries[0];

const getLatLngDisplayValue = (entry: FeatureInspectionDialogEntry) =>
  activeFeatureDialogShowClosing ? addClosingPoints(entry.latLngs) : entry.latLngs;

const getActiveFeatureDialogText = (entry: FeatureInspectionDialogEntry) => {
  if (activeFeatureDialogTab === 'latlngs') {
    return formatInspectionValue(getLatLngDisplayValue(entry), '[]');
  }

  if (activeFeatureDialogTab === 'geojson') {
    return formatInspectionValue(entry.geoJsonCoordinates, '[]');
  }

  return entry.metadata && Object.keys(entry.metadata).length > 0
    ? formatInspectionValue(entry.metadata, 'No feature metadata')
    : 'No feature metadata';
};

const renderFeatureDialogState = (dialog: HTMLDialogElement) => {
  const selectedEntry = getActiveFeatureDialogEntry();

  if (!selectedEntry) {
    return;
  }

  activeFeatureDialogSelection = selectedEntry.id;

  const selectorEl = dialog.querySelector<HTMLElement>('[data-state="feature-dialog-selector"]');
  if (selectorEl) {
    selectorEl.innerHTML = `
      <label class="demo-feature-dialog-field">
        <span class="demo-feature-dialog-field-label">Layer / feature</span>
        <select class="demo-feature-dialog-select" data-state="feature-dialog-select">
          ${activeFeatureDialogEntries
            .map(
              (entry) => `
                <option value="${entry.id}" ${entry.id === selectedEntry.id ? 'selected' : ''}>
                  ${entry.label || entry.title}
                </option>
              `,
            )
            .join('')}
        </select>
      </label>
    `;
  }

  dialog.querySelector<HTMLElement>('[data-state="feature-dialog-layer"]')!.textContent =
    selectedEntry.layerId || 'default';
  dialog.querySelector<HTMLElement>('[data-state="feature-dialog-latlngs"]')!.textContent =
    formatInspectionValue(getLatLngDisplayValue(selectedEntry), '[]');
  dialog.querySelector<HTMLElement>('[data-state="feature-dialog-geojson"]')!.textContent =
    formatInspectionValue(selectedEntry.geoJsonCoordinates, '[]');
  dialog.querySelector<HTMLElement>('[data-state="feature-dialog-metadata"]')!.textContent =
    selectedEntry.metadata && Object.keys(selectedEntry.metadata).length > 0
      ? formatInspectionValue(selectedEntry.metadata, 'No feature metadata')
      : 'No feature metadata';

  const toolsEl = dialog.querySelector<HTMLElement>('[data-state="feature-dialog-tools"]');
  if (toolsEl) {
    toolsEl.innerHTML = `
      ${
        activeFeatureDialogTab === 'latlngs'
          ? `<button class="demo-feature-dialog-tool" type="button" data-action="toggle-latlng-closing">${
              activeFeatureDialogShowClosing ? 'Hide closing point' : 'Show closing point'
            }</button>`
          : ''
      }
      <button class="demo-feature-dialog-tool" type="button" data-action="copy-feature-dialog">Copy ${
        activeFeatureDialogTab === 'latlngs'
          ? 'Lat / Lng'
          : activeFeatureDialogTab === 'geojson'
            ? 'GeoJSON'
            : 'metadata'
      }</button>
    `;
  }

  const noteEl = dialog.querySelector<HTMLElement>('[data-state="feature-dialog-note"]');
  if (noteEl) {
    noteEl.textContent =
      activeFeatureDialogTab === 'latlngs'
        ? activeFeatureDialogShowClosing
          ? 'Repeated closing point shown for comparison with GeoJSON.'
          : 'Leaflet Lat / Lng output omits the repeated closing point by default.'
        : activeFeatureDialogTab === 'geojson'
          ? 'GeoJSON polygon rings include the repeated closing point.'
          : '';
  }

  dialog.querySelectorAll<HTMLElement>('[data-feature-dialog-tab]').forEach((button) => {
    button.setAttribute('aria-pressed', button.dataset.featureDialogTab === activeFeatureDialogTab ? 'true' : 'false');
  });
  dialog.querySelectorAll<HTMLElement>('[data-feature-dialog-panel]').forEach((panel) => {
    panel.hidden = panel.dataset.featureDialogPanel !== activeFeatureDialogTab;
  });
};

export const showFeatureInspectionDialog = (payload: FeatureInspectionDialogPayload) => {
  const dialog = ensureFeatureDialog();
  if (!dialog) {
    return;
  }

  activeFeatureDialogEntries = payload.entries;
  activeFeatureDialogSelection = payload.selectedFeatureId;
  activeFeatureDialogTab = 'latlngs';
  activeFeatureDialogShowClosing = false;
  renderFeatureDialogState(dialog);

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

  const featureLabel = `${entries.length} feature${entries.length === 1 ? '' : 's'} ready`;
  return `
    <div class="demo-feature-list">
      <section class="demo-feature-card">
        <p class="demo-feature-card-kicker">Current map state</p>
        <h3 class="demo-feature-card-title">${featureLabel}</h3>
        <p class="demo-feature-card-copy">${
          entries.length === 1
            ? 'Open the inspector dialog to review coordinates, geometry, and metadata for the current feature.'
            : 'Open the inspector dialog to switch between features, review coordinates, and inspect metadata.'
        }</p>
        <button class="demo-feature-button" type="button" data-action="open-feature-dialog">${entries[0]?.actionLabel || 'Open inspector'}</button>
      </section>
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
    <div class="demo-wrapper-shell">
      <section class="demo-wrapper-body">
        <div class="demo-wrapper-copy">
          <div class="demo-wrapper-topline">
            ${sourceMode
              ? `
                <div class="demo-wrapper-source">
                  <span class="demo-wrapper-source-kicker">Source mode</span>
                  <span class="demo-wrapper-source-value">${sourceMode}</span>
                  ${sourceSummary ? `<p class="demo-wrapper-source-copy">${sourceSummary}</p>` : ''}
                </div>
              `
              : '<div></div>'}
            <button class="demo-theme-toggle demo-theme-toggle--icon" type="button" data-action="toggle-theme" data-theme-presentation="icon">${renderSharedIcon(getActiveTheme() === 'dark' ? 'sun' : 'moon')}</button>
          </div>
          <h1 class="demo-wrapper-title">${title}</h1>
          <p class="demo-wrapper-subtitle">${subtitle}</p>
          <div class="demo-wrapper-notes" aria-label="Demo notes">
            <section class="demo-wrapper-note">
              <h2 class="demo-wrapper-note-label">Same scenarios</h2>
              <p class="demo-wrapper-note-copy">Both routes run the same curated workflows. The variable is the Leaflet runtime, not the demo content.</p>
            </section>
            <section class="demo-wrapper-note">
              <h2 class="demo-wrapper-note-label">Same package surface</h2>
              <p class="demo-wrapper-note-copy">Each runtime route exercises the same Polydraw package surface, so differences are easier to compare directly.</p>
            </section>
            <section class="demo-wrapper-note">
              <h2 class="demo-wrapper-note-label">Use this split to decide</h2>
              <p class="demo-wrapper-note-copy">Use Leaflet 1.9.x to confirm the stable line and Leaflet 2.x to evaluate the forward path.</p>
            </section>
          </div>
        </div>
        <div class="demo-wrapper-runtimes">
          ${targets
            .map(
              (target) => `
                <article class="demo-wrapper-runtime">
                  <span class="demo-wrapper-runtime-badge">${target.badge}</span>
                  <h2 class="demo-wrapper-runtime-title">${target.title}</h2>
                  <p class="demo-wrapper-runtime-copy">${target.compatibility}</p>
                  <p class="demo-wrapper-runtime-summary">${target.summary}</p>
                  <a class="demo-wrapper-runtime-link" href="${target.href}">Open ${target.title}</a>
                </article>
              `,
            )
            .join('')}
        </div>
      </section>
    </div>
  `;
};

export const renderMapDemoPage = (options: {
  runtimeLabel: string;
  sourceLabel?: string;
  subtitle: string;
  homeHref: string;
  homeLabel: string;
  scenarios: MapScenario[];
}) => {
  const { runtimeLabel, sourceLabel, subtitle, homeHref, homeLabel, scenarios } = options;
  return `
    <div class="demo-route-shell" data-mobile-info="collapsed">
      <header class="demo-route-topbar">
        <div class="demo-route-topbar-left">
          <a class="demo-route-topbar-link demo-route-topbar-link--icon demo-route-topbar-home" href="${homeHref}" aria-label="${homeLabel}" title="${homeLabel}">
            ${renderSharedIcon('back')}
          </a>
          <div class="demo-route-topbar-info">
            <span class="demo-route-topbar-title">leaflet-polydraw</span>
            <div class="demo-route-topbar-meta">
              <span class="demo-route-topbar-badge">${runtimeLabel}</span>
              ${sourceLabel ? `<span class="demo-route-topbar-badge demo-route-topbar-badge--source">${sourceLabel}</span>` : ''}
            </div>
            <span class="demo-route-topbar-copy">${subtitle}</span>
          </div>
        </div>
        <div class="demo-route-topbar-actions">
          <details class="demo-route-scenario-drawer">
            <summary class="demo-route-scenario-toggle">
              <span class="demo-route-scenario-toggle-label" data-state="scenario-label">Load scenario</span>
            </summary>
            <div class="demo-route-scenario-menu">
              ${scenarios
                .map(
                  (scenario) => `
                    <button class="demo-scenario-button" type="button" data-scenario-id="${scenario.id}">
                      <span class="demo-scenario-button-label">
                        <span class="demo-scenario-button-title">${scenario.title}</span>
                        <span class="demo-scenario-button-summary">${scenario.summary}</span>
                      </span>
                    </button>
                  `,
                )
                .join('')}
            </div>
          </details>
          <button class="demo-route-topbar-button" type="button" data-action="reset">Reset map</button>
          <button class="demo-theme-toggle demo-theme-toggle--icon" type="button" data-action="toggle-theme" data-theme-presentation="icon">${renderSharedIcon(getActiveTheme() === 'dark' ? 'sun' : 'moon')}</button>
        </div>
      </header>
      <div class="demo-route-layout">
        <section class="demo-map-panel">
          <div id="demo-map" class="demo-map"></div>
        </section>
        <aside class="demo-sidebar">
          <button class="demo-mobile-info-toggle" type="button" data-action="toggle-mobile-info" aria-expanded="false">
            Map info
          </button>
          <div class="demo-sidebar-content">
            <section class="demo-panel">
              <div class="demo-panel-title">Scenario</div>
              <h2 class="demo-scenario-heading" data-state="scenario-title">Waiting for scenario</h2>
              <p class="demo-status-copy" data-state="scenario-summary">Choose a scenario to load a curated Polydraw workflow.</p>
            </section>
            <section class="demo-panel">
              <div class="demo-panel-title">State</div>
              <div class="demo-state-list">
                <div class="demo-state-row">
                  <span class="demo-state-label">Features</span>
                  <span class="demo-state-value" data-state="feature-count">0</span>
                </div>
                <div class="demo-state-row">
                  <span class="demo-state-label">Layers</span>
                  <span class="demo-state-value" data-state="layer-count">0</span>
                </div>
                <div class="demo-state-row">
                  <span class="demo-state-label">Active layer</span>
                  <span class="demo-state-value" data-state="active-layer">default</span>
                </div>
              </div>
            </section>
            <section class="demo-panel demo-feature-drawer">
            <div class="demo-panel-title">Feature inspector</div>
              <p class="demo-feature-intro">Open the inspector to review one feature at a time. Feature switching happens in the modal, not in the side panel.</p>
              <div data-state="feature-list"></div>
            </section>
          </div>
        </aside>
        <dialog class="demo-feature-dialog" data-feature-dialog>
          <div class="demo-feature-dialog-shell">
            <div class="demo-feature-dialog-head">
              <div>
                <p class="demo-feature-dialog-kicker">Feature inspection</p>
                <h2 class="demo-feature-dialog-title">Inspect feature</h2>
              </div>
              <button class="demo-feature-dialog-close" type="button" data-action="close-feature-dialog" aria-label="Close feature dialog">Close</button>
            </div>
            <div class="demo-feature-dialog-controls" data-state="feature-dialog-selector"></div>
            <div class="demo-feature-dialog-meta">
              <div class="demo-feature-dialog-meta-item">
                <span class="demo-feature-dialog-meta-label">Layer</span>
                <span class="demo-feature-dialog-meta-value" data-state="feature-dialog-layer">default</span>
              </div>
            </div>
            <div class="demo-feature-dialog-toolbar">
              <div class="demo-feature-dialog-tabs" role="tablist" aria-label="Feature data views">
                <button class="demo-feature-dialog-tab" type="button" data-feature-dialog-tab="latlngs" aria-pressed="true">Lat / Lng</button>
                <button class="demo-feature-dialog-tab" type="button" data-feature-dialog-tab="geojson" aria-pressed="false">GeoJSON</button>
                <button class="demo-feature-dialog-tab" type="button" data-feature-dialog-tab="metadata" aria-pressed="false">Metadata</button>
              </div>
              <div class="demo-feature-dialog-tools" data-state="feature-dialog-tools"></div>
            </div>
            <p class="demo-feature-dialog-note" data-state="feature-dialog-note"></p>
            <div class="demo-feature-dialog-sections">
              <section class="demo-feature-dialog-section" data-feature-dialog-panel="latlngs">
                <pre class="demo-feature-dialog-code" data-state="feature-dialog-latlngs">[]</pre>
              </section>
              <section class="demo-feature-dialog-section" data-feature-dialog-panel="geojson" hidden>
                <pre class="demo-feature-dialog-code" data-state="feature-dialog-geojson">[]</pre>
              </section>
              <section class="demo-feature-dialog-section" data-feature-dialog-panel="metadata" hidden>
                <pre class="demo-feature-dialog-code" data-state="feature-dialog-metadata">No feature metadata</pre>
              </section>
            </div>
          </div>
        </dialog>
      </div>
    </div>
  `;
};
