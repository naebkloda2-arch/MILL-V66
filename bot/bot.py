import asyncio
import random
import sqlite3
import time

from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import Command
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.fsm.storage.memory import MemoryStorage
from aiogram.utils.keyboard import ReplyKeyboardBuilder

# ── КОНФИГ ────────────────────────────────────────────────────────────────
TOKEN = "8747144008:AAEnA-DgzZwDOoWMxP0g3GZJ-Wk6gLc-cKw"

# Тот же файл, что открывает Node (Core/Database/DB.js).
# Бот лежит внутри проекта (MILL-V66/bot/bot.py), поэтому путь -
# на уровень выше и в Files/database. Если переносишь бота отдельно -
# задай переменную окружения MILL_DB_PATH одинаково для Node и бота.
import os
DB_PATH = os.environ.get(
    "MILL_DB_PATH",
    os.path.join(os.path.dirname(__file__), "..", "Files", "database", "plr.db"),
)

# Base32-алфавит игровых тегов — идентичен Core/Database/DB.js
BASE32 = "0289PYLQGRJCUV"

CODE_TTL_SECONDS = 5 * 60  # 5 минут на ввод кода

# Скин "Волшебник Барли" — выдаётся в награду за успешную привязку.
WIZARD_BARLEY_SKIN_ID = 59

bot = Bot(token=TOKEN)
dp = Dispatcher(storage=MemoryStorage())


class LinkStates(StatesGroup):
    waiting_for_tag = State()
    waiting_for_code = State()


# ── БД helpers ───────────────────────────────────────────────────────────

def db_connect():
    conn = sqlite3.connect(DB_PATH, timeout=20)
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA busy_timeout=5000;")
    return conn


def tag_to_low_id(tag: str) -> int:
    clean = tag.upper().lstrip("#").strip()
    low_id = 0
    for ch in clean:
        idx = BASE32.find(ch)
        if idx == -1:
            raise ValueError(f"Недопустимый символ в теге: {ch}")
        low_id = low_id * len(BASE32) + idx
    return low_id


def get_player_by_low_id(low_id: int):
    conn = db_connect()
    try:
        cur = conn.cursor()
        cur.execute("SELECT lowId, tag, name, gold, gems, trophies FROM players WHERE lowId=?", (low_id,))
        return cur.fetchone()
    finally:
        conn.close()


def get_link_for_telegram_user(telegram_user_id: int):
    conn = db_connect()
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT low_id FROM telegram_links WHERE telegram_user_id=? AND linked=1",
            (telegram_user_id,),
        )
        return cur.fetchone()
    finally:
        conn.close()


def is_account_already_linked(low_id: int) -> bool:
    conn = db_connect()
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT telegram_user_id FROM telegram_links WHERE low_id=? AND linked=1",
            (low_id,),
        )
        return cur.fetchone() is not None
    finally:
        conn.close()


def start_link_request(telegram_user_id: int, low_id: int, code: str):
    conn = db_connect()
    try:
        cur = conn.cursor()
        expiry = int(time.time()) + CODE_TTL_SECONDS
        cur.execute(
            """
            INSERT INTO telegram_links (telegram_user_id, low_id, pending_code, code_expiry, linked)
            VALUES (?, ?, ?, ?, 0)
            ON CONFLICT(telegram_user_id) DO UPDATE SET
                low_id=excluded.low_id,
                pending_code=excluded.pending_code,
                code_expiry=excluded.code_expiry,
                linked=0
            """,
            (telegram_user_id, low_id, code, expiry),
        )
        conn.commit()
    finally:
        conn.close()


def push_notification(low_id: int, text: str, skin_id: int | None = None):
    """Кладём сообщение в очередь входящих — сервер (Node) заберёт его
    и покажет игроку в игре при следующем логине/пакете 24101.

    Если skin_id указан, уведомление привязывается к награде: когда игрок
    откроет его в игре (command 528), сервер выдаст именно этот скин через
    LogicGiveDeliveryItemsCommand (24111) — это то, что реально делает
    скин видимым/выбираемым в игре, а не просто запись в unlocked_skins."""
    conn = db_connect()
    try:
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO pending_notifications (low_id, text, skin_id, createdAt, delivered) VALUES (?, ?, ?, ?, 0)",
            (low_id, text, skin_id, int(time.time() * 1000)),
        )
        conn.commit()
    finally:
        conn.close()


def grant_skin(low_id: int, skin_id: int):
    """Кладём скин в инвентарь игрока (та же таблица, что читает Node
    при следующей отдаче OwnData / инвентаря)."""
    conn = db_connect()
    try:
        cur = conn.cursor()
        cur.execute(
            "INSERT OR IGNORE INTO unlocked_skins (low_id, skin_id, grantedAt) VALUES (?, ?, ?)",
            (low_id, skin_id, int(time.time() * 1000)),
        )
        conn.commit()
    finally:
        conn.close()


def confirm_link(telegram_user_id: int, low_id: int, submitted_code: str) -> tuple[bool, str]:
    conn = db_connect()
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT pending_code, code_expiry FROM telegram_links WHERE telegram_user_id=? AND low_id=?",
            (telegram_user_id, low_id),
        )
        row = cur.fetchone()
        if not row:
            return False, "Запрос на привязку не найден. Начните заново."

        pending_code, expiry = row
        if not pending_code:
            return False, "Код уже был использован. Начните заново."
        if int(time.time()) > expiry:
            return False, "Код истёк. Начните заново."
        if submitted_code.strip() != pending_code:
            return False, "Неверный код."

        cur.execute(
            """
            UPDATE telegram_links
               SET linked=1, pending_code=NULL, code_expiry=NULL, linkedAt=?
             WHERE telegram_user_id=? AND low_id=?
            """,
            (int(time.time()), telegram_user_id, low_id),
        )
        conn.commit()
        return True, "OK"
    finally:
        conn.close()


def main_kb():
    builder = ReplyKeyboardBuilder()
    builder.button(text="🔗 Привязать аккаунт")
    builder.button(text="👤 Мой аккаунт")
    builder.adjust(2)
    return builder.as_markup(resize_keyboard=True)


# ── Handlers ─────────────────────────────────────────────────────────────

@dp.message(Command("start"))
async def cmd_start(message: types.Message, state: FSMContext):
    await state.clear()
    await message.answer(
        "🚀 Добро пожаловать в <b>MillBrawl</b>!\n\n"
        "Чтобы привязать игровой аккаунт, нажми «🔗 Привязать аккаунт» "
        "и пришли свой игровой тег (например <code>#98VUP</code>).",
        reply_markup=main_kb(),
        parse_mode="HTML",
    )


@dp.message(F.text == "👤 Мой аккаунт")
async def my_account(message: types.Message):
    link = get_link_for_telegram_user(message.from_user.id)
    if not link:
        await message.answer("❌ У тебя ещё нет привязанного аккаунта.")
        return

    low_id = link[0]
    player = get_player_by_low_id(low_id)
    if not player:
        await message.answer("⚠️ Аккаунт привязан, но не найден в игровой базе.")
        return

    _, tag, name, gold, gems, trophies = player
    await message.answer(
        f"👤 <b>Твой аккаунт</b>\n\n"
        f"Имя: {name}\n"
        f"Тег: <code>{tag}</code>\n\n"
        f"🪙 Монеты: {gold}\n"
        f"💎 Гемы: {gems}\n"
        f"🏆 Кубки: {trophies}",
        parse_mode="HTML",
    )


@dp.message(F.text == "🔗 Привязать аккаунт")
async def link_start(message: types.Message, state: FSMContext):
    if get_link_for_telegram_user(message.from_user.id):
        await message.answer("✅ У тебя уже привязан аккаунт. Используй «👤 Мой аккаунт».")
        return

    await state.clear()
    await message.answer(
        "📝 Пришли свой игровой тег (например <code>#98VUP</code>):",
        parse_mode="HTML",
    )
    await state.set_state(LinkStates.waiting_for_tag)


@dp.message(LinkStates.waiting_for_tag)
async def process_tag(message: types.Message, state: FSMContext):
    raw_tag = message.text.strip()

    try:
        low_id = tag_to_low_id(raw_tag)
    except ValueError:
        await message.answer("❌ Неверный формат тега. Попробуй ещё раз (например <code>#98VUP</code>).", parse_mode="HTML")
        return

    player = get_player_by_low_id(low_id)
    if not player:
        await message.answer("❌ Аккаунт с таким тегом не найден. Проверь тег и попробуй снова.")
        return

    if is_account_already_linked(low_id):
        await message.answer("❌ Этот аккаунт уже привязан к другому Telegram.")
        await state.clear()
        return

    code = str(random.randint(100000, 999999))
    start_link_request(message.from_user.id, low_id, code)
    push_notification(low_id, f"Код привязки Telegram: {code}. Никому его не сообщай.")

    await state.update_data(low_id=low_id, tag=player[1])
    await message.answer(
        f"📩 Код отправлен во входящие в игре (тег <code>{player[1]}</code>).\n\n"
        "Зайди в игру, посмотри код и пришли его сюда.\n"
        "⏳ Код действует 5 минут.",
        parse_mode="HTML",
    )
    await state.set_state(LinkStates.waiting_for_code)


@dp.message(LinkStates.waiting_for_code)
async def process_code(message: types.Message, state: FSMContext):
    data = await state.get_data()
    low_id = data.get("low_id")
    tag = data.get("tag")

    if low_id is None:
        await message.answer("❌ Сессия истекла. Начни заново — «🔗 Привязать аккаунт».")
        await state.clear()
        return

    ok, reason = confirm_link(message.from_user.id, low_id, message.text)
    if not ok:
        await message.answer(f"❌ {reason}")
        return

    # Сам скин в unlocked_skins кладёт сервер (Node), когда игрок ОТКРОЕТ
    # уведомление в игре (кнопка "Забрать" -> command 528) — см.
    # Logic/Commands/Client/LogicViewInboxNotificationCommand.js.
    # Здесь только создаём уведомление с привязанным skin_id, ничего не
    # выдаём заранее, чтобы "Забрать" в игре было реальным действием.
    push_notification(
        low_id,
        "Успешная привязка аккаунта! В подарок тебе выдан скин «Волшебник Барли». "
        "Открой это уведомление во входящих и нажми «Забрать», чтобы получить скин.",
        skin_id=WIZARD_BARLEY_SKIN_ID,
    )

    await message.answer(
        f"🎉 Аккаунт <code>{tag}</code> успешно привязан!\n"
        "🎁 В подарок выдан скин «Волшебник Барли».",
        reply_markup=main_kb(),
        parse_mode="HTML",
    )
    await state.clear()


async def main():
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
