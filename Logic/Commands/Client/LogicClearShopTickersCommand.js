'use strict';

/**
 * Порт LogicClearShopTickersCommand (id 515).
 * Поля по питон-референсу (auto_decode=False, т.е. без TickWhenGiven/ExecuteTick/
 * ExecutorAccountID здесь — те уже читаются роутером EndClientTurnMessage до вызова decode):
 *   Reason  = readVInt()
 *   Reason  = readVInt()   (да, читается дважды подряд в референсе — оставляем как есть)
 *   OfferID = readVInt()
 *   Unk     = readVInt()
 *
 * execute() в референсе — no-op (pass), сервер ничего не делает в ответ.
 */
class LogicClearShopTickersCommand {
  constructor(socket, payload) {
    this.socket = socket;
    this.payload = payload;
  }

  decode(stream) {
    this.reason1 = stream.readVInt();
    this.reason2 = stream.readVInt();
    this.offerId = stream.readVInt();
    this.unk     = stream.readVInt();
    return {
      Reason: this.reason2,
      OfferID: this.offerId,
      Unk: this.unk,
    };
  }

  execute() {
    // no-op, как и в питон-референсе
  }

  static getCommandType() {
    return 515;
  }
}

module.exports = { LogicClearShopTickersCommand };
