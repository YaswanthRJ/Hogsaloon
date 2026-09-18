local queueKey = KEYS[1]
local waitingUsersKey = KEYS[2]
local userId = ARGV[1]

local entries = redis.call('LRANGE', queueKey, 0, -1)
local remaining = {}

for _, entry in ipairs(entries) do
  local ok, decoded = pcall(cjson.decode, entry)

  if ok and decoded and decoded.userId == userId then
    -- drop the abandoned queue entry
  else
    table.insert(remaining, entry)
  end
end

redis.call('DEL', queueKey)

if #remaining > 0 then
  redis.call('RPUSH', queueKey, unpack(remaining))
end

redis.call('SREM', waitingUsersKey, userId)
