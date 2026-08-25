'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Читает milestones.csv и выдаёт данные награды за конкретный уровень
 * Trophy Road / Brawl Pass — порт Classes/Files/Classes/Milestones.py
 * из V64-эталона, адаптированный под структуру строк нашего
 * milestones.csv (он у нас уже v66-актуальный, с сезоном 48 и т.д.).
 *
 * Формат имени строки:
 *   Trophy Road:  goal_6_<lvlID>      (lower-case!)
 *   Brawl Pass:   Goal_<RewardID>_<Season>_<lvlID>   (RewardID: 9=Premium, 10=Free, 12=Star)
 *
 * Колонки (0-indexed, см. заголовок файла):
 *   0 Name, 9 PrimaryLvlUpRewardType, 10 PrimaryLvlUpRewardCount,
 *   12 PrimaryLvlUpRewardData
 */

const ASSETS_DIR = path.join(__dirname, '..', '..', 'Files', 'assets', 'csv_logic');
const FILE_NAME = 'milestones.csv';

const COL_TYPE = 9;
const COL_COUNT = 10;
const COL_DATA = 12;

let _rowsByName = null;

/**
 * milestones.csv квотирует только НЕКОТОРЫЕ поля (Name и строковые данные
 * вроде PrimaryLvlUpRewardData), а не все подряд, как emotes.csv/sprays.csv —
 * поэтому наивный split('","') тут не работает (даёт 1 колонку на всю
 * строку). Разбираем по одному символу с учётом кавычек.
 */
function parseCsvLine(line) {
  const cells = [];
  let cur = '';
  let inQuotes = false;
  const clean = line.replace(/\r$/, '');

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      cells.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  cells.push(cur);
  return cells;
}

function loadIndex() {
  if (_rowsByName) return _rowsByName;

  const raw = fs.readFileSync(path.join(ASSETS_DIR, FILE_NAME), 'utf8');
  const lines = raw.split('\n').filter((l) => l.trim().length > 0);
  const rows = lines.slice(2).map(parseCsvLine);

  _rowsByName = new Map();
  for (const row of rows) {
    if (row[0]) _rowsByName.set(row[0], row);
  }
  return _rowsByName;
}

function rowToMilestone(row) {
  if (!row) return null;
  const type = parseInt(row[COL_TYPE], 10);
  const count = parseInt(row[COL_COUNT], 10);
  return {
    RewardType: Number.isFinite(type) ? type : 0,
    RewardCount: Number.isFinite(count) ? count : 0,
    RewardData: row[COL_DATA] || '',
  };
}

/**
 * @param lvlID  уровень Trophy Road
 */
function getTrophyRoadLvl(lvlID) {
  const idx = loadIndex();
  return rowToMilestone(idx.get(`goal_6_${lvlID}`));
}

/**
 * @param rewardId  9=Premium, 10=Free, 12=Star (fields.RewardID из команды 517)
 * @param season    fields.BrawlPassSeason
 * @param lvlID     fields.LVL
 */
function getBrawlPassLvl(rewardId, season, lvlID) {
  const idx = loadIndex();
  return rowToMilestone(idx.get(`Goal_${rewardId}_${season}_${lvlID}`));
}

module.exports = { getTrophyRoadLvl, getBrawlPassLvl };
