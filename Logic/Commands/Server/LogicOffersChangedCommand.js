'use strict';

const { ShopOffers } = require('../../Static/ShopOffers');

/**
 * Порт LogicOffersChangedCommand (id 211) из питон-референса (v53/в64).
 *
 * Отдаёт клиенту полный список офферов магазина: сначала 3 захардкоженных
 * спец-оффера (индексы -3, -2, -1 в PushasedOffers — "подарок дня",
 * "gift", "special offer"), затем все офферы из ShopOffers.Offers,
 * затем один финальный захардкоженный ("компенсация", индекс -4).
 *
 * В питон-версии State/Claim читаются из БД (player_data['PushasedOffers']).
 * У нас пока нет БД — playerData передаётся вызывающим кодом (обычно
 * пустой объект с PushasedOffers: [] по умолчанию).
 */
class LogicOffersChangedCommand {
  /**
   * @param w          Stream, куда пишем (после заголовка команды 24111)
   * @param playerData { PushasedOffers: number[] } — какие офферы уже куплены/клеймлены
   */
  static encode(w, playerData) {
    const purchased = (playerData && playerData.PushasedOffers) || [];
    const offers = ShopOffers.Offers;

    w.writeVInt(4 + offers.length); // Offers count

    // --- Спец-оффер -3: "Unlock all brawlers" ---
    w.writeVInt(1); // RewardCount
    w.writeVInt(6);  // ItemType
    w.writeVInt(0);  // Amount
    w.writeDataReference(0, 0);
    w.writeVInt(0);  // Extra

    w.writeVInt(0);      // Currency
    w.writeVInt(1);      // Cost
    w.writeVInt(172800);  // Time
    w.writeVInt(1);       // State
    w.writeVInt(0);
    w.writeBoolean(purchased.includes(-3)); // Claim
    w.writeVInt(0);        // Offer Index
    w.writeVInt(0);
    w.writeBoolean(false); // Daily Offer
    w.writeVInt(1);        // Old price
    w.writeInt(0);
    w.writeString('Unlock all brawlers');
    w.writeBoolean(false);
    w.writeString('offer_stuntshow');
    w.writeVInt(-1);
    w.writeBoolean(false); // being processed
    w.writeVInt(1);  // TypeBenefit
    w.writeVInt(100); // Benefit
    w.writeString();
    w.writeBoolean(false); // OneTimeOffer
    w.writeBoolean(false); // unk
    w.writeDataReference(0, 0);
    w.writeDataReference(0, 0);

    // --- Спец-оффер -2: "Gift" ---
    w.writeVInt(2); // RewardCount
    w.writeVInt(1);    // ItemType (Coins)
    w.writeVInt(1000); // Amount
    w.writeDataReference(0, 0);
    w.writeVInt(0);
    w.writeVInt(16);  // ItemType (Gems)
    w.writeVInt(250);
    w.writeDataReference(0, 0);
    w.writeVInt(0);

    w.writeVInt(0);
    w.writeVInt(0); // Cost (бесплатно)
    w.writeVInt(172800);
    w.writeVInt(1);
    w.writeVInt(0);
    w.writeBoolean(purchased.includes(-2));
    w.writeVInt(1);
    w.writeVInt(0);
    w.writeBoolean(false);
    w.writeVInt(549); // Old price
    w.writeInt(0);
    w.writeString('Gift\u{1F911}');
    w.writeBoolean(false);
    w.writeString('offer_stuntshow');
    w.writeVInt(-1);
    w.writeBoolean(false);
    w.writeVInt(2);
    w.writeVInt(300);
    w.writeString();
    w.writeBoolean(false);
    w.writeBoolean(false);
    w.writeDataReference(0, 0);
    w.writeDataReference(0, 0);

    // --- Спец-оффер -1: "Special Offer" (скин + пин + токен-даблер) ---
    w.writeVInt(3); // RewardCount
    w.writeVInt(4);   // ItemType (Skin)
    w.writeVInt(0);
    w.writeDataReference(16, 1);
    w.writeVInt(376); // SkinID
    w.writeVInt(19);  // ItemType (Pin)
    w.writeVInt(250);
    w.writeDataReference(0, 0);
    w.writeVInt(272); // PinID
    w.writeVInt(9);   // ItemType
    w.writeVInt(1000);
    w.writeDataReference(0, 0);
    w.writeVInt(1000);

    w.writeVInt(0);
    w.writeVInt(109); // Cost
    w.writeVInt(172800);
    w.writeVInt(1);
    w.writeVInt(0);
    w.writeBoolean(purchased.includes(-1));
    w.writeVInt(2);
    w.writeVInt(0);
    w.writeBoolean(false);
    w.writeVInt(159); // Old price
    w.writeInt(0);
    w.writeString('Special Offer');
    w.writeBoolean(false);
    w.writeString('offer_stuntshow');
    w.writeVInt(-1);
    w.writeBoolean(false);
    w.writeVInt(1);
    w.writeVInt(2);
    w.writeString();
    w.writeBoolean(false);
    w.writeBoolean(false);
    w.writeDataReference(0, 0);
    w.writeDataReference(70, 0);

    // --- Обычные офферы из ShopOffers.Offers ---
    offers.forEach((offer, index) => {
      w.writeVInt(offer.Rewards.length);
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

      w.writeVInt(offer.Currency);
      w.writeVInt(offer.Cost);
      w.writeVInt(offer.Time);
      w.writeVInt(1); // State
      w.writeVInt(0);
      w.writeBoolean(purchased.includes(index) || !!offer.Claim);
      w.writeVInt(index + 3); // Offer Index (после 3 спец-офферов)
      w.writeVInt(0);
      w.writeBoolean(!!offer.DailyOffer);
      w.writeVInt(offer.OldPrice || 0);
      w.writeInt(0);
      w.writeString(offer.Text || '');
      w.writeBoolean(false);
      w.writeString(offer.Background || '');
      w.writeVInt(-1);
      w.writeBoolean(!!offer.Processed);
      w.writeVInt(offer.TypeBenefit || 0);
      w.writeVInt(offer.Benefit || 0);
      w.writeString();
      w.writeBoolean(!!offer.OneTimeOffer);
      w.writeBoolean(false); // unk
      if (offer.BigOffer) {
        w.writeDataReference(69, offer.ShopPanelLayouts >= 0 ? offer.ShopPanelLayouts : 0);
        w.writeDataReference(70, offer.ShopStyleSets >= 0 ? offer.ShopStyleSets : 0);
      } else {
        w.writeDataReference(0, 0);
        w.writeDataReference(0, 0);
      }
    });

    // --- Спец-оффер -4: "Компенсация" ---
    w.writeVInt(1); // RewardCount
    w.writeVInt(16); // ItemType (Gems)
    w.writeVInt(2000);
    w.writeDataReference(0, 0);
    w.writeVInt(0);

    w.writeVInt(0);
    w.writeVInt(0); // Cost
    w.writeVInt(172800);
    w.writeVInt(1);
    w.writeVInt(0);
    w.writeBoolean(purchased.includes(-4));
    w.writeVInt(4 + offers.length); // Offer Index
    w.writeVInt(0);
    w.writeBoolean(false);
    w.writeVInt(1); // Old price
    w.writeInt(0);
    w.writeString('Компенсация');
    w.writeBoolean(false);
    w.writeString('offer_deepsea');
    w.writeVInt(-1);
    w.writeBoolean(false);
    w.writeVInt(1);
    w.writeVInt(100);
    w.writeString();
    w.writeBoolean(false);
    w.writeBoolean(false);
    w.writeDataReference(0, 0);
    w.writeDataReference(0, 0);
  }
}

module.exports = { LogicOffersChangedCommand };
