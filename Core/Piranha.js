'use strict';

const { Stream } = require('./Byte/Stream');
const Logger     = require('./Logger');

class Piranha {
  /**
   * @param {import('net').Socket} socket
   * @param {number} id       message id
   * @param {number} version  message version
   */
  constructor(socket, id, version) {
    this.stream  = new Stream();
    this.id      = id;
    this.version = version;
    this.socket  = socket;
  }

  send() {
    if (this.id < 20_000) return;

    const body = this.stream.toBuffer();
    const bodyLen = body.length;

    // 7-byte header: [u16 id][u24 len][u16 version]
    const header = Buffer.alloc(7);
    header.writeUInt16BE(this.id, 0);
    header[2] = (bodyLen >>> 16) & 0xff;
    header[3] = (bodyLen >>> 8)  & 0xff;
    header[4] =  bodyLen         & 0xff;
    header.writeUInt16BE(this.version, 5);

    this.socket.write(header);
    this.socket.write(body);

    Logger.packetOut(this.id);
  }
}

module.exports = { Piranha };
