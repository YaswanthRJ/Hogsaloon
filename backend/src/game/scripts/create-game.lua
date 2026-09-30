local gameKey = KEYS[1]
local sessionGameKey = KEYS[2]
local chatSessionKey = KEYS[3]

local gameId = ARGV[1]
local sessionId = ARGV[2]
local playerA = ARGV[3]
local playerB = ARGV[4]
local gameType = ARGV[5]
local createdAt = ARGV[6]
local state = ARGV[7]
local expiresAt = tonumber(ARGV[8])
local now = tonumber(ARGV[9])

if redis.call('HGET', chatSessionKey, 'status') ~= 'ACTIVE' or
  tonumber(redis.call('HGET', chatSessionKey, 'expiresAt') or '0') <= now then
  return { 'CHAT_INACTIVE' }
end

local chatUserA = redis.call('HGET', chatSessionKey, 'userA')
local chatUserB = redis.call('HGET', chatSessionKey, 'userB')
if not ((playerA == chatUserA and playerB == chatUserB) or
  (playerA == chatUserB and playerB == chatUserA)) then
  return { 'NOT_PLAYER' }
end

if redis.call('EXISTS', sessionGameKey) == 1 then
  return { 'ACTIVE_GAME_EXISTS' }
end

if redis.call('EXISTS', gameKey) == 1 then
  return { 'GAME_ID_EXISTS' }
end

redis.call('HSET', gameKey,
  'gameId', gameId,
  'sessionId', sessionId,
  'gameType', gameType,
  'playerA', playerA,
  'playerB', playerB,
  'status', 'INVITED',
  'createdAt', createdAt,
  'state', state)
redis.call('PEXPIREAT', gameKey, expiresAt)
redis.call('SET', sessionGameKey, gameId, 'PXAT', expiresAt)

return { 'OK' }