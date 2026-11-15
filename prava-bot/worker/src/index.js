// "Yo'l qoidasi | Biz bilan osonroq" — Cloudflare Worker.
// Bir joyda: Telegram bot (webhook), Mini App API va foydalanuvchilar bazasi (Durable Object, SQLite).
// Mini App fayllarini (../webapp) Cloudflare o'zi beradi — wrangler.toml dagi [assets].
import { DurableObject } from "cloudflare:workers";
import QUESTIONS from "../../questions.json";

const FREE_QUESTIONS = 10;
const enc = new TextEncoder();

// ---------- BAZA ----------
export class Store extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    this.sql.exec(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY, name TEXT, paid INTEGER DEFAULT 0, paid_at INTEGER,
      charge_id TEXT, best_test INTEGER DEFAULT 0, best_drive INTEGER)`);
  }
  getUser(id, name = "") {
    const r = this.sql.exec("SELECT id, name, paid, best_test, best_drive FROM users WHERE id = ?", id).toArray()[0];
    if (!r) {
      this.sql.exec("INSERT INTO users (id, name) VALUES (?, ?)", id, name);
      return { id, name, paid: false, best_test: 0, best_drive: null };
    }
    return { id: r.id, name: r.name, paid: !!r.paid, best_test: r.best_test, best_drive: r.best_drive };
  }
  setPaid(id, chargeId) {
    this.getUser(id);
    this.sql.exec("UPDATE users SET paid = 1, paid_at = ?, charge_id = ? WHERE id = ?", Math.floor(Date.now() / 1000), chargeId, id);
    return this.getUser(id);
  }
  saveResult(id, kind, score, passed, time) {
    const u = this.getUser(id);
    if (kind === "test" && u.paid) this.sql.exec("UPDATE users SET best_test = MAX(best_test, ?) WHERE id = ?", score, id);
    else if (kind === "drive" && passed)
      this.sql.exec("UPDATE users SET best_drive = CASE WHEN best_drive IS NULL OR best_drive > ? THEN ? ELSE best_drive END WHERE id = ?", time, time, id);
    return this.getUser(id);
  }
}
const store = env => env.STORE.get(env.STORE.idFromName("main"));

// ---------- YORDAMCHILAR ----------
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8" } });
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
async function hmac(key, msg) {
  const k = await crypto.subtle.importKey("raw", typeof key === "string" ? enc.encode(key) : key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return crypto.subtle.sign("HMAC", k, enc.encode(msg));
}
const safeEqual = (a, b) => { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; };
const price = env => parseInt(env.PRICE_STARS || "25", 10);
const webhookSecret = async env => hex(await crypto.subtle.digest("SHA-256", enc.encode("webhook:" + env.BOT_TOKEN))).slice(0, 48);

// Mini App'dan kelgan initData imzosini tekshirish (Telegram hujjatidagi algoritm)
async function verifyInitData(initData, token, maxAge = 86400) {
  if (!initData || !token) return null;
  const p = new URLSearchParams(initData), hash = p.get("hash");
  if (!hash) return null;
  p.delete("hash");
  const check = [...p.entries()].map(([k, v]) => `${k}=${v}`).sort().join("\n");
  const secret = await hmac("WebAppData", token);
  if (!safeEqual(hex(await hmac(secret, check)), hash)) return null;
  if (Date.now() / 1000 - parseInt(p.get("auth_date") || "0", 10) > maxAge) return null;
  try { return JSON.parse(p.get("user") || "{}"); } catch { return null; }
}
async function auth(req, env) {
  const init = req.headers.get("X-Init-Data") || "";
  if (env.DEV === "1" && init === "dev") return { id: 1, first_name: "Sinov" };   // faqat lokal sinov
  const u = await verifyInitData(init, env.BOT_TOKEN);
  return u && u.id ? u : null;
}

async function tg(env, method, body) {
  try {
    const r = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const d = await r.json();
    if (!d.ok) console.error(method, d.description);
    return d;
  } catch (e) {                       // tarmoq uzilsa ham webhook yiqilmasin
    console.error(method, String(e));
    return { ok: false, description: String(e) };
  }
}
const invoice = (env, uid) => ({
  title: "Yo'l qoidasi — to'liq versiya",
  description: `Barcha ${QUESTIONS.length} savol, imtihon rejimi va avtodrom — cheksiz.`,
  payload: `full:${uid}`, currency: "XTR", prices: [{ label: "To'liq versiya", amount: price(env) }],
});
function menu(env, origin, u) {
  const rows = [[{ text: "🚗 Avtodrom va test", web_app: { url: origin + "/" } }]];
  if (!u.paid) rows.push([{ text: `⭐ To'liq versiya — ${price(env)} Stars`, callback_data: "buy" }]);
  return { inline_keyboard: rows };
}

// ---------- TELEGRAM BOT (webhook) ----------
async function onUpdate(env, origin, up) {
  if (up.pre_checkout_query) {          // 10 soniya ichida javob kerak — webhook javobining o'zida qaytaramiz
    const q = up.pre_checkout_query, ok = q.invoice_payload === `full:${q.from.id}`;
    return json({ method: "answerPreCheckoutQuery", pre_checkout_query_id: q.id, ok,
      ...(ok ? {} : { error_message: "To'lovni faqat o'zingiz uchun qilishingiz mumkin." }) });
  }
  if (up.callback_query) {
    const c = up.callback_query;
    await tg(env, "answerCallbackQuery", { callback_query_id: c.id });
    if (c.data === "buy") await tg(env, "sendInvoice", { chat_id: c.from.id, ...invoice(env, c.from.id) });
    return new Response("ok");
  }
  const m = up.message;
  if (!m || !m.from) return new Response("ok");
  if (m.successful_payment) {
    const u = await store(env).setPaid(m.from.id, m.successful_payment.telegram_payment_charge_id);
    await tg(env, "sendMessage", { chat_id: m.chat.id, text: "🎉 Rahmat! To'liq versiya ochildi.", reply_markup: menu(env, origin, u) });
    return new Response("ok");
  }
  const text = (m.text || "").trim(), cmd = text.split(/[\s@]/)[0];
  if (cmd === "/start") {
    const u = await store(env).getUser(m.from.id, m.from.first_name || "");
    const status = u.paid ? "✅ To'liq versiya ochilgan." :
      `Bepul: ${FREE_QUESTIONS} ta savol va avtodromda mashq.\nTo'liq versiya: barcha ${QUESTIONS.length} savol va imtihon rejimi.`;
    await tg(env, "sendMessage", { chat_id: m.chat.id, reply_markup: menu(env, origin, u),
      text: `Assalomu alaykum, ${m.from.first_name || ""}! 👋\n🚦 Yo'l qoidasi — biz bilan osonroq!\n\n` +
        `Prava imtihoniga tayyorlaning: avtodromda mashina haydang va testlarni yeching.\n\n${status}` });
  } else if (cmd === "/buy") {
    await tg(env, "sendInvoice", { chat_id: m.chat.id, ...invoice(env, m.from.id) });
  } else if (cmd === "/paysupport") {
    await tg(env, "sendMessage", { chat_id: m.chat.id, text: "To'lov bo'yicha savollar bo'lsa, shu yerga yozing — javob beramiz." });
  }
  return new Response("ok");
}

// Bir marta ochiladi: webhook, menyu tugmasi va buyruqlarni o'rnatadi
async function setup(env, origin) {
  const res = {};
  res.webhook = await tg(env, "setWebhook", { url: origin + "/tg", secret_token: await webhookSecret(env),
    allowed_updates: ["message", "callback_query", "pre_checkout_query"], drop_pending_updates: true });
  res.menu = await tg(env, "setChatMenuButton", { menu_button: { type: "web_app", text: "Ochish", web_app: { url: origin + "/" } } });
  res.commands = await tg(env, "setMyCommands", { commands: [
    { command: "start", description: "Boshlash" }, { command: "buy", description: "To'liq versiyani ochish" },
    { command: "paysupport", description: "To'lov bo'yicha yordam" }] });
  const me = await tg(env, "getMe", {});
  const ok = res.webhook.ok && res.menu.ok && res.commands.ok;
  const body = ok
    ? `✅ Tayyor! Bot ulandi: @${me.result?.username}\nMini App: ${origin}/\n\nTelegram'da botga /start yozing.`
    : `❌ Xato:\n${Object.entries(res).filter(([, v]) => !v.ok).map(([k, v]) => `${k}: ${v.description}`).join("\n")}`;
  return new Response(body, { status: ok ? 200 : 500, headers: { "content-type": "text/plain; charset=utf-8" } });
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url), origin = url.origin;
    if (!env.BOT_TOKEN && env.DEV !== "1")
      return new Response("BOT_TOKEN qo'shilmagan: Cloudflare → Worker → Settings → Variables and Secrets → Add → Secret, nomi BOT_TOKEN.",
        { status: 500, headers: { "content-type": "text/plain; charset=utf-8" } });

    if (url.pathname === "/setup") return setup(env, origin);
    if (url.pathname === "/tg" && req.method === "POST") {
      if (!safeEqual(req.headers.get("X-Telegram-Bot-Api-Secret-Token") || "", await webhookSecret(env))) return new Response("forbidden", { status: 403 });
      return onUpdate(env, origin, await req.json());
    }
    if (url.pathname.startsWith("/api/")) {
      const user = await auth(req, env);
      if (!user) return new Response("initData noto'g'ri", { status: 401 });
      const s = store(env);
      if (url.pathname === "/api/me") return json(await s.getUser(user.id, user.first_name || ""));
      if (url.pathname === "/api/questions") {
        const u = await s.getUser(user.id, user.first_name || "");
        return json({ paid: u.paid, total: QUESTIONS.length, questions: u.paid ? QUESTIONS : QUESTIONS.slice(0, FREE_QUESTIONS) });
      }
      if (url.pathname === "/api/result" && req.method === "POST") {
        const d = await req.json().catch(() => ({}));
        return json(await s.saveResult(user.id, d.kind, parseInt(d.score, 10) || 0, !!d.passed, parseInt(d.time, 10) || 0));
      }
      if (url.pathname === "/api/invoice" && req.method === "POST") {
        const r = await tg(env, "createInvoiceLink", invoice(env, user.id));
        return r.ok ? json({ link: r.result }) : json({ error: r.description }, 502);
      }
      return new Response("not found", { status: 404 });
    }
    return env.ASSETS.fetch(req);
  },
};
