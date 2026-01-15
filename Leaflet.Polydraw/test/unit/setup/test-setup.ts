/**
 * Test Setup for Leaflet Polydraw
 *
 * This file configures the test environment and provides
 * global mocks and utilities for testing.
 */

import { vi } from 'vitest';
import * as L from 'leaflet';

// Make Leaflet available globally for version detection and adapter logic
(globalThis as { L?: typeof L }).L = L;

// Mock DOM APIs that might be needed
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock PointerEvent
global.PointerEvent = class PointerEvent extends Event {
  pointerId: number;
  clientX: number;
  clientY: number;
  pressure: number;
  pointerType: string;

  constructor(type: string, options: any = {}) {
    super(type);
    this.pointerId = options.pointerId || 1;
    this.clientX = options.clientX || 0;
    this.clientY = options.clientY || 0;
    this.pressure = options.pressure || 0.5;
    this.pointerType = options.pointerType || 'mouse';
  }
} as any;

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};
