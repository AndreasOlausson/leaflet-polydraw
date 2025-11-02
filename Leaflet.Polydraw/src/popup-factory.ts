/**
 * Factory for creating popup UI structures.
 * Provides reusable methods for building popup DOM elements.
 */
export class PopupFactory {
  /**
   * Creates a menu button element.
   * @param id Unique identifier for the button.
   * @param title Tooltip text.
   * @param cssClasses Additional CSS classes to apply.
   * @param options Optional configuration (alpha banner, etc.).
   * @returns HTMLDivElement representing the menu button.
   */
  static createMenuButton(
    id: string,
    title: string,
    cssClasses: string[],
    options?: {
      alphaBanner?: boolean;
    },
  ): HTMLDivElement {
    const button = document.createElement('div');
    button.classList.add('marker-menu-button', ...cssClasses);
    button.title = title;
    button.setAttribute('data-action-id', id);

    if (options?.alphaBanner) {
      const alphaBanner = document.createElement('span');
      alphaBanner.classList.add('alpha-banner');
      alphaBanner.textContent = 'ALPHA';
      button.appendChild(alphaBanner);
    }

    return button;
  }

  /**
   * Builds a menu popup container structure.
   * @param buttons Array of button elements to include.
   * @returns HTMLDivElement containing the complete menu structure.
   */
  static buildMenuPopup(buttons: HTMLDivElement[]): HTMLDivElement {
    const outerWrapper = document.createElement('div');
    outerWrapper.classList.add('alter-marker-outer-wrapper');

    const wrapper = document.createElement('div');
    wrapper.classList.add('alter-marker-wrapper');

    const markerContent = document.createElement('div');
    markerContent.classList.add('content');

    const markerContentWrapper = document.createElement('div');
    markerContentWrapper.classList.add('marker-menu-content');

    // Append buttons with separators between them
    buttons.forEach((button) => {
      markerContentWrapper.appendChild(button);
    });

    markerContent.appendChild(markerContentWrapper);
    wrapper.appendChild(markerContent);
    outerWrapper.appendChild(wrapper);

    return outerWrapper;
  }

  /**
   * Builds an info popup container structure.
   * @param content HTML element to display inside the popup.
   * @returns HTMLDivElement containing the complete info popup structure.
   */
  static buildInfoPopup(content: HTMLElement): HTMLDivElement {
    const outerWrapper = document.createElement('div');
    outerWrapper.classList.add('info-marker-outer-wrapper');

    const wrapper = document.createElement('div');
    wrapper.classList.add('info-marker-wrapper');

    const markerContent = document.createElement('div');
    markerContent.classList.add('content');

    markerContent.appendChild(content);
    wrapper.appendChild(markerContent);
    outerWrapper.appendChild(wrapper);

    return outerWrapper;
  }
}
