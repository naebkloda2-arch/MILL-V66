'use strict';

const { Piranha } = require('../../../Core/Piranha');

/**
 * Портировано из присланного дампа BattleEndMessage (id 23456).
 * Оригинал был написан под PiranhaMessage/writeHex из другого проекта —
 * здесь адаптирован под текущий Core/Piranha + Core/Byte/Stream (writeHex
 * там уже есть, см. Stream.js, поэтому бинарная структура сохранена 1:1).
 *
 * ВАЖНО: это "фейковый" конец боя — реального симулированного матча нет,
 * просто сразу шлём готовый пакет результата, где наш игрок — победитель
 * (Team 1, позиция 0, положительное изменение трофеев). Используется как
 * заглушка на команду 1000 (запуск матчмейкинга), пока нет реальной
 * серверной battle-симуляции.
 *
 * @param {import('net').Socket} socket
 * @param {object} player  { name, uid: [high, low], brawlerId, trophies }
 */
class BattleEndMessage {
  constructor(socket, player = {}) {
    this.msg = new Piranha(socket, 23456, 1);
    this.player = {
      name: player.name || 'Player',
      uidHigh: player.uid ? player.uid[0] : 0,
      uidLow: player.uid ? player.uid[1] : 1,
      brawlerId: player.brawlerId != null ? player.brawlerId : 16, // Shelly по умолчанию
      trophyChange: player.trophyChange != null ? player.trophyChange : 8, // +8 трофеев за победу
    };
  }

  encode() {
    const w = this.msg.stream;

    // --- Battle header ---
    w.writeInt(0)   // Unknown
    w.writeInt(0)   // Unknown
    w.writeInt(0)   // Unknown
    w.writeInt(0)   // Unknown

    // --- Player count and mode info ---
    w.writeVInt(2)  // Team count (2 teams)
    w.writeVInt(9)  // Players per team (9)
    w.writeVInt(9)  // (repeated)

    // --- Static header block ---
    w.writeHex('0000000000000000000000000000000000000000107F000A')

    // ── Team 1 (Blue) — наш игрок первым, это Т1/победитель ──────────────
    w.writeVInt(2)
    w.writeVInt(16)
    w.writeVInt(this.player.brawlerId)
    w.writeVInt(1)
    w.writeInt(0x1d840d01)
    w.writeVInt(0xad08)
    w.writeVInt(1)
    w.writeVInt(0x0b)
    w.writeVInt(1)
    w.writeInt(this.player.uidHigh)
    w.writeInt(this.player.uidLow)
    w.writeInt(0x0f74209d)
    w.writeString(this.player.name)
    w.writeVInt(0x3f)
    w.writeVInt(0xa401)
    w.writeVInt(0x018e)
    w.writeVInt(0x85da)
    w.writeVInt(0x1a8a)
    w.writeVInt(0x83812900)
    w.writeInt(0)
    w.writeInt(0)
    w.writeInt(0)
    w.writeInt(0)
    w.writeVInt(this.player.trophyChange) // Trophy change (положительное — победа)
    w.writeVInt(0xa601)  // Star player flags
    w.writeVInt(0x9501)  // Rank
    w.writeVInt(1)       // Position в команде — 1 (первое место/T1)

    // Player 2 бота — заполняем командой из шаблона
    this._writeBotPlayer(w, ' curry ', 0x8c01, 0x1db40e01, 0x9d04, 0x0f9aa2dd, [0xa401, 0xa5fc, 0xd91a, 0x8b83, 0x8129], [0, 0, 0x01000004, 0x4c000000], [0x8c01, 0x0c, 0x9501, 0x0d])
    this._writeBotPlayer(w, 'RedPandaW', 18, 0x1d8804, 0x019e02, 0x0986bf3e, [0xa401, 0xb283, 0xda1a, 0x8683, 0x8129], [0, 0, 0, 0], [0x8c01, 0x3a])
    this._writeBotPlayer(w, 'anyyllsss ', 20, 0x1db411, 0x01ae01, 0x0f90b715, [0xa401, 0xad82, 0xda1a, 0x8783, 0x8129], [0, 0, 0, 0], [0x9501, 0x0d])
    this._writeBotPlayer(w, 'Yağızな🤍', 57, 0x1d8b11, 0x019001, 0x0cfb65ce, [0xa401, 0x9e86, 0xda1a, 0x8083, 0x8129], [0, 0, 0, 0], [0x8c01, 0x8402, 0x9501, 0x0a])
    this._writeBotPlayer(w, 'VINDI', 11, 0x1d820b01, 0x28, 0x0f951222, [0xa401, 0xa786, 0xda1a, 0x8083, 0x8129], [0, 0, 0, 0], [0x8c01, 0x9b01, 0x9501, 0x0a])

    // --- Team 2 (Red) — проигравшая команда (боты-заглушки) ---
    // Player 8 (пустое имя-плейсхолдер из оригинального дампа)
    w.writeVInt(0)
    w.writeVInt(2)
    w.writeVInt(16)
    w.writeVInt(0x8c01)
    w.writeVInt(1)
    w.writeInt(0x1d840d01)
    w.writeVInt(0)
    w.writeInt(0)
    w.writeInt(1)
    w.writeInt(0x0fc3df8b)
    w.writeString('')
    w.writeVInt(0xa401)
    w.writeVInt(0x80fc)
    w.writeVInt(0xd91a)
    w.writeVInt(0x8083)
    w.writeVInt(0x8129)
    w.writeInt(0)
    w.writeInt(0)
    w.writeInt(0)
    w.writeInt(1)
    w.writeInt(0)
    w.writeInt(0)
    w.writeInt(0)
    w.writeInt(0)

    // Player 9: "NE BAKIYON"
    w.writeVInt(2)
    w.writeVInt(16)
    w.writeVInt(0xa501)
    w.writeVInt(1)
    w.writeInt(0x1db81501)
    w.writeVInt(0)
    w.writeVInt(1)
    w.writeVInt(0x0b)
    w.writeVInt(1)
    w.writeInt(0)
    w.writeInt(1)
    w.writeInt(0x0fc07575)
    w.writeString('NE BAKIYON')
    w.writeVInt(0xa401)
    w.writeVInt(0x80fc)
    w.writeVInt(0xd91a)
    w.writeVInt(0x8083)
    w.writeVInt(0x8129)
    w.writeInt(0)
    w.writeInt(0)
    w.writeInt(0)
    w.writeInt(0)
    w.writeInt(0)
    w.writeInt(0)

    // Player 10: "\~zeta` \~○●"
    w.writeVInt(0)
    w.writeVInt(2)
    w.writeVInt(16)
    w.writeVInt(40)
    w.writeVInt(1)
    w.writeInt(0x98040100 | 0)
    w.writeVInt(1)
    w.writeVInt(0x0b)
    w.writeVInt(1)
    w.writeInt(0)
    w.writeInt(1)
    w.writeInt(0x0fb91c61)
    w.writeString('\\~zeta` \\~○●')
    w.writeVInt(0xa401)
    w.writeVInt(0xa285)
    w.writeVInt(0xda1a)
    w.writeVInt(0x8b83)
    w.writeVInt(0x8129)
    w.writeInt(0)
    w.writeInt(0)
    w.writeInt(0)
    w.writeInt(0)
    w.writeVInt(0x8c01)
    w.writeVInt(0xb201)
    w.writeVInt(0x9501)
    w.writeVInt(0x0b)

    // --- Battle result footer ---
    w.writeVInt(0)    // Winner team: 0 = Team 1 (наша) победила
    w.writeVInt(3)
    w.writeVInt(4)
    w.writeInt(0)
    w.writeInt(0x09b044)
    w.writeInt(0x0d01)
    w.writeInt(0)
    w.writeInt(0x02010000)
    w.writeInt(5)
    w.writeInt(0)
    w.writeInt(1)
    w.writeInt(0)
    w.writeInt(0)
    w.writeInt(1)
    w.writeInt(0)
    w.writeInt(0x0fc3df8b)
    w.writeInt(0)
    w.writeInt(1)
    w.writeInt(-1)
    w.writeByte(0)
    w.writeVInt(6)
    w.writeVInt(2)
    w.writeHex('000000000000000000000000000000000000000000000000000000')
  }

  // Хелпер для ботов команды-победителя — берёт структуру 1:1 из
  // оригинального дампа, просто параметризован именем/id/статами.
  _writeBotPlayer(w, name, brawlerId, uidPart, statA, uid, trophyBlock, zeroInts, tail) {
    w.writeVInt(0)
    w.writeVInt(2)
    w.writeVInt(16)
    w.writeVInt(brawlerId)
    w.writeVInt(1)
    w.writeInt(uidPart)
    w.writeVInt(statA)
    w.writeVInt(1)
    w.writeVInt(0x0b)
    w.writeVInt(1)
    w.writeInt(0)
    w.writeInt(1)
    w.writeInt(uid)
    w.writeString(name)
    for (const v of trophyBlock) w.writeVInt(v)
    for (const v of zeroInts) w.writeInt(v)
    for (const v of tail) w.writeVInt(v)
  }

  send() {
    this.encode()
    this.msg.send()
  }
}

module.exports = { BattleEndMessage }
