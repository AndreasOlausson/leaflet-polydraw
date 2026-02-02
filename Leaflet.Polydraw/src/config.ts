import { DrawMode } from './enums';
import { PolydrawConfig } from './types/polydraw-interfaces';

export const defaultConfig: PolydrawConfig = {
  mergePolygons: true,
  kinks: false,
  tools: {
    draw: true,
    subtract: true,
    p2p: true,
    p2pSubtract: true,
    clone: true,
    erase: true,
  },
  modes: {
    attachElbow: true,
    dragElbow: true,
    dragPolygons: true,
    edgeDeletion: true,
  },
  defaultMode: DrawMode.Off,
  modifierSubtractMode: true,
  dragPolygons: {
    opacity: 0.7,
    dragCursor: 'move',
    hoverCursor: 'grab',
    markerBehavior: 'hide',
    markerAnimationDuration: 200,
    modifierSubtract: {
      keys: {
        windows: 'ctrlKey',
        mac: 'metaKey',
        linux: 'ctrlKey',
      },
      hideMarkersOnDrag: true,
    },
  },
  edgeDeletion: {
    keys: {
      windows: 'ctrlKey',
      mac: 'metaKey',
      linux: 'ctrlKey',
    },
    minVertices: 3,
  },
  markers: {
    deleteMarker: true,
    infoMarker: true,
    menuMarker: true,
    coordsTitle: true,
    zIndexOffset: 0,
    markerIcon: {
      styleClasses: ['polygon-marker'],
      zIndexOffset: null,
    },
    holeIcon: {
      styleClasses: ['polygon-marker', 'hole'],
      zIndexOffset: null,
    },
    markerInfoIcon: {
      position: 3,
      showArea: true,
      showPerimeter: true,
      useMetrics: true,
      usePerimeterMinValue: false,
      areaLabel: 'Area',
      perimeterLabel: 'Perimeter',
      values: {
        min: {
          metric: '50',
          imperial: '100',
        },
        unknown: {
          metric: '-',
          imperial: '-',
        },
      },
      units: {
        unknownUnit: '',
        metric: {
          onlyMetrics: true,
          perimeter: {
            m: 'm',
            km: 'km',
          },
          area: {
            m2: 'm²',
            km2: 'km²',
            daa: 'daa',
            ha: 'ha',
          },
        },
        imperial: {
          perimeter: {
            feet: 'ft',
            yards: 'yd',
            miles: 'mi',
          },
          area: {
            feet2: 'ft²',
            yards2: 'yd²',
            acres: 'ac',
            miles2: 'mi²',
          },
        },
      },
      styleClasses: ['polygon-marker', 'info'],
      zIndexOffset: 10000,
    },
    markerMenuIcon: {
      position: 1,
      styleClasses: ['polygon-marker', 'menu'],
      zIndexOffset: 10000,
    },
    markerDeleteIcon: {
      position: 5,
      styleClasses: ['polygon-marker', 'delete'],
      zIndexOffset: 10000,
    },
    holeMarkers: {
      menuMarker: false,
      deleteMarker: true,
      infoMarker: false,
    },
    visualOptimization: {
      toleranceMin: 0.000005,
      toleranceMax: 0.005,
      curve: 1.35,
      sharpAngleThreshold: 30,
      thresholdBoundingBox: 0.05,
      thresholdDistance: 0.05,
      useDistance: true,
      useBoundingBox: false,
      useAngles: true,
    },
  },
  polyLineOptions: {
    opacity: 1,
    weight: 2,
  },
  subtractLineOptions: {
    opacity: 1,
    weight: 2,
  },
  polygonOptions: {
    weight: 2,
    opacity: 1,
    fillOpacity: 0.2,
    smoothFactor: 0.3,
    noClip: true,
  },
  holeOptions: {
    weight: 2,
    opacity: 1,
    fillOpacity: 0.5,
  },
  polygonCreation: {
    method: 'concaveman',
    simplification: {
      mode: 'simple',
      tolerance: 0.001,
      highQuality: false,
    },
  },
  simplification: {
    mode: 'simple',
    simple: {
      tolerance: 0.0001,
      highQuality: false,
    },
    dynamic: {
      baseTolerance: 0.0001,
      highQuality: false,
      fractionGuard: 0.9,
      multiplier: 2,
    },
  },
  menuOperations: {
    simplify: {
      enabled: true,
      processHoles: true,
    },
    doubleElbows: {
      enabled: true,
      processHoles: true,
    },
    bbox: {
      enabled: true,
      processHoles: true,
    },
    bezier: {
      enabled: true,
    },
    scale: {
      enabled: true,
    },
    rotate: {
      enabled: true,
    },
    visualOptimizationToggle: {
      enabled: true,
    },
  },
  boundingBox: {
    addMidPointMarkers: true,
  },
  bezier: {
    resolution: 10000,
    sharpness: 0.75,
    resampleMultiplier: 10,
    maxNodes: 1000,
    visualOptimizationLevel: 10,
    ghostMarkers: false,
  },
  colors: {
    dragPolygons: {
      subtract: '#D9460F',
    },
    p2p: {
      closingMarker: '#4CAF50',
    },
    edgeHover: '#7a9441',
    edgeDeletion: {
      hover: '#D9460F',
    },
    polyline: '#50622b',
    subtractLine: '#D9460F',
    polygon: {
      border: '#50622b',
      fill: '#b4cd8a',
    },
    hole: {
      border: '#aa0000',
      fill: '#ffcccc',
    },
    styles: {
      controlButton: {
        backgroundColor: '#fff',
        color: '#000',
      },
      controlButtonHover: {
        backgroundColor: '#f4f4f4',
      },
      controlButtonActive: {
        backgroundColor: 'rgb(128, 218, 255)',
        color: '#fff',
      },
      indicatorActive: {
        backgroundColor: '#ffcc00',
      },
      p2pMarker: {
        backgroundColor: '#fff',
        borderColor: '#50622b',
      },
    },
  },
  tooltips: {
    enabled: true,
    delayMs: 500,
    direction: 'left',
    backgroundColor: '#645d5d',
    color: '#ffffff',
  },
  history: {
    capture: {
      freehand: true,
      pointToPoint: true,
      addPredefinedPolygon: true,
      eraseAll: true,
      markerDrag: true,
      polygonDrag: true,
      polygonClone: true,
      addVertex: true,
      removeVertex: true,
      removeHole: true,
      modifierSubtract: true,
      deletePolygon: true,
      polygonActions: {
        simplify: true,
        doubleElbows: true,
        bbox: true,
        bezier: true,
        scale: true,
        rotate: true,
        toggleOptimization: true,
      },
    },
  },
  maxHistorySize: 50,
};
