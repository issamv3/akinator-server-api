import { connect, ConnectResult } from 'puppeteer-real-browser';
import { v4 as uuid } from 'uuid';

import { region, themes } from '../constants';

type GameSession = ConnectResult & {
  question: string | null;
  timeout: NodeJS.Timeout;
};

const gameMap = new Map<string, GameSession>();

export const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

// Fungsi untuk reset timeout 5 menit
const setAutoCleanup = (id: string) => {
  const session = gameMap.get(id);
  if (!session) return;

  clearTimeout(session.timeout);
  const timeout = setTimeout(
    async () => {
      const current = gameMap.get(id);
      if (current) {
        try {
          await current.browser.close();
        } catch (err) {
          console.error(`Failed to close browser for ${id}`, err);
        }
        gameMap.delete(id);
        console.log(`Session ${id} cleaned up due to inactivity.`);
      }
    },
    5 * 60 * 1000
  ); // 5 menit

  session.timeout = timeout;
};

export const startSessionAkinator = async (
  region: region,
  childMode: boolean = false
): Promise<{ id: string; question: string | null }> => {
  let browser: ConnectResult['browser'] | null = null;
  try {
    const { page, browser: puppeteerBrowser } = await connect({
      headless: false,
    });
    browser = puppeteerBrowser;

    const [lang, theme] = region.split('_');
    const baseUrl = `https://${lang}.akinator.com`;

    await page.goto(baseUrl);

    if (childMode) {
      await page.click('#labelChildFilter');
    }

    const action = await page.$eval('#formTheme', (el) =>
      el.getAttribute('action')
    );

    await page.click('.btn-play > a');

    if (action === '/theme-selection') {
      // @ts-ignore
      const themeId: number = themes[theme] ?? 1;
      await sleep(1000);
      await page.waitForFunction(
        () => typeof (window as any).chooseTheme === 'function'
      );
      await page.evaluate((data) => {
        (window as any).chooseTheme(`${data}`);
      }, themeId);
    }

    const id = uuid();
    await sleep(1000);
    await page.waitForSelector('#question-label');
    const question = await page.evaluate(() => {
      const el = document.querySelector('#question-label');
      return el ? el.textContent : null;
    });

    const timeout = setTimeout(
      async () => {
        try {
          await browser!.close();
        } catch (err) {
          console.error(`Failed to close browser for ${id}`, err);
        }
        gameMap.delete(id);
        console.log(`Session ${id} cleaned up due to inactivity.`);
      },
      5 * 60 * 1000
    ); // 5 menit

    gameMap.set(id, { page, browser, question, timeout });
    browser = null;
    return { id, question };
  } catch (error) {
    if (browser) await browser.close();
    throw error;
  }
};

export const answerAkinator = async (
  id: string,
  akinatorAnswer: number
): Promise<object | null> => {
  let browser: ConnectResult['browser'] | null = null;
  if (!gameMap.has(id)) throw new Error('Session not found');
  try {
    const { page, browser: puppeteerBrowser } = gameMap.get(id)!;
    browser = puppeteerBrowser;

    setAutoCleanup(id);

    const result = await new Promise<object | null>((resolve) => {
      const responseHandler = async (response: any) => {
        if (response.url().includes('/answer')) {
          const body = await response.json();
          page.off('response', responseHandler);
          resolve(body);
        }
      };

      page.on('response', responseHandler);

      page
        .waitForFunction(
          () => typeof (window as any).chooseAnswer === 'function'
        )
        .then(() =>
          page.evaluate((data) => {
            (window as any).chooseAnswer(data);
          }, akinatorAnswer)
        )
        .catch(() => {
          page.off('response', responseHandler);
          resolve(null);
        });
    });

    return result;
  } catch (error) {
    if (browser) await browser.close();
    throw error;
  }
};

export const cancelAnswerAkinator = async (
  id: string
): Promise<object | null> => {
  let browser: ConnectResult['browser'] | null = null;
  if (!gameMap.has(id)) throw new Error('Session not found');
  try {
    const { page, browser: puppeteerBrowser } = gameMap.get(id)!;
    browser = puppeteerBrowser;

    setAutoCleanup(id); // reset timeout karena ada aktivitas

    const result = await new Promise<object | null>((resolve) => {
      const responseHandler = async (response: any) => {
        if (response.url().includes('/cancel_answer')) {
          const body = await response.json();
          page.off('response', responseHandler);
          resolve(body);
        }
      };

      page.on('response', responseHandler);

      page
        .waitForFunction(
          () => typeof (window as any).cancelAnswer === 'function'
        )
        .then(() =>
          page.evaluate(() => {
            (window as any).cancelAnswer();
          })
        )
        .catch(() => {
          page.off('response', responseHandler);
          resolve(null);
        });
    });

    return result;
  } catch (error) {
    if (browser) await browser.close();
    throw error;
  }
};

export const endSessionAkinator = async (id: string): Promise<void> => {
  const session = gameMap.get(id);
  if (!session) throw new Error('Session not found');

  clearTimeout(session.timeout);

  try {
    await session.browser.close();
  } catch (err) {
    console.error(`Error closing browser for ${id}`, err);
  }

  gameMap.delete(id);
  console.log(`Session ${id} ended manually.`);
};
