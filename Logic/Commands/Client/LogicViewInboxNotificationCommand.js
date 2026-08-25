'use strict';

const DB = require('../../../Core/Database/DB');
const Logger = require('../../../Core/Logger');

/**
 * Порт LogicViewInboxNotificationCommand (id 528) из питон-референса
 * (FPBS-V64/Classes/Commands/Client/LogicViewInboxNotificationCommand.py).
 *
 * decode() по референсу (auto_decode=False — TickWhenGiven/ExecuteTick/
 * ExecutorAccountID уже читаются роутером EndClientTurnMessage до вызова):
 *   Index = readVInt()
 *   Unk1  = readVInt()
 *
 * execute() в референсе ищет уведомление в player_data.NotificationFactory
 * по Index, определяет награду по типу уведомления и кладёт её в
 * player_data.delivery_items.Boxes, затем шлёт 24111
 * (LogicGiveDeliveryItemsCommand).
 *
 * У нас проще: карта Index -> notification row (из БД) собирается заново
 * при каждой отдаче 24101 и лежит в socket.pendingNotificationIndex
 * (см. OwnData.js / encodeNotificationFactory). Если строка несёт skin_id —
 * это и есть награда; выдаём её через unlocked_skins + отвечаем 24111 с
 * DataRef=[29, skinId], что в референсе соответствует ScId 29 (скины) и
 * реально делает скин видимым/выбираемым у клиента.
 */
class LogicViewInboxNotificationCommand {
  constructor(socket, payload) {
    this.socket = socket;
    this.payload = payload;
  }

  decode(stream) {
    this.index = stream.readVInt();
    this.unk1 = stream.readVInt();
    return {
      Index: this.index,
      Unk1: this.unk1,
    };
  }

  execute(playerData) {
    const socket = this.socket;
    const player = socket && socket.player;

    if (!player) {
      Logger.serverInfo(`[528] no player attached to socket — can't resolve notification, ignoring`);
      return;
    }

    const indexMap = socket.pendingNotificationIndex;
    const row = indexMap && indexMap.get(this.index);

    if (!row) {
      Logger.serverInfo(`[528] Index=${this.index} not found in pendingNotificationIndex for #${player.tag} — nothing to deliver`);
      return;
    }

    try {
      DB.markNotificationOpened(row.id);
    } catch (e) {
      Logger.serverInfo(`[528] markNotificationOpened failed: ${e.message}`);
    }

    // Собираем delivery_items так же, как это делает LogicGiveDeliveryItemsCommand
    // (Logic/Commands/Server/LogicGiveDeliveryItemsCommand.js) — одна "коробка"
    // с одной наградой, ScId 29 = Skins (см. питон-референс ItemType схему).
    //
    // notification.Id для этой строки был закодирован в OwnData.js как 94
    // (SkinRewardNotification), если row несёт skin_id, и как 81 иначе — см.
    // C#-референс LogicViewInboxNotificationCommand.cs, case 94/81. Здесь
    // достаточно проверять row.skin_id напрямую, т.к. это тот же признак.
    const boxes = [];

    if (row.skin_id !== null && row.skin_id !== undefined) {
      try {
        DB.grantSkin(player.lowId, row.skin_id);
      } catch (e) {
        Logger.serverInfo(`[528] grantSkin failed: ${e.message}`);
      }

      boxes.push({
        Type: 100,
        Items: [
          {
            Amount: 1,
            DataRef: [29, row.skin_id], // 29 = Skins csv, как в референсе (writeDataReference(29, skinID))
            RewardID: 9,                // RewardID=9 используется в референсе для skin/brawler-подарков
          },
        ],
      });
    }

    this.deliveryPlayerData = {
      delivery_items: { Boxes: boxes },
      RewardTrackType: 0,
      RewardForRank: 0,
      BrawlPassSeason: 0,
    };

    Logger.serverInfo(`[528] Index=${this.index} opened by #${player.tag} -> skin_id=${row.skin_id ?? 'none'}, sending 24111`);
  }

  static getCommandType() {
    return 528;
  }
}

module.exports = { LogicViewInboxNotificationCommand };
