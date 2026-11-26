# Google Sheets ulash bo‘yicha 2 daqiqalik qo‘llanma

Saytdan qoldirilgan barcha telefon raqamlar to‘g‘ridan-to‘g‘ri **Google Sheets** jadvalingizga tushishi uchun quyidagi 4 qadamni bajaring:

1. **Google Sheets**'da yangi jadval yarating.
2. Yuqori menyudan **`Extensions` (Расширения / Kengaytmalar) → `Apps Script`** bo‘limiga o‘ting.
3. Ochilgan oynadagi kodni o‘chirib, loyiha ichidagi [`google-sheets-script.gs`](./google-sheets-script.gs) faylidagi kodni to‘liq nusxalab qo‘ying va **Save (`Ctrl + S`)** tugmasini bosing.
4. O‘ng yuqoridagi ko‘k **`Deploy` → `New deployment`** tugmasini bosing:
   - **Select type** (tishli g‘ildirakcha): **`Web app`**
   - **Execute as**: **`Me`**
   - **Who has access**: **`Anyone`** *(bu juda muhim!)*
   - **`Deploy`** tugmasini bosing va ruxsat bering (`Authorize access`).
5. Sizga berilgan **`Web app URL`** (`https://script.google.com/macros/s/.../exec`) manzilini nusxalab oling va [`js/config.js`](./js/config.js) faylidagi `GOOGLE_SHEETS_WEB_APP_URL` ichiga qo‘ying:

```js
window.YANGI_SHORCHI_CONFIG = {
  GOOGLE_SHEETS_WEB_APP_URL: "https://script.google.com/macros/s/SIZNING_KODINGIZ/exec",
  TELEGRAM_CHANNEL_URL: "https://t.me/oscar_building",
  EVENT_DATE_TEXT: "5-dekabr | 20:00 da",
  COUNTDOWN_SECONDS: 117
};
```

Shu zahoti saytdagi `DAVOM ETISH` tugmasi bosilganda:
1. Telefon raqam, Toshkent vaqti va reklama manbasi (`utm_source`) Google Sheets'dagi **`Lidlar`** varag‘iga yoziladi.
2. Mijoz darhol **`thankYou.html`** (`OXIRGI QADAM QOLDI!`) sahifasiga o‘tadi va **`OBUNA BO‘LISH`** tugmasi orqali `https://t.me/oscar_building` Telegram kanaliga ulanadi.
