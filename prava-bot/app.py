"""Prava Mashq: Telegram bot + Mini App (avtodrom o'yini va test).

Ishga tushirish: python3 app.py   (sozlamalar .env faylida — README.md ga qarang)
"""
import asyncio
import hashlib
import hmac
import json
import logging
import os
import sqlite3
import time
from pathlib import Path
from urllib.parse import parse_qsl

from aiohttp import web

HERE = Path(__file__).parent


def load_env(path=HERE / ".env"):
    if path.exists():
        for line in path.read_text(encoding="utf-8").splitlines():
            if line.strip() and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip())


load_env()
BOT_TOKEN = os.environ.get("BOT_TOKEN", "")
WEBAPP_URL = os.environ.get("WEBAPP_URL", "")          # https://... (Telegram faqat HTTPS qabul qiladi)
PRICE_STARS = int(os.environ.get("PRICE_STARS", "25"))  # narx Telegram Stars'da
PORT = int(os.environ.get("PORT", "8080"))
DEV = os.environ.get("DEV") == "1"                     # faqat lokal sinov uchun
FREE_QUESTIONS = 10
QUESTIONS = json.loads((HERE / "questions.json").read_text(encoding="utf-8"))

# ---------- MA'LUMOTLAR BAZASI ----------
db = sqlite3.connect(HERE / "users.db", check_same_thread=False)
db.execute("""CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY, name TEXT, paid INTEGER DEFAULT 0, paid_at INTEGER,
    charge_id TEXT, best_test INTEGER DEFAULT 0, best_drive INTEGER)""")
db.commit()


def get_user(uid, name=""):
    row = db.execute("SELECT id, name, paid, best_test, best_drive FROM users WHERE id=?", (uid,)).fetchone()
    if not row:
        db.execute("INSERT INTO users (id, name) VALUES (?, ?)", (uid, name))
        db.commit()
        return {"id": uid, "name": name, "paid": False, "best_test": 0, "best_drive": None}
    return {"id": row[0], "name": row[1], "paid": bool(row[2]), "best_test": row[3], "best_drive": row[4]}


def set_paid(uid, charge_id):
    get_user(uid)
    db.execute("UPDATE users SET paid=1, paid_at=?, charge_id=? WHERE id=?", (int(time.time()), charge_id, uid))
    db.commit()


# ---------- TELEGRAM initData TEKSHIRUVI ----------
def verify_init_data(init_data: str, token: str, max_age=86400):
    """Mini App'dan kelgan initData'ni tekshiradi. To'g'ri bo'lsa foydalanuvchi dict'ini qaytaradi."""
    if not init_data or not token:
        return None
    pairs = dict(parse_qsl(init_data, keep_blank_values=True))
    received = pairs.pop("hash", None)
    if not received:
        return None
    check = "\n".join(f"{k}={v}" for k, v in sorted(pairs.items()))
    secret = hmac.new(b"WebAppData", token.encode(), hashlib.sha256).digest()
    expected = hmac.new(secret, check.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, received):
        return None
    if time.time() - int(pairs.get("auth_date", 0)) > max_age:
        return None
    try:
        return json.loads(pairs.get("user", "{}"))
    except ValueError:
        return None


def auth(request):
    init = request.headers.get("X-Init-Data", "")
    if DEV and init == "dev":
        return {"id": 1, "first_name": "Sinov"}
    user = verify_init_data(init, BOT_TOKEN)
    if not user or "id" not in user:
        raise web.HTTPUnauthorized(text="initData noto'g'ri")
    return user


# ---------- MINI APP API ----------
async def api_me(request):
    tg = auth(request)
    return web.json_response(get_user(tg["id"], tg.get("first_name", "")))


async def api_questions(request):
    tg = auth(request)
    u = get_user(tg["id"], tg.get("first_name", ""))
    qs = QUESTIONS if u["paid"] else QUESTIONS[:FREE_QUESTIONS]
    return web.json_response({"paid": u["paid"], "total": len(QUESTIONS), "questions": qs})


async def api_result(request):
    tg = auth(request)
    u = get_user(tg["id"])
    data = await request.json()
    if data.get("kind") == "test" and u["paid"]:
        db.execute("UPDATE users SET best_test=MAX(best_test, ?) WHERE id=?", (int(data.get("score", 0)), u["id"]))
    elif data.get("kind") == "drive" and data.get("passed"):
        t = int(data.get("time", 0))
        db.execute("UPDATE users SET best_drive=CASE WHEN best_drive IS NULL OR best_drive>? THEN ? ELSE best_drive END WHERE id=?",
                   (t, t, u["id"]))
    db.commit()
    return web.json_response(get_user(u["id"]))


async def api_invoice(request):
    tg = auth(request)
    link = await request.app["bot"].create_invoice_link(**invoice_args(tg["id"]))
    return web.json_response({"link": link})


def invoice_args(uid):
    from aiogram.types import LabeledPrice
    return dict(title="Prava Mashq — to'liq versiya",
                description=f"Barcha {len(QUESTIONS)} savol, imtihon rejimi va avtodrom — cheksiz.",
                payload=f"full:{uid}", currency="XTR",
                prices=[LabeledPrice(label="To'liq versiya", amount=PRICE_STARS)])


def make_web(bot=None):
    app = web.Application()
    app["bot"] = bot
    app.router.add_get("/api/me", api_me)
    app.router.add_get("/api/questions", api_questions)
    app.router.add_post("/api/result", api_result)
    app.router.add_post("/api/invoice", api_invoice)
    app.router.add_get("/", lambda r: web.FileResponse(HERE / "webapp" / "index.html"))
    app.router.add_static("/", HERE / "webapp")
    return app


# ---------- TELEGRAM BOT ----------
def make_bot():
    from aiogram import Bot, Dispatcher, F
    from aiogram.filters import CommandStart, Command
    from aiogram.types import (InlineKeyboardButton, InlineKeyboardMarkup, Message,
                               PreCheckoutQuery, WebAppInfo)

    bot, dp = Bot(BOT_TOKEN), Dispatcher()

    def menu(uid):
        u = get_user(uid)
        rows = [[InlineKeyboardButton(text="🚗 Avtodrom va test", web_app=WebAppInfo(url=WEBAPP_URL))]]
        if not u["paid"]:
            rows.append([InlineKeyboardButton(text=f"⭐ To'liq versiya — {PRICE_STARS} Stars", callback_data="buy")])
        return InlineKeyboardMarkup(inline_keyboard=rows)

    @dp.message(CommandStart())
    async def start(m: Message):
        u = get_user(m.from_user.id, m.from_user.first_name)
        status = "✅ To'liq versiya ochilgan." if u["paid"] else (
            f"Bepul: {FREE_QUESTIONS} ta savol va avtodromda mashq.\n"
            f"To'liq versiya: barcha {len(QUESTIONS)} savol va imtihon rejimi.")
        await m.answer(f"Assalomu alaykum, {m.from_user.first_name}! 👋\n\n"
                       "Prava imtihoniga tayyorlaning: avtodromda mashina haydang va testlarni yeching.\n\n"
                       f"{status}", reply_markup=menu(m.from_user.id))

    @dp.callback_query(F.data == "buy")
    async def buy(c):
        await c.answer()
        await bot.send_invoice(chat_id=c.from_user.id, **invoice_args(c.from_user.id))

    @dp.message(Command("buy"))
    async def buy_cmd(m: Message):
        await bot.send_invoice(chat_id=m.chat.id, **invoice_args(m.from_user.id))

    @dp.pre_checkout_query()
    async def pre_checkout(q: PreCheckoutQuery):
        await q.answer(ok=q.invoice_payload == f"full:{q.from_user.id}",
                       error_message="To'lovni faqat o'zingiz uchun qilishingiz mumkin.")

    @dp.message(F.successful_payment)
    async def paid(m: Message):
        set_paid(m.from_user.id, m.successful_payment.telegram_payment_charge_id)
        await m.answer("🎉 Rahmat! To'liq versiya ochildi.", reply_markup=menu(m.from_user.id))

    @dp.message(Command("paysupport"))
    async def support(m: Message):
        await m.answer("To'lov bo'yicha savollar bo'lsa, shu yerga yozing — javob beramiz.")

    return bot, dp


async def main():
    logging.basicConfig(level=logging.INFO)
    bot = dp = None
    if BOT_TOKEN:
        bot, dp = make_bot()
    elif not DEV:
        raise SystemExit("BOT_TOKEN topilmadi. .env faylini to'ldiring (README.md).")
    runner = web.AppRunner(make_web(bot))
    await runner.setup()
    await web.TCPSite(runner, "0.0.0.0", PORT).start()
    logging.info("Mini App serveri: http://localhost:%s", PORT)
    if dp:
        await dp.start_polling(bot)
    else:
        await asyncio.Event().wait()


if __name__ == "__main__":
    asyncio.run(main())
