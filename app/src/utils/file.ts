import { writeFileSync, existsSync, mkdirSync, readFileSync } from "fs";
import fetch from "node-fetch";
import { stringify } from "csv-stringify/sync";
import pdf from "pdf-parse";

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

export const createCsvFile = (
  filename: string,
  data: Array<string | number>[]
) => {
  const csvData = stringify(data, { quoted: true });
  writeFileSync(filename, csvData);
};

export const parsePdf = async (filename: string) => {
  const buf = readFileSync(filename);
  const data = await pdf(buf);
  return data.text;
};
