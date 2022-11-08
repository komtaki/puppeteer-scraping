import { readFileSync } from "fs";
import pdf from "pdf-parse";
import puppeteer from "puppeteer";
import type { Page } from "puppeteer";
import { downloadFile, mkdirIfNotExist } from "./utils";

const parsePdf = async (filename: string) => {
  const buf = readFileSync(filename);
  const data = await pdf(buf)
  return data.text
};

const createCSV = async (code: number, listingDate: string, filename: string) => {
  const data = await parsePdf(filename);

  if (!data) return;

  const match = (data: string, regex: RegExp) => {
    const result = data.match(regex);
    return result ? result[1] : "";
  };

  const csvData = [
    code,
    match(data, /[\s\S]+会\s*社\s*名\s*(.*)\n/),
    match(listingDate, /^([0-9]{4}\/[0-9]{2}\/[0-9]{2})/),
    match(data, /\n市\s*場\s*区\s*分\s*(.*)\n/),
    match(data, /\n既\s*上\s*場\s*市\s*場\s*(.*)\n/),
    match(data, /\n代\s*表\s*者\s*の\s*役\s*職\s*氏\s*名\s*(.*)\n/),
    match(data, /[\s\S]+事\s*業\s*の\s*内\s*容\s*([\s\S]+)業\s*種\s*別\s*分\s*類\s*・\s*コ/).replace(/\r?\n/g, ''),
    match(data, /\n業\s*種\s*別\s*分\s*類\s*・\s*コ\s*ー\s*ド\s*(.*)・[0-9]+/),
  ];

  console.log('"' + csvData.join('","') + '"');
};

const downloadPdfFiles = async (page: Page, dataPath: string) => {
  const SELECTOR_LISTING_DATE =
    "#readArea > div:nth-child(4) > div > table:nth-child(1) > tbody > tr:nth-child(odd) > td:nth-child(1)";
  const SELECTOR_TABLE_CODE =
    "#readArea > div:nth-child(4) > div > table:nth-child(1) > tbody > tr:nth-child(odd) > td:nth-child(3) > a";
  const SELECTOR_TABLE_DOC_LINK =
    "#readArea > div:nth-child(4) > div > table:nth-child(1) > tbody > tr:nth-child(odd) > td:nth-child(4) > a";
  await page.waitForSelector(SELECTOR_TABLE_DOC_LINK);

  const listingDateElements = await page.$$(SELECTOR_LISTING_DATE);
  const docLinksElements = await page.$$(SELECTOR_TABLE_DOC_LINK);
  const codeElements = await page.$$(SELECTOR_TABLE_CODE);

  for (let i = 0; i < docLinksElements.length; i++) {
    const href = await (
      await docLinksElements[i].getProperty("href")
    ).jsonValue();
    const code = await (
      await codeElements[i].getProperty("textContent")
    ).jsonValue();
    const listingDate = await (
      await listingDateElements[i].getProperty("textContent")
    ).jsonValue();

    await downloadFile(`${href}`, `${dataPath}/${code}.pdf`);
    await createCSV(Number(code), String(listingDate), `${dataPath}/${code}.pdf`);
  }
};

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "google-chrome-stable",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  const JPX_URLS = {
    2022: 'https://www.jpx.co.jp/listing/stocks/new/index.html',
    // 2021: 'https://www.jpx.co.jp/listing/stocks/new/00-archives-01.html',
    // 2020: 'https://www.jpx.co.jp/listing/stocks/new/00-archives-02.html',
    // 2019: 'https://www.jpx.co.jp/listing/stocks/new/00-archives-03.html',
    // 2018: 'https://www.jpx.co.jp/listing/stocks/new/00-archives-04.html',
  } as const;

  const keys = Object.keys(JPX_URLS) as unknown as Array<keyof typeof JPX_URLS>

  console.log(
    '"' +
      [
        "証券番号",
        "企業",
        "上場日",
        "上場した市場",
        "既上場市場",
        "代表者の役職・氏名",
        "事業内容",
        "種別",
      ].join('","') +
      '"'
  );

  for (let i = 0; i < keys.length; i++) {
    await page.goto(JPX_URLS[keys[i]]);

    const dataPath = `${process.env.DATA_PATH}/${keys[i]}`;
    mkdirIfNotExist(dataPath);
    await downloadPdfFiles(page, dataPath);
  }

  await browser.close();
})();
