'use strict';

const { Piranha } = require('../../../Core/Piranha');
const DB = require('../../../Core/Database/DB');

/**
 * Ответ на AskForPlayerLeaderboard (клиент шлёт 14403).
 *
 * Message ID = 24403 — подтверждено рабочим Python-сервером (в55/в63/в64).
 * Структура записи игрока и общий порядок полей взяты из того же
 * источника (LeaderboardMessage.encode), просто переписаны под наш Stream.
 *
 * listType: 0 = мир, 1 = локальный/страна, 2 = клубы
 *
 * Источник данных — реальные игроки из SQLite (players), топ-200 по
 * трофеям (см. DB.getLeaderboardPlayers). Раньше здесь был статичный
 * fake-массив LeaderboardPlayers — теперь он больше не используется.
 */
class PlayerLeaderboard {
  /**
   * @param socket
   * @param listType  0 = world, 1 = local, 2 = clubs
   * @param brawlerId id бойца, если открыта вкладка "топ по бойцу" (0 = обычный топ по трофеям)
   * @param self      { HighId, LowId, Trophies } — данные игрока, которому шлём ответ
   */
  constructor(socket, listType = 0, brawlerId = 0, self = null) {
    this.msg       = new Piranha(socket, 24403, 1);
    this.listType  = listType;
    this.brawlerId = brawlerId;
    this.self      = self || { HighId: 0, LowId: 0, Trophies: 0 };
  }

  encode() {
    const w = this.msg.stream;

    w.writeVInt(this.listType);
    w.writeVInt(0);

    if (this.brawlerId > 0) {
      w.writeDataReference(16, this.brawlerId);
    } else {
      w.writeDataReference(0, 0);
    }

    // "Ru" только для локального топа (страна), иначе пусто
    if (this.listType === 1) {
      w.writeString('Ru');
    } else {
      w.writeString(null);
    }

    // Реальные игроки из БД, топ-200 по трофеям. Клубный лидерборд
    // обрабатывается отдельным модулем — здесь только игроки.
    let rows = [];
    try {
      rows = DB.getLeaderboardPlayers(200, this.listType === 1 ? 'RU' : null);
    } catch (e) {
      rows = [];
    }

    const players = rows.map((r, i) => ({
      HighId: r.highId || 0,
      LowId: r.lowId,
      Name: r.name || 'Brawler',
      Trophies: r.trophies || 0,
      Thumbnail: [28, 1],   // дефолтная иконка профиля — колонки под неё пока нет в players
      NameColor: [43, 0],   // дефолтный цвет ника — колонки под него пока нет в players
      AllianceName: '',
    }));

    // Один фейковый "бот" для верха топа (временное решение, реальная
    // синхронизация лидерборда пока не делается — см. TODO в чате).
    // HighId/LowId взяты заведомо несуществующими, чтобы не совпасть с
    // реальным игроком и не сломать поиск selfIndex ниже.
    players.push({
      HighId: 0,
      LowId: 999999999,
      Name: 'KakaoMill',
      Trophies: 45000,
      Thumbnail: [28, 5],
      NameColor: [43, 2],
      AllianceName: 'MILL',
    });

    players.sort((a, b) => b.Trophies - a.Trophies);

    w.writeVInt(players.length);
    for (const p of players) {
      w.writeLogicLong(p.HighId, p.LowId);

      w.writeVInt(1);            // "Неизвестное значение" (референс: Stream.WriteVInt(1))
      w.writeVInt(p.Trophies);

      w.writeBoolean(true);      // референс: Stream.WriteBoolean(true)
      w.writeString(p.AllianceName || null); // имя клуба (пусто если без клана)

      w.writeString(p.Name);
      w.writeVInt(100);          // Level (референс: Stream.WriteVInt(100))
      w.writeVInt(28000000 + p.Thumbnail[1]);
      w.writeVInt(43000000 + p.NameColor[1]);

      w.writeVInt(0);            // AllianceId (референс: fake, всегда 0)
      w.writeBoolean(false);     // Has alliance (референс: Stream.WriteBoolean(false), fake)
    }

    // Позиция игрока в топе (0, если не входит в топ-200) — референс:
    // Stream.WriteVInt(0); Stream.WriteVInt(playerIndex); Stream.WriteVInt(0);
    // Stream.WriteVInt(0); Stream.WriteString(AvatarRegion);
    // (лишнего поля с трофеями самого игрока в референсе нет — раньше оно
    // сдвигало все последующие поля на 1 VInt и ломало парсинг клиентом)
    const selfIndex = players.findIndex(
      (p) => p.HighId === this.self.HighId && p.LowId === this.self.LowId
    );

    w.writeVInt(0);
    w.writeVInt(selfIndex === -1 ? 0 : selfIndex + 1);
    w.writeVInt(0);
    w.writeVInt(0);
    w.writeString('Ru');
  }

  send() {
    this.encode();
    this.msg.send();
  }
}

module.exports = { PlayerLeaderboard };
