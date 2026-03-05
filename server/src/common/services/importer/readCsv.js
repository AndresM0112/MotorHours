// import fs from "fs";
// import { parse } from "csv-parse";
export async function* readCsvRows() {}
// export async function* readCsvRows(
//   tempFilePath,
//   { delimiter = ",", headerRow = 1, skipEmptyRows = true } = {}
// ) {
//   let headers = [];
//   let rowNum = 0;
//   const parser = fs
//     .createReadStream(tempFilePath)
//     .pipe(parse({ delimiter, relax_column_count: true }));

//   for await (const record of parser) {
//     rowNum++;
//     if (rowNum === headerRow) {
//       headers = record.map((v) => String(v ?? "").trim());
//       continue;
//     }
//     const obj = {};
//     let empty = true;
//     for (let i = 0; i < record.length; i++) {
//       const key = headers[i] || String(i + 1);
//       const val = record[i];
//       if (val !== undefined && val !== null && val !== "") empty = false;
//       obj[key] = val;
//     }
//     if (skipEmptyRows && empty) continue;
//     yield obj;
//   }
// }
