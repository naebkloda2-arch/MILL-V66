'use strict';

const { Stream } = require('../../../Core/Byte/Stream');
const { Hello: TxHello } = require('../../Server/Login/Hello');

class Hello {
  constructor(socket, payload) {
    this.stream = new Stream(payload);
    this.socket = socket;
  }

  decode() {
    // Nothing to decode for Hello
  }

  process() {
    const msg = new TxHello(this.socket);
    msg.send();
  }
}

module.exports = { Hello };
