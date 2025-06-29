import * as L from 'leaflet';

/**
 * Factory for creating Leaflet DivIcons.
 */
export class IconFactory {
  /**
   * Creates a DivIcon with the given class names.
   * @param classNames Array of class names to apply.
   * @returns A Leaflet DivIcon.
   */
  static createDivIcon(classNames: string[]): L.DivIcon {
    const classes = classNames.join(' ');
    return L.divIcon({ className: classes });
  }
}
