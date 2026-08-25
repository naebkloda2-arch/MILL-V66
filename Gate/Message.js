'use strict';

const { Hello }  = require('../Message/Client/Login/Hello');
const { Auth }   = require('../Message/Client/Login/Auth');
const { AskForPlayerLeaderboard } = require('../Message/Client/Home/AskForPlayerLeaderboard');
const { GetPlayerProfileMessage } = require('../Message/Client/Home/GetPlayerProfileMessage');
const { AvatarNameCheckMessage } = require('../Message/Client/Home/AvatarNameCheckMessage');
const { ChangeAvatarNameMessage } = require('../Message/Client/Home/ChangeAvatarNameMessage');
const { EndClientTurnMessage } = require('../Message/Client/Home/EndClientTurnMessage');
const { KeepAliveMessage } = require('../Message/Client/Socket/KeepAliveMessage');
const Logger     = require('../Core/Logger');

// ── Справочник реализованных пакетов (что уже сделано на данный момент) ────
// Имена в логах (Logger.packetName, вызывается из Server.js для КАЖДОГО
// входящего/исходящего пакета) берутся из Core/Logger.js — эта таблица
// просто человекочитаемая копия для быстрой сверки прямо здесь, рядом с
// dispatch(). Если добавляешь новый case ниже — не забудь добавить имя и
// туда, иначе в логах опять будет "Not Found" для того, что на самом деле
// уже обрабатывается.
//
//   Входящий (клиент → сервер)          Ответ (сервер → клиент)
//   ────────────────────────────────    ─────────────────────────────────
//   10100 Hello                      →  20100 Hello
//   10101 Auth                       →  20104 AuthOk (+ 24101 OwnHomeDataMessage)
//   14403 AskForPlayerLeaderboard    →  24403 PlayerLeaderboard
//   15081 GetPlayerProfileMessage    →  24113 PlayerProfileMessage
//   14600 AvatarNameCheckMessage     →  20300 AvatarNameCheckResponseMessage
//   10212 ChangeAvatarNameMessage    →  24111 AvailableServerCommandMessage (commandId=201)
//   14102 EndClientTurnMessage       →  (24111 AvailableServerCommandMessage — по ситуации, не всегда)
//   10108 KeepAliveMessage           →  20108 KeepAliveServerMessage
//
//   Тихо игнорируются (без ответа, см. SILENT_IGNORE ниже):
//   10110 AnalyticEventMessage, 39004 Unknown39004, 14366 PlayerStatusMessage,
//   10113 SetDeviceTokenMessage, 10055 AskPlayerJWTokenMessage
//
//   Замечено в логах, но НЕ обрабатывается и НЕ в SILENT_IGNORE (значит
//   реально "Not Found" — 10107 шлётся клиентом регулярно с payload 1 байт,
//   формат/назначение пока не выяснены):
//   10107 — ???

// Пакеты, которые клиент шлёт регулярно, но которые не требуют ответа
// (fire-and-forget: аналитика, статус игрока, device token и т.д.).
// Раньше они светились в логах как "Not Found" — теперь тихо игнорируются,
// без изменения поведения (мы и раньше ничего с ними не делали).
const SILENT_IGNORE = new Set([
  10110, // AnalyticEventMessage
  39004, // не найден в известной карте пакетов v62 — скорее всего что-то из более новой версии клиента
  14366, // PlayerStatusMessage
  10113, // SetDeviceTokenMessage
  10055, // AskPlayerJWTokenMessage (в карте есть ответ 23774 PlayerJWTokenMessage, но формат неизвестен — оставляем без ответа, чем гадать)
]);

function dispatch(id, payload, socket) {
  switch (id) {
    case 10100: {
      const msg = new Hello(socket, payload);
      msg.decode();
      msg.process();
      break;
    }
    case 10101: {
      const msg = new Auth(socket, payload);
      msg.decode();
      msg.process();
      break;
    }
    case 14403: {
      const msg = new AskForPlayerLeaderboard(socket, payload);
      msg.decode();
      msg.process();
      break;
    }
    case 15081: {
      const msg = new GetPlayerProfileMessage(socket, payload);
      msg.decode();
      msg.process();
      break;
    }
    case 14600: {
      const msg = new AvatarNameCheckMessage(socket, payload);
      msg.decode();
      msg.process();
      break;
    }
    case 10212: {
      const msg = new ChangeAvatarNameMessage(socket, payload);
      msg.decode();
      msg.process();
      break;
    }
    case 14102: {
      const msg = new EndClientTurnMessage(socket, payload);
      msg.decode();
      msg.process();
      break;
    }
    case 10108: {
      const msg = new KeepAliveMessage(socket, payload);
      msg.decode();
      msg.process();
      break;
    }
    default:
      if (SILENT_IGNORE.has(id)) return; // fire-and-forget, ничего не делаем
      Logger.unknown(id, payload);
  }
}

module.exports = { dispatch };
