import { chromium, Browser, Page } from 'playwright';
import { v4 as uuid } from 'uuid';

import { region, themes } from '../constants';

type GameSession = {
  browser: Browser;
  page: Page;
  question: string | null;
  timeout: NodeJS.Timeout;
};

const gameMap = new Map<string, GameSession>();

export const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

const safeBrowserClose = async (
  browser: Browser,
  sessionId: string
) => {
  try {
    if (!browser.isConnected()) {
      console.log(`Browser for session ${sessionId} already disconnected`);
      return;
    }
    await browser.close();
    console.log(`Browser for session ${sessionId} closed successfully`);
  } catch (err) {
    console.error(`Failed to close browser for session ${sessionId}:`, err);
  }
};

const cleanupSession = async (id: string, reason: string = 'cleanup') => {
  const session = gameMap.get(id);
  if (!session) return;

  clearTimeout(session.timeout);
  await safeBrowserClose(session.browser, id);
  gameMap.delete(id);
  console.log(`Session ${id} cleaned up due to ${reason}`);
};

const setAutoCleanup = (id: string) => {
  const session = gameMap.get(id);
  if (!session) return;

  clearTimeout(session.timeout);
  const timeout = setTimeout(
    () => cleanupSession(id, 'inactivity'),
    5 * 60 * 1000
  );

  session.timeout = timeout;
};

export const startSessionAkinator = async (
  region: region,
  childMode: boolean = false
): Promise<{ id: string; question: string | null }> => {
  let browser: Browser | null = null;
  let page: Page | null = null;
  const id = uuid();

  try {
    browser = await chromium.launch({ headless: false });
    page = await browser.newPage();

    const parts = region.split('_');
const lang = parts[0];
const theme = parts[1] ?? '';
    const baseUrl = `https://${lang}.akinator.com`;

    await page.goto(baseUrl);

    if (childMode) {
      await page.click('#labelChildFilter');
    }

    const action = await page.getAttribute('#formTheme', 'action');

    await page.click('.btn-play > a');

    if (action === '/theme-selection') {
      const themeId: number = themes[theme] ?? 1;
      await sleep(2000);
      await page.waitForFunction(() => typeof (window as any).chooseTheme === 'function');
      await page.evaluate((data) => {
        (window as any).chooseTheme(`${data}`);
      }, themeId);
    }

    await sleep(2500);
    await page.waitForSelector('#question-label');
    const question = await page.evaluate(() => {
      const el = document.querySelector('#question-label');
      return el ? el.textContent : null;
    });

    const timeout = setTimeout(
      () => cleanupSession(id, 'inactivity'),
      5 * 60 * 1000
    );

    gameMap.set(id, { page, browser, question, timeout });

    browser = null;
    page = null;

    return { id, question };
  } catch (error) {
    console.error(`Error starting session ${id}:`, error);
    if (browser) {
      await safeBrowserClose(browser, id);
    }
    throw error;
  }
};

export const answerAkinator = async (
  id: string,
  akinatorAnswer: number
): Promise<object | null> => {
  if (!gameMap.has(id)) throw new Error('Session not found');

  const session = gameMap.get(id)!;
  const { page, browser } = session;

  try {
    setAutoCleanup(id);

    const [response] = await Promise.all([
      page.waitForResponse((response) => response.url().includes('/answer'), { timeout: 7000 }),
      page.waitForFunction(() => typeof (window as any).chooseAnswer === 'function')
        .then(() => page.evaluate((data) => {
          (window as any).chooseAnswer(data);
        }, akinatorAnswer))
    ]);

    const result = await response.json();

    if (result && typeof result === 'object' && 'id_proposition' in result) {
      console.log(`Game finished for session ${id}, Akinator made a guess`);
      await cleanupSession(id, 'game finished');
    }

    return result;
  } catch (error) {
    console.error(`Error answering akinator for session ${id}:`, error);
    await cleanupSession(id, 'error in answerAkinator');
    throw error;
  }
};

export const cancelAnswerAkinator = async (
  id: string
): Promise<object | null> => {
  if (!gameMap.has(id)) throw new Error('Session not found');

  const session = gameMap.get(id)!;
  const { page, browser } = session;

  try {
    setAutoCleanup(id);

    const [response] = await Promise.all([
      page.waitForResponse((response) => response.url().includes('/cancel_answer'), { timeout: 7000 }),
      page.waitForFunction(() => typeof (window as any).cancelAnswer === 'function')
        .then(() => page.evaluate(() => {
          (window as any).cancelAnswer();
        }))
    ]);

    const result = await response.json();

    return result;
  } catch (error) {
    console.error(`Error canceling answer for session ${id}:`, error);
    await cleanupSession(id, 'error in cancelAnswerAkinator');
    throw error;
  }
};

export const endSessionAkinator = async (id: string): Promise<void> => {
  if (!gameMap.has(id)) throw new Error('Session not found');
  await cleanupSession(id, 'manual end');
};

export const cleanupAllSessions = async (): Promise<void> => {
  const sessionIds = Array.from(gameMap.keys());
  const cleanupPromises = sessionIds.map((id) =>
    cleanupSession(id, 'application shutdown')
  );

  await Promise.all(cleanupPromises);
  console.log('All sessions cleaned up');
};

process.on('SIGINT', async () => {
  console.log('Received SIGINT, cleaning up sessions...');
  await cleanupAllSessions();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, cleaning up sessions...');
  await cleanupAllSessions();
  process.exit(0);
});

process.on('uncaughtException', async (err) => {
  console.error('Uncaught Exception:', err);
  await cleanupAllSessions();
  process.exit(1);
});

process.on('unhandledRejection', async (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  await cleanupAllSessions();
  process.exit(1);
});
