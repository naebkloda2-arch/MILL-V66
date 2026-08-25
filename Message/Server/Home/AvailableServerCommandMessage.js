'use strict';

const { Piranha } = require('../../../Core/Piranha');
const { LogicGiveDeliveryItemsCommand } = require('../../../Logic/Commands/Server/LogicGiveDeliveryItemsCommand');
const { LogicChangeAvatarNameCommand } = require('../../../Logic/Commands/Server/LogicChangeAvatarNameCommand');

/**
 * Порт AvailableServerCommandMessage (id 24111).
 * Пишет VInt(commandID), затем делегирует encode конкретной серверной команде.
 *
 * Сейчас поддерживаем только commandID === 203 (LogicGiveDeliveryItemsCommand),
 * т.к. это единственная серверная команда, которая нам сейчас нужна для стардропа.
 * Остальные (LogicOffersChangedCommand и т.д.) можно добавить сюда же по мере надобности.
 */
class AvailableServerCommandMessage {
  /**
   * @param socket
   * @param commandId  например 203
   * @param fields     { playerData: {...} } — передаётся в encode конкретной команды
   */
  constructor(socket, commandId, fields) {
    this.msg = new Piranha(socket, 24111, 1);
    this.commandId = commandId;
    this.fields = fields;
  }

  encode() {
    const w = this.msg.stream;
    w.writeVInt(this.commandId);

    switch (this.commandId) {
      case 203:
        LogicGiveDeliveryItemsCommand.encode(w, this.fields);
        break;
      case 201:
        LogicChangeAvatarNameCommand.encode(w, this.fields);
        break;
      default:
        // неизвестная команда — пишем пустое тело, чтобы не сломать стрим
        break;
    }
  }

  send() {
    this.encode();
    this.msg.send();
  }
}

module.exports = { AvailableServerCommandMessage };
