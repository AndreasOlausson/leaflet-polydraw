import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DrawMode } from '../../../src/enums';
import { createPolydrawHarness } from '../helpers/polydraw-harness';

describe('Mode Switching', () => {
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

  it('updates the draw mode and emits mode change events', () => {
    const onModeChange = vi.fn();
    polydraw.on('polydraw:mode:change', onModeChange);

    polydraw.setDrawMode(DrawMode.Add);
    polydraw.setDrawMode(DrawMode.PointToPoint);

    expect(polydraw.getDrawMode()).toBe(DrawMode.PointToPoint);
    const modes = onModeChange.mock.calls.map(([payload]) => payload.mode);
    expect(modes).toContain(DrawMode.Add);
    expect(modes).toContain(DrawMode.PointToPoint);
    expect(modes[modes.length - 1]).toBe(DrawMode.PointToPoint);
  });
});
