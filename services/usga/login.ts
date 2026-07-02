import type { Page } from "playwright";

const LOGIN_URL = "https://adminportal.usga.org/";

export async function loginToUsga(page: Page) {
  const username = process.env.USGA_ADMIN_USERNAME;
  const password = process.env.USGA_ADMIN_PASSWORD;

  if (!username) throw new Error("Missing USGA_ADMIN_USERNAME");
  if (!password) throw new Error("Missing USGA_ADMIN_PASSWORD");

  await page.goto(LOGIN_URL, { waitUntil: "networkidle" });

  await page.getByRole("textbox").first().fill(username);
  await page.getByRole("textbox").nth(1).fill(password);

  await page.getByRole("button").filter({ hasText: /sign in|log in/i }).click();

  await page.waitForLoadState("networkidle");

  const url = page.url();

  if (url.toLowerCase().includes("login")) {
    throw new Error("USGA login appears to have failed.");
  }

  return true;
}