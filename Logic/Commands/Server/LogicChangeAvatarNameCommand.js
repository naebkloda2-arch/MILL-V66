'use strict';

/**
 * LogicChangeAvatarNameCommand (id 201) — часть AvailableServerCommandMessage
 * (24111). Взято из script.js (NbsOfflineV64, `LogicChangeAvatarNameCommand`).
 *
 * В референсе после этих полей ещё идёт `LogicCommand.encode()` (пустой
 * заголовок: vint(0)+vint(0)+vLong(0,0)) — но наша уже работающая команда
 * 203 (LogicGiveDeliveryItemsCommand) такой заголовок НЕ пишет, значит в
 * этом проекте обёртка 24111 его не ожидает. Поэтому здесь тоже без
 * заголовка, по аналогии с 203.
 */
class LogicChangeAvatarNameCommand {
  /**
   * @param w      Stream, куда пишем (после commandId=201, который пишет
   *               AvailableServerCommandMessage)
   * @param fields { name }
   */
  static encode(w, fields) {
    w.writeString(fields.name || 'Brawler');
    w.writeVInt(0);
  }
}

module.exports = { LogicChangeAvatarNameCommand };
