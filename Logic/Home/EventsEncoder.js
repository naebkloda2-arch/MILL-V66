'use strict';

/**
 * Блок "событий" (event slots / ротация режимов на карте мира) —
 * взято из script.js (NbsOfflineV64, `OwnHomeDataMessage`, секция
 * `config.events.length` + `for (const event of config.events)`).
 *
 * ⚠️ ПОКА НЕ ПОДКЛЮЧЕНО к OwnData.js! Это готовый строительный блок,
 * а не финальный фикс. Причина: наш v66 `OwnHomeDataMessage` в районе
 * "фиксированной зоны из нулей" (между hero-трофи-блоком и gems) устроен
 * иначе, чем этот v64-референс в том же месте (там перед событиями идёт
 * region/supportedCreator строки, цепочка writeDataReference(2..24,*),
 * Brawl Pass блок, "52-loop" — ничего из этого не видно у нас как
 * distinct-полей, наш зона — просто десятки writeVInt(0) с комментариями
 * "idk"). Значит либо это другие поля (v66 упростил/убрал их), либо они
 * там есть, но зазипованы в те самые безымянные нули. Вставлять этот блок
 * вслепую в разные места нашего 63-байтового участка — тот же риск краша/
 * отката в обучение, что уже был с Power Level. Нужно сначала точно
 * определить offset (тем же методом: тестовый скрипт + сравнение
 * buf.length + желательно хекс-дамп OwnHomeDataMessage с реального
 * рабочего в64-сервера для опорной сверки).
 *
 * Что НЕ включено специально (по просьбе не добавлять ranked/кастомные):
 * в оригинале слоты [20,21,22,23,24,35,36] — это чемпионшип/ranked-слоты
 * с доп. полем `championShipInfo` (макс. побед, чемпионшип-текст, гем-
 * оффер, chronos-файл). Наши события ниже это не используют — считаем,
 * что все наши слоты обычные (не ranked), поэтому везде идут ветки
 * `else` из референса (false/0), без championShipInfo вообще.
 *
 * @param w       Stream (из Piranha.stream)
 * @param events  массив { slot, gmv, mapID, tokens } — см. Events.js
 */
function encodeEventsBlock(w, events) {
  w.writeVInt(events.length);
  for (const event of events) {
    w.writeVInt(-1);
    w.writeVInt(event.slot);
    w.writeVInt(0);
    w.writeVInt(0);
    w.writeVInt(0);
    w.writeVInt(0);
    w.writeDataReference(15, event.mapID); // classId=15 — карта (не проверено на наших csv!)
    w.writeDataReference(48, event.gmv);   // classId=48 — вариант режима (не проверено на наших csv!)
    w.writeVInt(0);
    w.writeString('');
    w.writeVInt(0);
    w.writeVInt(0);
    w.writeVInt(0);       // championShipInfo.maxWins — у нас всегда false-ветка → 0
    w.writeVInt(0);
    w.writeVInt(0);
    w.writeVInt(6);
    w.writeBoolean(false);
    w.writeBoolean(false);
    w.writeVInt(0);
    w.writeBoolean(false);
    w.writeVInt(0);
    w.writeVInt(0);
    w.writeBoolean(false); // championShipInfo chronosTextEntry — у нас всегда false-ветка
    w.writeBoolean(false);
    w.writeBoolean(false);
    w.writeBoolean(false); // championShipInfo logicGemOffer — у нас всегда false-ветка
    w.writeVInt(-1);
    // референс тут пишет доп. chronosFileEntry ТОЛЬКО если championShipInfo есть —
    // у нас его нет ни для одного слота, так что этот блок целиком пропускается
    w.writeBoolean(false);
    w.writeBoolean(false);
    w.writeVInt(-1);
    w.writeVInt(0);
    w.writeVInt(0);
    w.writeVInt(0);
    w.writeBoolean(false);
    w.writeBoolean(false);
    w.writeBoolean(false);
    w.writeBoolean(false);
  }
}

module.exports = { encodeEventsBlock };
