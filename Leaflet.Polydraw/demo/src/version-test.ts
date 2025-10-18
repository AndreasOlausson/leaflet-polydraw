/**
 * Version Detection Test
 * This file tests the Leaflet version detection and compatibility features
 */

import { LeafletVersionDetector } from '../../src/compatibility/version-detector';
import { LeafletVersion } from '../../src/enums';

// Test version detection
console.log('=== Leaflet Version Detection Test ===');
const versionInfo = LeafletVersionDetector.getVersionInfo();
console.log('Version Info:', versionInfo);

const detectedVersion = LeafletVersionDetector.getVersion();
console.log('Detected Version:', detectedVersion);

// Test enum usage
console.log('LeafletVersion.V1:', LeafletVersion.V1);
console.log('LeafletVersion.V2:', LeafletVersion.V2);

// Test helper methods
console.log('Is V1:', LeafletVersionDetector.isV1());
console.log('Is V2:', LeafletVersionDetector.isV2());

// Display results in the page
const statusDiv = document.createElement('div');
statusDiv.style.cssText = `
  position: fixed;
  top: 10px;
  right: 10px;
  background: rgba(255, 255, 255, 0.9);
  border: 2px solid #333;
  border-radius: 8px;
  padding: 12px;
  font-family: monospace;
  font-size: 12px;
  z-index: 10000;
  max-width: 300px;
`;

statusDiv.innerHTML = `
  <h4 style="margin: 0 0 8px 0;">Leaflet Version Detection</h4>
  <div><strong>Version:</strong> ${detectedVersion}</div>
  <div><strong>Leaflet Version:</strong> ${versionInfo.leafletVersion || 'Unknown'}</div>
  <div><strong>Has Factory Methods:</strong> ${versionInfo.hasFactoryMethods}</div>
  <div><strong>Has Constructors:</strong> ${versionInfo.hasConstructors}</div>
  <div><strong>Global L Available:</strong> ${versionInfo.globalLAvailable}</div>
  <div><strong>Is V1:</strong> ${LeafletVersionDetector.isV1()}</div>
  <div><strong>Is V2:</strong> ${LeafletVersionDetector.isV2()}</div>
`;

document.body.appendChild(statusDiv);

export { versionInfo, detectedVersion };
