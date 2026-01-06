const { Redis } = require('@upstash/redis');
const config = require('../config');

const redis = new Redis({
  url: config.REDIS_URL,
  token: config.REDIS_TOKEN,
});

module.exports = redis;