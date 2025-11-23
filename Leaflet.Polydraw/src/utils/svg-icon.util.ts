/**
 * Applies SVG markup to a button element and normalizes the SVG so it renders consistently.
 * - Adds a missing viewBox based on the original width/height so large coordinate systems scale down.
 * - Inlines style blocks to avoid leaking class-based styles between icons.
 * - Forces a consistent 24px size and disables pointer events on the SVG and its children.
 */
export function applySvgIcon(button: HTMLElement, svgMarkup: string): void {
  button.innerHTML = svgMarkup;

  const svgElement = button.querySelector('svg');
  if (!svgElement) return;

  normalizeViewBox(svgElement);
  inlineSvgStyles(svgElement);

  svgElement.setAttribute('width', '24');
  svgElement.setAttribute('height', '24');
  (svgElement as unknown as HTMLElement).style.pointerEvents = 'none';

  svgElement.querySelectorAll('*').forEach((el) => {
    (el as HTMLElement).style.pointerEvents = 'none';
  });
}

/**
 * Ensures SVGs without an explicit viewBox still scale correctly when width/height are overridden.
 */
function normalizeViewBox(svgElement: SVGElement): void {
  if (svgElement.hasAttribute('viewBox')) return;

  const widthAttr = svgElement.getAttribute('width');
  const heightAttr = svgElement.getAttribute('height');

  const width = widthAttr ? parseFloat(widthAttr) : NaN;
  const height = heightAttr ? parseFloat(heightAttr) : NaN;

  if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
    svgElement.setAttribute('viewBox', `0 0 ${width} ${height}`);
  }
}

/**
 * Inlines style rules defined inside the SVG so class names don't clash across icons.
 */
function inlineSvgStyles(svgElement: SVGElement): void {
  const styleElements = Array.from(svgElement.querySelectorAll('style'));
  if (styleElements.length === 0) return;

  const inlinedClasses = new Set<string>();

  styleElements.forEach((styleElement) => {
    const cssText = styleElement.textContent;
    if (!cssText) {
      styleElement.remove();
      return;
    }

    const ruleRegex = /([^{]+)\{([^}]*)\}/g;
    let match: RegExpExecArray | null;

    while ((match = ruleRegex.exec(cssText)) !== null) {
      const selectors = match[1]
        .split(',')
        .map((selector) => selector.trim())
        .filter(Boolean);
      const declarations = match[2];

      selectors.forEach((selector) => {
        if (!selector.startsWith('.')) return;

        const className = selector.slice(1);
        inlinedClasses.add(className);

        svgElement.querySelectorAll<SVGElement>(`.${className}`).forEach((el) => {
          declarations.split(';').forEach((declaration) => {
            const [property, value] = declaration.split(':');
            if (!property || !value) return;
            el.style.setProperty(property.trim(), value.trim());
          });
        });
      });
    }

    styleElement.remove();
  });

  if (inlinedClasses.size === 0) return;

  svgElement.querySelectorAll<SVGElement>('[class]').forEach((el) => {
    const remaining = Array.from(el.classList).filter((cls) => !inlinedClasses.has(cls));
    if (remaining.length > 0) {
      el.setAttribute('class', remaining.join(' '));
    } else {
      el.removeAttribute('class');
    }
  });
}
