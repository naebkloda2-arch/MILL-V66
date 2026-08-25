'use strict';

const { Stream } = require('../../../Core/Byte/Stream');
const { AvatarNameCheckResponseMessage } = require('../../Server/Login/AvatarNameCheckResponseMessage');

/**
 * AvatarNameCheckMessage (14600) — клиент спрашивает "это имя ок?" перед
 * тем как реально сменить ник. Взято из script.js (NbsOfflineV64,
 * `AvatarNameCheckRequestMessage`): decode = просто readString().
 */
class AvatarNameCheckMessage {
  constructor(socket, payload) {
    this.stream = new Stream(payload);
    this.socket = socket;
    this.name   = '';
  }

  decode() {
    this.name = this.stream.readString();
  }

  process() {
    const msg = new AvatarNameCheckResponseMessage(this.socket, this.name);
    msg.send();
  }
}

module.exports = { AvatarNameCheckMessage };
