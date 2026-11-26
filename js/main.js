(function () {
  "use strict";

  const cfg = window.YANGI_SHORCHI_CONFIG || {};
  const OUTBOX_KEY = "ys_outbox_queue_v1";
  const LAST_SENT_KEY = "ys_last_sent_v1";

  // 0. Sync Telegram Channel URL on thankYou.html + Background Outbox Retry Flusher
  const tgBtn = document.getElementById("telegramChannelBtn");
  if (tgBtn && cfg.TELEGRAM_CHANNEL_URL) {
    tgBtn.href = cfg.TELEGRAM_CHANNEL_URL;
  }

  function readOutbox() {
    try {
      return JSON.parse(localStorage.getItem(OUTBOX_KEY) || "[]");
    } catch (_) {
      return [];
    }
  }

  function writeOutbox(items) {
    try {
      localStorage.setItem(OUTBOX_KEY, JSON.stringify(items.slice(-30)));
    } catch (_) {}
  }

  function removeFromOutbox(leadId) {
    const remaining = readOutbox().filter((item) => item.lead_id !== leadId);
    writeOutbox(remaining);
  }

  function buildFormBody(payload) {
    const params = new URLSearchParams();
    Object.entries(payload).forEach(([k, v]) => params.append(k, String(v ?? "")));
    return params.toString();
  }

  async function transmitPayload(payload) {
    const endpoint = (cfg.GOOGLE_SHEETS_WEB_APP_URL || "").trim();
    if (!endpoint) {
      removeFromOutbox(payload.lead_id);
      return true;
    }

    const encodedBody = buildFormBody(payload);

    try {
      await fetch(endpoint, {
        method: "POST",
        mode: "no-cors",
        keepalive: true,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
        },
        body: encodedBody
      });
      removeFromOutbox(payload.lead_id);
      return true;
    } catch (_) {
      // Fallback to navigator.sendBeacon if fetch failed under extreme network drop
      try {
        if (navigator.sendBeacon) {
          const blob = new Blob([encodedBody], {
            type: "application/x-www-form-urlencoded;charset=UTF-8"
          });
          if (navigator.sendBeacon(endpoint, blob)) {
            removeFromOutbox(payload.lead_id);
            return true;
          }
        }
      } catch (__) {}
      return false;
    }
  }

  // Background queue flusher (recovers any failed/offline submission on thankYou.html or revisit)
  async function flushOutboxWithJitter() {
    const queue = readOutbox();
    if (!queue.length) return;
    for (let i = 0; i < queue.length; i++) {
      const item = queue[i];
      // Jittered delay smooths out 5,000+ concurrent user spikes
      const jitterMs = 350 + Math.floor(Math.random() * 1100);
      await new Promise((r) => setTimeout(r, jitterMs));
      await transmitPayload(item);
    }
  }

  if (readOutbox().length > 0) {
    setTimeout(flushOutboxWithJitter, 400);
  }
  window.addEventListener("online", flushOutboxWithJitter);

  // =========================================================================
  // MAIN LANDING PAGE CONTROLS
  // =========================================================================
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

  // 1. Lightweight Countdown Timer (pauses work when tab hidden to save mobile battery/CPU)
  if (countdownEls.length > 0) {
    let remaining = typeof cfg.COUNTDOWN_SECONDS === "number" ? cfg.COUNTDOWN_SECONDS : 117;
    const renderTimer = () => {
      const mins = String(Math.floor(remaining / 60)).padStart(2, "0");
      const secs = String(remaining % 60).padStart(2, "0");
      const txt = `${mins}:${secs}`;
      for (let i = 0; i < countdownEls.length; i++) {
        countdownEls[i].textContent = txt;
      }
    };
    renderTimer();
    setInterval(() => {
      if (!document.hidden && remaining > 0) {
        remaining -= 1;
        renderTimer();
      }
    }, 1000);
  }

  if (!form) return;

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
    }, 90);
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    clearError();
  }

  openBtns.forEach((btn) => btn.addEventListener("click", openModal, { passive: true }));
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
    return COUNTRY_RULES[code] || COUNTRY_RULES["+998"];
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

  // 4. Instant Non-Blocking Lead Submission + Anti-Duplicate Guard
  let isSubmitting = false;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
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

    const rawPhone = `${code}${digits}`;

    // Prevent accidental double-submission of identical phone within 25 seconds
    try {
      const last = JSON.parse(sessionStorage.getItem(LAST_SENT_KEY) || "null");
      if (last && last.raw_phone === rawPhone && Date.now() - last.ts < 25000) {
        window.location.href = "thankYou.html?from=root";
        return;
      }
    } catch (_) {}

    isSubmitting = true;
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "YUBORILMOQDA...";
    }

    const formattedPhone = `${code} ${formatDigits(digits, rule.format)}`;
    const urlParams = new URLSearchParams(window.location.search);
    const leadId = `ys_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const payload = {
      lead_id: leadId,
      name: fullName,
      phone: formattedPhone,
      raw_phone: rawPhone,
      timestamp: new Date().toLocaleString("uz-UZ", { timeZone: "Asia/Tashkent" }),
      project: "Yangi Shorchi",
      utm_source: urlParams.get("utm_source") || "direct",
      utm_medium: urlParams.get("utm_medium") || "",
      utm_campaign: urlParams.get("utm_campaign") || ""
    };

    // Enqueue before sending so zero leads are lost even if network drops mid-redirect
    const queue = readOutbox();
    queue.push(payload);
    writeOutbox(queue);

    try {
      sessionStorage.setItem(LAST_SENT_KEY, JSON.stringify({ raw_phone: rawPhone, ts: Date.now() }));
    } catch (_) {}

    // Race transmission against snappy 900ms UI budget so button NEVER hangs under 5,000+ user load
    await Promise.race([
      transmitPayload(payload),
      new Promise((resolve) => setTimeout(resolve, 900))
    ]);

    window.location.href = "thankYou.html?from=root";
  });
})();
