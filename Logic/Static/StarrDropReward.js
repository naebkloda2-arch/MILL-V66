'use strict';

const { loadRows } = require('./PinPricing');

/**
 * Порт genStarDropReward() из питон-сурса (Draco_Brawl_Stage / GenStarDropRewards.py).
 * Это "простая" версия стардропа: 7 типов наград по весам, без рарностей/тикетов
 * из LogicStarrDropData (та система тут НЕ используется — по твоему решению).
 *
 * Вызывается из LogicPurchaseOfferCommand (519), когда в оффере есть
 * reward с ItemType === 50 (это и есть "стардроп" внутри магазина).
 *
 * ИСПРАВЛЕНО (баг с TID_... при открытии награды): раньше ID пина/иконки/
 * бойца генерировались случайно в захардкоженных диапазонах (0..1516,
 * 0..100, 0..72), которые НЕ совпадали с реальными в66 CSV-таблицами
 * (emotes.csv=3031 строка, player_thumbnails.csv=1224, characters.csv=347).
 * Если сгенерированный ID выходит за пределы реальной таблицы (или указывает
 * не на ту строку), клиент не может найти для него имя/иконку и вместо
 * названия показывает сырой ключ локализации TID_... . Теперь диапазоны
 * берутся из реальных CSV через тот же загрузчик, что и в PinPricing.js.
 */

// ID бойца = индекс строки в characters.csv (см. PinPricing.getRowIndexByName)
function getAllBrawlerIds() {
  const rows = loadRows('characters.csv');
  const ids = [];
  for (let i = 0; i < rows.length; i++) ids.push(i);
  return ids;
}

// ID скина = индекс строки в skins.csv, колонка 2 = Disabled — пропускаем
// отключённые скины, чтобы не выдавать в награду то, чего нет у клиента.
function getAllSkinIds() {
  const rows = loadRows('skins.csv');
  const ids = [];
  for (let i = 0; i < rows.length; i++) {
    const disabled = (rows[i][2] || '').toUpperCase() === 'TRUE';
    if (!disabled) ids.push(i);
  }
  return ids;
}

// ID пина = индекс строки в emotes.csv (52 = Pin/Emote, см. PinPricing.getPinPrice)
function getAllPinIds() {
  const rows = loadRows('emotes.csv');
  const ids = [];
  for (let i = 0; i < rows.length; i++) ids.push(i);
  return ids;
}

// ID иконки = индекс строки в player_thumbnails.csv, колонка 10 =
// IsAvailableForOffers — берём только те, что реально предназначены
// для выдачи в наградах/акциях (а не служебные/скрытые записи).
function getAllThumbnailIds() {
  const rows = loadRows('player_thumbnails.csv');
  const ids = [];
  for (let i = 0; i < rows.length; i++) {
    const availableForOffers = (rows[i][10] || '').toUpperCase() === 'TRUE';
    if (availableForOffers) ids.push(i);
  }
  return ids;
}

const REWARD_TABLE = [
  { type: 'Coins',     tickets: 25 },
  { type: 'Gems',      tickets: 10 },
  { type: 'Bling',     tickets: 10 },
  { type: 'Pins',      tickets: 10 },
  { type: 'Thumbnail', tickets: 20 },
  { type: 'Skin',      tickets: 15 },
  { type: 'Brawler',   tickets: 10 },
];

function weightedChoice(table) {
  const total = table.reduce((sum, t) => sum + t.tickets, 0);
  let r = Math.random() * total;
  for (const t of table) {
    if (r < t.tickets) return t.type;
    r -= t.tickets;
  }
  return table[table.length - 1].type;
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * @param playerData объект данных игрока (мутируется, как в питон-версии):
 *   ожидает playerData.OwnedSkins, .OwnedThumbnails, .OwnedPins, .OwnedBrawlers,
 *   .Coins, .Gems, .Blings — все опциональны, недостающее создаётся на лету.
 * @returns {{Amount:number, DataRef:[number,number], RewardID:number}|null}
 *          null означает "нечего давать" (например все скины/бойцы уже есть) —
 *          в этом случае вызывающий код не должен добавлять box.
 */
function genStarDropReward(playerData) {
  playerData.OwnedSkins      = playerData.OwnedSkins      || [];
  playerData.OwnedThumbnails = playerData.OwnedThumbnails || [];
  playerData.OwnedPins       = playerData.OwnedPins       || [];
  playerData.OwnedBrawlers   = playerData.OwnedBrawlers   || {};
  playerData.Coins  = playerData.Coins  || 0;
  playerData.Gems   = playerData.Gems   || 0;
  playerData.Blings = playerData.Blings || 0;

  const rewardType = weightedChoice(REWARD_TABLE);

  switch (rewardType) {
    case 'Skin': {
      const allSkins = getAllSkinIds();
      const available = allSkins.filter((id) => !playerData.OwnedSkins.includes(id));
      if (available.length === 0) return null;
      const skinId = available[randInt(0, available.length - 1)];
      playerData.OwnedSkins.push(skinId);
      return { Amount: 1, DataRef: [29, skinId], RewardID: 9 };
    }

    case 'Thumbnail': {
      const allThumbs = getAllThumbnailIds();
      const available = allThumbs.filter((id) => !playerData.OwnedThumbnails.includes(id));
      if (available.length === 0) return null;
      const thumbId = available[randInt(0, available.length - 1)];
      playerData.OwnedThumbnails.push(thumbId);
      return { Amount: 1, DataRef: [28, thumbId], RewardID: 11 };
    }

    case 'Pins': {
      const allPins = getAllPinIds();
      const available = allPins.filter((id) => !playerData.OwnedPins.includes(id));
      if (available.length === 0) return null;
      const pinId = available[randInt(0, available.length - 1)];
      playerData.OwnedPins.push(pinId);
      return { Amount: 1, DataRef: [52, pinId], RewardID: 11 };
    }

    case 'Brawler': {
      const owned = new Set(Object.keys(playerData.OwnedBrawlers).map(Number));
      const all = getAllBrawlerIds();
      const available = all.filter((id) => !owned.has(id));
      if (available.length === 0) return null;
      const brawlerId = available[randInt(0, available.length - 1)];
      const powerLevel = 1;
      playerData.OwnedBrawlers[brawlerId] = {
        CardID: 0, // TODO: смэпить на реальный CardID из characters.csv, когда скинешь файлы
        Trophies: 0,
        HighestTrophies: 0,
        PowerLevel: powerLevel,
        PowerPoints: 0,
        State: 2,
        Mastery: 0,
        ClaimRewardsMastery: 0,
      };
      return { Amount: powerLevel, DataRef: [16, brawlerId], RewardID: 1 };
    }

    case 'Coins': {
      const amount = randInt(50, 200);
      playerData.Coins += amount;
      return { Amount: amount, DataRef: [0, 0], RewardID: 7 };
    }

    case 'Gems': {
      const amount = randInt(10, 30);
      playerData.Gems += amount;
      return { Amount: amount, DataRef: [0, 0], RewardID: 8 };
    }

    case 'Bling': {
      const amount = randInt(20, 100);
      playerData.Blings += amount;
      return { Amount: amount, DataRef: [0, 0], RewardID: 25 };
    }

    default:
      return null;
  }
}

module.exports = { genStarDropReward, REWARD_TABLE };
