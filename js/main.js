(function () {
  "use strict";

  const cfg = window.YANGI_SHORCHI_CONFIG || {};
  const modal = document.getElementById("registerModal");
  const openBtns = document.querySelectorAll("[data-open-modal]");
  const closeBtn = document.getElementById("closeModalBtn");
  const form = document.getElementById("leadForm");
  const nameInput = document.getElementById("nameInput");
  const nameGroup = document.getElementById("nameGroup");
  const countrySelect = document.getElementById("countryCode");
  const phoneInput = document.getElementById("phoneInput");
  const phoneGroup = document.getElementById("phoneGroup");
  const errorBox = document.getElementById("formError");
  const submitBtn = document.getElementById("submitBtn");
  const countdownEls = document.querySelectorAll("[data-countdown], #countdownTimer");
  const eventDateEl = document.getElementById("eventDateText");

  if (eventDateEl && cfg.EVENT_DATE_TEXT) {
    eventDateEl.textContent = cfg.EVENT_DATE_TEXT;
  }

  // 1. Live Countdown Timer (MM:SS)
  if (countdownEls.length > 0) {
    let remaining = typeof cfg.COUNTDOWN_SECONDS === "number" ? cfg.COUNTDOWN_SECONDS : 117;
    const renderTimer = () => {
      const mins = String(Math.floor(remaining / 60)).padStart(2, "0");
      const secs = String(remaining % 60).padStart(2, "0");
      const txt = `${mins}:${secs}`;
      countdownEls.forEach((el) => {
        el.textContent = txt;
      });
    };
    renderTimer();
    setInterval(() => {
      if (remaining > 0) {
        remaining -= 1;
        renderTimer();
      }
    }, 1000);
  }

  // 2. Modal Open / Close Controls
  function openModal() {
    if (!modal) return;
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    setTimeout(() => {
      if (nameInput && !nameInput.value.trim()) {
        nameInput.focus();
      } else if (phoneInput) {
        phoneInput.focus();
      }
    }, 120);
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    clearError();
  }

  openBtns.forEach((btn) => btn.addEventListener("click", openModal));
  if (closeBtn) closeBtn.addEventListener("click", closeModal);
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal();
    });
  }
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal && modal.classList.contains("is-open")) {
      closeModal();
    }
  });

  // 3. Input Validation & Phone Formatting
  const COUNTRY_RULES = {
    "+998": { len: 9, placeholder: "88 888 88 88", format: [2, 3, 2, 2] },
    "+7": { len: 10, placeholder: "900 000 00 00", format: [3, 3, 2, 2] },
    "+996": { len: 9, placeholder: "555 000 000", format: [3, 3, 3] },
    "+992": { len: 9, placeholder: "90 000 00 00", format: [2, 3, 2, 2] },
    "+82": { len: 10, placeholder: "10 0000 0000", format: [2, 4, 4] }
  };

  function getRule() {
    const code = countrySelect ? countrySelect.value : "+998";
    return COUNTRY_RULES[code] || { len: 9, placeholder: "88 888 88 88", format: [2, 3, 2, 2] };
  }

  function formatDigits(digits, groups) {
    let res = "";
    let idx = 0;
    for (let i = 0; i < groups.length; i++) {
      if (idx >= digits.length) break;
      const slice = digits.slice(idx, idx + groups[i]);
      res += (idx === 0 ? "" : " ") + slice;
      idx += groups[i];
    }
    return res;
  }

  function clearError() {
    if (errorBox) errorBox.textContent = "";
    if (nameGroup) nameGroup.classList.remove("has-error");
    if (phoneGroup) phoneGroup.classList.remove("has-error");
  }

  function showError(msg, targetGroup) {
    if (errorBox) errorBox.textContent = msg;
    if (targetGroup) targetGroup.classList.add("has-error");
  }

  if (nameInput) {
    nameInput.addEventListener("input", () => {
      if (nameGroup) nameGroup.classList.remove("has-error");
      if (errorBox) errorBox.textContent = "";
    });
  }

  if (countrySelect && phoneInput) {
    countrySelect.addEventListener("change", () => {
      const rule = getRule();
      phoneInput.placeholder = rule.placeholder;
      phoneInput.value = "";
      clearError();
      phoneInput.focus();
    });

    phoneInput.addEventListener("input", () => {
      if (phoneGroup) phoneGroup.classList.remove("has-error");
      if (errorBox) errorBox.textContent = "";
      const rule = getRule();
      let digits = phoneInput.value.replace(/\D/g, "");
      if (countrySelect.value === "+998" && digits.length === 12 && digits.startsWith("998")) {
        digits = digits.slice(3);
      }
      digits = digits.slice(0, rule.len);
      phoneInput.value = formatDigits(digits, rule.format);
    });
  }

  // 4. Submit Name + Phone -> Google Sheets -> Redirect to thankYou.html
  async function sendToGoogleSheets(payload) {
    const endpoint = (cfg.GOOGLE_SHEETS_WEB_APP_URL || "").trim();

    // Backup locally
    try {
      const saved = JSON.parse(localStorage.getItem("yangi_shorchi_leads") || "[]");
      saved.push(payload);
      localStorage.setItem("yangi_shorchi_leads", JSON.stringify(saved.slice(-100)));
    } catch (_) {}

    if (!endpoint) {
      return;
    }

    const bodyParams = new URLSearchParams();
    Object.entries(payload).forEach(([k, v]) => bodyParams.append(k, String(v ?? "")));

    const fetchPromise = fetch(endpoint, {
      method: "POST",
      mode: "no-cors",
      keepalive: true,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
      },
      body: bodyParams.toString()
    }).catch((err) => {
      console.warn("Google Sheets yuborishda ogohlantirish:", err);
    });

    // Wait up to 2.5s for Google Sheets response; keepalive ensures completion even if slow
    await Promise.race([
      fetchPromise,
      new Promise((resolve) => setTimeout(resolve, 2500))
    ]);
  }

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearError();

      const fullName = (nameInput ? nameInput.value : "").trim();
      if (fullName.length < 2) {
        showError("Iltimos, ismingizni kiriting!", nameGroup);
        if (nameInput) nameInput.focus();
        return;
      }

      const code = countrySelect ? countrySelect.value : "+998";
      const rule = getRule();
      const digits = (phoneInput ? phoneInput.value : "").replace(/\D/g, "");

      if (digits.length < rule.len) {
        showError("Iltimos, telefon raqamingizni to‘liq kiriting!", phoneGroup);
        if (phoneInput) phoneInput.focus();
        return;
      }

      const formattedPhone = `${code} ${formatDigits(digits, rule.format)}`;
      const urlParams = new URLSearchParams(window.location.search);
      const utmSource = urlParams.get("utm_source") || "direct";
      const utmMedium = urlParams.get("utm_medium") || "";
      const utmCampaign = urlParams.get("utm_campaign") || "";

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "YUBORILMOQDA...";
      }

      const now = new Date();
      const timestamp = now.toLocaleString("uz-UZ", { timeZone: "Asia/Tashkent" });

      await sendToGoogleSheets({
        name: fullName,
        phone: formattedPhone,
        raw_phone: `${code}${digits}`,
        timestamp: timestamp,
        project: "Yangi Sho'rchi",
        utm_source: utmSource,
        utm_medium: utmMedium,
        utm_campaign: utmCampaign,
        page_url: window.location.href
      });

      window.location.href = "thankYou.html?from=root";
    });
  }
})();
