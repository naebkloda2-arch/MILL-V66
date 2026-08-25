'use strict';

const { Stream }  = require('../../../Core/Byte/Stream');
const { AuthOk }  = require('../../Server/Login/AuthOk');
const { OwnData } = require('../../Server/Home/OwnData');
const DB          = require('../../../Core/Database/DB');
const Logger      = require('../../../Core/Logger');

class Auth {
  constructor(socket, payload) {
    this.stream  = new Stream(payload);
    this.socket  = socket;
    this.highId  = 0;
    this.lowId   = 0;
    this.token   = '';
    this.major   = 0;
    this.build   = 0;
    this.content = 0;
  }

  decode() {
    this.highId  = this.stream.readInt();
    this.lowId   = this.stream.readInt();
    this.token   = this.stream.readString();
    this.major   = this.stream.readVInt();
    this.build   = this.stream.readVInt();
    this.content = this.stream.readVInt();
  }

  process() {
    // Загружаем/создаём игрока в БД по highId/lowId клиента.
    // lowId=0 (гостевой первый вход без сохранённого аккаунта) — генерируем
    // новый lowId так же, как это делает клиент: используем текущий счётчик.
    let lowId = this.lowId;
    if (!lowId || lowId <= 0) {
      const row = DB.db.prepare('SELECT COALESCE(MAX(lowId), 0) + 1 AS next FROM players').get();
      lowId = row.next;
    }

    const existedBefore = !!DB.getPlayerByLowId(lowId);
    this.player = DB.loadOrCreatePlayer(lowId, this.highId);
    Logger.playerTag(this.player.tag, !existedBefore);

    // Прикрепляем игрока к сокету, чтобы другие обработчики (например
    // EndClientTurnMessage / LogicViewInboxNotificationCommand) могли
    // достать lowId без повторной авторизации.
    this.socket.player = this.player;

    // Original Zig sleeps 2 s before replying — replicated with setTimeout
    setTimeout(() => {
      const ok = new AuthOk(this.socket, this.player);
      ok.send();

      const home = new OwnData(this.socket, this.player);
      home.send();
    }, 2000);
  }
}

module.exports = { Auth };
