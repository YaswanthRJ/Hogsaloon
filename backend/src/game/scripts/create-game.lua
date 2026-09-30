local gameKey = KEYS[1]
local sessionGameKey = KEYS[2]
local chatSessionKey = KEYS[3]

local gameId = ARGV[1]
local sessionId = ARGV[2]
local playerA = ARGV[3]
local playerB = ARGV[4]
local gameType = ARGV[5]
local createdAt = ARGV[6]
local expiresAt = tonumber(ARGV[7])
local now = tonumber(ARGV[8])

if redis.call('HGET', chatSessionKey, 'status') ~= 'ACTIVE' or
  tonumber(redis.call('HGET', chatSessionKey, 'expiresAt') or '0') <= now then
  return { 'CHAT_INACTIVE' }
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
  'userAChoice', '',
  'userBChoice', '',
  'winnerId', '')
redis.call('PEXPIREAT', gameKey, expiresAt)
redis.call('SET', sessionGameKey, gameId, 'PXAT', expiresAt)

return { 'OK' }