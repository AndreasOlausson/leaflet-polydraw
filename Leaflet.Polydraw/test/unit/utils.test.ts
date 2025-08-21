import { Perimeter, Area, PolyDrawUtil, Compass } from '../../src/utils';
import { MarkerPosition } from '../../src/enums';

describe('Perimeter', () => {
  it('calculates metric length correctly', () => {
    const config = {
      markers: {
        markerInfoIcon: {
          useMetrics: true,
          position: 0,
          showArea: true,
          showPerimeter: true,
          usePerimeterMinValue: false,
          areaLabel: '',
          perimeterLabel: '',
          values: { min: { metric: '', imperial: '' }, unknown: { metric: '', imperial: '' } },
          units: {
            unknownUnit: '',
            metric: {
              perimeter: { m: 'm', km: 'km' },
              area: { m2: 'm²', km2: 'km²', daa: 'daa', ha: 'ha' },
            },
            imperial: {
              perimeter: { feet: 'ft', yards: 'yd', miles: 'mi' },
              area: { feet2: 'ft²', yards2: 'yd²', acres: 'ac', miles2: 'mi²' },
            },
          },
          styleClasses: [],
          zIndexOffset: 0,
        },
      },
    };
    const perimeter = new Perimeter(1000, config as any);
    expect(perimeter.metricLength).toBe('1.0');
    expect(perimeter.metricUnit).toBe('km');
  });

  it('calculates metric length for different values', () => {
    const config = {
      markers: {
        markerInfoIcon: {
          useMetrics: true,
          position: 0,
          showArea: true,
          showPerimeter: true,
          usePerimeterMinValue: false,
          areaLabel: '',
          perimeterLabel: '',
          values: { min: { metric: '', imperial: '' }, unknown: { metric: '', imperial: '' } },
          units: {
            unknownUnit: '',
            metric: {
              perimeter: { m: 'm', km: 'km' },
              area: { m2: 'm²', km2: 'km²', daa: 'daa', ha: 'ha' },
            },
            imperial: {
              perimeter: { feet: 'ft', yards: 'yd', miles: 'mi' },
              area: { feet2: 'ft²', yards2: 'yd²', acres: 'ac', miles2: 'mi²' },
            },
          },
          styleClasses: [],
          zIndexOffset: 0,
        },
      },
    };

    // Test different length values
    const testCases = [
      { length: 50, expectedMetric: '50', expectedUnit: 'm' },
      { length: 500, expectedMetric: '500', expectedUnit: 'm' },
      { length: 1000, expectedMetric: '1.0', expectedUnit: 'km' },
      { length: 5000, expectedMetric: '5.0', expectedUnit: 'km' },
      { length: 15000, expectedMetric: '15', expectedUnit: 'km' },
    ];

    testCases.forEach((testCase) => {
      const perimeter = new Perimeter(testCase.length, config as any);
      expect(perimeter.metricLength).toBe(testCase.expectedMetric);
      expect(perimeter.metricUnit).toBe(testCase.expectedUnit);
    });
  });

  it('calculates imperial length correctly', () => {
    const config = {
      markers: {
        markerInfoIcon: {
          useMetrics: false,
          position: 0,
          showArea: true,
          showPerimeter: true,
          usePerimeterMinValue: false,
          areaLabel: '',
          perimeterLabel: '',
          values: { min: { metric: '', imperial: '' }, unknown: { metric: '', imperial: '' } },
          units: {
            unknownUnit: '',
            metric: {
              perimeter: { m: 'm', km: 'km' },
              area: { m2: 'm²', km2: 'km²', daa: 'daa', ha: 'ha' },
            },
            imperial: {
              perimeter: { feet: 'ft', yards: 'yd', miles: 'mi' },
              area: { feet2: 'ft²', yards2: 'yd²', acres: 'ac', miles2: 'mi²' },
            },
          },
          styleClasses: [],
          zIndexOffset: 0,
        },
      },
    };

    const perimeter = new Perimeter(1000, config as any);
    expect(perimeter.imperialLength).toBe('1100');
    expect(perimeter.imperialUnit).toBe('yd');
  });
});

describe('Area', () => {
  it('calculates metric area correctly', () => {
    const config = {
      markers: {
        markerInfoIcon: {
          useMetrics: true,
          position: 0,
          showArea: true,
          showPerimeter: true,
          usePerimeterMinValue: false,
          areaLabel: '',
          perimeterLabel: '',
          values: { min: { metric: '', imperial: '' }, unknown: { metric: '', imperial: '' } },
          units: {
            unknownUnit: '',
            metric: {
              perimeter: { m: 'm', km: 'km' },
              area: { m2: 'm²', km2: 'km²', daa: 'daa', ha: 'ha' },
            },
            imperial: {
              perimeter: { feet: 'ft', yards: 'yd', miles: 'mi' },
              area: { feet2: 'ft²', yards2: 'yd²', acres: 'ac', miles2: 'mi²' },
            },
          },
          styleClasses: [],
          zIndexOffset: 0,
        },
      },
    };

    const area = new Area(10000, config as any);
    expect(area.metricArea).toBe('10.0');
    expect(area.metricUnit).toBe('daa');
  });

  it('calculates area for different values', () => {
    const config = {
      markers: {
        markerInfoIcon: {
          useMetrics: true,
          position: 0,
          showArea: true,
          showPerimeter: true,
          usePerimeterMinValue: false,
          areaLabel: '',
          perimeterLabel: '',
          values: { min: { metric: '', imperial: '' }, unknown: { metric: '', imperial: '' } },
          units: {
            unknownUnit: '',
            metric: {
              perimeter: { m: 'm', km: 'km' },
              area: { m2: 'm²', km2: 'km²', daa: 'daa', ha: 'ha' },
            },
            imperial: {
              perimeter: { feet: 'ft', yards: 'yd', miles: 'mi' },
              area: { feet2: 'ft²', yards2: 'yd²', acres: 'ac', miles2: 'mi²' },
            },
          },
          styleClasses: [],
          zIndexOffset: 0,
        },
      },
    };

    // Test different area values
    const testCases = [
      { area: 5000, expectedMetric: '5000', expectedUnit: 'm²' },
      { area: 10000, expectedMetric: '10.0', expectedUnit: 'daa' },
      { area: 50000, expectedMetric: '50.0', expectedUnit: 'daa' },
      { area: 100000, expectedMetric: '100', expectedUnit: 'daa' },
      { area: 1000000, expectedMetric: '1000', expectedUnit: 'daa' },
    ];

    testCases.forEach((testCase) => {
      const area = new Area(testCase.area, config as any);
      expect(area.metricArea).toBe(testCase.expectedMetric);
      expect(area.metricUnit).toBe(testCase.expectedUnit);
    });
  });

  it('calculates imperial area correctly', () => {
    const config = {
      markers: {
        markerInfoIcon: {
          useMetrics: false,
          position: 0,
          showArea: true,
          showPerimeter: true,
          usePerimeterMinValue: false,
          areaLabel: '',
          perimeterLabel: '',
          values: { min: { metric: '', imperial: '' }, unknown: { metric: '', imperial: '' } },
          units: {
            unknownUnit: '',
            metric: {
              perimeter: { m: 'm', km: 'km' },
              area: { m2: 'm²', km2: 'km²', daa: 'daa', ha: 'ha' },
            },
            imperial: {
              perimeter: { feet: 'ft', yards: 'yd', miles: 'mi' },
              area: { feet2: 'ft²', yards2: 'yd²', acres: 'ac', miles2: 'mi²' },
            },
          },
          styleClasses: [],
          zIndexOffset: 0,
        },
      },
    };

    const area = new Area(10000, config as any);
    expect(area.imperialArea).toBe('2.47');
    expect(area.imperialUnit).toBe('ac');
  });
});

describe('PolyDrawUtil', () => {
  it('calculates bounds correctly', () => {
    const polygon = [
      { lat: 0, lng: 0 },
      { lat: 0, lng: 1 },
      { lat: 1, lng: 1 },
      { lat: 1, lng: 0 },
      { lat: 0, lng: 0 },
    ];

    const bounds = PolyDrawUtil.getBounds(polygon);
    expect(bounds.getSouth()).toBe(0);
    expect(bounds.getNorth()).toBe(1);
    expect(bounds.getWest()).toBe(0);
    expect(bounds.getEast()).toBe(1);
  });

  it('calculates bounds with padding', () => {
    const polygon = [
      { lat: 0, lng: 0 },
      { lat: 0, lng: 1 },
      { lat: 1, lng: 1 },
      { lat: 1, lng: 0 },
      { lat: 0, lng: 0 },
    ];

    const bounds = PolyDrawUtil.getBounds(polygon, 0.1);
    expect(bounds.getSouth()).toBeLessThan(0);
    expect(bounds.getNorth()).toBeGreaterThan(1);
    expect(bounds.getWest()).toBeLessThan(0);
    expect(bounds.getEast()).toBeGreaterThan(1);
  });
});

describe('Compass', () => {
  it('creates compass directions correctly', () => {
    const compass = new Compass(0, 0, 1, 1);

    expect(compass.direction.North.lat).toBe(1);
    expect(compass.direction.North.lng).toBe(0.5);

    expect(compass.direction.South.lat).toBe(0);
    expect(compass.direction.South.lng).toBe(0.5);

    expect(compass.direction.East.lat).toBe(0.5);
    expect(compass.direction.East.lng).toBe(1);

    expect(compass.direction.West.lat).toBe(0.5);
    expect(compass.direction.West.lng).toBe(0);
  });

  it('gets direction by position', () => {
    const compass = new Compass(0, 0, 1, 1);

    const north = compass.getDirection(MarkerPosition.North);
    expect(north.lat).toBe(1);
    expect(north.lng).toBe(0.5);

    const south = compass.getDirection(MarkerPosition.South);
    expect(south.lat).toBe(0);
    expect(south.lng).toBe(0.5);
  });

  it('gets positions array', () => {
    const compass = new Compass(0, 0, 1, 1);

    const positions = compass.getPositions();
    expect(positions.length).toBe(9); // 8 directions + closing node
    expect(positions[0][0]).toBe(0); // SouthWest lng
    expect(positions[0][1]).toBe(0); // SouthWest lat
  });
});
