import puppeteer from "puppeteer";
import type { Page } from "puppeteer";
import { fullScreenShot, getPropertyValueFromElement } from "./utils/puppeteer";

const login = async (page: Page) => {
  const LOGIN_USER_SELECTOR = "#user_email";
  const LOGIN_PASS_SELECTOR = "#user_password";
  const LOGIN_SUBMIT_SELECTOR = "#signup-view-signup-button";

  await page.goto("https://www.drwallet.jp/users/sign_in");

  await page.type(LOGIN_USER_SELECTOR, process.env.DOCKER_WALLET_ID || "");
  await page.type(
    LOGIN_PASS_SELECTOR,
    process.env.DOCKER_WALLET_PASSWORD || ""
  );

  await page.click(LOGIN_SUBMIT_SELECTOR);

  const _sleep = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  await _sleep(10000);

  await fullScreenShot(page, `${process.env.DATA_PATH}/login.png`);
};

const getData = async (page: Page) => {
  const SELECTOR = {
    DATA_DATE: "#after_input_receipt_list > tbody > tr > td.transacted_at_cell",
    DATA_SHOP: "#after_input_receipt_list > tbody > tr > td.shop_name_cell",
    DATA_AMOUNT: "#after_input_receipt_list > tbody > tr > td.amount_cell > p",
    DATA_CATEGORY: "#after_input_receipt_list > tbody > tr > td.category_cell",
    DATA_ACCOUNT: "#after_input_receipt_list > tbody > tr > td.account_cell",
  };

  const dateElements = await page.$$(SELECTOR.DATA_DATE);
  const shopElements = await page.$$(SELECTOR.DATA_SHOP);
  const amountElements = await page.$$(SELECTOR.DATA_AMOUNT);
  const categoryElements = await page.$$(SELECTOR.DATA_CATEGORY);
  const accountElements = await page.$$(SELECTOR.DATA_ACCOUNT);

  for (let j = 0; j < shopElements.length; j++) {
    const amountClassName =
      (await getPropertyValueFromElement(amountElements[j], "className")) || "";
    const isIncome = (await amountClassName.includes("income")) ? "" : "-";
    const amountValue = await getPropertyValueFromElement(amountElements[j]);

    if (!amountValue) {
      continue;
    }

    const moneyData = [
      await getPropertyValueFromElement(dateElements[j]),
      await getPropertyValueFromElement(shopElements[j]),
      await amountValue.replace("￥", isIncome),
      await getPropertyValueFromElement(categoryElements[j]),
      await getPropertyValueFromElement(accountElements[j]),
    ];

    console.log('"' + moneyData.join('","') + '"');
  }
};

const getDataList = async (page: Page) => {
  await getData(page);
  await fullScreenShot(page, `${process.env.DATA_PATH}/this-month.png`);

  const PREVIOUS_MONTH = "#previous-month";
  const maxMonth = process.env.MAX_PREVIOUS_MONTH || 12;

  for (let i = 0; i < maxMonth; i++) {
    await page.click(PREVIOUS_MONTH);

    const loadingSelector = ".blockOverlay";
    await page.waitForFunction(
      (loadingSelector) => !document.querySelector(loadingSelector),
      {},
      loadingSelector
    );

    const DATA_EMPTY_SELECTOR =
      "#after_input_receipt_list > tbody > tr > .shop_name_cell";
    const isEmpty = await page.$(DATA_EMPTY_SELECTOR);

    await fullScreenShot(
      page,
      `${process.env.DATA_PATH}/previous-month-${i}.png`
    );

    if (!isEmpty) {
      continue;
    }
    await getData(page);
  }
};

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "google-chrome-stable",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();

  await login(page);

  console.log(
    '"' + ["日付", "店舗名", "合計金額", "カテゴリー", "口座"].join('","') + '"'
  );
  await getDataList(page);

  await browser.close();
})();
