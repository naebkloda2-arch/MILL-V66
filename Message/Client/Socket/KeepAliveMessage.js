'use strict';

const { KeepAliveServerMessage } = require('../../Server/Socket/KeepAliveServerMessage');

/**
 * Порт KeepAliveMessage (id 10108). По карте пакетов (LogicLaserMessageFactory)
 * это чисто keepalive-пинг от клиента, без полей — сервер должен ответить
 * KeepAliveServerMessage (20108), тоже без полей, иначе клиент может решить,
 * что соединение мертво, и оборвать его сам (см. заметку в исходном анализе
 * логов — дисконнекты в конце сессии шли сразу после Not Found (10108)).
 */
class KeepAliveMessage {
  constructor(socket, payload) {
    this.socket = socket;
    this.payload = payload;
  }

  decode() {
    // тело пустое, читать нечего
  }

  process() {
    const response = new KeepAliveServerMessage(this.socket);
    response.send();
  }
}

module.exports = { KeepAliveMessage };
