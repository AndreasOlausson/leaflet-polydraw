import { normalizeHexColor } from '../utils/color-style.util';

export const DEFAULT_COLOR_MAP_PALETTE = [
  '#003366',
  '#336699',
  '#3366CC',
  '#003399',
  '#000099',
  '#0000CC',
  '#000066',
  '#006666',
  '#006699',
  '#0099CC',
  '#0066CC',
  '#0033CC',
  '#0000FF',
  '#3333FF',
  '#333399',
  '#669999',
  '#009999',
  '#33CCCC',
  '#00CCFF',
  '#0099FF',
  '#0066FF',
  '#3366FF',
  '#3333CC',
  '#666699',
  '#339966',
  '#00CC99',
  '#00FFCC',
  '#00FFFF',
  '#33CCFF',
  '#3399FF',
  '#6699FF',
  '#6666FF',
  '#6600FF',
  '#6600CC',
  '#339933',
  '#00CC66',
  '#00FF99',
  '#66FFCC',
  '#66FFFF',
  '#66CCFF',
  '#99CCFF',
  '#9999FF',
  '#9966FF',
  '#9933FF',
  '#9900FF',
  '#006600',
  '#00CC00',
  '#00FF00',
  '#66FF99',
  '#99FFCC',
  '#CCFFFF',
  '#CCCCFF',
  '#CC99FF',
  '#CC66FF',
  '#CC33FF',
  '#CC00FF',
  '#9900CC',
  '#003300',
  '#009933',
  '#33CC33',
  '#66FF66',
  '#99FF99',
  '#CCFFCC',
  '#FFFFFF',
  '#FFCCFF',
  '#FF99FF',
  '#FF66FF',
  '#FF00FF',
  '#CC00CC',
  '#660066',
  '#336600',
  '#009900',
  '#66FF33',
  '#99FF66',
  '#CCFF99',
  '#FFFFCC',
  '#FFCCCC',
  '#FF99CC',
  '#FF66CC',
  '#FF33CC',
  '#CC0099',
  '#993399',
  '#333300',
  '#669900',
  '#99FF33',
  '#CCFF66',
  '#FFFF99',
  '#FFCC99',
  '#FF9999',
  '#FF6699',
  '#FF3399',
  '#CC3399',
  '#990099',
  '#666633',
  '#99CC00',
  '#CCFF33',
  '#FFFF66',
  '#FFCC66',
  '#FF9966',
  '#FF6666',
  '#FF0066',
  '#CC6699',
  '#993366',
  '#999966',
  '#CCCC00',
  '#FFFF00',
  '#FFCC00',
  '#FF9933',
  '#FF6600',
  '#FF5050',
  '#CC0066',
  '#660033',
  '#996633',
  '#CC9900',
  '#FF9900',
  '#CC6600',
  '#FF3300',
  '#FF0000',
  '#CC0000',
  '#990033',
  '#663300',
  '#996600',
  '#CC3300',
  '#993300',
  '#990000',
  '#800000',
  '#993333',
] as const;

const COLOR_MAP_ROWS = [7, 8, 9, 10, 11, 12, 13, 12, 11, 10, 9, 8, 7] as const;
const COLOR_MAP_CELL_WIDTH = 18;
const COLOR_MAP_ROW_HEIGHT = 15;
const COLOR_MAP_WIDTH = 234;

export interface ColorMapControl {
  element: HTMLDivElement;
  setSelectedColor(color: string): void;
}

export interface ColorMapOptions {
  colors?: readonly string[];
  selectedColor: string;
  ariaLabelPrefix: string;
  onSelect(color: string): void;
}

function getCellPosition(index: number): { left: number; top: number } {
  let remaining = index;
  for (let rowIndex = 0; rowIndex < COLOR_MAP_ROWS.length; rowIndex += 1) {
    const rowCount = COLOR_MAP_ROWS[rowIndex];
    if (remaining < rowCount) {
      const rowWidth = rowCount * COLOR_MAP_CELL_WIDTH;
      return {
        left: Math.round((COLOR_MAP_WIDTH - rowWidth) / 2 + remaining * COLOR_MAP_CELL_WIDTH),
        top: rowIndex * COLOR_MAP_ROW_HEIGHT,
      };
    }
    remaining -= rowCount;
  }

  const overflowIndex = index - DEFAULT_COLOR_MAP_PALETTE.length;
  return {
    left: (overflowIndex % 13) * COLOR_MAP_CELL_WIDTH,
    top:
      COLOR_MAP_ROWS.length * COLOR_MAP_ROW_HEIGHT +
      Math.floor(overflowIndex / 13) * COLOR_MAP_ROW_HEIGHT,
  };
}

export function createColorMap(options: ColorMapOptions): ColorMapControl {
  const colors = options.colors ?? DEFAULT_COLOR_MAP_PALETTE;
  const element = document.createElement('div');
  element.className = 'polydraw-color-map polygon-color-map';

  const setSelectedColor = (selectedColor: string) => {
    const normalizedSelected = normalizeHexColor(selectedColor, '').toLowerCase();
    element.querySelectorAll<HTMLButtonElement>('.polydraw-color-swatch').forEach((swatch) => {
      swatch.classList.toggle(
        'selected',
        swatch.dataset.color?.toLowerCase() === normalizedSelected,
      );
    });
  };

  colors.forEach((paletteColor, index) => {
    const color = normalizeHexColor(paletteColor, '#50622b');
    const swatch = document.createElement('button');
    swatch.type = 'button';
    swatch.className = 'polydraw-color-swatch polygon-color-swatch';
    swatch.style.backgroundColor = color;
    swatch.dataset.color = color;
    swatch.setAttribute('aria-label', `${options.ariaLabelPrefix} ${color}`);
    const position = getCellPosition(index);
    swatch.style.left = `${position.left}px`;
    swatch.style.top = `${position.top}px`;
    swatch.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      setSelectedColor(color);
      options.onSelect(color);
    });
    element.appendChild(swatch);
  });

  setSelectedColor(options.selectedColor);
  return { element, setSelectedColor };
}
