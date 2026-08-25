'use strict';

const { BattleEndMessage } = require('../../../Message/Server/Home/BattleEndMessage');

/**
 * Порт LogicStartMatchmakingCommand (id 1000) — клиент шлёт при нажатии
 * "Играть" / входе в поиск боя.
 *
 * Реальная структура полей команды 1000 пока не разобрана (см. диагностику
 * в EndClientTurnMessage — байты после неё не читались ни как известный
 * LogicCommand). Раз мы не эмулируем реальный матч, поля нам не критичны —
 * просто НЕ трогаем stream (оставляем decode пустым) и сразу отвечаем
 * готовым BattleEndMessage, где наш игрок — победитель команды 1.
 *
 * ВАЖНО: поскольку формат полей неизвестен, эта команда обязана быть
 * ПОСЛЕДНЕЙ читаемой командой в ходу (см. EndClientTurnMessage — после
 * неизвестной команды парсинг хода в любом случае останавливается, так
 * что это не ломает уже работающий разбор остальных команд).
 */
class LogicStartMatchmakingCommand {
  constructor(socket, payload) {
    this.socket = socket;
    this.payload = payload;
  }

  decode(stream) {
    // Поля неизвестны и не нужны для фейкового конца боя — не читаем.
    return {};
  }

  execute(playerData) {
    const socket = this.socket;
    const player = (socket && socket.player) || {};

    const battleEnd = new BattleEndMessage(socket, {
      name: player.name || 'KakaoMill',
      uid: [player.highId || 0, player.lowId || 1],
      brawlerId: (playerData && playerData.selectedBrawlerId) || 16,
      trophyChange: 8,
    });

    // Небольшая задержка — чтобы клиент успел отрисовать экран загрузки
    // боя перед тем, как мы сразу пришлём его результат (иначе UI может
    // моргнуть/пропустить анимацию входа в матч).
    setTimeout(() => {
      try {
        battleEnd.send();
      } catch (err) {
        const Logger = require('../../../Core/Logger');
        Logger.clientErr(`[1000] failed to send BattleEndMessage: ${err.message}`);
      }
    }, 1500);
  }

  static getCommandType() {
    return 1000;
  }
}

module.exports = { LogicStartMatchmakingCommand };
