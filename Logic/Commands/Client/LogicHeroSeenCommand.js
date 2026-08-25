'use strict';

/**
 * Порт LogicHeroSeenCommand (id 522) — клиент шлёт, когда игрок открыл
 * экран бойца в первый раз ("отметить бойца просмотренным").
 *
 * Поля по питон-эталону (LogicHeroSeenCommand.py):
 *   BrawlerID = readDataReference()
 * (косметика — влияет только на бейдж "NEW" на иконке бойца, ни на что
 * критичное). Раньше не была зарегистрирована → ломала разбор всего хода
 * (см. LogicGiveDeliveryItemsAckCommand.js — тот же класс проблем с 203).
 * Пока просто безопасно съедаем поле, не роняя очередь остальных команд;
 * реальное сохранение State=2 в Logic/Static/brawlers (БД) — отдельная
 * косметическая доработка, не критична сейчас.
 */
class LogicHeroSeenCommand {
  constructor(socket, payload) {
    this.socket = socket;
    this.payload = payload;
  }

  decode(stream) {
    this.brawlerId = stream.readDataReference();
    return { BrawlerID: this.brawlerId };
  }

  execute(playerData) {
    // no-op: косметический флаг "просмотрено", не влияет на баланс/протокол.
  }

  static getCommandType() {
    return 522;
  }
}

module.exports = { LogicHeroSeenCommand };
