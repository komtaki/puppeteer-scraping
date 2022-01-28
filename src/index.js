const puppeteer = require("puppeteer");

const fullScreenShot = async (page, path) => {
  await page.screenshot({ path: path, fullPage: true });
};

const DATA_PATH = "/app/src/data";

const login = async (page) => {
  const LOGIN_USER_SELECTOR = "#user_email";
  const LOGIN_PASS_SELECTOR = "#user_password";
  const LOGIN_SUBMIT_SELECTOR = "#signup-view-signup-button";

  await page.goto("https://www.drwallet.jp/users/sign_in");

  await page.type(LOGIN_USER_SELECTOR, process.env.DOCKER_WALLET_ID);
  await page.type(LOGIN_PASS_SELECTOR, process.env.DOCKER_WALLET_PASSWORD);

  await page.click(LOGIN_SUBMIT_SELECTOR);

  const _sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  await _sleep(10000);

  await fullScreenShot(page, `${DATA_PATH}/login.png`);
};

const getData = async (page) => {
  const DATA_DATE_SELECTOR =
    "#after_input_receipt_list > tbody > tr > td.transacted_at_cell";
  const dateElements = await page.$$(DATA_DATE_SELECTOR);

  const DATA_SHOP_SELECTOR =
    "#after_input_receipt_list > tbody > tr > td.shop_name_cell";
  const shopElements = await page.$$(DATA_SHOP_SELECTOR);

  const DATA_AMOUNT_SELECTOR =
    "#after_input_receipt_list > tbody > tr > td.amount_cell > p";
  const amountElements = await page.$$(DATA_AMOUNT_SELECTOR);

  const DATA_CATEGORY_SELECTOR =
    "#after_input_receipt_list > tbody > tr > td.category_cell";
  const categoryElements = await page.$$(DATA_CATEGORY_SELECTOR);

  const DATA_ACCOUNT_SELECTOR =
    "#after_input_receipt_list > tbody > tr > td.account_cell";
  const accountElements = await page.$$(DATA_ACCOUNT_SELECTOR);

  for (let j = 0; j < shopElements.length; j++) {
    let amountClassName = await (await amountElements[j].getProperty("className")).jsonValue();
    let isIncome = await amountClassName.includes('income') ? '' : '-';
    let amountValue = await (await amountElements[j].getProperty("textContent")).jsonValue();

    let moneyData = [
      await (await dateElements[j].getProperty("textContent")).jsonValue(),
      await (await shopElements[j].getProperty("textContent")).jsonValue(),
      await amountValue.replace('￥', isIncome),
      await (
        await categoryElements[j].getProperty("textContent")
      ).jsonValue(),
      await (await accountElements[j].getProperty("textContent")).jsonValue(),
    ];

    await console.log('"' + moneyData.join('","') + '"');
  }
}

const getDataList = async (page) => {
  await getData(page);
  await fullScreenShot(page, `${DATA_PATH}/this-month.png`);

  const PREVIOUS_MONTH = "#previous-month";

  for (let i = 0; i < process.env.MAX_PREVIOUS_MONTH; i++) {
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

    await fullScreenShot(page, `${DATA_PATH}/previous-month-${i}.png`);

    if (!isEmpty) {
      continue;
    }
    await getData(page);
  }
};

(async () => {
  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();

  await login(page);

  await console.log('"' + ["日付", "店舗名", "合計金額", "カテゴリー", "口座"].join('","') + '"');
  await getDataList(page);

  await browser.close();
})();
