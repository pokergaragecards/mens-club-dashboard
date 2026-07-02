import { chromium, Browser, BrowserContext, Page } from "playwright";

export async function createUsgaBrowser(): Promise<{
  browser: Browser;
  context: BrowserContext;
  page: Page;
}> {
  const browser = await chromium.launch({
    headless: false, // change to true once working
    slowMo: 150,
  });

  const context = await browser.newContext({
    viewport: {
      width: 1600,
      height: 1000,
    },
  });

  const page = await context.newPage();

  return {
    browser,
    context,
    page,
  };
}