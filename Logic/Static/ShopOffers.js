'use strict';

/**
 * Список акций (офферов) в магазине.
 *
 * Схема ItemType подтверждена питон-референсом (LogicPurchaseOfferCommand v53/в64
 * + LogicOffersChangedCommand 211):
 *   1  = Coins (монеты)
 *   3  = Brawler (открытие бойца, Amount=PowerLevel, BrawlerID=[16,id])
 *   4  = Skin (Extra=SkinID, BrawlerID=[16,brawlerId])
 *   16 = Gems (гемы)
 *   19 = Pin (Extra=PinID)
 *   21 = PinPack (набор из 3 пинов, спец-логика в 519)
 *   25 = Thumbnail (Extra=ThumbnailID)
 *   45 = Blings (жетоны)
 *   50 = StarrDrop (открытие стардропа -> genStarDropReward)
 *
 * Amount    — количество награды (для валют), или PowerLevel для бойца
 * BrawlerID — [group, id] дата-референс (0,0 если это просто валюта)
 * Extra     — доп. параметр (SkinID/PinID/ThumbnailID в зависимости от ItemType)
 *
 * Currency — 0 = гемы, 1 = монеты, 6 = блинги (см. LogicPurchaseOfferCommand.deductCurrency)
 * Cost     — цена оффера
 * OldPrice — старая цена (зачёркнутая, для скидки), 0 = без скидки
 * Time     — время жизни оффера в секундах
 * Text     — текст акции
 * Background — id фонового арта акции
 */
const ShopOffers = {
  Offers: [
    {
      Rewards: [
        { ItemType: 16, Amount: 100, BrawlerID: [0, 0], Extra: 0 }, // 100 гемов
      ],
      ShopStyle: [70, 9],
      Currency: 0,
      Cost: 0,
      OldPrice: 0,
      Time: 86400,
      Text: 'Подарок',
      Background: 'offer_bgr_carretabrawl',
      DailyOffer: true,
      ShowAtLaunch: true,
      OneTimeOffer: false,
      IsClaim: false,
      IsClaimed: false,
      Processed: false,
      TypeBenefit: 0,
      Benefit: 0,
    },
    {
      Rewards: [
        { ItemType: 16, Amount: 1000, BrawlerID: [0, 0], Extra: 0 }, // 1000 гемов
      ],
      ShopStyle: [70, 9],
      Currency: 0,
      Cost: 499,
      OldPrice: 999,
      Time: 172800,
      Text: 'Изумруды',
      Background: 'offer_bgr_carretabrawl',
      DailyOffer: false,
      ShowAtLaunch: false,
      OneTimeOffer: true,
      IsClaim: false,
      IsClaimed: false,
      Processed: false,
      TypeBenefit: 0,
      Benefit: 0,
    },
    {
      Rewards: [
        { ItemType: 50, Amount: 1, BrawlerID: [0, 0], Extra: 0 }, // стардроп
      ],
      ShopStyle: [70, 9],
      Currency: 1,
      Cost: 100,
      OldPrice: 0,
      Time: 172800,
      Text: 'Звёздный фидбон',
      Background: 'offer_bgr_carretabrawl',
      DailyOffer: false,
      ShowAtLaunch: false,
      OneTimeOffer: false,
      IsClaim: false,
      IsClaimed: false,
      Processed: false,
      TypeBenefit: 0,
      Benefit: 0,
    },
    {
      Rewards: [
        { ItemType: 1, Amount: 5000, BrawlerID: [0, 0], Extra: 0 }, // 5000 монет
      ],
      ShopStyle: [70, 9],
      Currency: 0,
      Cost: 149,
      OldPrice: 249,
      Time: 259200,
      Text: 'Мешок монет',
      Background: 'offer_bgr_carretabrawl',
      DailyOffer: false,
      ShowAtLaunch: false,
      OneTimeOffer: false,
      IsClaim: false,
      IsClaimed: false,
      Processed: false,
      TypeBenefit: 0,
      Benefit: 0,
    },
    {
      Rewards: [
        { ItemType: 45, Amount: 200, BrawlerID: [0, 0], Extra: 0 }, // 200 блингов
      ],
      ShopStyle: [70, 9],
      Currency: 0,
      Cost: 79,
      OldPrice: 0,
      Time: 259200,
      Text: 'Пачка кириешек',
      Background: 'offer_bgr_carretabrawl',
      DailyOffer: false,
      ShowAtLaunch: false,
      OneTimeOffer: false,
      IsClaim: false,
      IsClaimed: false,
      Processed: false,
      TypeBenefit: 0,
      Benefit: 0,
    },
    {
      Rewards: [
        { ItemType: 50, Amount: 3, BrawlerID: [0, 0], Extra: 0 }, // 3 стардропа разом
      ],
      ShopStyle: [70, 9],
      Currency: 0,
      Cost: 249,
      OldPrice: 349,
      Time: 129600,
      Text: 'Тройной звёздный хуй',
      Background: 'offer_bgr_carretabrawl',
      DailyOffer: false,
      ShowAtLaunch: false,
      OneTimeOffer: true,
      IsClaim: false,
      IsClaimed: false,
      Processed: false,
      TypeBenefit: 0,
      Benefit: 0,
    },
  ],
};

module.exports = { ShopOffers };
