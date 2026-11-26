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

  async function flushOutboxWithJitter() {
    const queue = readOutbox();
    if (!queue.length) return;
    for (let i = 0; i < queue.length; i++) {
      const item = queue[i];
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
  const phoneInput = document.getElementById("phoneInput");
  const phoneGroup = document.getElementById("phoneGroup");
  const errorBox = document.getElementById("formError");
  const submitBtn = document.getElementById("submitBtn");
  const countdownEls = document.querySelectorAll("[data-countdown], #countdownTimer");
  const eventDateEl = document.getElementById("eventDateText");

  if (eventDateEl && cfg.EVENT_DATE_TEXT) {
    eventDateEl.textContent = cfg.EVENT_DATE_TEXT;
  }

  // 1. Lightweight Countdown Timer
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

  let isSubmitting = false;

  // Reset button state when navigating back via iOS Safari / Telegram WebView bfcache
  window.addEventListener("pageshow", () => {
    isSubmitting = false;
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "DAVOM ETISH";
    }
  });

  // 2. Modal Open / Close Controls
  function openModal() {
    if (!modal) return;
    isSubmitting = false;
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "DAVOM ETISH";
    }
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

  if (phoneGroup && phoneInput) {
    phoneGroup.addEventListener("click", () => {
      phoneInput.focus();
    });
  }

  // 3. Uzbekistan +998 Phone Formatting & Input Sanitization
  const UZ_GROUPS = [2, 3, 2, 2];

  function formatUzPhone(digits) {
    let res = "";
    let idx = 0;
    for (let i = 0; i < UZ_GROUPS.length; i++) {
      if (idx >= digits.length) break;
      const slice = digits.slice(idx, idx + UZ_GROUPS[i]);
      res += (idx === 0 ? "" : " ") + slice;
      idx += UZ_GROUPS[i];
    }
    return res;
  }

  // Prevent spreadsheet formula injection (=, +, -, @) and strip control chars
  function sanitizeName(raw) {
    return String(raw || "")
      .replace(/[\u0000-\u001F\u007F]/g, " ")
      .replace(/\s+/g, " ")
      .replace(/^[=+\-@]+/, "")
      .trim()
      .slice(0, 60);
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

  function normalizePhoneInput() {
    if (!phoneInput) return;
    if (phoneGroup) phoneGroup.classList.remove("has-error");
    if (errorBox) errorBox.textContent = "";
    let digits = phoneInput.value.replace(/\D/g, "");
    if (digits.length >= 12 && digits.startsWith("998")) {
      digits = digits.slice(3);
    }
    digits = digits.slice(0, 9);
    phoneInput.value = formatUzPhone(digits);
  }

  if (phoneInput) {
    phoneInput.addEventListener("input", normalizePhoneInput);
    phoneInput.addEventListener("change", normalizePhoneInput);
  }

  // 4. Instant Non-Blocking Lead Submission
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    clearError();

    const fullName = sanitizeName(nameInput ? nameInput.value : "");
    if (fullName.length < 2) {
      showError("Iltimos, ismingizni kiriting!", nameGroup);
      if (nameInput) nameInput.focus();
      return;
    }

    let digits = (phoneInput ? phoneInput.value : "").replace(/\D/g, "");
    if (digits.length >= 12 && digits.startsWith("998")) {
      digits = digits.slice(3);
    }

    if (digits.length < 9 || /^0+$/.test(digits)) {
      showError("Iltimos, telefon raqamingizni to‘liq kiriting!", phoneGroup);
      if (phoneInput) phoneInput.focus();
      return;
    }

    const rawPhone = `+998${digits}`;

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

    const formattedPhone = `+998 ${formatUzPhone(digits)}`;
    const leadId = `ys_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const payload = {
      lead_id: leadId,
      name: fullName,
      phone: formattedPhone,
      raw_phone: rawPhone,
      timestamp: new Date().toLocaleString("uz-UZ", { timeZone: "Asia/Tashkent" }),
      project: "Yangi Shorchi"
    };

    const queue = readOutbox();
    queue.push(payload);
    writeOutbox(queue);

    try {
      sessionStorage.setItem(LAST_SENT_KEY, JSON.stringify({ raw_phone: rawPhone, ts: Date.now() }));
    } catch (_) {}

    await Promise.race([
      transmitPayload(payload),
      new Promise((resolve) => setTimeout(resolve, 900))
    ]);

    window.location.href = "thankYou.html?from=root";
  });
})();
