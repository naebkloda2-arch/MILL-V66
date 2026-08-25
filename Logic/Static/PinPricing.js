'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Цены предметов, покупаемых напрямую (не через оффер магазина) —
 * category в Unk2 команды 519 (handleDirectPurchase):
 *   52 = Pin/Emote  — Files/assets/csv_logic/emotes.csv
 *   68 = Spray      — Files/assets/csv_logic/sprays.csv
 *
 * Оба файла имеют одинаковую раскладку колонок под цену:
 * PriceBling (0-indexed колонка 17), PriceGems (0-indexed колонка 18).
 * value из Unk2=[category, value] — ИНДЕКС СТРОКИ данных (считая с 0
 * ПОСЛЕ двух строк заголовков "Name"/"string"), как и во всех остальных
 * classId-таблицах этого протокола.
 *
 * Подтверждено реальным тестом (30.07): покупка пина дала Unk2=[52,152..154]
 * и сработала; покупка спрея дала Unk2=[68,3] и раньше падала в
 * "offer not found", т.к. категория 68 не была подключена вовсе.
 * classId=68 для спреев подтверждён V64-эталоном (OwnHomeDataMessage.py,
 * блок Vanity: writeVInt(68) перед x for x in player.OwnedSprays).
 */

const ASSETS_DIR = path.join(__dirname, '..', '..', 'Files', 'assets', 'csv_logic');

const PRICE_BLING_COL = 17;
const PRICE_GEMS_COL = 18;

// Дефолтные цены-заглушки, если у конкретной строки поля пустые
// (дефолтный/бесплатный предмет, не продающийся отдельно).
const DEFAULT_PRICE_BLING = 19;
const DEFAULT_PRICE_GEMS = 750;

const _cacheByFile = new Map();

// Простой построчный CSV-парсер под конкретный формат этих файлов
// (значения всегда в двойных кавычках, разделитель — запятая, без
// экранированных кавычек внутри значений). Не претендует на общий
// CSV-парсер — только под emotes.csv/sprays.csv этого проекта.
function parseCsvLine(line) {
  return line
    .replace(/\r$/, '')
    .split('","')
    .map((cell, i, arr) => {
      if (i === 0) cell = cell.replace(/^"/, '');
      if (i === arr.length - 1) cell = cell.replace(/"$/, '');
      return cell;
    });
}

function loadRows(fileName) {
  if (_cacheByFile.has(fileName)) return _cacheByFile.get(fileName);

  const raw = fs.readFileSync(path.join(ASSETS_DIR, fileName), 'utf8');
  const lines = raw.split('\n').filter((l) => l.trim().length > 0);

  // Первые 2 строки — заголовки ("Name" и "string"), данные с 3-й строки
  // файла (index 2), что соответствует rowIndex=0 в терминах value.
  const rows = lines.slice(2).map(parseCsvLine);
  _cacheByFile.set(fileName, rows);
  return rows;
}

function getPriceFromFile(fileName, rowIndex) {
  const rows = loadRows(fileName);
  const row = rows[rowIndex];

  if (!row) {
    return { bling: DEFAULT_PRICE_BLING, gems: DEFAULT_PRICE_GEMS, name: `unknown_${rowIndex}` };
  }

  const bling = parseInt(row[PRICE_BLING_COL], 10);
  const gems = parseInt(row[PRICE_GEMS_COL], 10);

  return {
    bling: Number.isFinite(bling) ? bling : DEFAULT_PRICE_BLING,
    gems: Number.isFinite(gems) ? gems : DEFAULT_PRICE_GEMS,
    name: row[0] || `unknown_${rowIndex}`,
  };
}

/**
 * @param rowIndex  value из Unk2=[52, value] (индекс строки данных, с 0)
 * @returns {{ bling: number, gems: number, name: string }}
 */
function getPinPrice(rowIndex) {
  return getPriceFromFile('emotes.csv', rowIndex);
}

/**
 * @param rowIndex  value из Unk2=[68, value] (индекс строки данных, с 0)
 * @returns {{ bling: number, gems: number, name: string }}
 */
function getSprayPrice(rowIndex) {
  return getPriceFromFile('sprays.csv', rowIndex);
}

/**
 * Обратный поиск: имя предмета (как в milestones.csv/PrimaryLvlUpRewardData,
 * например "emoji_bp_fairy") -> индекс строки данных (rowIndex), который
 * используется как value в DataRef/DirectPurchase.
 * Нужен для выдачи наград БП/Trophy Road (LogicClaimRankUpRewardCommand, id 517),
 * где милстоуны хранят имя, а не готовый rowIndex.
 *
 * @param fileName  например 'emotes.csv', 'sprays.csv', 'player_thumbnails.csv', 'skins.csv'
 * @param name       имя строки (колонка 0 / Name)
 * @returns {number} rowIndex или -1, если не найдено
 */
function getRowIndexByName(fileName, name) {
  const rows = loadRows(fileName);
  return rows.findIndex((row) => row[0] === name);
}

/**
 * Количество строк данных в CSV-таблице (rowIndex идёт от 0 до count-1).
 * Нужен всюду, где раньше генерировался ID предмета "наугад" в захардкоженном
 * диапазоне (например StarrDropReward.js) — такие диапазоны не совпадали
 * с реальными в66-таблицами и клиент не мог зарезолвить имя/иконку
 * (показывал TID_... заглушку). Используем реальный размер CSV вместо этого.
 *
 * @param fileName например 'emotes.csv', 'player_thumbnails.csv', 'skins.csv'
 */
function getRowCount(fileName) {
  return loadRows(fileName).length;
}

module.exports = { getPinPrice, getSprayPrice, getRowIndexByName, getRowCount, loadRows };

