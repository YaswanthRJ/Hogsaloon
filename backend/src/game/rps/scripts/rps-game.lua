local gameKey = KEYS[1]
local sessionGameKey = KEYS[2]
local chatSessionKey = KEYS[3]

local operation = ARGV[1]
local gameId = ARGV[2]
local userId = ARGV[3]
local choice = ARGV[4]
local now = tonumber(ARGV[5])

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
if redis.call('HGET', gameKey, 'gameType') ~= 'RPS' or
  redis.call('HGET', gameKey, 'status') ~= 'PLAYING' then
  return { 'INVALID_STATUS' }
end
if choice ~= 'ROCK' and choice ~= 'PAPER' and choice ~= 'SCISSORS' then
  return { 'INVALID_CHOICE' }
end

local playerA = redis.call('HGET', gameKey, 'playerA')
local playerB = redis.call('HGET', gameKey, 'playerB')
if userId ~= playerA and userId ~= playerB then
  return { 'NOT_PLAYER' }
end

local stateJson = redis.call('HGET', gameKey, 'state')
local state = cjson.decode(stateJson)
local ownKey = userId == playerA and 'choiceA' or 'choiceB'
local opponentKey = userId == playerA and 'choiceB' or 'choiceA'
local ownChoice = state[ownKey]
local opponentChoice = state[opponentKey]

if operation == 'COMMIT' then
  if ownChoice ~= cjson.null and ownChoice ~= nil then
    return { 'ALREADY_CHOSEN' }
  end
  if opponentChoice == cjson.null or opponentChoice == nil then
    state[ownKey] = choice
    redis.call('HSET', gameKey, 'state', cjson.encode(state))
    local opponentId = userId == playerA and playerB or playerA
    return { 'WAITING', opponentId }
  end
  return { 'RESULT_REQUIRED', stateJson, opponentChoice }
end

if operation == 'FINALIZE' then
  local expectedStateJson = ARGV[6]
  local nextStateJson = ARGV[7]
  local expectedOpponentChoice = ARGV[8]
  local finished = ARGV[9] == '1'

  if stateJson ~= expectedStateJson or
    (ownChoice ~= cjson.null and ownChoice ~= nil) or
    opponentChoice ~= expectedOpponentChoice then
    return { 'RESULT_STATE_CHANGED' }
  end

  local nextState = cjson.decode(nextStateJson)
  redis.call('HSET', gameKey, 'state', cjson.encode(nextState))

  if finished then
    redis.call('HSET', gameKey, 'status', 'FINISHED')
    redis.call('DEL', sessionGameKey)
  end

  return { 'ROUND_RESULT' }
end

return { 'INVALID_ACTION' }