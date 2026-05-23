import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { leafletAdapter } from '../../../src/compatibility/leaflet-adapter';
import { createPolydrawHarness } from '../helpers/polydraw-harness';

describe('Menu Action Failure Guard', () => {
  let cleanup: () => void;
  let polydraw: ReturnType<typeof createPolydrawHarness>['polydraw'];

  beforeEach(() => {
    const harness = createPolydrawHarness();
    polydraw = harness.polydraw;
    cleanup = harness.cleanup;
  });

  afterEach(() => {
    cleanup();
  });

  it('does not save history when menu action cannot resolve polygon geometry', async () => {
    const internal = polydraw as unknown as {
      eventManager: {
        emit: (event: string, data: unknown) => void;
      };
      historyManager: {
        saveState: (...args: unknown[]) => void;
      };
    };

    const saveStateSpy = vi.spyOn(internal.historyManager, 'saveState');
    const emptyFeatureGroup = leafletAdapter.createFeatureGroup();

    expect(() => {
      internal.eventManager.emit('polydraw:menu:action', {
        action: 'simplify',
        featureGroup: emptyFeatureGroup,
      });
    }).not.toThrow();

    // Let async callback settle
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(saveStateSpy).not.toHaveBeenCalled();
  });
});
