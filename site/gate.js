/*
 * دروازه ورود سمت کاربر.
 *
 * ⚠️ توجه — این یک لایه امنیتی واقعی نیست:
 *    سایت روی GitHub Pages عمومی منتشر می‌شود، بنابراین bank.js و تصاویر
 *    assets/ مستقیماً با آدرس خودشان قابل دانلود هستند و این دروازه آن‌ها را
 *    محافظت نمی‌کند. هدف فقط جلوگیری از دسترسی اتفاقی بازدیدکننده عادی است.
 *    برای محافظت واقعی باید سایت پشت یک سرور (مثلاً Cloudflare Access یا Worker)
 *    منتشر شود — که آن‌وقت آدرس دیگر روی github.io نخواهد بود.
 *
 * پسورد به شکل متن ساده در کد نیست؛ فقط خروجی PBKDF2-SHA256 آن ذخیره می‌شود
 * و مقدار واقعی هنگام دیپلوی از GitHub Secret تزریق می‌شود.
 */
'use strict';
(function () {
  const CFG = window.__GATE__ || {};
  const ITERATIONS = 150000;
  const STORAGE_KEY = 'vekalat.unlocked';
  const app = document.getElementById('app');

  // بانک سؤال ۵٫۶ مگابایتی فقط بعد از باز شدن قفل بارگذاری می‌شود.
  function loadBank() {
    app.innerHTML = '<div class="card">در حال بارگذاری بانک سؤال…</div>';
    const s = document.createElement('script');
    s.src = 'bank.js';
    s.onload = () => window.__bootApp();
    s.onerror = () => {
      app.innerHTML = '<div class="card"><div class="warning">بارگذاری بانک سؤال ناموفق بود. صفحه را دوباره باز کنید.</div></div>';
    };
    document.body.appendChild(s);
  }

  async function derive(password) {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt: enc.encode(CFG.salt || ''), iterations: ITERATIONS, hash: 'SHA-256' },
      key,
      256
    );
    return [...new Uint8Array(bits)].map(b => b.toString(16).padStart(2, '0')).join('');
  }

  function renderGate(message) {
    app.innerHTML = `
      <div class="card" style="max-width:420px;margin:40px auto">
        <div class="sourceTitle">ورود به مربی آزمون وکالت</div>
        <div class="sourceHint">برای مشاهده سؤالات، رمز عبور را وارد کنید.</div>
        <form id="gateForm">
          <input id="gatePass" class="jump" type="password" inputmode="numeric"
                 autocomplete="current-password" placeholder="رمز عبور" style="text-align:center;letter-spacing:4px">
          <button type="submit" class="btn primary" style="width:100%;margin-top:10px">ورود</button>
        </form>
        <div id="gateMsg" class="warning ${message ? '' : 'hidden'}" style="margin-top:10px">${message || ''}</div>
      </div>`;

    const form = document.getElementById('gateForm');
    const input = document.getElementById('gatePass');
    input.focus();

    form.addEventListener('submit', async e => {
      e.preventDefault();
      const btn = form.querySelector('button');
      btn.disabled = true;
      btn.textContent = 'در حال بررسی…';
      try {
        if (await derive(input.value) === CFG.hash) {
          try { sessionStorage.setItem(STORAGE_KEY, '1'); } catch (_) {}
          loadBank();
        } else {
          renderGate('رمز عبور نادرست است.');
        }
      } catch (_) {
        renderGate('بررسی رمز ممکن نشد. مرورگر باید از HTTPS استفاده کند.');
      }
    });
  }

  // در اجرای محلی مقدار جایگزین نشده است، پس دروازه نمایش داده نمی‌شود.
  const configured = CFG.hash && CFG.hash !== '__GATE_HASH__';
  let unlocked = false;
  try { unlocked = sessionStorage.getItem(STORAGE_KEY) === '1'; } catch (_) {}

  if (!configured || unlocked) loadBank();
  else renderGate('');
})();
