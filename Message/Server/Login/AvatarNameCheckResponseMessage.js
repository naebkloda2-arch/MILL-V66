'use strict';

const { Piranha } = require('../../../Core/Piranha');

/**
 * AvatarNameCheckResponseMessage (20300) — ответ на AvatarNameCheckMessage
 * (14600). Взято из script.js (NbsOfflineV64, `AvatarNameCheckResponseMessage`).
 *
 * writeBoolean(false) — флаг "имя занято/недоступно" (у нас всегда false,
 * своей проверки уникальности имён пока нет, разрешаем любое имя).
 * writeInt(0) — код ошибки, 0 = нет ошибки.
 * writeString(name) — эхо предложенного имени обратно.
 */
class AvatarNameCheckResponseMessage {
  constructor(socket, name) {
    this.msg  = new Piranha(socket, 20300, 1);
    this.name = name;
  }

  encode() {
    const w = this.msg.stream;
    w.writeBoolean(false);
    w.writeInt(0);
    w.writeString(this.name || '');
  }

  send() {
    this.encode();
    this.msg.send();
  }
}

module.exports = { AvatarNameCheckResponseMessage };
