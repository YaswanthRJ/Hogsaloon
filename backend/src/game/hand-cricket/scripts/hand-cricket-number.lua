local gameKey = KEYS[1]
local sessionGameKey = KEYS[2]
local chatSessionKey = KEYS[3]

local operation = ARGV[1]
local phase = ARGV[2]
local gameId = ARGV[3]
local userId = ARGV[4]
local number = tonumber(ARGV[5])
local now = tonumber(ARGV[6])

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
if not number or number < 1 or number > 10 or number % 1 ~= 0 then
  return { 'INVALID_NUMBER' }
end

local playerA = redis.call('HGET', gameKey, 'playerA')
local playerB = redis.call('HGET', gameKey, 'playerB')
if userId ~= playerA and userId ~= playerB then
  return { 'NOT_PLAYER' }
end

local stateJson = redis.call('HGET', gameKey, 'state')
local state = cjson.decode(stateJson)
if state.phase ~= phase then
  return { 'INVALID_PHASE' }
end

local ownKey = userId == playerA and 'pendingNumberA' or 'pendingNumberB'
local opponentKey = userId == playerA and 'pendingNumberB' or 'pendingNumberA'
local ownNumber = state[ownKey]
local opponentNumber = state[opponentKey]

if operation == 'COMMIT' then
  if ownNumber ~= cjson.null and ownNumber ~= nil then
    return { 'ALREADY_SUBMITTED' }
  end
  if opponentNumber == cjson.null or opponentNumber == nil then
    state[ownKey] = number
    redis.call('HSET', gameKey, 'state', cjson.encode(state))
    local opponentId = userId == playerA and playerB or playerA
    return { 'WAITING', opponentId }
  end
  return { 'RESOLVE', stateJson, tostring(opponentNumber) }
end

if operation == 'FINALIZE' then
  local expectedStateJson = ARGV[7]
  local nextStateJson = ARGV[8]
  local expectedOpponentNumber = tonumber(ARGV[9])

  if stateJson ~= expectedStateJson or
    (ownNumber ~= cjson.null and ownNumber ~= nil) or
    tonumber(opponentNumber) ~= expectedOpponentNumber then
    return { 'STATE_CHANGED' }
  end

  redis.call('HSET', gameKey, 'state', nextStateJson)
  local nextState = cjson.decode(nextStateJson)
  if nextState.phase == 'FINISHED' then
    redis.call('HSET', gameKey, 'status', 'FINISHED')
    redis.call('DEL', sessionGameKey)
  end
  return { 'OK' }
end

return { 'INVALID_ACTION' }