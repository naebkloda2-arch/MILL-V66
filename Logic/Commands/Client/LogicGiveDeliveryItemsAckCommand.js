'use strict';

/**
 * КРИТИЧНЫЙ ФИКС (найдено 30.07 по логу — "command 203 not implemented").
 *
 * 203 (LogicGiveDeliveryItemsCommand) — это НЕ только наша исходящая
 * команда (см. Logic/Commands/Server/LogicGiveDeliveryItemsCommand.js,
 * которую мы шлём через 24111 после клейма БП/покупки). В LogicCommandManager.py
 * (эталон) она же зарегистрирована и как ВХОДЯЩАЯ команда — клиент сам
 * присылает "203" внутри своего EndClientTurnMessage (14102), судя по
 * всему как подтверждение/эхо после получения награды.
 *
 * Раньше мы её не знали → EndClientTurnMessage.js видел неизвестный ID,
 * не мог посчитать длину и ОБРЫВАЛ разбор всего хода (stopping turn parse
 * here), из-за чего ЛЮБЫЕ команды, прилетевшие в одном пакете ПОСЛЕ этого
 * эха 203 (например следующая покупка 519), просто терялись — сервер их
 * никогда не видел, клиент вечно ждал ответ. Это и есть настоящая причина
 * "случайных" зависаний покупок после клейма БП, а не блинги как таковые
 * (блинги просто чаще фигурируют рядом с пинами/БП по совпадению).
 *
 * Реальный decode() в питон-эталоне (Classes/Commands/Server/LogicGiveDeliveryItemsCommand.py):
 *   def decode(self, calling_instance):
 *       fields = {}
 *       return fields
 * — то есть НОЛЬ дополнительных полей после стандартного LogicCommand-заголовка
 * (TickWhenGiven/ExecuteTick/ExecutorAccountID), который уже читает сам
 * EndClientTurnMessage.js до вызова decode(). Значит здесь просто ничего
 * читать не нужно — regестрируем как безопасный no-op, чтобы разбор хода
 * продолжался дальше и не терял следующие команды.
 */
class LogicGiveDeliveryItemsAckCommand {
  constructor(socket, payload) {
    this.socket = socket;
    this.payload = payload;
  }

  decode(stream) {
    return {};
  }

  execute(playerData) {
    // Клиентское эхо получения награды — на сервере ничего делать не нужно,
    // сама выдача уже произошла раньше (в 517/519), это просто квитанция.
  }

  static getCommandType() {
    return 203;
  }
}

module.exports = { LogicGiveDeliveryItemsAckCommand };
