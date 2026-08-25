'use strict';

const { Piranha } = require('../../../Core/Piranha');

class Hello {
  constructor(socket) {
    this.msg = new Piranha(socket, 20100, 0);
  }

  encode() {
    const w = this.msg.stream;
    w.writeInt(24);
    for (let i = 0; i < 24; i++) w.writeByte(1);
  }

  send() {
    this.encode();
    this.msg.send();
  }
}

module.exports = { Hello };
