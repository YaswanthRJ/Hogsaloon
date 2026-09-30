local gameKey = KEYS[1]
local sessionGameKey = KEYS[2]
local chatSessionKey = KEYS[3]

local gameId = ARGV[1]
local userId = ARGV[2]
local choice = ARGV[3]
local finalize = ARGV[4] == '1'
local expectedOpponentChoice = ARGV[5]
local winnerId = ARGV[6]
local now = tonumber(ARGV[7])

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

if choice ~= 'ROCK' and choice ~= 'PAPER' and choice ~= 'SCISSORS' then
  return { 'INVALID_CHOICE' }
end

local playerA = redis.call('HGET', gameKey, 'playerA')
local playerB = redis.call('HGET', gameKey, 'playerB')

if userId ~= playerA and userId ~= playerB then
  return { 'NOT_PLAYER' }
end

if redis.call('HGET', gameKey, 'status') ~= 'PLAYING' then
  return { 'INVALID_STATUS' }
end

local ownField = userId == playerA and 'userAChoice' or 'userBChoice'
local opponentField = userId == playerA and 'userBChoice' or 'userAChoice'
local ownChoice = redis.call('HGET', gameKey, ownField) or ''
local opponentChoice = redis.call('HGET', gameKey, opponentField) or ''

if ownChoice ~= '' then
  return { 'ALREADY_CHOSEN' }
end

if finalize then
  if opponentChoice == '' or opponentChoice ~= expectedOpponentChoice then
    return { 'INVALID_RESULT_STATE' }
  end
  if winnerId ~= '' and winnerId ~= playerA and winnerId ~= playerB then
    return { 'INVALID_RESULT_STATE' }
  end

  redis.call('HSET', gameKey, ownField, choice, 'status', 'FINISHED', 'winnerId', winnerId)
  redis.call('DEL', sessionGameKey)

  local choiceA = userId == playerA and choice or opponentChoice
  local choiceB = userId == playerB and choice or opponentChoice
  return { 'RESULT', playerA, playerB, choiceA, choiceB, winnerId }
end

if opponentChoice ~= '' then
  return { 'RESULT_REQUIRED', opponentChoice }
end

redis.call('HSET', gameKey, ownField, choice)
local opponentId = userId == playerA and playerB or playerA
return { 'WAITING', opponentId }