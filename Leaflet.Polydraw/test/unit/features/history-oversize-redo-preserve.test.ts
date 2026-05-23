import { describe, it, expect } from 'vitest';
import { EventManager } from '../../../src/managers/event-manager';
import { HistoryManager } from '../../../src/managers/history-manager';
import { leafletAdapter } from '../../../src/compatibility/leaflet-adapter';

describe('History Oversize Snapshot Behavior', () => {
  it('preserves redo stack when a new snapshot is skipped due to size limits', () => {
    const eventManager = new EventManager();
    const historyManager = new HistoryManager(eventManager, 10);

    const polygon = leafletAdapter.createPolygon([
      leafletAdapter.createLatLng(58.4, 15.6),
      leafletAdapter.createLatLng(58.5, 15.7),
      leafletAdapter.createLatLng(58.45, 15.8),
    ]);
    const featureGroup = leafletAdapter.createFeatureGroup([polygon]);
    const featureGroups = [featureGroup];

    historyManager.saveState(featureGroups, 'initial');
    const undone = historyManager.undo(featureGroups);
    expect(undone).toBeTruthy();
    expect(historyManager.canRedo()).toBe(true);

    (historyManager as unknown as { maxSnapshotSize: number }).maxSnapshotSize = 1;
    historyManager.saveState(featureGroups, 'too-large-to-save');

    expect(historyManager.canRedo()).toBe(true);
  });
});
