'use strict';

/**
 * Список событий (слоты ротации режимов). Пока НЕ используется нигде в
 * коде — заготовка данных для EventsEncoder.js, см. предупреждение там
 * про то, что сначала нужно определить точный offset вставки в
 * OwnData.js.
 *
 * mapID/gmv взяты как есть из config.json настоящего офлайн-клиента
 * NbsOfflineV64 (v64) — но НЕ проверены против наших собственных CSV
 * (Files/assets/csv_logic/*.csv). classId=15 (карта) и classId=48
 * (вариант режима) в этом файле не встречались раньше ни разу — прежде
 * чем полагаться на конкретные mapID/gmv ниже, стоит сверить их с
 * реальными строками в csv этого проекта (тем же способом, что и с
 * characters.csv — см. Logic/Static/CharacterTrophies.js).
 */
const Events = [
  { slot: 1,  gmv: 41, mapID: 810, tokens: 10 },
  { slot: 2,  gmv: 17, mapID: 774, tokens: 10 },
  { slot: 3,  gmv: 9,  mapID: 542, tokens: 10 },
  { slot: 4,  gmv: 37, mapID: 761, tokens: 10 },
  { slot: 5,  gmv: 20, mapID: 903, tokens: 10 },
  { slot: 6,  gmv: 0,  mapID: 642, tokens: 10 },
  { slot: 7,  gmv: 7,  mapID: 21,  tokens: 10 },
  { slot: 9,  gmv: 31, mapID: 752, tokens: 10 },
  { slot: 10, gmv: 14, mapID: 177, tokens: 10 },
  { slot: 12, gmv: 41, mapID: 809, tokens: 10 },
  { slot: 13, gmv: 3,  mapID: 817, tokens: 10 },
  { slot: 34, gmv: 3,  mapID: 2,   tokens: 10 },
];

module.exports = { Events };
