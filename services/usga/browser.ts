import { chromium, type Browser, type BrowserContext, type Page } from "playwright";

export async function connectToExistingChrome(): Promise<{
  browser: Browser;
  context: BrowserContext;
  page: Page;
}> {
  const browser = await chromium.connectOverCDP("http://127.0.0.1:9222");

  const context = browser.contexts()[0];

  if (!context) {
    throw new Error("No Chrome context found. Make sure Chrome is running with remote debugging.");
  }

  const page = context.pages()[0] ?? (await context.newPage());

  return { browser, context, page };
}