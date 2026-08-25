'use strict';

/**
 * Порт LogicGiveDeliveryItemsCommand (id 203) из питон-сурса.
 * Пишет player_data.delivery_items.Boxes в стрим — это то, что клиент
 * реально показывает как "полученные награды" (в т.ч. награда стардропа).
 *
 * У нас нет БД, поэтому playerData передаётся напрямую в fields,
 * а не читается из DatabaseHandler, как в питоне.
 */
class LogicGiveDeliveryItemsCommand {
  /**
   * @param w        Stream, куда пишем (после заголовка команды)
   * @param fields   { playerData: {...} } — playerData.delivery_items.Boxes ожидается
   */
  static encode(w, fields) {
    const playerData = fields.playerData || {};
    const boxes = (playerData.delivery_items && playerData.delivery_items.Boxes) || [];

    w.writeVInt(0);
    w.writeVInt(boxes.length); // Multiplier / box count

    for (const box of boxes) {
      w.writeVInt(box.Type);
      const rewards = box.Items || [];
      w.writeVInt(rewards.length);

      for (const item of rewards) {
        w.writeVInt(item.Amount);

        if (item.DataRef[0] === 16) w.writeDataReference(item.DataRef[0], item.DataRef[1]);
        else w.writeDataReference(0, 0);

        w.writeVInt(item.RewardID);

        if (item.DataRef[0] === 29) w.writeDataReference(item.DataRef[0], item.DataRef[1]);
        else w.writeDataReference(0, 0);

        if (item.DataRef[0] === 52 || item.DataRef[0] === 28) w.writeDataReference(item.DataRef[0], item.DataRef[1]);
        else w.writeDataReference(0, 0);

        if (item.DataRef[0] === 23) w.writeDataReference(item.DataRef[0], item.DataRef[1]);
        else w.writeDataReference(0, 0);

        w.writeVInt(0);
        w.writeVInt(0);
        w.writeVInt(0);
        w.writeVInt(0);

        // ОТКАЧЕНО (30.07, после реального теста): 5-й DataRef-слот под
        // category=68 (Spray) вызывал бесконечную загрузку — он не
        // подтверждён V64-эталоном (там всего 4 слота: 16/29/52/28/23),
        // и лишний слот сдвигал разбор хвоста пакета (RewardTrackType/
        // RewardForRank/BrawlPassSeason), из-за чего клиент не мог
        // корректно распарсить ответ. Спреи теперь выдаются через
        // существующий слот 52 (тот же, что Pin/Emote) — см.
        // LogicPurchaseOfferCommand.js _handleDirectPurchase.
      }
    }

    w.writeBoolean(false);
    w.writeVInt(playerData.RewardTrackType || 0);
    w.writeVInt(playerData.RewardForRank || 0);
    w.writeVInt(playerData.BrawlPassSeason || 0);

    // LogicServerCommand.encode базовый хвост (TickWhenGiven/ExecuteTick/ExecutorAccountID)
    // в питоне пишется LogicServerCommand.encode(self, fields) в конце —
    // тут пишем нули, т.к. у нас нет полноценного tick-счётчика сервера.
    w.writeVInt(0);
    w.writeVInt(0);
    w.writeLogicLong(0, 0);
  }
}

module.exports = { LogicGiveDeliveryItemsCommand };
