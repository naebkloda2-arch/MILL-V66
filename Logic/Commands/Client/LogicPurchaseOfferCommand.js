'use strict';

const { genStarDropReward } = require('../../Static/StarrDropReward');
const { ShopOffers } = require('../../Static/ShopOffers');
const { getPinPrice, getSprayPrice } = require('../../Static/PinPricing');
const { AvailableServerCommandMessage } = require('../../../Message/Server/Home/AvailableServerCommandMessage');

/**
 * Порт LogicPurchaseOfferCommand (id 519) — полная версия по референсу v53/в64.
 *
 * Схема ItemType (подтверждена и LogicOffersChangedCommand 211):
 *   1  = Coins
 *   3  = Brawler (Amount=PowerLevel, BrawlerID=[16,id] в награде -> берём id из reward.BrawlerID[1])
 *   4  = Skin (Extra=SkinID)
 *   16 = Gems
 *   19 = Pin (Extra=PinID)
 *   21 = PinPack (3 случайных пина по редкости бойца — см. handlePinPack)
 *   25 = Thumbnail (Extra=ThumbnailID)
 *   45 = Blings
 *   50 = StarrDrop -> genStarDropReward()
 *
 * ВАЖНО про PinPack (21) и getBrawlerPinsTable(): в питоне это огромный
 * хардкод BrawlerPins{id: {Common:[...], Rare:[...], Epic:[...]}} на все
 * 60 бойцов v53. Мы НЕ переносим эту таблицу целиком (устареет под в66
 * ID бойцов/пинов) — вместо этого ItemType 21 сейчас просто пропускается
 * (см. TODO ниже). Если понадобится — дай знать, перенесём таблицу отдельно.
 *
 * TODO пока нет БД:
 *  - реальное списание Currency/Cost из баланса игрока (сейчас no-op)
 *  - PushasedOffers / OneTimeOffer проверка повторной покупки
 *  - ItemType 21 (PinPack) — нужна таблица BrawlerPins под в66 ID
 *  - handleDirectPurchase (покупка конкретного пина/скина/иконки за гемы
 *    напрямую, не через оффер) — Unk2 сейчас читается, но не используется
 */
class LogicPurchaseOfferCommand {
  constructor(socket, payload) {
    this.socket = socket;
    this.payload = payload; // Stream, уже позиционированный после заголовка команды
  }

  /**
   * @param stream  Stream, из которого дочитываем поля команды
   *                (TickWhenGiven/ExecuteTick/ExecutorAccountID уже прочитаны роутером)
   *
   * Порядок полей подтверждён питон-референсом:
   *   OfferIndex = readVInt()
   *   Unk2       = readDataReference()   (категория+id для DirectPurchase: 52=Pin,28=Thumb,29=Skin)
   *   CurrencyType = readVInt()
   */
  decode(stream) {
    this.offerIndex   = stream.readVInt();
    this.unk2         = stream.readDataReference();
    this.currencyType = stream.readVInt();
    return {
      OfferIndex: this.offerIndex,
      Unk2: this.unk2,
      CurrencyType: this.currencyType,
    };
  }

  /**
   * @param playerData  временный объект данных игрока (заглушка вместо БД,
   *                     пока нет persistence — живёт только на время вызова)
   */
  execute(playerData) {
    this._ensurePlayerFields(playerData);

    {
      const Logger = require('../../../Core/Logger');
      Logger.serverInfo(`[519] decoded fields: rawOfferIndex=${this.offerIndex} unk2=${JSON.stringify(this.unk2)} currencyType=${this.currencyType} offers.length=${ShopOffers.Offers.length}`);
    }

    // ВАЖНО (найдено по реальному тесту 30.07): клиент шлёт команду 519
    // не только при покупке оффера из магазина, но и при ПРЯМОЙ покупке
    // конкретного пина/эмодзи/иконки/скина (например, "Шелли -> эмодзи ->
    // купить"). В этом случае Unk2 = [category, value] содержит реальную
    // категорию (52=Pin/Emote, 28=Thumbnail, 29=Skin), а OfferIndex — это
    // НЕ индекс в ShopOffers.Offers (может быть отрицательным служебным
    // значением вроде -64) — раньше это уходило в ветку "offer not found"
    // и клиент вис в вечной загрузке, ожидая ответ, которого не было.
    //
    // Различаем два пути ТОЧНО как в V64-эталоне: если category из Unk2
    // одна из известных прямых категорий — это handleDirectPurchase,
    // а НЕ поиск в ShopOffers.Offers.
    const [unk2Category] = Array.isArray(this.unk2) ? this.unk2 : [0, 0];
    if (unk2Category === 52 || unk2Category === 28 || unk2Category === 29 || unk2Category === 68) {
      this._handleDirectPurchase(playerData);
      return;
    }

    // OfferIndex в питоне -1 относительно присланного клиентом (см. offer_index = fields["OfferIndex"] - 1).
    // ВАЖНО: работает ТОЛЬКО если сервер шлёт в 24101 (ShopOffersEncoder.js) OfferIndex = index
    // (0,1,2...) для ShopOffers.Offers, БЕЗ доп. сдвига на фейковый оффер (см. комментарий там).
    // Если нарушить это условие — offer будет undefined/не тот, и покупка зависнет у клиента
    // (TID_SHOP_OFFER_PURCHASE_ERROR_1), т.к. сервер не пришлёт ответ вовремя.
    const offerIndex = this.offerIndex - 1;
    const offer = ShopOffers.Offers[offerIndex];
    if (!offer) {
      const Logger = require('../../../Core/Logger');
      Logger.clientErr(`[519] offer not found for OfferIndex=${this.offerIndex} (resolved=${offerIndex}, offers.length=${ShopOffers.Offers.length})`);
      return;
    }

    // Списание валюты (заглушка — реально сработает, когда будет БД с балансом)
    if (offer.Currency === 0) playerData.Gems -= offer.Cost;
    else if (offer.Currency === 1) playerData.Coins -= offer.Cost;
    else if (offer.Currency === 6) playerData.Blings -= offer.Cost;

    playerData.delivery_items = { Boxes: [] };
    const box = { Type: 0, Items: [] };

    for (const reward of offer.Rewards) {
      switch (reward.ItemType) {
        case 4: { // Skin
          playerData.OwnedSkins.push(reward.Extra);
          box.Type = 100;
          box.Items.push({ Amount: 1, DataRef: [29, reward.Extra], RewardID: 9 });
          break;
        }

        case 19: { // Pin
          playerData.OwnedPins.push(reward.Extra);
          box.Type = 100;
          box.Items.push({ Amount: 1, DataRef: [52, reward.Extra], RewardID: 11 });
          break;
        }

        case 21: {
          // PinPack — требует таблицу BrawlerPins под в66 (не перенесена, см. TODO в шапке)
          break;
        }

        case 16: { // Gems
          playerData.Gems += reward.Amount;
          box.Type = 100;
          box.Items.push({ Amount: reward.Amount, DataRef: [0, 0], RewardID: 8 });
          break;
        }

        case 25: { // Thumbnail
          playerData.OwnedThumbnails.push(reward.Extra);
          box.Type = 100;
          box.Items.push({ Amount: 1, DataRef: [28, reward.Extra], RewardID: 11 });
          break;
        }

        case 45: { // Blings
          playerData.Blings += reward.Amount;
          box.Type = 100;
          box.Items.push({ Amount: reward.Amount, DataRef: [0, 0], RewardID: 25 });
          break;
        }

        case 50: { // StarrDrop
          const item = genStarDropReward(playerData);
          if (item) {
            box.Type = 100;
            box.Items.push(item);
          }
          break;
        }

        case 1: { // Coins
          playerData.Coins += reward.Amount;
          box.Type = 100;
          box.Items.push({ Amount: reward.Amount, DataRef: [0, 0], RewardID: 7 });
          break;
        }

        case 3: { // Brawler
          const brawlerId = reward.BrawlerID[1];
          playerData.OwnedBrawlers[brawlerId] = {
            CardID: 0, // TODO: смэпить на реальный CardID из characters.csv
            Trophies: 0,
            HighestTrophies: 0,
            PowerLevel: reward.Amount,
            PowerPoints: 0,
            State: 2,
            Mastery: 0,
            ClaimRewardsMastery: 0,
          };
          box.Type = 100;
          box.Items.push({ Amount: reward.Amount, DataRef: [16, brawlerId], RewardID: 1 });
          break;
        }

        default:
          // неизвестный ItemType — пропускаем, не роняем сервер
          break;
      }
    }

    if (box.Items.length) {
      playerData.delivery_items.Boxes.push(box);
    }

    playerData.PushasedOffers = playerData.PushasedOffers || [];
    if (offer.OfferID !== undefined) playerData.PushasedOffers.push(offer.OfferID);
    else playerData.PushasedOffers.push(offerIndex);

    this._sendUpdate(playerData);
  }

  /**
   * Прямая покупка конкретного предмета (не через оффер магазина) —
   * порт handleDirectPurchase() из V64-эталона.
   *
   * Unk2 = [category, value]:
   *   52 = Pin/Emote  — цена берётся из emotes.csv (Logic/Static/PinPricing.js)
   *   28 = Thumbnail  — фиксированная цена [19 blings, 750 gems] (как в эталоне)
   *   29 = Skin       — фиксированная цена [29 blings, 1000 gems] (как в эталоне)
   *
   * CurrencyType: 0 = гемы, 6 = блинги (см. deductCurrency в эталоне).
   */
  _handleDirectPurchase(playerData) {
    const [category, value] = this.unk2;
    let item = null;

    if (category === 52) { // Pin/Emote
      const price = getPinPrice(value);
      this._deductCurrency(playerData, this.currencyType, price.gems, price.bling);
      item = { Amount: 1, DataRef: [52, value], RewardID: 11 };
      playerData.OwnedPins.push(value);
    } else if (category === 28) { // Thumbnail
      this._deductCurrency(playerData, this.currencyType, 19, 750);
      item = { Amount: 1, DataRef: [28, value], RewardID: 11 };
      playerData.OwnedThumbnails.push(value);
    } else if (category === 29) { // Skin
      this._deductCurrency(playerData, this.currencyType, 29, 1000);
      item = { Amount: 1, DataRef: [29, value], RewardID: 9 };
      playerData.OwnedSkins.push(value);
    } else if (category === 68) { // Spray
      // ОТКАЧЕНО (30.07, после реального теста): попытка отправить
      // DataRef=[68,value] через отдельный 5-й слот вызывала бесконечную
      // загрузку — протокол 203 (LogicGiveDeliveryItemsCommand) реально
      // поддерживает только 4 DataRef-слота (16/29/52/28/23), подтверждено
      // V64-эталоном байт-в-байт. category=68 там не встречается вообще.
      //
      // Рабочее решение: отдаём спрей через тот же слот 52, что и Pin/Emote —
      // этот путь подтверждён живым тестом (покупка пина работает). Иконка
      // предмета в награде может визуально не совпадать со спреем (клиент
      // отрисовывает её как пин), но покупка проходит и не виснет/не крашит.
      const price = getSprayPrice(value);
      this._deductCurrency(playerData, this.currencyType, price.gems, price.bling);
      playerData.OwnedSprays.push(value);
      item = { Amount: 1, DataRef: [52, value], RewardID: 11 };
    }

    if (item) {
      playerData.delivery_items = { Boxes: [{ Type: 100, Items: [item] }] };
      this._sendUpdate(playerData);
    } else {
      const Logger = require('../../../Core/Logger');
      Logger.clientErr(`[519] direct purchase: unknown Unk2 category=${category} value=${value}, not handled`);
    }
  }

  // currencyType: 0 = гемы (списываем gemsPrice), 6 = блинги (списываем blingPrice)
  // ВАЖНО: порядок аргументов gemsPrice/blingPrice подтверждён V64-эталоном
  // (deductCurrency(player_data, currency_type, price_pair) где price_pair[0]=gems, [1]=bling) —
  // раньше здесь были перепутаны местами bling/gems во всех вызовах.
  _deductCurrency(playerData, currencyType, gemsPrice, blingPrice) {
    if (currencyType === 0) playerData.Gems -= gemsPrice;
    else if (currencyType === 6) playerData.Blings -= blingPrice;
  }

  _ensurePlayerFields(playerData) {
    playerData.Coins            = playerData.Coins || 0;
    playerData.Gems             = playerData.Gems || 0;
    playerData.Blings           = playerData.Blings || 0;
    playerData.OwnedSkins       = playerData.OwnedSkins || [];
    playerData.OwnedPins        = playerData.OwnedPins || [];
    playerData.OwnedSprays      = playerData.OwnedSprays || [];
    playerData.OwnedThumbnails  = playerData.OwnedThumbnails || [];
    playerData.OwnedBrawlers    = playerData.OwnedBrawlers || {};
  }

  _sendUpdate(playerData) {
    const response = new AvailableServerCommandMessage(this.socket, 203, { playerData });
    response.send();
  }

  static getCommandType() {
    return 519;
  }
}

module.exports = { LogicPurchaseOfferCommand };
