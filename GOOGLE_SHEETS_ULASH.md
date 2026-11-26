# Google Sheets ulash bo‘yicha 1 daqiqalik qo‘llanma (Ism + Telefon raqam)

Saytdan qoldirilgan **Ism** va **Telefon raqamlar** to‘g‘ridan-to‘g‘ri **Google Sheets** jadvalingizga tushishi uchun:

1. https://sheets.new havolasini ochib yangi jadval yarating (nomini masalan `Yangi Shorchi Lidlar` deb qo‘ying).
2. Yuqori menyudan **`Extensions` (Расширения / Kengaytmalar) → `Apps Script`** bo‘limiga kiring.
3. Ochilgan oynadagi `function myFunction() {}` kodini o‘chirib, [`google-sheets-script.gs`](./google-sheets-script.gs) faylidagi kodni joylang va **Save (`Ctrl + S`)** bosing.
4. O‘ng yuqoridagi ko‘k **`Deploy` → `New deployment`** tugmasini bosing:
   - Chapdagi tishli g‘ildirakcha (`Select type` ⚙️) → **`Web app`** tanlang.
   - **Execute as**: **`Me`**
   - **Who has access**: **`Anyone`** *(Все / Hamma — bu juda muhim!)*
   - **`Deploy`** bosing → `Authorize access` → Google akkauntingizni tanlang → `Advanced` → `Go to Untitled project (unsafe)` → `Allow` bosing.
5. Chiqqan **`Web app URL`** (`https://script.google.com/macros/s/.../exec`) linkini nusxalab chatga tashlang (yoki [`js/config.js`](./js/config.js) faylidagi `GOOGLE_SHEETS_WEB_APP_URL` ichiga qo‘ying).

Jadvalda avtomatik tarzda yashil sarlavhali **`Lidlar`** varag‘i ochiladi va har bir mijoz quyidagi ustunlarda tushadi:
`№` | **`Ism`** | **`Telefon raqami`** | `Sana va vaqt` | `Loyiha` | `Manba (UTM)`
