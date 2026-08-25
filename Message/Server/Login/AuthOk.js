'use strict';

const { Piranha } = require('../../../Core/Piranha');

class AuthOk {
  constructor(socket, player = null) {
    this.msg = new Piranha(socket, 20104, 1);
    this.player = player;
  }

  encode() {
    const w  = this.msg.stream;
    const ts = Date.now().toString();

    const highId = this.player ? this.player.highId : 0;
    const lowId  = this.player ? this.player.lowId  : 1;
    const token  = this.player ? this.player.token  : 'psinatoken';

    w.writeLong(highId, lowId);
    w.writeLong(highId, lowId);
    w.writeString(token);
    w.writeString(null);
    w.writeString(null);
    w.writeInt(66);   // version 66
    w.writeInt(264);
    w.writeInt(1);
    w.writeString('prod');
    w.writeInt(0);
    w.writeInt(0);
    w.writeInt(1);
    w.writeString('');
    w.writeString(ts);
    w.writeString(ts);
  }

  send() {
    this.encode();
    this.msg.send();
  }
}

module.exports = { AuthOk };
