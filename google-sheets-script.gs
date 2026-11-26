/**
 * YANGI SHO'RCHI — GOOGLE SHEETS AVTOMATIK QABUL QILISH SKRIPTI
 *
 * O'rnatish tartibi:
 * 1. Google Sheets'da yangi jadval oching.
 * 2. Yuqori menyudan: Extensions (Kengaytmalar) -> Apps Script bo'limiga kiring.
 * 3. Ichidagi eski kodni o'chirib, ushbu kodni to'liq nusxalab joylang va Save (Ctrl+S) bosing.
 * 4. Yuqori o'ng burchakdan: Deploy -> New deployment -> Select type: Web app tanlang.
 * 5. "Execute as": Me | "Who has access": Anyone (Hamma) qilib belgilang va Deploy bosing.
 * 6. Chiqqan Web App URL ("https://script.google.com/macros/s/.../exec") manzilini nusxalab,
 *    saytdagi `js/config.js` faylining `GOOGLE_SHEETS_WEB_APP_URL` qatoriga qo'ying!
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

    // Agar jadval bo'sh bo'lsa, chiroyli yashil sarlavha qatorini avtomatik yaratadi
    if (sheet.getLastRow() === 0) {
      const headers = [
        "№",
        "Sana va vaqt",
        "Telefon raqami",
        "Loyiha",
        "Manba (UTM Source)",
        "UTM Medium",
        "UTM Campaign",
        "Sahifa manzili"
      ];
      sheet.appendRow(headers);
      const headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setBackground("#064B2B");
      headerRange.setFontColor("#FFFFFF");
      headerRange.setFontWeight("bold");
      sheet.setFrozenRows(1);
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
    const phone = params.phone || params.raw_phone || "";

    sheet.appendRow([
      rowNumber,
      tashkentTime,
      "'" + phone,
      params.project || "Yangi Sho'rchi",
      params.utm_source || "direct",
      params.utm_medium || "",
      params.utm_campaign || "",
      params.page_url || ""
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
