import { describe, expect, it } from 'vitest';
import { createButtons } from '../../src/buttons';
import { defaultConfig } from '../../src/config';
import { EventManager } from '../../src/managers/event-manager';
import { HistoryManager } from '../../src/managers/history-manager';

const buildButtons = (toolOverrides: Partial<typeof defaultConfig.tools>) => {
  const config = structuredClone(defaultConfig);
  config.tools = { ...config.tools, ...toolOverrides };

  const container = document.createElement('div');
  const subContainer = document.createElement('div');
  container.appendChild(subContainer);

  const eventManager = new EventManager();
  const historyManager = new HistoryManager(eventManager);

  const unusedButtonHandler = () => {};

  createButtons(
    container,
    subContainer,
    config,
    unusedButtonHandler,
    unusedButtonHandler,
    unusedButtonHandler,
    unusedButtonHandler,
    unusedButtonHandler,
    unusedButtonHandler,
    unusedButtonHandler,
    unusedButtonHandler,
    unusedButtonHandler,
    eventManager,
    historyManager,
  );

  return { container, subContainer };
};

describe('tools config', () => {
  describe('tool button visibility', () => {
    const toolCases: Array<{ key: keyof typeof defaultConfig.tools; selector: string }> = [
      { key: 'draw', selector: '.icon-draw' },
      { key: 'subtract', selector: '.icon-subtract' },
      { key: 'p2p', selector: '.icon-p2p' },
      { key: 'p2pSubtract', selector: '.icon-p2p-subtract' },
      { key: 'clone', selector: '.icon-clone' },
      { key: 'erase', selector: '.icon-erase' },
    ];

    toolCases.forEach(({ key, selector }) => {
      it(`shows ${key} button when enabled`, () => {
        const { subContainer } = buildButtons({ [key]: true });
        expect(subContainer.querySelector(selector)).not.toBeNull();
      });

      it(`hides ${key} button when disabled`, () => {
        const { subContainer } = buildButtons({ [key]: false });
        expect(subContainer.querySelector(selector)).toBeNull();
      });
    });
  });
});
