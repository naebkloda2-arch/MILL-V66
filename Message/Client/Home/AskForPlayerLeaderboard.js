'use strict';

const { Stream }            = require('../../../Core/Byte/Stream');
const { PlayerLeaderboard } = require('../../Server/Home/PlayerLeaderboard');
const Logger                = require('../../../Core/Logger');

/**
 * AskForPlayerLeaderboard — клиент шлёт при открытии вкладки рейтинга
 * (ScoresPage в клиентских логах). Packet ID = 14403 (подтверждено v68-дебагом).
 *
 * Ответ 24403 подтверждён рабочим Python-сервером (в55/в63/в64), поле
 * "Type" там же читается как: 0 = мир, 1 = локальный/страна, 2 = клубы.
 *
 * Точный decode запроса не подтверждён (у нас нет исходного decode() для
 * 14403, только encode ответа), поэтому читаем по аналогии с полями
 * ответа — если что-то не сходится, будет видно в логе serverInfo.
 *
 * self теперь берётся из socket.player (прикрепляется при Auth), а не из
 * захардкоженной константы — это нужно, чтобы клиент корректно подсвечивал
 * собственную строку в топе и показывал реальное место игрока.
 */
class AskForPlayerLeaderboard {
  constructor(socket, payload) {
    this.stream    = new Stream(payload);
    this.socket    = socket;
    this.listType  = 0; // 0 = world, 1 = local, 2 = clubs
    this.brawlerId = 0;
  }

  decode() {
    try {
      this.listType = this.stream.readVInt();
    } catch (e) { /* payload короче ожидаемого — оставляем дефолт */ }

    try {
      this.brawlerId = this.stream.readVInt();
    } catch (e) { /* нет второго поля — не критично */ }
  }

  process() {
    Logger.serverInfo(`Leaderboard requested: type=${this.listType} brawlerId=${this.brawlerId}`);

    const player = this.socket && this.socket.player;
    const self = player
      ? { HighId: player.highId || 0, LowId: player.lowId, Trophies: player.trophies || 0 }
      : { HighId: 0, LowId: 0, Trophies: 0 };

    const msg = new PlayerLeaderboard(this.socket, this.listType, this.brawlerId, self);
    msg.send();
  }
}

module.exports = { AskForPlayerLeaderboard };
