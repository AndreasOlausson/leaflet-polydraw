import type { PolydrawConfig } from '../../../src/types/polydraw-interfaces';
import { leafletAdapter } from '../../../src/compatibility/leaflet-adapter';
import Polydraw from '../../../src/polydraw';
import { MockFactory } from '../mocks/factory';

export const createPolydrawHarness = (config?: Partial<PolydrawConfig>) => {
  const container = MockFactory.createMapContainer();
  const map = leafletAdapter.createMap(container, {
    zoomControl: false,
    attributionControl: false,
  });
  map.setView([58.4, 15.6], 10);
  const polydraw = new Polydraw({ config });
  polydraw.addTo(map);

  const cleanup = () => {
    polydraw.cleanup();
    map.remove();
    container.remove();
  };

  return { map, container, polydraw, cleanup };
};
