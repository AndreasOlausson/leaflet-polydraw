import { demoTargets } from '@polydraw-demo/shared-content';
import { mountSharedStyles, renderWrapperPage } from '@polydraw-demo/shared-ui';

const app = document.getElementById('app');
if (!app) {
  throw new Error('Missing app root');
}

mountSharedStyles('#556b62');

const isDevelopment = import.meta.env.DEV;
const isLocalSource = import.meta.env.MODE === 'workspace';
const sourceLabel = isDevelopment ? (isLocalSource ? 'workspace source' : 'npm package') : undefined;
const sourceSummary = !isDevelopment
  ? undefined
  : isLocalSource
    ? 'Development mode is pointing both runtime routes at the local workspace source instead of the published package.'
    : 'Development mode is using the published npm package. Switch to the workspace source mode to exercise local library changes.';

document.title = `Polydraw Public Demo • ${isLocalSource ? 'Local' : 'Public'}`;

const hrefFor = (route: 'leaflet-v1' | 'leaflet-v2') => {
  if (import.meta.env.DEV) {
    return route === 'leaflet-v1' ? 'http://localhost:4174/' : 'http://localhost:4175/';
  }
  return route === 'leaflet-v1' ? '/leaflet-v1/' : '/leaflet-v2/';
};

app.innerHTML = renderWrapperPage({
  sourceMode: sourceLabel,
  sourceSummary,
  title: 'Choose a Leaflet runtime',
  subtitle:
    'Both routes run the same scenarios. Use Leaflet 1.9.x to validate the current stable line, or Leaflet 2.x to evaluate the forward path.',
  targets: demoTargets.map((target) => ({
    ...target,
    href: hrefFor(target.id)
  }))
});
