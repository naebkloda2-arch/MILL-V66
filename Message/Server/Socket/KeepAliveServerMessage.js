'use strict';

const { Piranha } = require('../../../Core/Piranha');

/**
 * Порт KeepAliveServerMessage (id 20108). Ответ на KeepAliveMessage (10108),
 * пустое тело — подтверждает клиенту, что соединение живо.
 */
class KeepAliveServerMessage {
  constructor(socket) {
    this.msg = new Piranha(socket, 20108, 1);
  }

  encode() {
    // тело пустое
  }

  send() {
    this.encode();
    this.msg.send();
  }
}

module.exports = { KeepAliveServerMessage };
