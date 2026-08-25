'use strict';

const { Piranha } = require('../../../Core/Piranha');
const DB = require('../../../Core/Database/DB');

/**
 * PlayerProfileMessage — ответ на GetPlayerProfileMessage (клиент шлёт 15081),
 * открывается при тапе на аватарку/ник.
 *
 * Message ID = 24113.
 *
 * ВТОРАЯ ПЕРЕПИСКА этого файла. Первая версия (в64-скрипт "на глаз") и
 * вторая (авторитетный C#-референс RavBrawlV53) обе вешали профиль в
 * бесконечную загрузку на реальном тесте — v53 оказался слишком другой
 * версией протокола.
 *
 * ЭТА версия взята из реального рабочего JS-кода офлайн-клиента
 * NbsOfflineV64 (файл script.js, класс `PlayerProfileMessage`,
 * `// src/packets/server/playerprofilemessage.ts`) — он используется тем
 * же офлайн-клиентом, чтобы напрямую скормить байты в НАСТОЯЩИЙ Decode()
 * самого клиента (`_Messaging.sendOfflineMessage(24113, ...)`), то есть
 * это не чья-то теория, а byte-layout, который сам клиент (v64) реально
 * умеет разбирать. Так как v66 — близкая версия к v64 (по словам
 * разработчика), это должно подойти либо один-в-один, либо с минимальными
 * отличиями.
 *
 * Структура (кол-во стат-полей = 16, конкретные id ниже) — НЕ путать со
 * старой версией этого файла, где было 24 последовательных id 1..32 —
 * та версия была придумана, а не взята из реального источника.
 */
class PlayerProfileMessage {
  /**
   * @param socket
   * @param player  строка из players (DB.getPlayerByLowId) — чей профиль показываем
   */
  constructor(socket, player) {
    this.msg    = new Piranha(socket, 24113, 1);
    this.player = player || { highId: 0, lowId: 0, name: 'MILL-V66', trophies: 0 };
  }

  encode() {
    const w = this.msg.stream;
    const p = this.player;

    w.writeLogicLong(p.highId || 0, p.lowId || 0); // AccountId

    // Реальный список бойцов ЭТОГО игрока (не общий хардкод на всех).
    // Новому аккаунту getBrawlers сам заведёт стартового Кольта.
    const brawlers = DB.getBrawlers(p.lowId || 0);

    // favouriteBrawler / winstreakBrawler — не трекаются в БД отдельно,
    // дефолт — боец с наибольшими кубками из реального списка игрока.
    const favourite = brawlers.reduce(
      (best, c) => (c.trophies > (best?.trophies ?? -1) ? c : best),
      null
    );
    const favouriteId = favourite ? favourite.character_id : 0;
    w.writeDataReference(16, favouriteId); // favouriteBrawler
    w.writeDataReference(16, 1); // winstreakBrawler (в референсе — то же поле config.winstreakBrawler, не трекаем отдельно)

    w.writeVInt(1);
    w.writeDataReference(16, 1);
    w.writeDataReference(0, -1);
    w.writeVInt(2000); //Кубки на персе
    w.writeVInt(0);
    w.writeVInt(5);
    w.writeVInt(0);
    w.writeVInt(0);

    // Stats — ТОЧНО 16 полей, id НЕ последовательные (реальный референс,
    // не выдумка): trioWins, soloWins, duoWins, trophies(29), highest(4),
    // rankedHighest(24), rankedCurrent(25) — не трекаем, оставляем 0 по
    // указанию не добавлять ranked, fameCredits(20), creationDate(27),
    // r35brawlers(28), roboRumble(9), bossFight(12), challengeWins(15),
    // rampage(16), soloLeague(18), clubLeague(19).
    const totalTrophies        = brawlers.reduce((s, c) => s + (c.trophies || 0), 0);
    const totalHighestTrophies = brawlers.reduce((s, c) => s + (c.highest_trophies || 0), 0);

    w.writeVInt(16);
    w.writeVInt(1);  w.writeVInt(67);                 // trioWins — не трекается
    w.writeVInt(8);  w.writeVInt(1488);                 // soloWins — не трекается
    w.writeVInt(11); w.writeVInt(6752);                 // duoWins — не трекается
    w.writeVInt(29); w.writeVInt(148800);      // сумма кубков игрока
  // w.writeVInt(29); w.writeVInt(totalTrophies);      // сумма кубков игрока
    w.writeVInt(4);  w.writeVInt(167670); // сумма highestTrophies по бойцам
  // w.writeVInt(4);  w.writeVInt(totalHighestTrophies); // сумма highestTrophies по бойцам
    w.writeVInt(24); w.writeVInt(6000);                 // rankedHighest — не трекаем (ranked не добавляем)
    w.writeVInt(25); w.writeVInt(13000);                 // rankedCurrent — не трекаем
    w.writeVInt(20); w.writeVInt(2888);                 // fameCredits — не трекается
    w.writeVInt(27); w.writeVInt(2067);                 // creationDate — не трекается
    w.writeVInt(28); w.writeVInt(12);                 // r35brawlers — не трекается
    w.writeVInt(9);  w.writeVInt(1888);                 // highestRoboRumbleLvlPassed — не трекается
    w.writeVInt(12); w.writeVInt(2837);                 // highestBossFightLvlPassed — не трекается
    w.writeVInt(15); w.writeVInt(3777);                 // mostChallengeWins — не трекается
    w.writeVInt(16); w.writeVInt(2388);                 // highestRampageLvlPassed — не трекается
    w.writeVInt(18); w.writeVInt(1938);                 // highestSoloLeague — не трекается
    w.writeVInt(19); w.writeVInt(2838);                 // highestClubLeague — не трекается

    // PlayerDisplayData.encode(stream) — имя/уровень/аватарка/цвет ника
    w.writeString(p.name || 'MILL-V66');
    w.writeVInt(100);
    w.writeVInt(28_000_000 + 2); // ThumbnailId — дефолт, колонки в БД нет
    w.writeVInt(43_000_000 + 2); // NameColorId — дефолт
    w.writeVInt(43_000_000 + 2); // NameColorId (дублируется, как в референсе)
    // референс: `if (version.gmv == 64) { boolean(false); vint(0); vint(0); }`
    // — эта тройка присутствует именно в v64-варианте PlayerDisplayData,
    // оставляем как есть, раз ориентируемся на v64.
    w.writeBoolean(false);
    w.writeVInt(0);
    w.writeVInt(0);

    w.writeBoolean(false);
    w.writeString('hello world'); // так в референсе — похоже на плейсхолдер/статус, не трогаем
    w.writeVInt(0);
    w.writeVInt(0);
    w.writeVInt(67); // winstreak — не трекается (было config.winstreak)
    w.writeDataReference(29, 0);
    w.writeDataReference(0, -1);
    w.writeDataReference(0, -1);
    w.writeDataReference(0, -1);
    w.writeDataReference(0, -1);
    w.writeBoolean(false);
    w.writeDataReference(0, 0);
    w.writeVInt(0);
  }

  send() {
    this.encode();
    try {
      const Logger = require('../../../Core/Logger');
      const body = this.msg.stream.toBuffer();
      Logger.serverInfo(`[24113] PlayerProfileMessage body length=${body.length} FULL hex=${body.toString('hex')}`);
    } catch (e) { /* diagnostics only, never break the send */ }
    this.msg.send();
  }
}

module.exports = { PlayerProfileMessage };
