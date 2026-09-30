local gameKey = KEYS[1]
local sessionGameKey = KEYS[2]
local chatSessionKey = KEYS[3]

local gameId = ARGV[1]
local userId = ARGV[2]
local action = ARGV[3]
local now = tonumber(ARGV[4])

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

local playerA = redis.call('HGET', gameKey, 'playerA')
local playerB = redis.call('HGET', gameKey, 'playerB')
local status = redis.call('HGET', gameKey, 'status')

if action == 'DECLINE' then
  if userId ~= playerB then
    return { 'NOT_INVITEE' }
  end
  if status ~= 'INVITED' then
    return { 'INVALID_STATUS' }
  end
elseif action == 'LEAVE' then
  if userId ~= playerA and userId ~= playerB then
    return { 'NOT_PLAYER' }
  end
  if status ~= 'INVITED' and status ~= 'PLAYING' then
    return { 'INVALID_STATUS' }
  end
elseif action ~= 'CHAT_ENDED' then
  return { 'INVALID_ACTION' }
end

redis.call('DEL', gameKey, sessionGameKey)
return { 'OK', playerA, playerB }