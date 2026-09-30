local gameKey = KEYS[1]
local sessionGameKey = KEYS[2]
local chatSessionKey = KEYS[3]

local gameId = ARGV[1]
local userId = ARGV[2]
local now = tonumber(ARGV[3])
local expectedStateJson = ARGV[4]
local nextStateJson = ARGV[5]

if redis.call('EXISTS', gameKey) == 0 then
  return { 'GAME_NOT_FOUND' }
end
if redis.call('GET', sessionGameKey) ~= gameId then
  return { 'GAME_NOT_ACTIVE' }
end
if redis.call('HGET', chatSessionKey, 'status') ~= 'ACTIVE' or
  tonumber(redis.call('HGET', chatSessionKey, 'expiresAt') or '0') <= now then
  return { 'CHAT_INACTIVE' }
end
if redis.call('HGET', gameKey, 'gameType') ~= 'HAND_CRICKET' or
  redis.call('HGET', gameKey, 'status') ~= 'PLAYING' then
  return { 'INVALID_PHASE' }
end
if redis.call('HGET', gameKey, 'playerA') ~= userId and
  redis.call('HGET', gameKey, 'playerB') ~= userId then
  return { 'NOT_PLAYER' }
end

local stateJson = redis.call('HGET', gameKey, 'state')
if stateJson ~= expectedStateJson then
  return { 'STATE_CHANGED' }
end
local state = cjson.decode(stateJson)
if state.phase ~= 'TOSS_DECISION' then
  return { 'INVALID_PHASE' }
end
if state.tossWinnerId ~= userId then
  return { 'NOT_TOSS_WINNER' }
end

redis.call('HSET', gameKey, 'state', nextStateJson)
return { 'OK' }