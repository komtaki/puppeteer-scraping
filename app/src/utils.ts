import { writeFileSync, existsSync, mkdirSync } from "fs";
import fetch from "node-fetch";
import type { Page } from "puppeteer";

export const fullScreenShot = async (page: Page, path: string) => {
  await page.screenshot({ path: path, fullPage: true });
};

export const downloadFile = async (url: string, downloadPath: string) => {
  const response = await fetch(url);
  const buffer = await response.buffer();
  writeFileSync(downloadPath, buffer);
};

export const mkdirIfNotExist = (path: string) => {
  if (!existsSync(path)) {
    mkdirSync(path);
  }
};
