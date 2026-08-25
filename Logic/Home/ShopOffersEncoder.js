'use strict';

const { ShopOffers } = require('../Static/ShopOffers');

/**
 * Кодирует блок офферов магазина внутри OwnHomeDataMessage (24101).
 *
 * ВАЖНО: формат полей здесь ОТЛИЧАЕТСЯ от LogicOffersChangedCommand (211,
 * см. Logic/Commands/Server/LogicOffersChangedCommand.js) — это два разных
 * пакета с разным layout'ом одного и того же понятия "оффер". Раньше это
 * было захардкожено прямо в OwnData.js (строка 67) на один-единственный
 * тестовый оффер "Test" — вынесено сюда как отдельный переиспользуемый
 * модуль и расширено на поддержку нескольких офферов из ShopOffers.Offers.
 *
 * Формат одного оффера (по наблюдаемому хардкоду):
 *   RewardCount, [ItemType, Amount, DataRef, Extra]xN,
 *   Currency, Cost, OldPrice(?), 0,0,0,0, Bool, 0,0, Bool, 0,
 *   Text, Bool, Int(0), 0, Bool, 0,0, Int(0), Bool, Bool,
 *   DataRef, DataRef, DataRef, Bool, Bool, Bool, 0,0,0, Bool, Bool,
 *   0,0, Bool, 0,0,0,0,0, Bool,Bool,Bool, 0, DataRef, 0, Bool, Bool(true), 0
 *
 * ПРИМЕЧАНИЕ: поля после Cost (строки 79-127 в оригинале) не все подписаны
 * по смыслу в исходном хардкоде — сохраняем их как константы-нули/false,
 * как было в рабочем варианте, меняя только то, что точно понятно
 * (ItemType/Amount/Currency/Cost/Text). Если что-то не будет работать
 * визуально в магазине — разбираем конкретное поле по факту теста.
 */
function encodeShopOffersBlock(w) {
  const offers = ShopOffers.Offers;
  // Кандидат на "срок действия оффера" — если гипотеза верна, далёкая
  // дата в будущем = "ещё не истекло" для любого разумного текущего времени.
  const FAR_FUTURE_UNIX = 2000000000; // ~2033 год

  w.writeVInt(offers.length); // shop offers count

  for (const offer of offers) {
    w.writeVInt(offer.Rewards.length); // reward count

    for (const reward of offer.Rewards) {
      w.writeVInt(reward.ItemType);
      w.writeVInt(reward.Amount);
      if (reward.BrawlerID && reward.BrawlerID[0] !== 0) {
        w.writeDataReference(reward.BrawlerID[0], reward.BrawlerID[1]);
      } else {
        w.writeDataReference(0, 0);
      }
      w.writeVInt(reward.Extra || 0);
    }

    w.writeVInt(0); // reward count (второй блок наград, не используем)

    w.writeVInt(offer.Currency);
    w.writeVInt(offer.Cost);
    w.writeVInt(offer.OldPrice || 0);
    w.writeVInt(0);
    w.writeVInt(0);
    w.writeVInt(0);
    w.writeVInt(0);
    w.writeBoolean(false);
    w.writeVInt(0);
    w.writeVInt(0);
    w.writeBoolean(false);
    w.writeVInt(0);
    w.writeString(offer.Text || 'Offer');
    w.writeBoolean(false);
    w.writeInt(FAR_FUTURE_UNIX) // ТЕСТ (30.07): было Int(0) — гипотеза "0 = акция истекла", блокирует покупку у клиента, хотя оффер всё равно рисуется
    w.writeVInt(0);
    w.writeBoolean(false);
    w.writeVInt(0);
    w.writeVInt(0);
    w.writeInt(FAR_FUTURE_UNIX) // ТЕСТ (30.07): второй Int(0) — тот же кандидат на "истёк"
    w.writeBoolean(false);
    w.writeBoolean(false);
    w.writeDataReference(0, 0);
    w.writeDataReference(0, 0);
    w.writeDataReference(0, 0);
    w.writeBoolean(false);
    w.writeBoolean(false);
    w.writeBoolean(false);
    w.writeVInt(0);
    w.writeVInt(0);
    w.writeVInt(0);
    w.writeBoolean(false);
    w.writeBoolean(false);
    w.writeVInt(0);
    w.writeVInt(0);
    w.writeBoolean(false);
    w.writeVInt(0);
    w.writeVInt(0);
    w.writeVInt(0);
    w.writeVInt(0);
    w.writeVInt(0);
    w.writeBoolean(false);
    w.writeBoolean(false);
    w.writeBoolean(false);
    w.writeVInt(0);
    w.writeDataReference(0, 0);
    w.writeVInt(0);
    w.writeBoolean(false);
    w.writeBoolean(true);
    w.writeVInt(0);
  }
}

module.exports = { encodeShopOffersBlock };
