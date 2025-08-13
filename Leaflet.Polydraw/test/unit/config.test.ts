import { describe, it, expect, vi } from 'vitest';
import * as L from 'leaflet';
import { createButtons } from '../../src/buttons';
import { PolydrawConfig } from '../../src/types/polydraw-interfaces';
import defaultConfig from '../../src/config.json';

vi.mock('../../src/utils', async () => {
  const actual = await vi.importActual('../../src/utils');
  return {
    ...actual,
    isTouchDevice: () => false,
  };
});

// Mock Leaflet's DomUtil to inspect what's being created
vi.mock('leaflet', async () => {
  const actualLeaflet = await vi.importActual('leaflet');
  return {
    ...actualLeaflet,
    DomUtil: {
      create: vi.fn((tagName, className, container) => {
        const el = document.createElement(tagName);
        el.className = className;
        if (container) {
          container.appendChild(el);
        }
        return el;
      }),
    },
    DomEvent: {
      on: vi.fn(() => ({
        on: vi.fn(),
      })),
      stop: vi.fn(),
    },
  };
});

describe('Configuration-driven UI', () => {
  const container = document.createElement('div');
  const subContainer = document.createElement('div');
  const mockCallbacks = {
    onActivateToggle: () => {},
    onDrawClick: () => {},
    onSubtractClick: () => {},
    onEraseClick: () => {},
    onPointToPointClick: () => {},
  };

  it('should render all buttons when all modes are enabled', () => {
    const config = {
      ...(defaultConfig as unknown as PolydrawConfig),
      modes: {
        draw: true,
        subtract: true,
        deleteAll: true,
        p2p: true,
        attachElbow: true,
        dragElbow: true,
        dragPolygons: true,
        edgeDeletion: true,
      },
    };

    createButtons(
      container,
      subContainer,
      config,
      mockCallbacks.onActivateToggle,
      mockCallbacks.onDrawClick,
      mockCallbacks.onSubtractClick,
      mockCallbacks.onEraseClick,
      mockCallbacks.onPointToPointClick,
    );

    expect(subContainer.querySelector('.icon-draw')).not.toBeNull();
    expect(subContainer.querySelector('.icon-subtract')).not.toBeNull();
    expect(subContainer.querySelector('.icon-erase')).not.toBeNull();
    expect(subContainer.querySelector('.icon-p2p')).not.toBeNull();
  });

  it('should not render buttons when modes are disabled', () => {
    const config = {
      ...(defaultConfig as unknown as PolydrawConfig),
      modes: {
        draw: false,
        subtract: false,
        deleteAll: false,
        p2p: false,
        attachElbow: false,
        dragElbow: false,
        dragPolygons: false,
        edgeDeletion: false,
      },
    };

    // Clear the subContainer before re-rendering
    subContainer.innerHTML = '';
    createButtons(
      container,
      subContainer,
      config,
      mockCallbacks.onActivateToggle,
      mockCallbacks.onDrawClick,
      mockCallbacks.onSubtractClick,
      mockCallbacks.onEraseClick,
      mockCallbacks.onPointToPointClick,
    );

    expect(subContainer.querySelector('.icon-draw')).toBeNull();
    expect(subContainer.querySelector('.icon-subtract')).toBeNull();
    expect(subContainer.querySelector('.icon-erase')).toBeNull();
    expect(subContainer.querySelector('.icon-p2p')).toBeNull();
  });

  it('should render a mix of enabled and disabled buttons correctly', () => {
    const config = {
      ...(defaultConfig as unknown as PolydrawConfig),
      modes: {
        draw: true,
        subtract: false,
        deleteAll: true,
        p2p: false,
        attachElbow: true,
        dragElbow: false,
        dragPolygons: true,
        edgeDeletion: false,
      },
    };

    // Clear the subContainer before re-rendering
    subContainer.innerHTML = '';
    createButtons(
      container,
      subContainer,
      config,
      mockCallbacks.onActivateToggle,
      mockCallbacks.onDrawClick,
      mockCallbacks.onSubtractClick,
      mockCallbacks.onEraseClick,
      mockCallbacks.onPointToPointClick,
    );

    expect(subContainer.querySelector('.icon-draw')).not.toBeNull();
    expect(subContainer.querySelector('.icon-subtract')).toBeNull();
    expect(subContainer.querySelector('.icon-erase')).not.toBeNull();
    expect(subContainer.querySelector('.icon-p2p')).toBeNull();
  });
});
