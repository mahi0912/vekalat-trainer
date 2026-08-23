/*
 * دروازه ورود سمت کاربر.
 *
 * ⚠️ این یک لایه امنیتی واقعی نیست:
 *    سایت روی GitHub Pages عمومی منتشر می‌شود، بنابراین data/questions.json و
 *    تصاویر assets/ مستقیماً با آدرس خودشان قابل دانلودند و این دروازه آن‌ها را
 *    محافظت نمی‌کند. هدف فقط جلوگیری از دسترسی اتفاقی بازدیدکننده عادی است.
 *    برای محافظت واقعی، سایت باید پشت یک سرور منتشر شود (Cloudflare Access یا Worker)
 *    که آن‌وقت آدرس دیگر روی github.io نخواهد بود.
 *
 * پسورد به شکل متن ساده در مخزن نیست؛ فقط خروجی PBKDF2-SHA256 آن ذخیره می‌شود و
 * مقدار واقعی هنگام دیپلوی از سکرت WEBAPP_PASSWORD تزریق می‌شود.
 */
import { $ } from './util.js';

const CFG = window.__GATE__ || {};
const ITERATIONS = 150000;
const STORAGE_KEY = 'vekalat.unlocked';
const app = $('#app');

async function derive(password) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(CFG.salt || ''), iterations: ITERATIONS, hash: 'SHA-256' },
    key, 256);
  return [...new Uint8Array(bits)].map(b => b.toString(16).padStart(2, '0')).join('');
}

async function launch() {
  const { boot } = await import('./app.js');
  await boot();
}

function renderGate(message) {
  app.innerHTML = `
    <div class="card gate">
      <h2>ورود</h2>
      <p class="muted" style="margin:6px 0 16px">برای مشاهده سؤالات، رمز عبور را وارد کنید.</p>
      <form id="gateForm">
        <input id="gatePass" type="password" inputmode="numeric" autocomplete="current-password"
               placeholder="رمز عبور" aria-label="رمز عبور">
        <button type="submit" class="btn primary" style="width:100%;margin-top:12px">ورود</button>
      </form>
      ${message ? `<div class="warning" style="margin-top:12px">${message}</div>` : ''}
    </div>`;

  const form = $('#gateForm');
  const input = $('#gatePass');
  input.focus();

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = form.querySelector('button');
    btn.disabled = true;
    btn.textContent = 'در حال بررسی…';
    try {
      if (await derive(input.value) === CFG.hash) {
        try { sessionStorage.setItem(STORAGE_KEY, '1'); } catch (_) { /* حالت خصوصی */ }
        launch();
      } else {
        renderGate('رمز عبور نادرست است.');
      }
    } catch (_) {
      renderGate('بررسی رمز ممکن نشد؛ صفحه باید روی HTTPS باز شود.');
    }
  });
}

// در اجرای محلی مقدار جایگزین نشده است، پس دروازه نمایش داده نمی‌شود.
const configured = CFG.hash && CFG.hash !== '__GATE_HASH__';
let unlocked = false;
try { unlocked = sessionStorage.getItem(STORAGE_KEY) === '1'; } catch (_) { /* حالت خصوصی */ }

if (!configured || unlocked) launch();
else renderGate('');
