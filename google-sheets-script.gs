const SHEET_NAME = "Lidlar";

function doPost(e) {
  let params = {};
  if (e && e.parameter && Object.keys(e.parameter).length > 0) {
    params = e.parameter;
  } else if (e && e.postData && e.postData.contents) {
    try {
      params = JSON.parse(e.postData.contents);
    } catch (_) {}
  }

  // Fast RAM deduplication (prevents duplicate rows if slow mobile retries)
  const cache = CacheService.getScriptCache();
  const leadId = (params.lead_id || "").trim();
  if (leadId && cache.get("lid_" + leadId)) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, deduped: true }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(28000);

  try {
    if (leadId && cache.get("lid_" + leadId)) {
      return ContentService
        .createTextOutput(JSON.stringify({ ok: true, deduped: true }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME);

    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
    }

    if (!cache.get("headers_ready_v1") && sheet.getLastRow() === 0) {
      const headers = [
        "T/r",
        "Ism",
        "Telefon raqami",
        "Sana va vaqt",
        "Loyiha",
        "Manba (UTM)"
      ];
      sheet.appendRow(headers);
      const headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setBackground("#064B2B");
      headerRange.setFontColor("#FFFFFF");
      headerRange.setFontWeight("bold");
      sheet.setFrozenRows(1);
      sheet.setColumnWidth(1, 55);
      sheet.setColumnWidth(2, 180);
      sheet.setColumnWidth(3, 175);
      sheet.setColumnWidth(4, 165);
      cache.put("headers_ready_v1", "1", 21600);
    }

    const tashkentTime = Utilities.formatDate(new Date(), "Asia/Tashkent", "dd.MM.yyyy HH:mm:ss");
    const name = (params.name || "").trim();
    const phone = (params.phone || params.raw_phone || "").trim();

    sheet.appendRow([
      "=ROW()-1",
      name,
      "'" + phone,
      tashkentTime,
      params.project || "Yangi Shorchi",
      params.utm_source || "direct"
    ]);

    if (leadId) {
      cache.put("lid_" + leadId, "1", 21600);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
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
    .createTextOutput("Yangi Shorchi high-load webhook OK")
    .setMimeType(ContentService.MimeType.TEXT);
}
