'use strict';

const net     = require('net');
const path    = require('path');
const { spawn } = require('child_process');
const Logger  = require('./Core/Logger');
const Message = require('./Gate/Message');

const PORT = 9339;
const HEADER_SIZE = 7; // [u16 id][u24 len][u16 ver]

// ── Per-connection state ──────────────────────────────────────────────────────

function createClientState() {
  return {
    chunks: [],       // accumulated raw bytes
    buffered: 0,      // total bytes in chunks
    addr: '',
  };
}

function clientLoop(socket) {
  const state = createClientState();
  state.addr = `${socket.remoteAddress}:${socket.remotePort}`;

  Logger.setAddr(state.addr);
  Logger.connect();

  socket.on('data', (chunk) => {
    state.chunks.push(chunk);
    state.buffered += chunk.length;
    processBuffer(socket, state);
  });

  socket.on('end',  () => { Logger.setAddr(state.addr); Logger.disconnect(); });
  socket.on('close',() => { Logger.setAddr(state.addr); Logger.disconnect(); });
  socket.on('error',(err) => {
    Logger.setAddr(state.addr);
    if (err.code !== 'ECONNRESET' && err.code !== 'EPIPE') {
      Logger.clientErr(`Socket error: ${err.message}`);
    }
  });
}

// Parse as many complete messages out of state.chunks as possible.
function processBuffer(socket, state) {
  while (true) {
    if (state.buffered < HEADER_SIZE) return; // need more data

    const header = consume(state, HEADER_SIZE);
    const msgId  = header.readUInt16BE(0);
    const msgLen = (header[2] << 16) | (header[3] << 8) | header[4];
    // header[5..6] = version (ignored)

    if (state.buffered < msgLen) {
      // Put the header back and wait for more data
      state.chunks.unshift(header);
      state.buffered += HEADER_SIZE;
      return;
    }

    const payload = msgLen > 0 ? consume(state, msgLen) : Buffer.alloc(0);

    Logger.setAddr(state.addr);
    Logger.packetIn(msgId);

    try {
      Message.dispatch(msgId, payload, socket);
    } catch (err) {
      Logger.clientErr(`Dispatch failed on ${msgId}: ${err.message}`);
    }
  }
}

// Pull `n` bytes out of the chunk list and return them as a single Buffer.
function consume(state, n) {
  const result = Buffer.allocUnsafe(n);
  let written = 0;

  while (written < n) {
    const head = state.chunks[0];
    const need = n - written;

    if (head.length <= need) {
      head.copy(result, written);
      written += head.length;
      state.buffered -= head.length;
      state.chunks.shift();
    } else {
      head.copy(result, written, 0, need);
      state.chunks[0] = head.slice(need);
      state.buffered -= need;
      written += need;
    }
  }

  return result;
}

// ── Start server ──────────────────────────────────────────────────────────────

const server = net.createServer((socket) => {
  socket.setNoDelay(true);
  clientLoop(socket);
});

server.on('error', (err) => {
  Logger.serverInfo(`Server error: ${err.message}`);
});

server.listen(PORT, '0.0.0.0', () => {
  Logger.banner();
  Logger.serverInfo(`Listening on ${PORT}`);
});

// ── Telegram-бот (bot/bot.py) ───────────────────────────────────────────────
// Поднимаем ботом отдельный процесс рядом с сервером. Если он упадёт
// (например временный обрыв сети у Telegram API) — перезапускаем сам,
// чтобы не приходилось следить за ним руками.

let botProcess = null;
let botRestartTimer = null;
let shuttingDown = false;

function startBot() {
  const botPath = path.join(__dirname, 'bot', 'bot.py');
  const pythonBin = process.env.MILL_BOT_PYTHON || 'python3';

  botProcess = spawn(pythonBin, [botPath], {
    cwd: path.join(__dirname, 'bot'),
    stdio: 'inherit',
  });

  botProcess.on('error', (err) => {
    Logger.serverInfo(`[BOT] Не удалось запустить бота: ${err.message}`);
  });

  botProcess.on('exit', (code, signal) => {
    botProcess = null;
    if (shuttingDown) return;

    Logger.serverInfo(`[BOT] Процесс бота завершился (code=${code}, signal=${signal}), перезапуск через 5с`);
    botRestartTimer = setTimeout(startBot, 5000);
  });

  Logger.serverInfo('[BOT] Telegram-бот запущен (bot/bot.py)');
}

startBot();

function stopBot() {
  shuttingDown = true;
  if (botRestartTimer) clearTimeout(botRestartTimer);
  if (botProcess) botProcess.kill();
}

process.on('SIGINT',  () => { stopBot(); process.exit(0); });
process.on('SIGTERM', () => { stopBot(); process.exit(0); });
