'use strict';

const { Piranha } = require('../../../Core/Piranha');
const { encodeShopOffersBlock } = require('../../../Logic/Home/ShopOffersEncoder');
const DB = require('../../../Core/Database/DB');

class OwnData {
  constructor(socket, player = null) {
    this.msg = new Piranha(socket, 24101, 1);
    this.player = player;
  }

  encode() {
    const w = this.msg.stream;

  
    w.writeVInt(0)
    w.writeVInt(-1)
    
    // LogicClientHome start
    // LogicDailyData start
    w.writeVInt(0)
    w.writeVInt(0)
    
    w.writeVInt(14880) 
    w.writeVInt(14880)
    w.writeVInt(14880)
    w.writeVInt(454)
    w.writeVInt(1488)

    // ByteStreamHelper.WriteDataReference(ByteStream, 28, 677)
    w.writeVInt(28)
    w.writeVInt(677)

    // ByteStreamHelper.WriteDataReference(ByteStream, 43, 0)
    w.writeVInt(43)
    w.writeVInt(0)
    
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(0)
    
    w.writeVInt(0)
    w.writeVInt(70000)
    w.writeVInt(0)
    w.writeVInt(1)
    w.writeBoolean(true)
    w.writeVInt(19500)   
    w.writeVInt(111111)  /
    w.writeVInt(1375134)
    w.writeVInt(0)
    w.writeVInt(1375134)
    
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(0)
    
    w.writeBoolean(true)
    w.writeVInt(2)
    w.writeVInt(2)
    w.writeVInt(2)
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(0)
    
    const __shopBlockStart = w.toBuffer().length;
    encodeShopOffersBlock(w)
    const __shopBlockEnd = w.toBuffer().length;
    try {
      const Logger = require('../../../Core/Logger');
      const full = w.toBuffer();
      Logger.serverInfo(`[24101] shop block bytes [${__shopBlockStart}:${__shopBlockEnd}] hex=${full.slice(__shopBlockStart, __shopBlockEnd).toString('hex')}`);
    } catch (e) { /* diagnostics only */ }
    
    
    
    w.writeVInt(200)
    w.writeVInt(500)
    
    w.writeVInt(-1)
    w.writeVInt(0)
    w.writeVInt(-1)
    

    w.writeVInt(1) 
    
    w.writeVInt(16)
    w.writeVInt(0)

    w.writeString("RU")      
    w.writeString(this.player ? this.player.name : "KakaoMill") 
    
    w.writeVInt(0) //меня пиздит отец
    w.writeVInt(0)
    
    w.writeVInt(1) //Brawl Pass
    w.writeVInt(48) //season
    w.writeVInt(18203) //bpxp
    w.writeBoolean(true)
    w.writeVInt(0)
    w.writeBoolean(false)
    w.writeBoolean(true)
    w.writeVInt(18)
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(1)
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(1)
    w.writeVInt(0) //Vanity items
    
    w.writeVInt(1)
    
    w.writeVInt(43)
    w.writeVInt(0)
    w.writeVInt(1)
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(1)
    w.writeVInt(0)
    w.writeVInt(2)
    w.writeVInt(0)
    w.writeVInt(1)
    w.writeVInt(0)
    
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(0)
    
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(0)    
    w.writeVInt(0)
    
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(1)
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(4)
    w.writeVInt(0)
    w.writeVInt(1)
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(2)
    w.writeVInt(0)
    w.writeVInt(2)
    w.writeVInt(0)
    w.writeVInt(2)
    w.writeVInt(0)
    w.writeVInt(2)
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(2)
    w.writeVInt(671) 
    w.writeVInt(1538) 
    
    w.writeVInt(0)
    
    w.writeVInt(43)
for (let i = 0; i < 43; i++) {
    w.writeVInt(i + 1)
}
    // ── Список активных событий (слоты режимов на главном экране) ──────────
    // Каждый слот — LogicEventSlot: SlotID, Status(1=active), unk, unk,
    // Timer(сек до конца ротации), unk, EventDataRef(classId,id) — какой
    // именно режим показать (id из Static/Events.json / LogicEventData),
    // Modifier(вариант карты/модификатор), затем хвост из нулей/-1.
    // Ranked идёт отдельным слотом в конце — свой event id + modifier.
    const ACTIVE_EVENTS = [
      { slot: 67, eventRef: [15, 10], modifier: 48 },  // Gem Grab
      { slot: 68, eventRef: [15, 11], modifier: 48 },  // Brawl Ball
      { slot: 69, eventRef: [15, 4],  modifier: 48 },  // Showdown (Solo)
      { slot: 70, eventRef: [15, 6],  modifier: 48 },  // Heist
      { slot: 71, eventRef: [15, 24], modifier: 48 },  // Ranked
    ];

    function writeEventSlot(w, ev) {
      w.writeVInt(ev.slot)
      w.writeVInt(1)               // Status: 1 = активно
      w.writeVInt(0)
      w.writeVInt(0)
      w.writeVInt(77777)           // Timer (сек до смены события)
      w.writeVInt(0)
      w.writeDataReference(ev.eventRef[0], ev.eventRef[1])
      w.writeVInt(ev.modifier)
      w.writeVInt(0)
      w.writeVInt(0)
      w.writeString("")
      w.writeVInt(0)
      w.writeVInt(0)
      w.writeVInt(0)
      w.writeVInt(0)
      w.writeVInt(0)
      w.writeVInt(-1)
      w.writeVInt(0)
      w.writeVInt(0)
      w.writeVInt(0)
      w.writeVInt(0)
      w.writeVInt(0)
      w.writeVInt(0)
      w.writeVInt(0)
      w.writeVInt(0)
      w.writeVInt(0)
      w.writeVInt(0)
      w.writeVInt(-1)
      w.writeVInt(0)
      w.writeVInt(0)
    }

    w.writeVInt(ACTIVE_EVENTS.length)
    for (const ev of ACTIVE_EVENTS) writeEventSlot(w, ev)

    w.writeVInt(ACTIVE_EVENTS.length) //update event (второй идентичный список — клиент читает оба)
    for (const ev of ACTIVE_EVENTS) writeEventSlot(w, ev)
    
    w.writeVInt(0)
    
    w.writeVInt(10)
for (const i of [20, 35, 75, 140, 290, 480, 800, 1250, 1875, 2800]) {
    w.writeVInt(i)
}

    w.writeVInt(4)
for (const i of [30, 80, 170, 360]) {
    w.writeVInt(i)
}
    
    w.writeVInt(4)
for (const i of [300, 880, 2040, 4680]) {
    w.writeVInt(i)
}
 
    w.writeVInt(0) //ReleaseEntry::encode
    
    w.writeVInt(13) //IntValue
    
    w.writeDataReference(1, 46)
    w.writeDataReference(1, 78)
    w.writeDataReference(1, 10018)
    w.writeDataReference(1, 10040)
    w.writeDataReference(41000165, 1)
    w.writeDataReference(30, 10029)
    w.writeDataReference(1, 69)
    w.writeDataReference(4, 28)
    w.writeDataReference(7000, 10028)
    w.writeDataReference(10000000, 10057)
    w.writeDataReference(1, 95)
    w.writeDataReference(259200, 10022)
    w.writeDataReference(1, 170)
    
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(0)    
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(0)
    
    w.writeVInt(0) //ChronosAssetListEvent
    
    w.writeVInt(0) // ShopVisualOfferGroupingEntry
    

w.writeVInt(6)
w.writeVInt(0)
for (const i of [29, 79, 169, 349, 699]) {
    w.writeVInt(i)
}

w.writeVInt(6)
w.writeVInt(0)
for (const i of [160, 450, 500, 1500, 4500]) {
    w.writeVInt(i)
}


w.writeVInt(5)
w.writeVInt(0)
for (const i of [100, 400, 1000, 3000]) {
    w.writeVInt(i)
}

    

    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(0)    
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(0)    
    w.writeVInt(0)
    w.writeVInt(0)
    
    w.writeVInt(15)
    
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(0)
    
    // Notification Factory: отдаём игроку накопленные во время
    // Telegram-привязки уведомления (код подтверждения и т.п.)
    encodeNotificationFactory(w, this.player, this.msg.socket);
    
    w.writeVInt(0)
    w.writeVInt(0)
    
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(0)
    
    w.writeVInt(0) //gears 
    
    w.writeBoolean(true) //recruit road
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(0)
    

        
        w.writeVInt(0)
        w.writeVInt(0)
        w.writeVInt(0)
        w.writeVInt(0)
        w.writeVInt(0)
        w.writeVInt(0)
        w.writeVInt(0)
        w.writeVInt(0)
        w.writeVInt(0)
        w.writeVInt(0)
        w.writeVInt(0)
        w.writeVInt(0)
        w.writeVInt(0)
        w.writeVInt(0)
        w.writeVInt(0)
        w.writeVInt(0)
        w.writeVInt(0)
        w.writeVInt(0)
        w.writeVInt(0)
        w.writeVInt(0)
        w.writeVInt(0)
        w.writeVInt(0)
        w.writeVInt(0)
        w.writeVInt(0)
        w.writeVInt(0)
        w.writeVInt(0)
        w.writeVInt(0)
        w.writeVInt(0)
        w.writeVInt(1)
        
        w.writeVInt(1)
        w.writeVInt(1)
        w.writeVInt(1)
        w.writeVInt(2)
        w.writeVInt(0)
        w.writeVInt(0)
        w.writeVInt(0)
        w.writeVInt(0)
        w.writeVInt(0)
        w.writeVInt(0)
    
    w.writeVInt(10)
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(1)
    w.writeVInt(0)
    
    
    
    w.writeVInt(1)
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(0)
    
    w.writeShortString("MILL-V66")


    
    w.writeVInt(1) //Registered
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(33)
    w.writeVInt(0)
    // Список карт (classId=23), которые считаются "разблокированными" у
    // игрока — ИМЕННО отсюда клиент понимает "у меня есть этот боец",
    // а не из блока трофеев ниже (тот только про статистику уже открытого
    // бойца). Добавлен CardId=862 (unlock-карта Buzz/Lightyear) — count
    // увеличен с 103 на 104.
    w.writeVInt(104)
    const ids = [
    0, 4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64, 68, 72, 95, 100, 105, 110, 115, 120, 125, 130, 177, 182, 188, 194, 200, 206, 218, 224, 230, 236, 279, 296, 303, 320, 327, 334, 341, 358, 365, 372, 379, 386, 393, 410, 417, 427, 434, 448, 466, 474, 491, 499, 507, 515, 523, 531, 539, 547, 557, 565, 573, 581, 589, 597, 605, 619, 633, 642, 655, 663, 671, 730, 748, 760, 768, 800, 811,828, 844, 871, 879, 901, 911, 925, 934, 985, 994, 1035, 1043, 1056, 1064, 1177, 1185,1212, 862];

for (const id of ids) {
    w.writeDataReference(23, id);
    w.writeVInt(0);
    w.writeVInt(2);
}

    w.writeDataReference(5, 8);
    w.writeVInt(1885);
    w.writeVInt(1882); //coins

    w.writeDataReference(5, 18);
    w.writeVInt(0);
    w.writeVInt(5);

    w.writeVInt(0); //trophies now

    // Count бойцов у игрока: Рико, Buzz (Lightyear), Кольт = 3
    w.writeVInt(3); //Highest Trophies (count бойцов)

    w.writeDataReference(16, 4); //Рико
    w.writeVInt(0);
    w.writeVInt(3400);

    w.writeDataReference(16, 88); //Buzz (Lightyear)
    w.writeVInt(0);
    w.writeVInt(67); //highest trophies у Buzz, пока 0 (новый боец)

    w.writeDataReference(16, 1); //Кольт (Colt)
    w.writeVInt(0);
    w.writeVInt(2000); //highest trophies у Кольта, пока 0 (новый боец)
    
    w.writeVInt(0)
    w.writeVInt(0) //Brawler Level
    w.writeVInt(0)
    w.writeVInt(0)
    
    // БАГ ИСПРАВЛЕН: тут раньше было `w.writeVInt()` без аргумента —
    // это писало NaN/ломало стрим и было вероятной причиной краша,
    // отдельно от вопроса самого id. Ставим 0, как и остальные поля рядом.
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(0) // idk 
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(0)
    
    w.writeVInt(0) //idk whaa
    
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(0)
    
    w.writeVInt(0) //idk again
    
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(0)
    
    w.writeVInt(0)
    

    
    
    w.writeVInt(0) //gems (не уверен но возможно это событие)
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(14880) //gems
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(2) // база: кандидаты А и Б оба не дали эффекта на регистрацию, откачено
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(2)
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeString()
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(0)
    w.writeVInt(0)
  }

  send() {
    this.encode();
    try {
      const Logger = require('../../../Core/Logger');
      const body = this.msg.stream.toBuffer();
      Logger.serverInfo(`[24101] OwnHomeDataMessage body length=${body.length} FULL hex=${body.toString('hex')}`);
    } catch (e) { /* diagnostics only, never break the send */ }
    this.msg.send();
  }
}

// LogicNotificationFactory::encode — минимальная реализация.
// Формат записи (стандартный для этого протокола):
//   VInt   id
// Точный бинарный формат из референса (NotificationFactory.Encode / Notification.Encode):
//
// NotificationFactory:
//   VInt count
//   for each: Notification.Encode(stream)
//
// Notification.Encode:
//   VInt    Id
//   Int     Index            (обычный 4-байтовый int, не VInt!)
//   Boolean IsViewed
//   Int     timePassed       (секунды с момента создания, 4-байтовый int)
//   String  MessageEntry     (обычная writeString: 4-байтовая длина + utf8)
//   VInt    0
//   switch(Id) { ... }       — для Id=81 (текстовое, наш случай) пишет ещё VInt(1)
//
// Мы используем Id=81 (простое текстовое) для обычных уведомлений и
// Id=94 (SkinRewardNotification) для уведомлений, несущих skin_id — это
// именно то поле, которое рисует клиенту кнопку "Забрать" (см. C#-референс
// RavBrawlV53/.../Home/Items/Notification.cs, case 94:
// stream.WriteVInt(29000000 + SkinID)).
//
// ВАЖНО про Index/skin_id (см. LogicViewInboxNotificationCommand, id=528):
// раньше уведомление помечалось "delivered" и переставало отдаваться уже
// на следующем 24101, поэтому если игрок не успевал открыть его в игре
// (нажать на уведомление) в ту же секунду — Index терялся и 528 не могла
// найти, какую награду выдавать. Теперь:
//   - показываем ВСЕ ещё не открытые игроком уведомления (delivered=0 ИЛИ
//     delivered=1&&opened=0), так они не "пропадают" между сессиями;
//   - Index — это позиция в ЭТОМ конкретном списке (пересчитывается
//     каждый раз, как и раньше — так делает референс), поэтому сразу
//     после отправки пишем socket.pendingNotificationIndex, чтобы 528
//     могла сопоставить присланный клиентом Index с конкретной строкой БД.
function encodeNotificationFactory(w, player, socket) {
  if (!player) {
    w.writeVInt(0);
    return;
  }

  let rows = [];
  try {
    const stillPending = DB.getDeliveredUnopenedNotifications(player.lowId);
    const fresh = DB.getUndeliveredNotifications(player.lowId);
    rows = stillPending.concat(fresh);
  } catch (e) {
    rows = [];
  }

  // Уведомления с наградой (skin_id, Id=94, кнопка "Забрать") показываем
  // первыми — так игрок видит и открывает их раньше обычных текстовых
  // (например, кода привязки). Сортировка стабильная: порядок внутри
  // каждой из двух групп (награда / без награды) не меняется.
  rows = rows.slice().sort((a, b) => {
    const aHasSkin = a.skin_id !== null && a.skin_id !== undefined;
    const bHasSkin = b.skin_id !== null && b.skin_id !== undefined;
    if (aHasSkin === bHasSkin) return 0;
    return aHasSkin ? -1 : 1;
  });

  w.writeVInt(rows.length);

  const indexMap = new Map(); // Index (как увидит клиент) -> notification row

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const createdAtMs = row.createdAt || Date.now();
    const timePassedSec = Math.max(0, Math.floor((Date.now() - createdAtMs) / 1000));

    const hasSkin = row.skin_id !== null && row.skin_id !== undefined;

    // ВАЖНО: Id=94 (SkinRewardNotification, по референсу RavBrawlV53)
    // ПРОТЕСТИРОВАН и вызывает краш клиента на 87% загрузки (подтверждено
    // логами — сессия с Id=94 крашится сразу после получения HomeData,
    // тогда как идентичный пакет с Id=81 работает без проблем). Похоже,
    // структура case 94 в v53 не совпадает с тем, что ожидает клиент v67
    // (разные версии протокола/движка). Пока НЕ используем 94 — держим
    // 81 для всех уведомлений, доставка скина всё равно работает через
    // 528 -> LogicGiveDeliveryItemsCommand (24111), просто без кнопки
    // "Забрать" на самом уведомлении. Если будет придумано, как достать
    // точный формат case 94 именно для v67 (например, через живой дамп
    // рабочего p67-сервера с таким уведомлением), можно будет вернуть.
    w.writeVInt(81);             // Id — FreeTextNotification (94 крашит клиент v67, см. выше)
    w.writeInt(i);               // Index — обычный int, позиция в списке
    w.writeBoolean(false);       // IsViewed
    w.writeInt(timePassedSec);   // timePassed — обычный int (секунды)
    w.writeString(row.text);     // MessageEntry — обычная writeString
    w.writeVInt(0);              // общее доп. поле перед switch
    w.writeVInt(1);              // case 81: text notification -> VInt(1)

    indexMap.set(i, row);
  }

  // Сохраняем актуальную карту Index->row на сокете, чтобы
  // LogicViewInboxNotificationCommand (528) могла найти нужную запись.
  if (socket) {
    socket.pendingNotificationIndex = indexMap;
  }

  try {
    const toMarkDelivered = rows.filter(r => !r.delivered).map(r => r.id);
    if (toMarkDelivered.length) DB.markNotificationsDelivered(toMarkDelivered);
  } catch (e) { /* не критично, попробуем на следующей отдаче */ }
}

module.exports = { OwnData };
