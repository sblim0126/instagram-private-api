'use strict';

var util = require("util");
var CookieStorage = require('./cookie-storage');
var RedisCookieStore = require('./redis-cookie-store').RedisCookieStore;

function CookieRedisStorage(cookieKey, redisClient) {
  CookieStorage.call(this, new RedisCookieStore(cookieKey, redisClient));
}

util.inherits(CookieRedisStorage, CookieStorage);
module.exports = CookieRedisStorage;

CookieRedisStorage.prototype.destroy = function(){

};