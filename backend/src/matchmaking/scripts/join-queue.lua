local queueKey = KEYS[1]
local waitingUsersKey = KEYS[2]

local userId = ARGV[1]
local entry = ARGV[2]

-- Prevent the same user from entering the queue twice
if redis.call('SISMEMBER', waitingUsersKey, userId) == 1 then
  return { 'DUPLICATE' }
end

-- Add user to the queue. FIFO order is used as the final tie-breaker.
redis.call('RPUSH', queueKey, entry)

-- Track that this user is waiting
redis.call('SADD', waitingUsersKey, userId)

local entries = redis.call('LRANGE', queueKey, 0, -1)
local joiningEntry = cjson.decode(entry)
local bestEntry = nil
local bestLanguageOverlap = -1
local bestInterestOverlap = -1

-- Not enough users to make a match
if #entries < 2 then
  return { 'WAITING' }
end

for _, candidate in ipairs(entries) do
  local candidateEntry = cjson.decode(candidate)

  if candidateEntry.userId ~= userId then
    local languageOverlap = 0
    local interestOverlap = 0

    for _, language in ipairs(joiningEntry.languages or {}) do
      for _, candidateLanguage in ipairs(candidateEntry.languages or {}) do
        if language == candidateLanguage then
          languageOverlap = languageOverlap + 1
          break
        end
      end
    end

    for _, interest in ipairs(joiningEntry.interests or {}) do
      for _, candidateInterest in ipairs(candidateEntry.interests or {}) do
        if interest == candidateInterest then
          interestOverlap = interestOverlap + 1
          break
        end
      end
    end

    if languageOverlap > bestLanguageOverlap or
      (languageOverlap == bestLanguageOverlap and interestOverlap > bestInterestOverlap) then
      bestEntry = candidate
      bestLanguageOverlap = languageOverlap
      bestInterestOverlap = interestOverlap
    end
  end
end

if not bestEntry then
  return { 'WAITING' }
end

redis.call('LREM', queueKey, 1, entry)
redis.call('LREM', queueKey, 1, bestEntry)

local bestEntryData = cjson.decode(bestEntry)

-- They are no longer waiting
redis.call(
  'SREM',
  waitingUsersKey,
  userId,
  bestEntryData.userId
)

return { 'MATCHED', entry, bestEntry }