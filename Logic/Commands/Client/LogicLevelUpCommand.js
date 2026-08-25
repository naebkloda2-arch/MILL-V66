'use strict';

const DB = require('../../../Core/Database/DB');

/**
 * Порт LogicLevelUpCommand (id 520) — прокачка Power Level бойца.
 *
 * Поля по питон-эталону: BrawlerID = readDataReference().
 * Стоимость по уровням (тот же эталон, PowerLevel 1..10 -> cost):
 *   20, 35, 75, 140, 290, 480, 800, 1250, 1875, 2800
 * Кап на 11 (после 11 апгрейд не проходит и деньги не списываются).
 *
 * Раньше эта команда не была зарегистрирована вообще → ломала разбор
 * всего хода (см. LogicGiveDeliveryItemsAckCommand.js). Теперь пишет
 * реальный прогресс в БД (таблица brawlers, та же что и для кубков) —
 * НО: баланс монет и Power Level в главном экране (OwnData.js) всё ещё
 * захардкожены/не подключены к этому — то есть списание и апгрейд теперь
 * по-настоящему сохраняются в БД, но визуально в игре пока не отразятся,
 * пока не подключим OwnData.js к реальным Coins/PowerLevel (отдельная
 * работа с осторожной "хрупкой зоной", см. обсуждение в чате).
 */
const UPGRADE_COST = [20, 35, 75, 140, 290, 480, 800, 1250, 1875, 2800]; // индекс = PowerLevel-1

class LogicLevelUpCommand {
  constructor(socket, payload) {
    this.socket = socket;
    this.payload = payload;
  }

  decode(stream) {
    this.brawlerId = stream.readDataReference();
    return { BrawlerID: this.brawlerId };
  }

  execute(playerData) {
    const Logger = require('../../../Core/Logger');
    const lowId = this.socket && this.socket.player ? this.socket.player.lowId : 0;
    const characterId = Array.isArray(this.brawlerId) ? this.brawlerId[1] : 0;

    const brawlers = DB.getBrawlers(lowId);
    const brawler = brawlers.find((b) => b.character_id === characterId);
    if (!brawler) {
      Logger.clientErr(`[520] level up: brawler characterId=${characterId} not found for lowId=${lowId}`);
      return;
    }

    if (brawler.power_level >= 11) {
      Logger.serverInfo(`[520] level up: characterId=${characterId} already at max PowerLevel 11, ignoring`);
      return;
    }

    const cost = UPGRADE_COST[brawler.power_level - 1] || 0;
    const newGold = DB.addGold(lowId, -cost);
    const newLevel = brawler.power_level + 1;

    DB.upsertBrawler(lowId, characterId, brawler.trophies, brawler.highest_trophies, newLevel);

    Logger.serverInfo(`[520] level up: characterId=${characterId} PowerLevel ${brawler.power_level}->${newLevel}, cost=${cost}, gold now=${newGold}`);
  }

  static getCommandType() {
    return 520;
  }
}

module.exports = { LogicLevelUpCommand };
