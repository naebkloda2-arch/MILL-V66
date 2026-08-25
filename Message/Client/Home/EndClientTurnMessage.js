'use strict';

const { Stream } = require('../../../Core/Byte/Stream');
const Logger     = require('../../../Core/Logger');
const { Piranha } = require('../../../Core/Piranha');
const { LogicPurchaseOfferCommand } = require('../../../Logic/Commands/Client/LogicPurchaseOfferCommand');
const { LogicClearShopTickersCommand } = require('../../../Logic/Commands/Client/LogicClearShopTickersCommand');
const { LogicClaimRankUpRewardCommand } = require('../../../Logic/Commands/Client/LogicClaimRankUpRewardCommand');
const { LogicGatchaCommand } = require('../../../Logic/Commands/Client/LogicGatchaCommand');
const { LogicViewInboxNotificationCommand } = require('../../../Logic/Commands/Client/LogicViewInboxNotificationCommand');
const { LogicGiveDeliveryItemsCommand } = require('../../../Logic/Commands/Server/LogicGiveDeliveryItemsCommand');
const { LogicGiveDeliveryItemsAckCommand } = require('../../../Logic/Commands/Client/LogicGiveDeliveryItemsAckCommand');
const { LogicHeroSeenCommand } = require('../../../Logic/Commands/Client/LogicHeroSeenCommand');
const { LogicLevelUpCommand } = require('../../../Logic/Commands/Client/LogicLevelUpCommand');
const { LogicStartMatchmakingCommand } = require('../../../Logic/Commands/Client/LogicStartMatchmakingCommand');

/**
 * Порт EndClientTurnMessage (id 14102).
 *
 * ИСПРАВЛЕНО (см. разбор реальных дампов): в этой версии протокола НЕТ
 * отдельного поля Checksum между Tick и CommandsCount. Реальная схема:
 *
 *   readBoolean()
 *   Tick           = readVInt()
 *   CommandsCount  = readVInt()      ← раньше ошибочно называлось "Checksum"
 *   for i in CommandsCount:
 *     CommandID = readVInt()          ← раньше ошибочно читалось как "CommandsCount"
 *     TickWhenGiven     = readVInt()  \
 *     ExecuteTick       = readVInt()   | LogicCommand base header
 *     ExecutorAccountID = readLogicLong()/
 *     <command-specific fields>
 *
 * Подтверждено на реальных дампах: поле, которое раньше логировалось как
 * commandsCount=515/517, на самом деле было CommandID (515=LogicClearShopTickersCommand,
 * 517=LogicClaimRankUpRewardCommand — оба существуют в LogicCommandManager
 * питон-референса). Поле перед ним (раньше "checksum", всегда 0/1/2) —
 * настоящий CommandsCount. Пустые ходы (без команд) кодируются просто как
 * Tick + CommandsCount(=0), без всякого третьего поля — отсюда и путаница.
 */
const DEBUG_TURN = true;

// временное хранилище данных игрока на соединение для команд, которым
// ещё не досталась своя таблица в БД (гача, покупки офферов и т.п.).
// LogicViewInboxNotificationCommand (528) в эту заглушку не пишет — она
// работает напрямую с socket.player + БД (см. её собственный execute).
const playerDataBySocket = new WeakMap();

function getPlayerData(socket) {
  if (!playerDataBySocket.has(socket)) {
    playerDataBySocket.set(socket, {
      Coins: 0, Gems: 0, Blings: 0,
      OwnedBrawlers: {}, OwnedSkins: [], OwnedPins: [], OwnedThumbnails: [],
    });
  }
  return playerDataBySocket.get(socket);
}

// registry: commandId -> class с decode(stream)+execute(playerData)
const KNOWN_COMMANDS = {
  203: LogicGiveDeliveryItemsAckCommand,
  500: LogicGatchaCommand,
  515: LogicClearShopTickersCommand,
  517: LogicClaimRankUpRewardCommand,
  519: LogicPurchaseOfferCommand,
  520: LogicLevelUpCommand,
  522: LogicHeroSeenCommand,
  528: LogicViewInboxNotificationCommand,
  1000: LogicStartMatchmakingCommand,
};

class EndClientTurnMessage {
  constructor(socket, payload) {
    this.stream = new Stream(payload);
    this.socket = socket;
    this.payload = payload;
  }

  decode() {
    const s = this.stream;
    const dbg = (label) => {
      if (DEBUG_TURN) Logger.serverInfo(`[14102] ${label} @offset=${s._offset}`);
    };

    this.commands = [];

    try {
      this.hasBool = s.readBoolean();
      dbg(`bool=${this.hasBool}`);

      this.tick = s.readVInt();
      dbg(`tick=${this.tick}`);

      this.commandsCount = s.readVInt();
      dbg(`commandsCount=${this.commandsCount}`);

      if (this.commandsCount < 0 || this.commandsCount > 50) {
        Logger.clientErr(`[14102] commandsCount looks invalid (${this.commandsCount}) — payload likely doesn't match expected layout. Raw hex: ${this.payload.toString('hex')}. Continuing anyway to see what we can read.`);
      }

      const maxAttempts = Math.min(this.commandsCount > 0 ? this.commandsCount : 0, 50);

      for (let i = 0; i < maxAttempts; i++) {
        if (s._offset >= this.payload.length) {
          Logger.serverInfo(`[14102] ran out of bytes at command ${i}/${maxAttempts} (offset=${s._offset}, len=${this.payload.length}) — stopping here`);
          break;
        }

        const commandId = s.readVInt();
        dbg(`command[${i}].id=${commandId}`);

        const CommandClass = KNOWN_COMMANDS[commandId];
        if (!CommandClass) {
          const remainingHex = this.payload.slice(s._offset).toString('hex');
          Logger.serverInfo(`[14102] command ${commandId} not implemented (index ${i}/${maxAttempts}, offset=${s._offset}). Remaining bytes from here: ${remainingHex}`);

          // Пробуем прочитать LogicCommand-заголовок даже для неизвестной
          // команды — чисто для диагностики (не критично, если это не он:
          // мы всё равно останавливаемся дальше, просто больше контекста в логе).
          try {
            const savedOffset = s._offset;
            const tickWhenGiven = s.readVInt();
            const executeTick   = s.readVInt();
            const executorAccountId = s.readLogicLong();
            Logger.serverInfo(`[14102]   (diagnostic only) if this were a LogicCommand header: tickWhenGiven=${tickWhenGiven} executeTick=${executeTick} executor=${executorAccountId}, then remaining: ${this.payload.slice(s._offset).toString('hex')}`);
            s._offset = savedOffset; // откатываем, т.к. это только диагностика
          } catch (diagErr) {
            Logger.serverInfo(`[14102]   (diagnostic header read failed: ${diagErr.message})`);
          }

          Logger.serverInfo(`[14102] stopping turn parse here — unknown command length, can't safely continue`);
          break;
        }

        // LogicCommand base header
        const tickWhenGiven = s.readVInt();
        const executeTick   = s.readVInt();
        const executorAccountId = s.readLogicLong();
        dbg(`command[${i}] header tickWhenGiven=${tickWhenGiven} executeTick=${executeTick} executor=${executorAccountId}`);

        const instance = new CommandClass(this.socket, s);
        const fields = instance.decode(s);
        dbg(`command[${i}] fields=${JSON.stringify(fields)}`);

        this.commands.push({ id: commandId, instance, fields });
      }
    } catch (err) {
      Logger.clientErr(`[14102] decode threw: ${err.message}. Raw hex: ${this.payload.toString('hex')}. Parsed so far: bool=${this.hasBool} tick=${this.tick} commandsCount=${this.commandsCount} commands=${this.commands.length}`);
    }
  }

  process() {
    for (const cmd of this.commands) {
      if (cmd.instance && typeof cmd.instance.execute === 'function') {
        const playerData = getPlayerData(this.socket);
        cmd.instance.execute(playerData);

        // Команды, которые после выполнения должны выдать награду клиенту
        // (сейчас — 528/LogicViewInboxNotificationCommand), кладут результат
        // в instance.deliveryPlayerData; отправляем его как 24111
        // (LogicGiveDeliveryItemsCommand), см. Logic/Commands/Server/.
        if (cmd.instance.deliveryPlayerData) {
          try {
            const msg = new Piranha(this.socket, 24111, 1);
            LogicGiveDeliveryItemsCommand.encode(msg.stream, { playerData: cmd.instance.deliveryPlayerData });
            msg.send();
            Logger.serverInfo(`[14102] sent 24111 (delivery items) after command id=${cmd.id}`);
          } catch (err) {
            Logger.clientErr(`[14102] failed to send 24111 after command id=${cmd.id}: ${err.message}`);
          }
        }
      }
    }
  }
}

module.exports = { EndClientTurnMessage };
