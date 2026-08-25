'use strict';

let _addr = '';

function termWidth() {
  return process.stdout.columns || 80;
}

function visibleLen(s) {
  return [...s].length;
}

function center(visible) {
  const W = termWidth();
  if (W > visible) {
    process.stdout.write(' '.repeat(Math.floor((W - visible) / 2)));
  }
}

function emit(s) {
  process.stdout.write(s);
}

// ── Public API ───────────────────────────────────────────────────────────────

function setAddr(addr) {
  const idx = addr.lastIndexOf(':');
  _addr = idx !== -1 ? addr.slice(0, idx) : addr;
}

function getAddr() {
  return _addr;
}

function banner() {
  const lines = [
    ' __  __ ___ _     _        __     __  __  __ ',
    '|  \\/  |_ _| |   | |       \\ \\   / / / / / / ',
    '| |\\/| || || |   | |        \\ \\ / / / / / /  ',
    '| |  | || || |___| |___      \\ V / /_/ /_/   ',
    '|_|  |_|___|_____|_____|      \\_/ (_) (_)    ',
    '                                             ',
    '        MILL-V66 | by @KakaoMill'
  ];

  const colors = [
    '\x1b[38;2;255;60;60m',
    '\x1b[38;2;255;120;0m',
    '\x1b[38;2;255;220;0m',
    '\x1b[38;2;0;255;120m',
    '\x1b[38;2;0;220;255m',
    '\x1b[38;2;0;120;255m',
    '\x1b[38;2;180;0;255m',
    '\x1b[38;2;255;255;255m'
  ];

  const lineLen = 70;
  emit('\n');
  for (let i = 0; i < lines.length; i++) {
    center(lineLen);
    emit(`${colors[Math.min(i, colors.length - 1)]}\x1b[1m${lines[i]}\x1b[0m\n`);
  }
  emit('\n');
}

function serverInfo(msg) {
  center(10 + 2 + visibleLen(msg));
  emit(`\x1b[36m\x1b[1m[ SERVER ]\x1b[0m  ${msg}\n`);
}

function connect() {
  const a = getAddr();
  center(2 + visibleLen(a) + 4 + 13);
  emit(`\x1b[32m\x1b[1m[ ${a} ]\x1b[0m\x1b[32m  ●  Connected\x1b[0m\n`);
}

function disconnect() {
  const a = getAddr();
  center(2 + visibleLen(a) + 4 + 16);
  emit(`\x1b[33m\x1b[1m[ ${a} ]\x1b[0m\x1b[33m  ○  Disconnected\x1b[0m\n`);
}

function packetName(id) {
  switch (id) {
    // ── Входящие (клиент → сервер), реально обрабатываются в Gate/Message.js ──
    case 10100: return 'Hello';
    case 10101: return 'Auth';
    case 14403: return 'AskForPlayerLeaderboard';
    case 15081: return 'GetPlayerProfileMessage';
    case 14600: return 'AvatarNameCheckMessage';
    case 10212: return 'ChangeAvatarNameMessage';
    case 14102: return 'EndClientTurnMessage';
    case 10108: return 'KeepAliveMessage';

    // ── Входящие, но тихо игнорируемые (см. SILENT_IGNORE в Gate/Message.js) ──
    // Не "Not Found" в смысле "сервер не понимает" — просто осознанно без ответа.
    case 10110: return 'AnalyticEventMessage (ignored)';
    case 39004: return 'Unknown39004 (ignored)'; // не опознан ни в одной известной карте пакетов
    case 14366: return 'PlayerStatusMessage (ignored)';
    case 10113: return 'SetDeviceTokenMessage (ignored)';
    case 10055: return 'AskPlayerJWTokenMessage (ignored)';

    // ── Исходящие (сервер → клиент) ──────────────────────────────────────────
    case 20100: return 'Hello';
    case 20104: return 'AuthOk';
    case 20108: return 'KeepAliveServerMessage';
    case 24101: return 'OwnHomeDataMessage'; // он же "HomeData"
    case 24111: return 'AvailableServerCommandMessage';
    case 24113: return 'PlayerProfileMessage';
    case 20300: return 'AvatarNameCheckResponseMessage';
    case 24403: return 'PlayerLeaderboard';
    case 23456: return 'BattleEndMessage';

    default:    return 'Unknown';
  }
}

function packetIn(id) {
  const a = getAddr();
  const name = packetName(id);
  if (name === 'Unknown') {
    const msg = `Not Found (${id})`;
    center(2 + visibleLen(a) + 4 + 5 + visibleLen(msg));
    emit(`\x1b[34m\x1b[1m[ ${a} ]\x1b[0m\x1b[34m  ←  \x1b[0m\x1b[33m${msg}\x1b[0m\n`);
  } else {
    center(2 + visibleLen(a) + 4 + 5 + visibleLen(name));
    emit(`\x1b[34m\x1b[1m[ ${a} ]\x1b[0m\x1b[34m  ←  \x1b[0m${name}\n`);
  }
}

function packetOut(id) {
  const a = getAddr();
  const name = packetName(id);
  if (name === 'Unknown') {
    const msg = `Not Found (${id})`;
    center(2 + visibleLen(a) + 4 + 5 + visibleLen(msg));
    emit(`\x1b[35m\x1b[1m[ ${a} ]\x1b[0m\x1b[35m  →  \x1b[0m\x1b[33m${msg}\x1b[0m\n`);
  } else {
    center(2 + visibleLen(a) + 4 + 5 + visibleLen(name));
    emit(`\x1b[35m\x1b[1m[ ${a} ]\x1b[0m\x1b[35m  →  \x1b[0m${name}\n`);
  }
}

function unknown(id, payload) {
  const a = getAddr();
  const msg = `Not Found (${id})`;
  center(2 + visibleLen(a) + 4 + 5 + visibleLen(msg));
  emit(`\x1b[33m\x1b[1m[ ${a} ]\x1b[0m\x1b[33m  ?  ${msg}\x1b[0m\n`);

  if (payload && payload.length) {
    const hex = payload.slice(0, 128).toString('hex').match(/.{1,2}/g).join(' ');
    const more = payload.length > 128 ? ` … (+${payload.length - 128} bytes)` : '';
    emit(`\x1b[33m        payload (${payload.length}b): ${hex}${more}\x1b[0m\n`);
  }
}

function clientErr(msg) {
  const a = getAddr();
  center(2 + visibleLen(a) + 4 + 5 + visibleLen(msg));
  emit(`\x1b[31m\x1b[1m[ ${a} ]  ✗  ${msg}\x1b[0m\n`);
}

function playerTag(tag, isNew) {
  const a = getAddr();
  const msg = isNew ? `Новый аккаунт: ${tag}` : `Вход: ${tag}`;
  center(2 + visibleLen(a) + 4 + 5 + visibleLen(msg));
  emit(`\x1b[32m\x1b[1m[ ${a} ]\x1b[0m\x1b[32m  ★  ${msg}\x1b[0m\n`);
}

module.exports = {
  setAddr,
  getAddr,
  banner,
  serverInfo,
  connect,
  disconnect,
  packetIn,
  packetOut,
  packetName,
  unknown,
  clientErr,
  playerTag,
};