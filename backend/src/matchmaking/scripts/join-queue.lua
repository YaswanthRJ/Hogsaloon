local queueKey = KEYS[1]
local waitingUsersKey = KEYS[2]

local userId = ARGV[1]
local entry = ARGV[2]

-- Prevent the same user from entering the queue twice
if redis.call('SISMEMBER', waitingUsersKey, userId) == 1 then
  return { 'DUPLICATE' }
end

-- Add user to FIFO queue
redis.call('RPUSH', queueKey, entry)

-- Track that this user is waiting
redis.call('SADD', waitingUsersKey, userId)

local count = redis.call('LLEN', queueKey)

-- Not enough users to make a match
if count < 2 then
  return { 'WAITING' }
end

-- Take the first two users
local first = redis.call('LPOP', queueKey)
local second = redis.call('LPOP', queueKey)

if not first or not second then
  return { 'WAITING' }
end

local firstEntry = cjson.decode(first)
local secondEntry = cjson.decode(second)

-- They are no longer waiting
redis.call(
  'SREM',
  waitingUsersKey,
  firstEntry.userId,
  secondEntry.userId
)

return { 'MATCHED', first, second }