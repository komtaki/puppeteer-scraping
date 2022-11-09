import puppeteer from "puppeteer";
import type { Page } from "puppeteer";
import {
  downloadFile,
  parsePdf,
  mkdirIfNotExist,
  createCsvFile,
} from "./utils/file";
import { getPropertyValueFromElement } from "./utils/puppeteer";

class CSVBuilder {
  private csvData: Array<string | number>[] = [];

  private buildCsvData = async (
    code: number,
    listingDate: string,
    filename: string
  ) => {
    const data = await parsePdf(filename);

    if (!data) return;

    const match = (data: string, regex: RegExp) => {
      const result = data.match(regex);
      return result ? result[1] : "";
    };

    this.csvData.push([
      code,
      match(data, /[\s\S]+会\s*社\s*名\s*(.*)\n/),
      match(listingDate, /^([0-9]{4}\/[0-9]{2}\/[0-9]{2})/),
      match(data, /\n市\s*場\s*区\s*分\s*(.*)\n/),
      match(data, /\n既\s*上\s*場\s*市\s*場\s*(.*)\n/),
      match(data, /\n代\s*表\s*者\s*の\s*役\s*職\s*氏\s*名\s*(.*)\n/),
      match(
        data,
        /[\s\S]+事\s*業\s*の\s*内\s*容\s*([\s\S]+)業\s*種\s*別\s*分\s*類\s*・\s*コ/
      ).replace(/\r?\n/g, ""),
      match(
        data,
        /\n業\s*種\s*別\s*分\s*類\s*・\s*コ\s*ー\s*ド\s*(.*)・[0-9]+/
      ),
    ]);
  };

  private JPX_URLS = {
    2022: "https://www.jpx.co.jp/listing/stocks/new/index.html",
    2021: "https://www.jpx.co.jp/listing/stocks/new/00-archives-01.html",
    2020: "https://www.jpx.co.jp/listing/stocks/new/00-archives-02.html",
    2019: "https://www.jpx.co.jp/listing/stocks/new/00-archives-03.html",
    2018: "https://www.jpx.co.jp/listing/stocks/new/00-archives-04.html",
  } as const;

  getAllYearData = async (page: Page) => {
    const keys = Object.keys(this.JPX_URLS) as unknown as Array<
      keyof typeof this.JPX_URLS
    >;

    for (let i = 0; i < keys.length; i++) {
      console.log(`Start scraping ${keys[i]}`);
      await this.getDataFromJPX(page, keys[i]);
      console.log(`Finish scraping ${keys[i]}`);
    }

    await this.getDataFromMinkabu(page);
  };

  private getDataFromJPX = async (page: Page, year: keyof typeof this.JPX_URLS) => {
    const dataPath = `${process.env.DATA_PATH}/${year}`;
    mkdirIfNotExist(dataPath);

    const SELECTOR = {
      LISTING_DATE:
        "#readArea > div:nth-child(4) > div > table:nth-child(1) > tbody > tr:nth-child(odd) > td:nth-child(1)",
      TABLE_CODE:
        "#readArea > div:nth-child(4) > div > table:nth-child(1) > tbody > tr:nth-child(odd) > td:nth-child(3) > a",
      TABLE_DOC_LINK:
        "#readArea > div:nth-child(4) > div > table:nth-child(1) > tbody > tr:nth-child(odd) > td:nth-child(4) > a",
    };

    await page.goto(this.JPX_URLS[year]);
    await page.waitForSelector(SELECTOR.TABLE_DOC_LINK);

    const listingDateElements = await page.$$(SELECTOR.LISTING_DATE);
    const docLinksElements = await page.$$(SELECTOR.TABLE_DOC_LINK);
    const codeElements = await page.$$(SELECTOR.TABLE_CODE);

    for (let i = 0; i < docLinksElements.length; i++) {
      if (!docLinksElements[0] || !codeElements[0]) continue;

      const href = await getPropertyValueFromElement(
        docLinksElements[i],
        "href"
      );
      const code = await getPropertyValueFromElement(codeElements[i]);
      const listingDate = await getPropertyValueFromElement(
        listingDateElements[i]
      );

      if (!href || !code) continue;

      const pdfPath = `${dataPath}/${code}.pdf`;
      // await downloadFile(`${href}`, pdfPath);
      await this.buildCsvData(Number(code), String(listingDate), pdfPath);
    }
  };

  private getDataFromMinkabu = async (page: Page) => {
    const csvHeader = [
      "証券番号",
      "企業",
      "上場日",
      "上場した市場",
      "既上場市場",
      "代表者の役職・氏名",
      "事業内容",
      "種別",
      "従業員数",
    ];

    const tempCSV: Array<string | number>[] = [csvHeader];

    for (let j = 0; j < this.csvData.length; j++) {
      await page.goto(`https://minkabu.jp/stock/${this.csvData[j][0]}/ipo`);

      const SELECTOR_WORKER =
        "#contents > div:nth-child(4) > div.md_mtab_box.md_box > div:nth-child(6) > table > tbody > tr:nth-child(7) > td";

      const workerElements = await page.$$(SELECTOR_WORKER);

      const worker = workerElements[0]
        ? String(await getPropertyValueFromElement(workerElements[0])).replace(
            /人.*/g,
            ""
          )
        : "";

      tempCSV.push([...this.csvData[j], worker]);
      console.log('"' + [...this.csvData[j], worker].join('","') + '"');
    }
    this.csvData = tempCSV;
  };

  getCsv = () => this.csvData;
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "google-chrome-stable",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  const builder = new CSVBuilder();
  await builder.getAllYearData(page);

  await browser.close();

  createCsvFile(`${process.env.DATA_PATH}/output.csv`, builder.getCsv());
})();
