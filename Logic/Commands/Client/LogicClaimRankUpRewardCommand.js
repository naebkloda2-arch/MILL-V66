'use strict';

const { AvailableServerCommandMessage } = require('../../../Message/Server/Home/AvailableServerCommandMessage');
const { getTrophyRoadLvl, getBrawlPassLvl } = require('../../Static/Milestones');
const { getRowIndexByName } = require('../../Static/PinPricing');

/**
 * Порт LogicClaimRankUpRewardCommand (id 517).
 * Поля по питон-референсу (auto_decode=False):
 *   RewardID        = readVInt()   (6=Trophy Road, 9=BP Premium, 10=BP Free, 12=BP Star)
 *   RewardType      = readVInt()
 *   BrawlPassSeason = readVInt()
 *   LVL             = readVInt()
 *
 * Теперь читает реальную таблицу наград из milestones.csv (см.
 * Logic/Static/Milestones.js — порт Classes/Files/Classes/Milestones.py
 * из V64-эталона) вместо пустого Box-заглушки.
 *
 * Отслеживание собранных уровней: playerData.BrawlPassLevel[] (Premium/Star)
 * и playerData.BrawlPassFreeLevel[] (Free) — чтобы при повторном заходе
 * клиент видел уровень как уже собранный, а не заново кликабельным.
 *
 * PrimaryLvlUpRewardType -> RewardID для клиента (см. DataRef-слоты в
 * LogicGiveDeliveryItemsCommand.js: только 16/29/52/28/23 поддерживаются
 * протоколом — категория 68/Spray туда НЕ пишется, используем 52 (тот же
 * слот, что и Pin/Emote), см. комментарий в _resolveItem):
 *   1  Coins           -> RewardID 7,  DataRef [0,0]
 *   16 Gems            -> RewardID 8,  DataRef [0,0]
 *   19 Pin/Emote       -> RewardID 11, DataRef [52, rowIndex] (emotes.csv)
 *   25 Thumbnail       -> RewardID 11, DataRef [28, rowIndex] (player_thumbnails.csv)
 *   35 Spray           -> RewardID 11, DataRef [52, rowIndex] (sprays.csv; слот 68
 *                         не подтверждён протоколом, используем рабочий 52 —
 *                         клиент как минимум не зависает/не крашится)
 *   38/39 FameCredits  -> RewardID 22, DataRef [0,0]
 *   41 PowerPoints     -> RewardID 24, DataRef [0,0]
 *   45 StarPoints      -> RewardID 25, DataRef [0,0]
 *   4/24 Skin          -> RewardID 9,  DataRef [29, rowIndex] (skins.csv)
 *   3  Brawler         -> RewardID 1,  DataRef [16, brawlerId] (не парсим — редко встречается в БП)
 *   остальные (43/49/50/55/78/79/80/83 — токены/тайтлы/спец.награды,
 *   не портированы из V64) -> уровень помечается собранным, но
 *   отправляется пустой Item (без DataRef), чтобы не гадать формат.
 */
class LogicClaimRankUpRewardCommand {
  constructor(socket, payload) {
    this.socket = socket;
    this.payload = payload;
  }

  decode(stream) {
    this.rewardId        = stream.readVInt();
    this.rewardType      = stream.readVInt();
    this.brawlPassSeason = stream.readVInt();
    this.lvl             = stream.readVInt();
    return {
      RewardID: this.rewardId,
      RewardType: this.rewardType,
      BrawlPassSeason: this.brawlPassSeason,
      LVL: this.lvl,
    };
  }

  execute(playerData) {
    const Logger = require('../../../Core/Logger');

    let milestone = null;
    if (this.rewardId === 6) {
      milestone = getTrophyRoadLvl(this.lvl);
    } else if (this.rewardId === 9 || this.rewardId === 10 || this.rewardId === 12) {
      milestone = getBrawlPassLvl(this.rewardId, this.brawlPassSeason, this.lvl);
    }

    Logger.serverInfo(`[517] claim reward: RewardID=${this.rewardId} RewardType=${this.rewardType} BrawlPassSeason=${this.brawlPassSeason} LVL=${this.lvl} milestone=${JSON.stringify(milestone)}`);

    const item = milestone ? this._resolveItem(playerData, milestone) : null;

    playerData.delivery_items = {
      Boxes: [{ Type: 100, Items: item ? [item] : [] }],
    };
    playerData.RewardTrackType = this.rewardId;

    // ВАЖНО (найдено 30.07): RewardForRank НЕ накопительный счётчик кликов —
    // это "какой именно уровень только что засчитан", клиент использует
    // это поле, чтобы понять, какой слот в БП отметить собранным. Формула
    // подтверждена V64-эталоном: RewardForRank = 2 + LVL (пересчитывается
    // заново на КАЖДЫЙ клейм, не суммируется с предыдущим значением).
    // Раньше здесь было `+= 1` — это давало рассинхрон (клиент отмечал
    // не тот слот, что был реально нажат), т.к. счётчик рос независимо
    // от LVL из запроса.
    if (this.rewardId === 6) {
      playerData.RewardForRank = 2 + this.lvl; // Trophy Road (см. также player.TrophyRoadTier в V64 — не портирован, используем ту же формулу)
    } else if (this.rewardId === 9 || this.rewardId === 10 || this.rewardId === 12) {
      playerData.BrawlPassSeason = this.brawlPassSeason;
      playerData.RewardForRank = 2 + this.lvl;
    }

    // Отмечаем уровень как собранный, чтобы клиент не показывал его
    // снова кликабельным после перезахода.
    if (this.rewardId === 10) {
      playerData.BrawlPassFreeLevel = playerData.BrawlPassFreeLevel || [];
      if (!playerData.BrawlPassFreeLevel.includes(this.lvl)) playerData.BrawlPassFreeLevel.push(this.lvl);
    } else if (this.rewardId === 9 || this.rewardId === 12) {
      playerData.BrawlPassLevel = playerData.BrawlPassLevel || [];
      if (!playerData.BrawlPassLevel.includes(this.lvl)) playerData.BrawlPassLevel.push(this.lvl);
    }

    const response = new AvailableServerCommandMessage(this.socket, 203, { playerData });
    response.send();
  }

  /**
   * Переводит запись milestones.csv (RewardType/RewardCount/RewardData)
   * в item для delivery_items — с реальным начислением на playerData,
   * где это применимо.
   */
  _resolveItem(playerData, milestone) {
    const { RewardType, RewardCount, RewardData } = milestone;

    switch (RewardType) {
      case 1: // Coins
        playerData.Coins = (playerData.Coins || 0) + RewardCount;
        return { Amount: RewardCount, DataRef: [0, 0], RewardID: 7 };

      case 16: // Gems
        playerData.Gems = (playerData.Gems || 0) + RewardCount;
        return { Amount: RewardCount, DataRef: [0, 0], RewardID: 8 };

      case 19: { // Pin/Emote
        const rowIndex = getRowIndexByName('emotes.csv', RewardData);
        if (rowIndex < 0) return null;
        playerData.OwnedPins = playerData.OwnedPins || [];
        playerData.OwnedPins.push(rowIndex);
        return { Amount: 1, DataRef: [52, rowIndex], RewardID: 11 };
      }

      case 25: { // Thumbnail
        const rowIndex = getRowIndexByName('player_thumbnails.csv', RewardData);
        if (rowIndex < 0) return null;
        playerData.OwnedThumbnails = playerData.OwnedThumbnails || [];
        playerData.OwnedThumbnails.push(rowIndex);
        return { Amount: 1, DataRef: [28, rowIndex], RewardID: 11 };
      }

      case 35: { // Spray — слот 68 не поддержан протоколом 203, шлём как Pin (слот 52)
        const rowIndex = getRowIndexByName('sprays.csv', RewardData);
        if (rowIndex < 0) return null;
        playerData.OwnedSprays = playerData.OwnedSprays || [];
        playerData.OwnedSprays.push(rowIndex);
        return { Amount: 1, DataRef: [52, rowIndex], RewardID: 11 };
      }

      case 38: // FameCredits
      case 39:
        playerData.FameCredits = (playerData.FameCredits || 0) + RewardCount;
        return { Amount: RewardCount, DataRef: [0, 0], RewardID: 22 };

      case 41: // PowerPoints
        playerData.PowerPoints = (playerData.PowerPoints || 0) + RewardCount;
        return { Amount: RewardCount, DataRef: [0, 0], RewardID: 24 };

      case 45: // StarPoints
        playerData.StarPoints = (playerData.StarPoints || 0) + RewardCount;
        return { Amount: RewardCount, DataRef: [0, 0], RewardID: 25 };

      case 50: { // Случайный набор наград (Coins+Gems+FameCredits+PowerPoints), см. V64-эталон
        const coins = 50 + Math.floor(Math.random() * 51); // 50-100
        const gems = 3 + Math.floor(Math.random() * 4); // 3-6
        const fame = 30 + Math.floor(Math.random() * 21); // 30-50
        const power = 30 + Math.floor(Math.random() * 21); // 30-50
        playerData.Coins = (playerData.Coins || 0) + coins;
        playerData.Gems = (playerData.Gems || 0) + gems;
        playerData.FameCredits = (playerData.FameCredits || 0) + fame;
        playerData.PowerPoints = (playerData.PowerPoints || 0) + power;
        return { Amount: coins, DataRef: [0, 0], RewardID: 7 };
      }

      case 78: { // "Ключ" БП (LVL=0, первый слот) — раньше зависал с пустым Item.
        // Формата "ключа" в V64/протоколе не найдено — выдаём как небольшой
        // бонус гемов, чтобы клиент получил ненулевой видимый предмет
        // вместо пустого Box, который у него зависал.
        const gems = RewardCount > 0 ? RewardCount : 5;
        playerData.Gems = (playerData.Gems || 0) + gems;
        return { Amount: gems, DataRef: [0, 0], RewardID: 8 };
      }

      case 83: { // StarrDrop (регулярно встречается в БП) — используем ту же
        // функцию, что уже подтверждена рабочей для магазинных стардропов
        // (ItemType 50 в 519/LogicPurchaseOfferCommand).
        const { genStarDropReward } = require('../../Static/StarrDropReward');
        return genStarDropReward(playerData);
      }

      case 4:
      case 24: { // Skin
        const rowIndex = getRowIndexByName('skins.csv', RewardData);
        if (rowIndex < 0) return null;
        playerData.OwnedSkins = playerData.OwnedSkins || [];
        playerData.OwnedSkins.push(rowIndex);
        return { Amount: 1, DataRef: [29, rowIndex], RewardID: 9 };
      }

      default:
        // 3 (Brawler), 43/49/50/55/78/79/80/83 (токены/тайтлы/спец —
        // не портированы) и всё неизвестное: уровень отмечается собранным
        // (см. BrawlPassLevel/BrawlPassFreeLevel выше), но предмет не
        // выдаётся физически — безопаснее пустого DataRef, чем гадать формат.
        return null;
    }
  }

  static getCommandType() {
    return 517;
  }
}

module.exports = { LogicClaimRankUpRewardCommand };
