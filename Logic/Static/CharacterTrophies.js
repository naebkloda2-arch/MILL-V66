'use strict';

/**
 * Кубки по бойцам ("Highest Trophies" блок в OwnHomeDataMessage / статы
 * в PlayerProfileMessage).
 *
 * ВАЖНО: characterId здесь — это НЕ CardId (classId=23, cards.csv) и НЕ
 * порядковый номер бойца в игре, а InstanceId из characters.csv
 * (classId=16, CharacterData) — позиция строки в файле, считая с 0 ПОСЛЕ
 * строк-заголовков "Name" и "string". Пример: Lightyear (Buzz) = 88
 * (см. комментарии в OwnData.js про подтверждённый подсчёт).
 *
 * Раньше этот блок был захардкожен прямо в OwnData.js (строки ~466-473):
 * всего 2 бойца — Рико (characterId=4, кубки 3400) и Buzz (characterId=88,
 * кубки 0, свежеразблокирован). Вынесено сюда, чтобы не копаться в
 * гигантском OwnData.js каждый раз, когда нужно поменять/добавить кубки
 * бойцу.
 *
 * ⚠️ Технически безопасно добавлять сюда новых бойцов: это часть блока
 * с ДИНАМИЧЕСКИМ count (w.writeVInt(CharacterTrophies.length) в OwnData.js
 * и в PlayerProfileMessage.js), а не фиксированная 63-байтовая зона —
 * та же самая схема уже была один раз безопасно расширена (с 1 бойца до
 * 2х, когда добавляли Buzz), так что добавление новых записей сюда не
 * должно ломать байтовую раскладку остального сообщения. Но: не путай
 * characterId (эта таблица) с CardId из unlock-списка в OwnData.js
 * (~строка 434) — это разные таблицы, оба нужно обновлять при добавлении
 * нового бойца (тут — кубки, там — сам факт разблокировки).
 *
 * powerLevel пока везде 1 (соответствует текущему состоянию: прокачка
 * работает сама после того как боец появляется в списке разблокированных,
 * но начальный Power Level у всех = 1, отдельная нерешённая задача).
 */
const CharacterTrophies = [
  { characterId: 4,  name: 'Rico (Рико)',        trophies: 3400, highestTrophies: 3400, powerLevel: 1 },
  { characterId: 88, name: 'Lightyear (Buzz)',    trophies: 0,    highestTrophies: 0,    powerLevel: 1 },
];

module.exports = { CharacterTrophies };
