import { TurfHelper } from '../src/turf-helper';
import defaultConfig from '../src/config.json';

describe('TurfHelper', () => {
  let turfHelper: TurfHelper;

  beforeEach(() => {
    // Create the helper with default config
    turfHelper = new TurfHelper(defaultConfig);
  });

  it('can be instantiated', () => {
    expect(turfHelper).toBeInstanceOf(TurfHelper);
  });

  it('can convert coordinates', () => {
    const latlng = { lat: 58.402514, lng: 15.606188 };
    
    const coords = turfHelper.getCoord(latlng);
    expect(coords).toBeInstanceOf(Array);
    expect(coords.length).toBe(2);
    expect(coords[0]).toBeCloseTo(15.606188);
    expect(coords[1]).toBeCloseTo(58.402514);
  });

  it('p2p - should increase the number of points ', () => {
    const square = [
          { lat: 0, lng: 0 },
          { lat: 0, lng: 2 },
          { lat: 2, lng: 2 },
          { lat: 2, lng: 0 }
        ];
        const result = turfHelper.getDoubleElbowLatLngs(square);
        expect(result.length).toBeGreaterThan(square.length);  
  });

  it('should generate double elbowed polygon with square input', () => {
    const square = [
      { lat: 0, lng: 0 },
      { lat: 0, lng: 2 },
      { lat: 2, lng: 2 },
      { lat: 2, lng: 0 }
    ];

    const result = turfHelper.getDoubleElbowLatLngs(square);
    expect(result.length).toBe(8);
    expect(result[0].lat).toBeCloseTo(0);
    expect(result[0].lng).toBeCloseTo(0);
    expect(result[1].lat).toBeCloseTo(0);
    expect(result[1].lng).toBeCloseTo(1);
    expect(result[2].lat).toBeCloseTo(0);
    expect(result[2].lng).toBeCloseTo(2);
    expect(result[3].lat).toBeCloseTo(1);
    expect(result[3].lng).toBeCloseTo(2);
    expect(result[4].lat).toBeCloseTo(2);
    expect(result[4].lng).toBeCloseTo(2);
    expect(result[5].lat).toBeCloseTo(2);
    expect(result[5].lng).toBeCloseTo(1);
    expect(result[6].lat).toBeCloseTo(2);
    expect(result[6].lng).toBeCloseTo(0);
    expect(result[7].lat).toBeCloseTo(1);
    expect(result[7].lng).toBeCloseTo(0);
  });
});
