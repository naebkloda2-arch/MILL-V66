'use strict';

const { LogicGemOffer } = require('./LogicGemOffer');
const { ShopOffers } = require('../Static/ShopOffers');

/**
 * Кодирует весь блок акций магазина внутри OwnHomeDataMessage.
 * Структура 1-в-1 повторяет тот кусок, что раньше был захардкожен
 * в OwnData.js (см. акция66ебать.txt) — просто теперь по циклу
 * и с данными из ShopOffers.js вместо руками вбитых чисел.
 */
class LogicOfferBundle {
  static encode(w) {
    w.writeVInt(ShopOffers.Offers.length);

    for (const offer of ShopOffers.Offers) {
      // Rewards (пишутся дважды подряд — так в оригинальном протоколе)
      w.writeVInt(offer.Rewards.length);
      for (const r of offer.Rewards) {
        LogicGemOffer.encode(w, r.ItemType, r.Amount, r.CsvID[0], r.CsvID[1], r.SkinID);
      }

      w.writeVInt(offer.Rewards.length);
      for (const r of offer.Rewards) {
        LogicGemOffer.encode(w, r.ItemType, r.Amount, r.CsvID[0], r.CsvID[1], r.SkinID);
      }

      w.writeVInt(offer.Currency);
      w.writeVInt(offer.Cost);
      w.writeVInt(offer.Time);

      w.writeVInt(0);
      w.writeVInt(0);
      w.writeVInt(0);
      w.writeVInt(0);

      w.writeBoolean(offer.IsClaim);
      w.writeVInt(0);
      w.writeVInt(0);

      w.writeBoolean(offer.DailyOffer);
      w.writeVInt(offer.OldPrice);

      // ChronosTextEntry(Text)
      w.writeString(offer.Text);
      w.writeVInt(0);

      w.writeBoolean(offer.ShowAtLaunch);

      // ChronosTextEntry(Background)
      w.writeString(offer.Background);
      w.writeVInt(0);

      w.writeBoolean(offer.Processed);
      w.writeVInt(offer.TypeBenefit);
      w.writeVInt(offer.Benefit);
      w.writeString(offer.Text);
      w.writeBoolean(offer.OneTimeOffer);
      w.writeBoolean(offer.IsClaimed);

      w.writeDataReference(offer.ShopStyle[0], offer.ShopStyle[1]);
      w.writeDataReference(offer.ShopStyle[0], offer.ShopStyle[1]);
      w.writeDataReference(offer.ShopStyle[0], offer.ShopStyle[1]);

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
    }
  }
}

module.exports = { LogicOfferBundle };
