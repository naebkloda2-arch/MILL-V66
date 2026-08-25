'use strict';

const { genStarDropReward } = require('../../Static/StarrDropReward');
const { AvailableServerCommandMessage } = require('../../../Message/Server/Home/AvailableServerCommandMessage');

/**
 * Порт LogicGatchaCommand (id 500) — открытие стардропа/бокса (в частности,
 * из BrawlPass — именно её клиент шлёт при "вечной загрузке" на стардропе).
 *
 * По питон-референсу:
 *   box_id = readVInt()   (1 = обычный бокс за 30 гемов, 3 = "мега"/про за 80 гемов)
 *
 * Референсный execute() тянет за собой огромную отдельную систему наград
 * (мощность бойцов, шанс нового бойца и т.д.) и списывает Gems (30/80) —
 * весь этот путь у нас уже упрощённо переиспользует genStarDropReward()
 * (та же функция, что и для стардропа из магазина, ItemType=50 в 519),
 * чтобы не дублировать логику наград. Разница с питон-версией: там жёстко
 * завязано на конкретный набор бойцов/пауэрпоинтов, здесь — общая таблица.
 *
 * ВАЖНО: если у игрока не хватает гемов на стоимость бокса — execute()
 * ничего не отправляет (никакого ответа вообще), КАК И В ПИТОН-РЕФЕРЕНСЕ
 * (там тоже "if Gems >= cost: send, иначе тишина"). Именно эта тишина и
 * даёт клиенту "вечную загрузку" — это ожидаемое поведение оригинала,
 * а не баг порта. Чтобы стардроп реально открывался, у игрока должен
 * быть достаточный баланс Gems (см. OwnData.js).
 */
class LogicGatchaCommand {
  constructor(socket, payload) {
    this.socket = socket;
    this.payload = payload;
  }

  decode(stream) {
    this.boxId = stream.readVInt();
    return { BoxID: this.boxId };
  }

  execute(playerData) {
    playerData.Gems = playerData.Gems || 0;

    const cost = this.boxId === 3 ? 80 : 30; // 1 = обычный, 3 = мега (см. референс)
    if (playerData.Gems < cost) {
      // Как и в питон-референсе: недостаточно гемов -> сервер молчит.
      // Если стардроп зависает именно тут — значит баланс Gems всё ещё 0/мал.
      return;
    }

    playerData.Gems -= cost;

    playerData.delivery_items = { Boxes: [] };
    const box = { Type: this.boxId === 3 ? 11 : 12, Items: [] };

    const item = genStarDropReward(playerData);
    if (item) box.Items.push(item);

    playerData.delivery_items.Boxes.push(box);

    const response = new AvailableServerCommandMessage(this.socket, 203, { playerData });
    response.send();
  }

  static getCommandType() {
    return 500;
  }
}

module.exports = { LogicGatchaCommand };
