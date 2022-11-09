import type { ElementHandle, Page } from "puppeteer";

export const fullScreenShot = async (page: Page, path: string) => {
  await page.screenshot({ path: path, fullPage: true });
};

export const getPropertyValueFromElement = async (
  element: ElementHandle<Element>,
  name: string = "textContent"
) => {
  if (!element) return;
  const property = await element.getProperty(name)
  return await property.jsonValue() as string|null;
}
