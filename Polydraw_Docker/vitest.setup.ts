import { vi } from 'vitest'

// Make Jest globals available for Vitest
global.jest = {
  fn: vi.fn,
  mock: vi.mock,
  unmock: vi.unmock,
  clearAllMocks: vi.clearAllMocks,
  resetAllMocks: vi.resetAllMocks,
  restoreAllMocks: vi.restoreAllMocks,
  requireActual: vi.importActual,
  requireMock: vi.importMock,
  spyOn: vi.spyOn,
  mocked: vi.mocked,
  doMock: vi.doMock,
  doUnmock: vi.doUnmock,
  setSystemTime: vi.setSystemTime,
  getRealSystemTime: vi.getRealSystemTime,
  useFakeTimers: vi.useFakeTimers,
  useRealTimers: vi.useRealTimers,
  runOnlyPendingTimers: vi.runOnlyPendingTimers,
  runAllTimers: vi.runAllTimers,
  advanceTimersByTime: vi.advanceTimersByTime,
  advanceTimersToNextTimer: vi.advanceTimersToNextTimer,
  getTimerCount: vi.getTimerCount,
} as any

// Make vi available globally as well
global.vi = vi
