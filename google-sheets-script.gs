/**
 * YANGI SHO'RCHI — GOOGLE SHEETS AVTOMATIK QABUL QILISH SKRIPTI (ISM + TELEFON RAQAM)
 *
 * O'rnatish tartibi (1 daqiqa):
 * 1. https://sheets.new orqali yangi Google Sheets jadval oching.
 * 2. Yuqori menyudan: Extensions (Расширения / Kengaytmalar) -> Apps Script bo'limiga kiring.
 * 3. Ichidagi bor kodni o'chirib, ushbu kodni to'liq qo'ying va Save (Ctrl+S) bosing.
 * 4. O'ng yuqoridan: Deploy -> New deployment -> Select type (⚙️): Web app tanlang.
 * 5. "Execute as": Me | "Who has access": Anyone (Все / Hamma) tanlab, Deploy bosing va ruxsat bering.
 * 6. Chiqqan Web App URL ("https://script.google.com/macros/s/.../exec") manzilini nusxalab menga yuboring
 *    yoki `js/config.js` ichidagi `GOOGLE_SHEETS_WEB_APP_URL` qatoriga qo'ying!
 */

const SHEET_NAME = "Lidlar";

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME);

    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
    }

    // Agar jadval bo'sh bo'lsa, yashil sarlavha qatorini avtomatik yaratadi
    if (sheet.getLastRow() === 0) {
      const headers = [
        "№",
        "Ism",
        "Telefon raqami",
        "Sana va vaqt",
        "Loyiha",
        "Manba (UTM Source)",
        "UTM Medium",
        "UTM Campaign"
      ];
      sheet.appendRow(headers);
      const headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setBackground("#064B2B");
      headerRange.setFontColor("#FFFFFF");
      headerRange.setFontWeight("bold");
      sheet.setFrozenRows(1);
      sheet.setColumnWidth(1, 50);
      sheet.setColumnWidth(2, 180);
      sheet.setColumnWidth(3, 170);
      sheet.setColumnWidth(4, 160);
    }

    let params = {};
    if (e && e.parameter && Object.keys(e.parameter).length > 0) {
      params = e.parameter;
    } else if (e && e.postData && e.postData.contents) {
      try {
        params = JSON.parse(e.postData.contents);
      } catch (_) {}
    }

    const rowNumber = sheet.getLastRow();
    const tashkentTime = Utilities.formatDate(new Date(), "Asia/Tashkent", "dd.MM.yyyy HH:mm:ss");
    const name = (params.name || "").trim();
    const phone = (params.phone || params.raw_phone || "").trim();

    sheet.appendRow([
      rowNumber,
      name,
      "'" + phone,
      tashkentTime,
      params.project || "Yangi Sho'rchi",
      params.utm_source || "direct",
      params.utm_medium || "",
      params.utm_campaign || ""
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, row: rowNumber }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(error) }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function doGet() {
  return ContentService
    .createTextOutput("Yangi Sho'rchi Google Sheets webhook ishlab turibdi!")
    .setMimeType(ContentService.MimeType.TEXT);
}
