'use strict';

const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');

// Единая БД, общая с Python-ботом (aiogram).
// Путь можно переопределить переменной окружения MILL_DB_PATH,
// чтобы бот и сервер указывали на один и тот же файл при разном
// расположении процессов.
const DB_PATH = process.env.MILL_DB_PATH ||
  path.join(__dirname, '..', '..', 'Files', 'database', 'plr.db');

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new DatabaseSync(DB_PATH);

// WAL — чтобы Node и Python могли работать с файлом одновременно
// без блокировок "database is locked".
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA busy_timeout = 5000;');

db.exec(`
CREATE TABLE IF NOT EXISTS players (
  lowId       INTEGER PRIMARY KEY,
  highId      INTEGER NOT NULL DEFAULT 0,
  tag         TEXT UNIQUE NOT NULL,
  token       TEXT NOT NULL,
  name        TEXT NOT NULL DEFAULT 'KakaoMill',
  gold        INTEGER NOT NULL DEFAULT 1500,
  gems        INTEGER NOT NULL DEFAULT 30,
  trophies    INTEGER NOT NULL DEFAULT 0,
  registered  INTEGER NOT NULL DEFAULT 0,
  createdAt   INTEGER NOT NULL,
  lastLoginAt INTEGER NOT NULL
);
`);

// Миграция для уже существующих БД (созданных до появления поля
// registered) — SQLite не поддерживает "ADD COLUMN IF NOT EXISTS",
// поэтому проверяем вручную через PRAGMA table_info.
{
  const cols = db.prepare('PRAGMA table_info(players)').all().map(c => c.name);
  if (!cols.includes('registered')) {
    db.exec('ALTER TABLE players ADD COLUMN registered INTEGER NOT NULL DEFAULT 0;');
  }
}

// Кубки/PowerLevel по бойцам — ТЕПЕРЬ по-настоящему на игрока, а не общий
// хардкод на всех (раньше это была Logic/Static/CharacterTrophies.js —
// один и тот же список для любого аккаунта). У новых игроков таблица
// пустая — getBrawlers() сам заводит стартовую запись (Кольт,
// characterId=0, 0 кубков), как в реальной игре у нового аккаунта.
db.exec(`
CREATE TABLE IF NOT EXISTS brawlers (
  low_id           INTEGER NOT NULL,
  character_id     INTEGER NOT NULL,
  trophies         INTEGER NOT NULL DEFAULT 0,
  highest_trophies INTEGER NOT NULL DEFAULT 0,
  power_level      INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (low_id, character_id)
);
`);

// club_name — задел на будущую систему клубов. Пока клубов как фичи нет
// (нет команд создания/вступления), поэтому реально везде будет NULL —
// профиль корректно покажет "не в клубе" для всех, как и сейчас, но уже
// по-настоящему из БД, а не из захардкоженного значения в пакете.
{
  const cols = db.prepare('PRAGMA table_info(players)').all().map(c => c.name);
  if (!cols.includes('club_name')) {
    db.exec('ALTER TABLE players ADD COLUMN club_name TEXT;');
  }
  // region — нужен для локального (страна) лидерборда, которого не было
  // вообще: PlayerLeaderboard.js слал ОДИН И ТОТ ЖЕ топ и в мир, и в "RU",
  // просто с разным заголовком строки, поэтому локальная вкладка на деле
  // была бы идентична мировой, а не пустой — то, что она реально пустая,
  // значит, клиент сам не находит "своих" в списке без честного региона
  // на каждой записи. Дефолт 'RU', т.к. клиент у нас сейчас всегда
  // объявляет себя RU (см. writeString("RU") в OwnData.js).
  if (!cols.includes('region')) {
    db.exec("ALTER TABLE players ADD COLUMN region TEXT NOT NULL DEFAULT 'RU';");
  }
}

db.exec(`
CREATE TABLE IF NOT EXISTS telegram_links (
  telegram_user_id INTEGER PRIMARY KEY,
  low_id           INTEGER NOT NULL,
  pending_code     TEXT,
  code_expiry      INTEGER,
  linked           INTEGER NOT NULL DEFAULT 0,
  linkedAt         INTEGER
);
`);

// Очередь уведомлений "во входящие" — сервер вычитывает и очищает
// её при следующем входе игрока (см. Notification.js / OwnData.js).
//
// skin_id — если не NULL, это уведомление привязано к награде-скину:
// когда клиент открывает его (LogicViewInboxNotificationCommand, id=528),
// сервер находит запись по Index -> notification row и знает, какой
// именно скин выдать через LogicGiveDeliveryItemsCommand (24111).
//
// opened — уведомление показано клиенту (ушло в 24101 хотя бы раз), но
// ЕЩЁ НЕ открыто самим игроком (528 не пришла). Раньше поле называлось
// "delivered" и означало "показано" — путали с "открыто игроком", из-за
// чего запись про skin_id было некуда девать: она удалялась/помечалась
// раньше, чем клиент успевал прислать 528. Теперь:
//   delivered = 0 -> ещё не показывали в 24101
//   delivered = 1 -> показали в 24101 (ушло во входящие клиенту)
//   opened    = 1 -> игрок открыл уведомление в игре (528 обработан)
db.exec(`
CREATE TABLE IF NOT EXISTS pending_notifications (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  low_id    INTEGER NOT NULL,
  text      TEXT NOT NULL,
  skin_id   INTEGER,
  createdAt INTEGER NOT NULL,
  delivered INTEGER NOT NULL DEFAULT 0,
  opened    INTEGER NOT NULL DEFAULT 0
);
`);

// Мягкая миграция для БД, созданных до добавления skin_id/opened —
// SQLite позволяет добавлять колонки, если их ещё нет.
function ensureColumn(table, column, ddl) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!cols.some(c => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
  }
}
ensureColumn('pending_notifications', 'skin_id', 'skin_id INTEGER');
ensureColumn('pending_notifications', 'opened', 'opened INTEGER NOT NULL DEFAULT 0');

db.exec(`
CREATE TABLE IF NOT EXISTS unlocked_skins (
  low_id    INTEGER NOT NULL,
  skin_id   INTEGER NOT NULL,
  grantedAt INTEGER NOT NULL,
  PRIMARY KEY (low_id, skin_id)
);
`);

// ── Base32 (Supercell-style) кодирование тега ───────────────────────────────
// Тот же алфавит, что и в клиенте/боте: "0289PYLQGRJCUV"
const BASE32 = '0289PYLQGRJCUV';

function lowIdToTag(lowId) {
  let id = BigInt(lowId);
  if (id === 0n) return '#' + BASE32[0];
  let out = '';
  const base = BigInt(BASE32.length);
  while (id > 0n) {
    out = BASE32[Number(id % base)] + out;
    id = id / base;
  }
  return '#' + out;
}

function tagToLowId(tag) {
  const clean = tag.toUpperCase().replace(/^#/, '').trim();
  let id = 0n;
  const base = BigInt(BASE32.length);
  for (const ch of clean) {
    const idx = BASE32.indexOf(ch);
    if (idx === -1) throw new Error(`Invalid tag character: ${ch}`);
    id = id * base + BigInt(idx);
  }
  return Number(id);
}

function randomToken(len = 40) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

// ── Players ──────────────────────────────────────────────────────────────

function getPlayerByLowId(lowId) {
  return db.prepare('SELECT * FROM players WHERE lowId = ?').get(lowId) || null;
}

function getPlayerByTag(tag) {
  return db.prepare('SELECT * FROM players WHERE tag = ?').get(tag.toUpperCase()) || null;
}

function createPlayer(lowId, highId) {
  const now = Date.now();
  const tag = lowIdToTag(lowId);
  const token = randomToken(40);

  db.prepare(`
    INSERT INTO players (lowId, highId, tag, token, name, gold, gems, trophies, registered, createdAt, lastLoginAt)
    VALUES (?, ?, ?, ?, 'KakaoMill', 1500, 30, 0, 0, ?, ?)
  `).run(lowId, highId, tag, token, now, now);

  return getPlayerByLowId(lowId);
}

// Найти игрока по highId/lowId, создать при отсутствии. Обновляет lastLoginAt.
function loadOrCreatePlayer(lowId, highId) {
  let player = getPlayerByLowId(lowId);
  if (!player) {
    player = createPlayer(lowId, highId);
  } else {
    db.prepare('UPDATE players SET lastLoginAt = ?, highId = ? WHERE lowId = ?')
      .run(Date.now(), highId, lowId);
  }
  return player;
}

// ── Telegram linking ────────────────────────────────────────────────────

function getLinkByLowId(lowId) {
  return db.prepare('SELECT * FROM telegram_links WHERE low_id = ? AND linked = 1').get(lowId) || null;
}

// ── Pending notifications (входящие) ────────────────────────────────────

function getUndeliveredNotifications(lowId) {
  return db.prepare(
    'SELECT * FROM pending_notifications WHERE low_id = ? AND delivered = 0 ORDER BY id ASC'
  ).all(lowId);
}

function markNotificationsDelivered(ids) {
  if (!ids.length) return;
  const stmt = db.prepare('UPDATE pending_notifications SET delivered = 1 WHERE id = ?');
  for (const id of ids) stmt.run(id);
}

// Уведомления, которые уже были показаны клиенту (delivered=1), но игрок
// их ещё не открыл (opened=0). Именно из этого набора собирается таблица
// Index -> row при каждой отдаче 24101, чтобы 528 могла найти нужную
// запись по Index, который прислал клиент.
function getDeliveredUnopenedNotifications(lowId) {
  return db.prepare(
    'SELECT * FROM pending_notifications WHERE low_id = ? AND delivered = 1 AND opened = 0 ORDER BY id ASC'
  ).all(lowId);
}

function markNotificationOpened(id) {
  db.prepare('UPDATE pending_notifications SET opened = 1 WHERE id = ?').run(id);
}

// ── Смена ника ───────────────────────────────────────────────────────────

function setPlayerName(lowId, name) {
  db.prepare('UPDATE players SET name = ?, registered = 1 WHERE lowId = ?').run(name, lowId);
}

// ── Unlocked skins ───────────────────────────────────────────────────────

function grantSkin(lowId, skinId) {
  db.prepare(`
    INSERT OR IGNORE INTO unlocked_skins (low_id, skin_id, grantedAt)
    VALUES (?, ?, ?)
  `).run(lowId, skinId, Date.now());
}

function getUnlockedSkins(lowId) {
  return db.prepare('SELECT skin_id FROM unlocked_skins WHERE low_id = ?')
    .all(lowId)
    .map(r => r.skin_id);
}

// ── Brawlers (кубки/PowerLevel по бойцам, теперь по-настоящему на игрока) ──

// Возвращает список бойцов игрока. Если у игрока ещё ни одной записи нет
// (новый аккаунт) — заводим стартового Кольта (characterId=0, 0 кубков),
// как в реальной игре, и сразу сохраняем эту запись в БД.
function getBrawlers(lowId) {
  const rows = db.prepare(
    'SELECT character_id, trophies, highest_trophies, power_level FROM brawlers WHERE low_id = ?'
  ).all(lowId);
  if (rows.length > 0) return rows;

  upsertBrawler(lowId, 0, 0, 0, 1); // стартовый Кольт
  return db.prepare(
    'SELECT character_id, trophies, highest_trophies, power_level FROM brawlers WHERE low_id = ?'
  ).all(lowId);
}

function upsertBrawler(lowId, characterId, trophies, highestTrophies, powerLevel = 1) {
  db.prepare(`
    INSERT INTO brawlers (low_id, character_id, trophies, highest_trophies, power_level)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(low_id, character_id) DO UPDATE SET
      trophies = excluded.trophies,
      highest_trophies = excluded.highest_trophies,
      power_level = excluded.power_level
  `).run(lowId, characterId, trophies, highestTrophies, powerLevel);
  syncPlayerTrophies(lowId);
}

function getTotalTrophies(lowId) {
  const row = db.prepare(
    'SELECT COALESCE(SUM(trophies), 0) AS total FROM brawlers WHERE low_id = ?'
  ).get(lowId);
  return row ? row.total : 0;
}

// Кэш-колонка players.trophies (нужна для сортировки лидерборда) —
// пересчитывается из реальных данных по бойцам при любом изменении.
function syncPlayerTrophies(lowId) {
  const total = getTotalTrophies(lowId);
  db.prepare('UPDATE players SET trophies = ? WHERE lowId = ?').run(total, lowId);
}

// Изменить баланс монет игрока на delta (может быть отрицательным).
// ВАЖНО: это пишет только в БД (players.gold) — сам баланс монет в
// OwnData.js (главный экран) всё ещё захардкожен (19500), поэтому эффект
// пока не виден в игре визуально, см. обсуждение про Power Level в чате.
function addGold(lowId, delta) {
  db.prepare('UPDATE players SET gold = gold + ? WHERE lowId = ?').run(delta, lowId);
  const row = db.prepare('SELECT gold FROM players WHERE lowId = ?').get(lowId);
  return row ? row.gold : 0;
}

// ── Leaderboard ──────────────────────────────────────────────────────────

// Реальные игроки из БД, топ-200 по трофеям. thumbnailId/nameColorId пока
// дефолтные (1/0) — при желании можно завести отдельные колонки в players
// и брать их оттуда, но для видимости лидерборда это не блокер.
function getLeaderboardPlayers(limit = 200, region = null) {
  if (region) {
    return db.prepare(
      'SELECT lowId, highId, tag, name, trophies FROM players WHERE region = ? ORDER BY trophies DESC LIMIT ?'
    ).all(region, limit);
  }
  return db.prepare(
    'SELECT lowId, highId, tag, name, trophies FROM players ORDER BY trophies DESC LIMIT ?'
  ).all(limit);
}

module.exports = {
  db,
  lowIdToTag,
  tagToLowId,
  randomToken,
  getPlayerByLowId,
  getPlayerByTag,
  createPlayer,
  loadOrCreatePlayer,
  getLinkByLowId,
  getUndeliveredNotifications,
  markNotificationsDelivered,
  getDeliveredUnopenedNotifications,
  markNotificationOpened,
  grantSkin,
  getUnlockedSkins,
  getLeaderboardPlayers,
  setPlayerName,
  getBrawlers,
  upsertBrawler,
  getTotalTrophies,
  syncPlayerTrophies,
  addGold,
};
