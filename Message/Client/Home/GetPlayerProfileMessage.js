'use strict';

const { Stream }               = require('../../../Core/Byte/Stream');
const { PlayerProfileMessage } = require('../../Server/Home/PlayerProfileMessage');
const DB                       = require('../../../Core/Database/DB');
const Logger                   = require('../../../Core/Logger');

/**
 * GetPlayerProfileMessage — клиент шлёт при открытии профиля (тап по
 * аватарке/нику, свой или чужой). Packet ID = 15081 (структура decode
 * взята из RavBrawlV53, GetPlayerProfileMessage.cs — там же используется
 * тем же классом и для "своего", и для "чужого" профиля).
 *
 * Формат: необязательный блок (если первый bool = true — какие-то данные
 * сравнения/приглашения, нам сейчас не нужны) + в конце всегда VInt и
 * AccountId (LogicLong как два фиксированных Int32, не VInt — это ReadLong,
 * а не ReadLogicLong/ReadDataReference). Читаем defensively: если что-то
 * не сошлось — просто откатываемся на профиль самого игрока.
 */
class GetPlayerProfileMessage {
  constructor(socket, payload) {
    this.stream    = new Stream(payload);
    this.socket    = socket;
    this.accountId = null; // [high, low] или null
  }

  decode() {
    try {
      if (this.stream.readBoolean()) {
        this.stream.readVInt();
        this.stream.readLong();
        const count = this.stream.readVInt();
        for (let i = 0; i < count; i++) {
          this.stream.readDataReference();
          this.stream.readVInt();
          this.stream.readVInt();
          this.stream.readVInt();
        }
        this.stream.readVInt();
        this.stream.readString();
        this.stream.readVInt();
        this.stream.readVInt();
        this.stream.readVInt();
        this.stream.readVInt();
      }
      this.stream.readVInt();
      this.accountId = this.stream.readLong();
    } catch (e) {
      this.accountId = null; // payload короче/другой формы — не критично, покажем свой профиль
    }
  }

  process() {
    const selfPlayer = this.socket && this.socket.player;

    let target = selfPlayer;
    if (this.accountId) {
      const [, low] = this.accountId;
      // Свой AccountId шлётся тоже честно (low совпадает с socket.player.lowId) —
      // просто пробуем найти игрока в БД по low; чужих игроков (не входящих
      // в нашу БД, например ботов лидерборда) так не найдём — тогда fallback
      // на self, чем показывать пустой профиль.
      const found = low ? DB.getPlayerByLowId(low) : null;
      if (found) target = found;
    }

    Logger.serverInfo(`PlayerProfile requested: accountId=${this.accountId} -> ${target ? target.name : 'self/unknown'}`);

    const msg = new PlayerProfileMessage(this.socket, target);
    msg.send();
  }
}

module.exports = { GetPlayerProfileMessage };
