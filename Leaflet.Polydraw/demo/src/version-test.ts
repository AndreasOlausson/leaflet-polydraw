/**
 * Version Detection Test
 * This file tests the Leaflet version detection and compatibility features
 */

import { LeafletVersionDetector } from '../../src/compatibility/version-detector';
import polydrawPackage from '../package.json' assert { type: 'json' };

const versionInfo = LeafletVersionDetector.getVersionInfo();

const detectedVersion = LeafletVersionDetector.getVersion();

// Display results in the page with expand/collapse functionality
const target = document.getElementById('leaflet-version-detection');
const versionHeader = document.getElementById('version-header');

if (target && versionHeader) {
  // Create expandable panel wrapper
  const panel = document.createElement('div');
  panel.style.border = '1px solid #ddd';
  panel.style.borderRadius = '6px';
  panel.style.overflow = 'hidden';
  panel.style.background = '#fff';
  panel.style.marginBottom = '8px';

  // Create content wrapper
  const contentWrap = document.createElement('div');
  contentWrap.style.padding = '8px';
  contentWrap.style.fontFamily = 'monospace';
  contentWrap.style.fontSize = '12px';

  // Create version info content
  const versionInfoDiv = document.createElement('div');
  versionInfoDiv.innerHTML = `
    <div><strong>Polydraw Version:</strong> ${polydrawPackage.version}</div>
    <div><strong>Leaflet Version:</strong> ${versionInfo.leafletVersion || 'Unknown'} (${detectedVersion})</div>
    <div><strong>Has Factory Methods:</strong> ${versionInfo.hasFactoryMethods}</div>
    <div><strong>Has Constructors:</strong> ${versionInfo.hasConstructors}</div>
    <div><strong>Global L Available:</strong> ${versionInfo.globalLAvailable}</div>
    <div><strong>Is V1:</strong> ${LeafletVersionDetector.isV1()}</div>
    <div><strong>Is V2:</strong> ${LeafletVersionDetector.isV2()}</div>
  `;

  contentWrap.appendChild(versionInfoDiv);
  panel.appendChild(contentWrap);

  // Add expand/collapse functionality
  const toggle = () => {
    const becomingExpanded = contentWrap.style.display === 'none';
    contentWrap.style.display = becomingExpanded ? 'block' : 'none';
    panel.setAttribute('data-collapsed', String(!becomingExpanded));
    versionHeader.setAttribute('aria-expanded', String(becomingExpanded));
  };

  // Set up header as toggle
  versionHeader.setAttribute('tabindex', '0');
  versionHeader.setAttribute('role', 'button');
  versionHeader.setAttribute('aria-expanded', 'true');

  // Add chevron to header
  const chevron = document.createElement('span');
  chevron.setAttribute('data-chevron', '');
  chevron.textContent = ' ▼';
  chevron.style.fontWeight = '600';
  chevron.style.marginLeft = '6px';
  versionHeader.appendChild(chevron);

  const updateChevron = () => {
    const isCollapsed = contentWrap.style.display === 'none';
    chevron.textContent = isCollapsed ? ' ►' : ' ▼';
  };

  const outerToggle = () => {
    toggle();
    updateChevron();
  };

  // Add event listeners
  versionHeader.addEventListener('click', outerToggle);
  versionHeader.addEventListener('keydown', (e) => {
    if ((e as KeyboardEvent).key === 'Enter' || (e as KeyboardEvent).key === ' ') {
      e.preventDefault();
      outerToggle();
    }
  });

  // Add hover effect
  versionHeader.addEventListener('mouseenter', () => {
    versionHeader.style.backgroundColor = 'rgba(0, 0, 0, 0.05)';
  });
  versionHeader.addEventListener('mouseleave', () => {
    versionHeader.style.backgroundColor = 'transparent';
  });

  // Initially expanded
  contentWrap.style.display = 'block';
  panel.setAttribute('data-collapsed', 'false');

  // Replace the target content
  target.innerHTML = '';
  target.appendChild(panel);
} else {
  // Fallback if elements not found
  const statusDiv = document.createElement('div');
  statusDiv.style.cssText = `
    background: rgba(255, 255, 255, 0.9);
    border-radius: 8px;
    padding: 12px;
    font-family: monospace;
    font-size: 12px;
    z-index: 10000;
  `;

  statusDiv.innerHTML = `
    <h4 style="margin: 0 0 8px 0;">Leaflet Version Detection</h4>
    <div><strong>Polydraw Version:</strong> ${polydrawPackage.version}</div>
    <div><strong>Leaflet Version:</strong> ${versionInfo.leafletVersion || 'Unknown'} (${detectedVersion})</div>
    <div><strong>Has Factory Methods:</strong> ${versionInfo.hasFactoryMethods}</div>
    <div><strong>Has Constructors:</strong> ${versionInfo.hasConstructors}</div>
    <div><strong>Global L Available:</strong> ${versionInfo.globalLAvailable}</div>
    <div><strong>Is V1:</strong> ${LeafletVersionDetector.isV1()}</div>
    <div><strong>Is V2:</strong> ${LeafletVersionDetector.isV2()}</div>
  `;

  document.body.appendChild(statusDiv);
}

export { versionInfo, detectedVersion };
