'use strict';

/**
 * Список игроков для лидерборда.
 * Пока статичный (fake) — потом можно подключить реальную БД игроков
 * и сортировать по трофеям динамически.
 *
 * HighId/LowId — id аккаунта (как в LogicLong: [high, low])
 * Name         — никнейм
 * Trophies     — текущие трофеи (по ним сортируется топ)
 * ExpLevel     — уровень игрока (значок опыта)
 * Thumbnail    — [group, id] иконки профиля
 * NameColor    — [group, id] цвета ника
 * AllianceName — название клуба/клана (пусто если без клана)
 * Rank         — позиция в топе (1 = первое место), проставляется автоматически ниже
 */
const LeaderboardPlayers = [
  { HighId: 0, LowId: 1001, Name: 'Pertoyc',   Trophies: 45210, ExpLevel: 78, Thumbnail: [28, 1],  NameColor: [43, 0], AllianceName: 'MILL' },
  { HighId: 0, LowId: 1002, Name: 'KakaoMill', Trophies: 43990, ExpLevel: 72, Thumbnail: [28, 5],  NameColor: [43, 2], AllianceName: 'MILL' },
  { HighId: 0, LowId: 1003, Name: 'Shelly_TOP',Trophies: 41250, ExpLevel: 65, Thumbnail: [28, 2],  NameColor: [43, 0], AllianceName: '' },
  { HighId: 0, LowId: 1004, Name: 'ProGamer',  Trophies: 39870, ExpLevel: 60, Thumbnail: [28, 8],  NameColor: [43, 4], AllianceName: 'GG' },
  { HighId: 0, LowId: 1005, Name: 'NoobSlayer',Trophies: 38120, ExpLevel: 58, Thumbnail: [28, 3],  NameColor: [43, 0], AllianceName: '' },
];

// Проставляем ранг автоматически по убыванию трофеев
LeaderboardPlayers.sort((a, b) => b.Trophies - a.Trophies);
LeaderboardPlayers.forEach((p, i) => { p.Rank = i + 1; });

module.exports = { LeaderboardPlayers };
