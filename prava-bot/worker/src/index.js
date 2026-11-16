// "Yo'l qoidasi | Biz bilan osonroq" — Cloudflare Worker.
// Bir joyda: Telegram bot (webhook), Mini App API, admin panel API va foydalanuvchilar bazasi (Durable Object, SQLite).
// Mini App fayllarini (../webapp) Cloudflare o'zi beradi — wrangler.toml dagi [assets].
import { DurableObject } from "cloudflare:workers";
import QUESTIONS from "../../questions.json";

const FREE_QUESTIONS = 10;
const BATCH = 25;                     // ommaviy xabar: bitta alarm'da nechta xabar (bepul tarif: 50 ta tashqi so'rov)
// Yangi alifbo (ö, ğ, ş, ç): bot xabarlari shu alifboda yuboriladi (Mini App'dagi standart bilan bir xil)
const ab = t => t.replace(/O[ʻ‘’']/g, "Ö").replace(/o[ʻ‘’']/g, "ö").replace(/G[ʻ‘’']/g, "Ğ").replace(/g[ʻ‘’']/g, "ğ")
  .replace(/SH/g, "Ş").replace(/S[hH]/g, "Ş").replace(/sh/g, "ş").replace(/CH/g, "Ç").replace(/C[hH]/g, "Ç").replace(/ch/g, "ç");
const enc = new TextEncoder();
const now = () => Math.floor(Date.now() / 1000);

// ---------- BAZA ----------
export class Store extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.env = env;
    this.sql = ctx.storage.sql;
    this.sql.exec(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY, name TEXT, paid INTEGER DEFAULT 0, paid_at INTEGER,
      charge_id TEXT, best_test INTEGER DEFAULT 0, best_drive INTEGER)`);
    // yangi ustunlar (eski bazaga ham qo'shiladi)
    for (const col of ["created_at INTEGER", "last_seen INTEGER", "paid_amount INTEGER", "username TEXT", "gift INTEGER DEFAULT 0", "blocked INTEGER DEFAULT 0", "banned INTEGER DEFAULT 0"])
      try { this.sql.exec(`ALTER TABLE users ADD COLUMN ${col}`); } catch (e) { /* allaqachon bor */ }
    this.sql.exec(`CREATE TABLE IF NOT EXISTS payments (charge_id TEXT PRIMARY KEY, user_id INTEGER, amount INTEGER, at INTEGER, refunded INTEGER DEFAULT 0)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS settings (k TEXT PRIMARY KEY, v TEXT)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS audit (id INTEGER PRIMARY KEY, at INTEGER, admin INTEGER, action TEXT, target INTEGER, info TEXT)`);
    this.hits = new Map();             // so'rovlar chastotasi (xotirada; Durable Object bitta nusxa bo'lgani uchun ishonchli)
    this.sql.exec(`CREATE TABLE IF NOT EXISTS broadcast (id INTEGER PRIMARY KEY, text TEXT, cursor INTEGER DEFAULT 0, sent INTEGER DEFAULT 0, failed INTEGER DEFAULT 0, total INTEGER, started INTEGER, done INTEGER DEFAULT 0)`);
  }
  row(r) { return { id: r.id, name: r.name, paid: !!r.paid, best_test: r.best_test, best_drive: r.best_drive, banned: !!r.banned }; }
  // key bo'yicha "win" soniya ichida "limit" tadan ko'p so'rov bo'lsa — false
  hit(key, limit, win = 60) {
    const t = Date.now(), arr = (this.hits.get(key) || []).filter(x => t - x < win * 1000);
    if (arr.length >= limit) { this.hits.set(key, arr); return false; }
    arr.push(t); this.hits.set(key, arr);
    if (this.hits.size > 20000) for (const [k, v] of this.hits) if (!v.length || t - v[v.length - 1] > win * 1000) this.hits.delete(k);
    return true;
  }
  getUser(id, name = "", username = "") {
    name = String(name || "").slice(0, 64); username = String(username || "").slice(0, 64);
    const r = this.sql.exec("SELECT id, name, paid, best_test, best_drive, banned FROM users WHERE id = ?", id).toArray()[0];
    if (!r) {
      this.sql.exec("INSERT INTO users (id, name, username, created_at, last_seen) VALUES (?, ?, ?, ?, ?)", id, name, username, now(), now());
      return { id, name, paid: false, best_test: 0, best_drive: null, banned: false };
    }
    this.sql.exec("UPDATE users SET last_seen = ?, name = COALESCE(NULLIF(?, ''), name), username = COALESCE(NULLIF(?, ''), username) WHERE id = ?", now(), name, username, id);
    return this.row(r);
  }
  setPaid(id, chargeId, amount = 0) {
    this.getUser(id);
    this.sql.exec("UPDATE users SET paid = 1, paid_at = ?, charge_id = ?, paid_amount = ?, gift = 0 WHERE id = ?", now(), chargeId, amount, id);
    if (chargeId) this.sql.exec("INSERT OR IGNORE INTO payments (charge_id, user_id, amount, at) VALUES (?, ?, ?, ?)", chargeId, id, amount, now());
    return this.getUser(id);
  }
  saveResult(id, kind, score, passed, time, access) {
    const u = this.getUser(id);
    if (kind === "test" && (u.paid || access)) this.sql.exec("UPDATE users SET best_test = MAX(best_test, ?) WHERE id = ?", score, id);
    else if (kind === "drive" && passed)
      this.sql.exec("UPDATE users SET best_drive = CASE WHEN best_drive IS NULL OR best_drive > ? THEN ? ELSE best_drive END WHERE id = ?", time, time, id);
    return this.getUser(id);
  }
  // --- sozlamalar ---
  getSetting(k) { return this.sql.exec("SELECT v FROM settings WHERE k = ?", k).toArray()[0]?.v ?? null; }
  setSetting(k, v) { this.sql.exec("INSERT INTO settings (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v", k, String(v)); return true; }
  // --- admin: statistika ---
  stats() {
    const one = (q, ...a) => this.sql.exec(q, ...a).toArray()[0] || {};
    const d1 = now() - 86400, d7 = now() - 7 * 86400;
    return {
      users: one("SELECT COUNT(*) n FROM users").n,
      paid: one("SELECT COUNT(*) n FROM users WHERE paid = 1 AND gift = 0").n,
      gift: one("SELECT COUNT(*) n FROM users WHERE paid = 1 AND gift = 1").n,
      new1: one("SELECT COUNT(*) n FROM users WHERE created_at >= ?", d1).n,
      new7: one("SELECT COUNT(*) n FROM users WHERE created_at >= ?", d7).n,
      active1: one("SELECT COUNT(*) n FROM users WHERE last_seen >= ?", d1).n,
      active7: one("SELECT COUNT(*) n FROM users WHERE last_seen >= ?", d7).n,
      stars: one("SELECT COALESCE(SUM(amount), 0) s FROM payments WHERE refunded = 0").s,
      stars7: one("SELECT COALESCE(SUM(amount), 0) s FROM payments WHERE refunded = 0 AND at >= ?", d7).s,
      pays7: one("SELECT COUNT(*) n FROM payments WHERE refunded = 0 AND at >= ?", d7).n,
      refunds: one("SELECT COUNT(*) n FROM payments WHERE refunded = 1").n,
      drivers: one("SELECT COUNT(*) n FROM users WHERE best_drive IS NOT NULL").n,
      avgTest: one("SELECT ROUND(AVG(best_test), 1) a FROM users WHERE best_test > 0").a,
      blocked: one("SELECT COUNT(*) n FROM users WHERE blocked = 1").n,
      banned: one("SELECT COUNT(*) n FROM users WHERE banned = 1").n,
      price: this.getSetting("price"),
      broadcast: this.sql.exec("SELECT id, sent, failed, total, done, started FROM broadcast ORDER BY id DESC LIMIT 1").toArray()[0] || null,
    };
  }
  users(q = "", offset = 0, filter = "") {
    const like = `%${q}%`, w = [];
    const args = [];
    if (q) { w.push("(name LIKE ? OR username LIKE ? OR CAST(id AS TEXT) LIKE ?)"); args.push(like, like, like); }
    if (filter === "paid") w.push("paid = 1 AND gift = 0"); if (filter === "gift") w.push("paid = 1 AND gift = 1"); if (filter === "free") w.push("paid = 0"); if (filter === "banned") w.push("banned = 1");
    const where = w.length ? "WHERE " + w.join(" AND ") : "";
    const total = this.sql.exec(`SELECT COUNT(*) n FROM users ${where}`, ...args).toArray()[0].n;
    const rows = this.sql.exec(`SELECT id, name, username, paid, gift, paid_at, paid_amount, charge_id, best_test, best_drive, created_at, last_seen, blocked, banned
      FROM users ${where} ORDER BY COALESCE(last_seen, created_at, 0) DESC LIMIT 30 OFFSET ?`, ...args, offset).toArray();
    return { total, rows };
  }
  grant(id, on) {
    this.getUser(id);
    if (on) this.sql.exec("UPDATE users SET paid = 1, gift = 1, paid_at = ? WHERE id = ?", now(), id);
    else this.sql.exec("UPDATE users SET paid = 0, gift = 0 WHERE id = ?", id);
    return this.sql.exec("SELECT id, paid, gift FROM users WHERE id = ?", id).toArray()[0];
  }
  ban(id, on) { this.getUser(id); this.sql.exec("UPDATE users SET banned = ? WHERE id = ?", on ? 1 : 0, id); return { id, banned: !!on }; }
  isBanned(id) { return !!this.sql.exec("SELECT banned FROM users WHERE id = ?", id).toArray()[0]?.banned; }
  log(admin, action, target = null, info = "") {
    this.sql.exec("INSERT INTO audit (at, admin, action, target, info) VALUES (?, ?, ?, ?, ?)", now(), admin, action, target, String(info).slice(0, 200));
    this.sql.exec("DELETE FROM audit WHERE id <= (SELECT MAX(id) - 500 FROM audit)");
  }
  auditList() { return this.sql.exec("SELECT at, admin, action, target, info FROM audit ORDER BY id DESC LIMIT 30").toArray(); }
  chargeOf(id) { return this.sql.exec("SELECT charge_id, paid_amount FROM users WHERE id = ?", id).toArray()[0] || null; }
  markRefunded(id, chargeId) {
    this.sql.exec("UPDATE users SET paid = 0, gift = 0 WHERE id = ?", id);
    this.sql.exec("UPDATE payments SET refunded = 1 WHERE charge_id = ?", chargeId); return true;
  }
  // --- ommaviy xabar: partiyalab, Durable Object alarm orqali ---
  async startBroadcast(text) {
    const cur = this.sql.exec("SELECT id FROM broadcast WHERE done = 0").toArray()[0];
    if (cur) return { error: "Oldingi xabar hali yuborilmoqda" };
    const total = this.sql.exec("SELECT COUNT(*) n FROM users WHERE blocked = 0 AND banned = 0").toArray()[0].n;
    this.sql.exec("INSERT INTO broadcast (text, total, started) VALUES (?, ?, ?)", text, total, now());
    await this.ctx.storage.setAlarm(Date.now() + 500);
    return { ok: true, total };
  }
  async alarm() {
    const b = this.sql.exec("SELECT * FROM broadcast WHERE done = 0 ORDER BY id LIMIT 1").toArray()[0];
    if (!b) return;
    const list = this.sql.exec("SELECT id FROM users WHERE blocked = 0 AND banned = 0 AND id > ? ORDER BY id LIMIT ?", b.cursor, BATCH).toArray();
    let sent = 0, failed = 0, last = b.cursor;
    for (const u of list) {
      const r = await tg(this.env, "sendMessage", { chat_id: u.id, text: b.text, disable_web_page_preview: true });
      if (r.ok) sent++; else { failed++; if (r.error_code === 403) this.sql.exec("UPDATE users SET blocked = 1 WHERE id = ?", u.id); }
      last = u.id;
    }
    const done = list.length < BATCH ? 1 : 0;
    this.sql.exec("UPDATE broadcast SET cursor = ?, sent = sent + ?, failed = failed + ?, done = ? WHERE id = ?", last, sent, failed, done, b.id);
    if (!done) await this.ctx.storage.setAlarm(Date.now() + 1500);
  }
}
const store = env => env.STORE.get(env.STORE.idFromName("main"));

// ---------- YORDAMCHILAR ----------
// Xavfsizlik sarlavhalari: brauzer faylni boshqa turda talqin qilmasin, sahifani faqat Telegram ichiga joylash mumkin bo'lsin
const SEC = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Strict-Transport-Security": "max-age=31536000",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
  "Content-Security-Policy": "frame-ancestors 'self' https://web.telegram.org https://*.telegram.org; object-src 'none'; base-uri 'self'",
};
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...SEC } });
const text = (t, status = 200) => new Response(t, { status, headers: { "content-type": "text/plain; charset=utf-8", ...SEC } });
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
async function hmac(key, msg) {
  const k = await crypto.subtle.importKey("raw", typeof key === "string" ? enc.encode(key) : key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return crypto.subtle.sign("HMAC", k, enc.encode(msg));
}
const safeEqual = (a, b) => { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; };
async function price(env) { const p = parseInt(await store(env).getSetting("price"), 10); return p > 0 ? p : parseInt(env.PRICE_STARS || "25", 10); }
// To'lov rejimi (admin panelda): "required" — to'liq versiya pullik; "optional" — hammasi bepul, to'lov ixtiyoriy (qo'llab-quvvatlash)
async function payMode(env) { return (await store(env).getSetting("paymode")) === "optional" ? "optional" : "required"; }
const webhookSecret = async env => hex(await crypto.subtle.digest("SHA-256", enc.encode("webhook:" + env.BOT_TOKEN))).slice(0, 48);
// Adminlar: Cloudflare'da ADMIN_IDS (Telegram ID'lar, vergul bilan)
const isAdmin = (env, id) => String(env.ADMIN_IDS || "").split(/[\s,]+/).filter(Boolean).includes(String(id)) || (env.DEV === "1" && id === 1);

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
const invoice = async (env, uid) => (await payMode(env)) === "optional" ? {
  title: ab("Loyihani qo'llab-quvvatlash"),
  description: ab("Bot bepul. Xohlasangiz, loyihani rivojlantirishga hissa qo'shing — rahmat!"),
  payload: `full:${uid}`, currency: "XTR", prices: [{ label: ab("Qo'llab-quvvatlash"), amount: await price(env) }],
} : {
  title: ab("Yo'l qoidasi — to'liq versiya"),
  description: ab(`Barcha ${QUESTIONS.length} savol, imtihon rejimi, 3D vaziyatlar va avtodrom — cheksiz.`),
  payload: `full:${uid}`, currency: "XTR", prices: [{ label: ab("To'liq versiya"), amount: await price(env) }],
};
async function menu(env, origin, u) {
  const rows = [[{ text: "🚗 Avtodrom va test", web_app: { url: origin + "/" } }]];
  const mode = await payMode(env), p = await price(env);
  if (mode === "optional") rows.push([{ text: ab(`⭐ Qo'llab-quvvatlash — ${p}`) + " Stars", callback_data: "buy" }]);
  else if (!u.paid) rows.push([{ text: ab(`⭐ To'liq versiya — ${p}`) + " Stars", callback_data: "buy" }]);
  return { inline_keyboard: rows };
}

// ---------- TELEGRAM BOT (webhook) ----------
async function onUpdate(env, origin, up) {
  if (up.pre_checkout_query) {          // 10 soniya ichida javob kerak — webhook javobining o'zida qaytaramiz
    const q = up.pre_checkout_query, p = await price(env);
    let err = "";
    if (q.invoice_payload !== `full:${q.from.id}`) err = "To'lovni faqat o'zingiz uchun qilishingiz mumkin.";
    else if (q.currency !== "XTR" || q.total_amount !== p) err = "Narx o'zgargan. Iltimos, to'lov tugmasini qaytadan bosing.";
    return json({ method: "answerPreCheckoutQuery", pre_checkout_query_id: q.id, ok: !err, ...(err ? { error_message: ab(err) } : {}) });
  }
  const from = up.callback_query?.from || up.message?.from;
  // to'lov xabaridan boshqa hamma narsa: bloklanganlar va juda tez yozuvchilar (spam) e'tiborsiz qoldiriladi
  if (from && !up.message?.successful_payment) {
    const s = store(env);
    if (!(await s.hit("bot:" + from.id, 20, 60)) || (await s.isBanned(from.id))) return new Response("ok");
  }
  if (up.callback_query) {
    const c = up.callback_query;
    await tg(env, "answerCallbackQuery", { callback_query_id: c.id });
    if (c.data === "buy") await tg(env, "sendInvoice", { chat_id: c.from.id, ...(await invoice(env, c.from.id)) });
    return new Response("ok");
  }
  const m = up.message;
  if (!m || !m.from) return new Response("ok");
  if (m.successful_payment) {
    const sp = m.successful_payment;
    if (sp.currency !== "XTR" || sp.invoice_payload !== `full:${m.from.id}`) { console.error("shubhali to'lov", JSON.stringify(sp)); return new Response("ok"); }
    const u = await store(env).setPaid(m.from.id, sp.telegram_payment_charge_id, sp.total_amount || 0);
    const thanks = (await payMode(env)) === "optional" ? "🎉 Katta rahmat! Qo'llab-quvvatlaganingiz uchun minnatdormiz." : "🎉 Rahmat! To'liq versiya ochildi.";
    await tg(env, "sendMessage", { chat_id: m.chat.id, text: ab(thanks), reply_markup: await menu(env, origin, u) });
    // adminlarga xabar
    for (const a of String(env.ADMIN_IDS || "").split(/[\s,]+/).filter(Boolean))
      await tg(env, "sendMessage", { chat_id: a, text: `💰 Yangi to'lov: ${sp.total_amount} ⭐ — ${m.from.first_name || ""} (${m.from.id})` });
    return new Response("ok");
  }
  const text = (m.text || "").trim(), cmd = text.split(/[\s@]/)[0];
  if (cmd === "/start") {
    const u = await store(env).getUser(m.from.id, m.from.first_name || "", m.from.username || "");
    const status = (await payMode(env)) === "optional" ? "✅ Barcha bo'limlar bepul ochiq." : u.paid ? "✅ To'liq versiya ochilgan." :
      `Bepul: ${FREE_QUESTIONS} ta savol va avtodromda mashq.\nTo'liq versiya: barcha ${QUESTIONS.length} savol va imtihon rejimi.`;
    await tg(env, "sendMessage", { chat_id: m.chat.id, reply_markup: await menu(env, origin, u),
      text: `Assalomu alaykum, ${m.from.first_name || ""}! 👋\n` + ab(`🚦 Yo'l qoidasi — biz bilan osonroq!\n\n` +
        `Prava imtihoniga tayyorlaning: avtodromda mashina haydang va testlarni yeching.\n\n${status}`) });
  } else if (cmd === "/buy") {
    await tg(env, "sendInvoice", { chat_id: m.chat.id, ...(await invoice(env, m.from.id)) });
  } else if (cmd === "/paysupport") {
    await tg(env, "sendMessage", { chat_id: m.chat.id, text: ab("To'lov bo'yicha savollar bo'lsa, shu yerga yozing — javob beramiz.") });
  } else if (cmd === "/myid") {
    await tg(env, "sendMessage", { chat_id: m.chat.id, text: `Sizning Telegram ID: ${m.from.id}` });
  } else if (cmd === "/admin") {
    if (isAdmin(env, m.from.id)) await tg(env, "sendMessage", { chat_id: m.chat.id, text: "🛠 Admin panel", reply_markup: { inline_keyboard: [[{ text: "🛠 Admin panelni ochish", web_app: { url: origin + "/#admin" } }]] } });
    else await tg(env, "sendMessage", { chat_id: m.chat.id, text: `Siz admin emassiz. ID: ${m.from.id}` });
  }
  return new Response("ok");
}

// Bir marta ochiladi: webhook, menyu tugmasi va buyruqlarni o'rnatadi
async function setup(env, origin) {
  const res = {};
  // Begona odam /setup ni ochsa ham zarar yo'q: hammasi shu Worker manziliga o'rnatiladi, kutilayotgan xabarlar o'chirilmaydi
  res.webhook = await tg(env, "setWebhook", { url: origin + "/tg", secret_token: await webhookSecret(env),
    allowed_updates: ["message", "callback_query", "pre_checkout_query"], drop_pending_updates: false, max_connections: 40 });
  res.menu = await tg(env, "setChatMenuButton", { menu_button: { type: "web_app", text: ab("Ochish"), web_app: { url: origin + "/" } } });
  res.commands = await tg(env, "setMyCommands", { commands: [
    { command: "start", description: ab("Boshlash") }, { command: "buy", description: ab("To'liq versiyani ochish") },
    { command: "paysupport", description: ab("To'lov bo'yicha yordam") }] });
  const me = await tg(env, "getMe", {});
  const ok = res.webhook.ok && res.menu.ok && res.commands.ok;
  const body = ok
    ? `✅ Tayyor! Bot ulandi: @${me.result?.username}\nMini App: ${origin}/\n\nTelegram'da botga /start yozing.`
    : `❌ Xato:\n${Object.entries(res).filter(([, v]) => !v.ok).map(([k, v]) => `${k}: ${v.description}`).join("\n")}`;
  return text(body, ok ? 200 : 500);
}

// ---------- ADMIN API ----------
async function adminApi(req, env, url, admin) {
  const s = store(env), p = url.pathname.slice("/api/admin/".length), body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
  const log = (action, target, info) => s.log(admin.id, action, target, info);
  if (p === "stats") return json({ ...(await s.stats()), price: await price(env), paymode: await payMode(env), questions: QUESTIONS.length });
  if (p === "audit") return json(await s.auditList());
  if (p === "paymode" && req.method === "POST") {
    const m = body.mode === "optional" ? "optional" : "required";
    await s.setSetting("paymode", m); await log("paymode", null, m); return json({ ok: true, paymode: m });
  }
  if (p === "ban" && req.method === "POST") {
    const id = parseInt(body.id, 10); if (!id) return json({ error: "ID noto'g'ri" }, 400);
    if (isAdmin(env, id)) return json({ error: "Adminni bloklab bo'lmaydi" }, 400);
    const r = await s.ban(id, !!body.on); await log(body.on ? "ban" : "unban", id); return json(r);
  }
  if (p === "users") return json(await s.users((url.searchParams.get("q") || "").slice(0, 60), Math.max(0, Math.min(1e6, parseInt(url.searchParams.get("o") || "0", 10) || 0)), String(url.searchParams.get("f") || "").slice(0, 10)));
  if (p === "grant" && req.method === "POST") {
    const id = parseInt(body.id, 10); if (!id) return json({ error: "ID noto'g'ri" }, 400);
    const r = await s.grant(id, !!body.on); await log(body.on ? "gift" : "ungift", id);
    if (body.notify && body.on) await tg(env, "sendMessage", { chat_id: id, text: ab("🎁 Sizga to'liq versiya sovg'a qilindi! Ilovani oching.") });
    return json(r);
  }
  if (p === "refund" && req.method === "POST") {
    const id = parseInt(body.id, 10), c = await s.chargeOf(id);
    if (!c || !c.charge_id) return json({ error: "Bu foydalanuvchida Stars to'lovi yo'q" }, 400);
    const r = await tg(env, "refundStarPayment", { user_id: id, telegram_payment_charge_id: c.charge_id });
    if (!r.ok) return json({ error: r.description || "Telegram xatosi" }, 502);
    await s.markRefunded(id, c.charge_id); await log("refund", id, `${c.paid_amount || 0} ⭐`); return json({ ok: true });
  }
  if (p === "price" && req.method === "POST") {
    const v = parseInt(body.price, 10); if (!(v >= 1 && v <= 10000)) return json({ error: "Narx 1–10000 Stars oralig'ida bo'lsin" }, 400);
    await s.setSetting("price", v); await log("price", null, v); return json({ ok: true, price: v });
  }
  if (p === "broadcast" && req.method === "POST") {
    const t = String(body.text || "").trim(); if (!t || t.length > 3500) return json({ error: "Matn 1–3500 belgi bo'lsin" }, 400);
    const r = await s.startBroadcast(t); if (r.ok) await log("broadcast", null, t.slice(0, 80)); return json(r);
  }
  if (p === "message" && req.method === "POST") {
    const id = parseInt(body.id, 10), t = String(body.text || "").trim(); if (!id || !t || t.length > 4000) return json({ error: "ID va matn (4000 belgigacha) kerak" }, 400);
    const r = await tg(env, "sendMessage", { chat_id: id, text: t }); if (r.ok) await log("message", id, t.slice(0, 80));
    return r.ok ? json({ ok: true }) : json({ error: r.description }, 502);
  }
  return new Response("not found", { status: 404 });
}

export default {
  async fetch(req, env) {
    try { return await route(req, env); }
    catch (e) { console.error("xato", e && e.stack || String(e)); return text("Server xatosi", 500); }   // ichki tafsilotlar tashqariga chiqmaydi
  },
};

async function route(req, env) {
    const url = new URL(req.url), origin = url.origin;
    if (!env.BOT_TOKEN && env.DEV !== "1")
      return text("BOT_TOKEN qo'shilmagan: Cloudflare → Worker → Settings → Variables and Secrets → Add → Secret, nomi BOT_TOKEN.", 500);

    if (url.pathname === "/setup") {
      if (!(await store(env).hit("setup", 5, 600))) return text("Juda ko'p urinish. 10 daqiqadan keyin qayta oching.", 429);
      return setup(env, origin);
    }
    if (url.pathname === "/tg") {
      if (req.method !== "POST") return text("method", 405);
      if (!safeEqual(req.headers.get("X-Telegram-Bot-Api-Secret-Token") || "", await webhookSecret(env))) return text("forbidden", 403);
      return onUpdate(env, origin, await req.json());
    }
    if (url.pathname.startsWith("/api/")) {
      const user = await auth(req, env);
      if (!user) return json({ error: "initData noto'g'ri" }, 401);
      const s = store(env);
      if (!(await s.hit("api:" + user.id, 120, 60))) return json({ error: "Juda ko'p so'rov. Bir daqiqadan keyin urinib ko'ring." }, 429);
      if (url.pathname.startsWith("/api/admin/")) return isAdmin(env, user.id) ? adminApi(req, env, url, user) : json({ error: "forbidden" }, 403);
      const u = await s.getUser(user.id, user.first_name || "", user.username || "");
      if (u.banned) return json({ error: "Hisobingiz bloklangan" }, 403);
      const mode = await payMode(env), access = u.paid || mode === "optional";
      if (url.pathname === "/api/me") return json({ ...u, paid: access, donor: u.paid, paymode: mode, admin: isAdmin(env, user.id), price: await price(env) });
      if (url.pathname === "/api/questions")
        return json({ paid: access, total: QUESTIONS.length, questions: access ? QUESTIONS : QUESTIONS.slice(0, FREE_QUESTIONS) });
      if (url.pathname === "/api/result" && req.method === "POST") {
        const d = await req.json().catch(() => ({}));
        // natijalar chegarasi: test 0–20 ball, avtodrom 30 soniya – 15 daqiqa
        const kind = d.kind === "drive" ? "drive" : d.kind === "test" ? "test" : null;
        if (!kind) return json({ error: "kind" }, 400);
        const score = Math.max(0, Math.min(20, parseInt(d.score, 10) || 0)), time = parseInt(d.time, 10) || 0;
        const passed = !!d.passed && (kind !== "drive" || (time >= 30 && time <= 900));
        const r = await s.saveResult(user.id, kind, score, passed, time, access);
        return json({ ...r, paid: access, donor: r.paid, paymode: mode, admin: isAdmin(env, user.id) });
      }
      if (url.pathname === "/api/invoice" && req.method === "POST") {
        if (!(await s.hit("inv:" + user.id, 10, 600))) return json({ error: "Juda ko'p urinish" }, 429);
        const r = await tg(env, "createInvoiceLink", await invoice(env, user.id));
        return r.ok ? json({ link: r.result }) : json({ error: r.description }, 502);
      }
      return json({ error: "not found" }, 404);
    }
    const res = await env.ASSETS.fetch(req), h = new Headers(res.headers);
    for (const [k, v] of Object.entries(SEC)) h.set(k, v);
    return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h });
}
