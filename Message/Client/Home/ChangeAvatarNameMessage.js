'use strict';

const { Stream } = require('../../../Core/Byte/Stream');
const { AvailableServerCommandMessage } = require('../../Server/Home/AvailableServerCommandMessage');
const DB     = require('../../../Core/Database/DB');
const Logger = require('../../../Core/Logger');

/**
 * ChangeAvatarNameMessage (10212) — клиент реально меняет ник. Взято из
 * script.js (NbsOfflineV64, `ChangeAvatarNameMessage`): decode = readString(),
 * execute = сохранить имя + отправить подтверждение через
 * LogicChangeAvatarNameCommand (id 201) внутри AvailableServerCommandMessage
 * (24111) — см. Logic/Commands/Server/LogicChangeAvatarNameCommand.js.
 */
class ChangeAvatarNameMessage {
  constructor(socket, payload) {
    this.stream = new Stream(payload);
    this.socket = socket;
    this.name   = '';
  }

  decode() {
    this.name = this.stream.readString();
  }

  process() {
    const player = this.socket && this.socket.player;
    if (!player || !this.name) return;

    DB.setPlayerName(player.lowId, this.name);
    player.name = this.name; // держим socket.player в актуальном состоянии до следующего логина

    Logger.serverInfo(`ChangeAvatarName: lowId=${player.lowId} -> "${this.name}"`);

    const msg = new AvailableServerCommandMessage(this.socket, 201, { name: this.name });
    msg.send();
  }
}

module.exports = { ChangeAvatarNameMessage };
