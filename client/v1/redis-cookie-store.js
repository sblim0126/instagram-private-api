'use strict';

var tough = require('tough-cookie');
var Store = tough.Store;
var permuteDomain = tough.permuteDomain;
var permutePath = tough.permutePath;
var util = require('util');

function RedisCookieStore(cookieKey, redisClient) {
  Store.call(this);
  this.idx = {};
  this.cookieKey = cookieKey;
  this.redisClient = redisClient;
}
util.inherits(RedisCookieStore, Store);
exports.RedisCookieStore = RedisCookieStore;
RedisCookieStore.prototype.idx = null;
RedisCookieStore.prototype.synchronous = true;

// force a default depth:
RedisCookieStore.prototype.inspect = function() {
  return "{ idx: "+util.inspect(this.idx, false, 2)+' }';
};

RedisCookieStore.prototype.findCookie = function(domain, path, key, cb) {
  var self = this;
  this.getCookieFromRedis(this.cookieKey, function(dataJson) {
    if (dataJson) {
      self.idx = dataJson;
    }
    if (!self.idx[domain]) {
      return cb(null,undefined);
    }
    if (!self.idx[domain][path]) {
      return cb(null,undefined);
    }
    return cb(null,self.idx[domain][path][key]||null);
  });
};

RedisCookieStore.prototype.findCookies = function(domain, path, cb) {
  var results = [];
  if (!domain) {
    return cb(null,[]);
  }

  var pathMatcher;
  if (!path) {
    // null or '/' means "all paths"
    pathMatcher = function matchAll(domainIndex) {
      for (var curPath in domainIndex) {
        var pathIndex = domainIndex[curPath];
        for (var key in pathIndex) {
          results.push(pathIndex[key]);
        }
      }
    };

  } else if (path === '/') {
    pathMatcher = function matchSlash(domainIndex) {
      var pathIndex = domainIndex['/'];
      if (!pathIndex) {
        return;
      }
      for (var key in pathIndex) {
        results.push(pathIndex[key]);
      }
    };

  } else {
    var paths = permutePath(path) || [path];
    pathMatcher = function matchRFC(domainIndex) {
      paths.forEach(function(curPath) {
        var pathIndex = domainIndex[curPath];
        if (!pathIndex) {
          return;
        }
        for (var key in pathIndex) {
          results.push(pathIndex[key]);
        }
      });
    };
  }

  var domains = permuteDomain(domain) || [domain];
  var idx = this.idx;
  domains.forEach(function(curDomain) {
    var domainIndex = idx[curDomain];
    if (!domainIndex) {
      return;
    }
    pathMatcher(domainIndex);
  });

  cb(null,results);
};

RedisCookieStore.prototype.putCookie = function(cookie, cb) {
  if (!this.idx[cookie.domain]) {
    this.idx[cookie.domain] = {};
  }
  if (!this.idx[cookie.domain][cookie.path]) {
    this.idx[cookie.domain][cookie.path] = {};
  }
  this.idx[cookie.domain][cookie.path][cookie.key] = cookie;
  this.saveCookieToRedis(this.cookieKey, this.idx, function() {
    cb(null);
  });
};

RedisCookieStore.prototype.updateCookie = function(oldCookie, newCookie, cb) {
  // updateCookie() may avoid updating cookies that are identical.  For example,
  // lastAccessed may not be important to some stores and an equality
  // comparison could exclude that field.
  this.putCookie(newCookie,cb);
};

RedisCookieStore.prototype.removeCookie = function(domain, path, key, cb) {
  if (this.idx[domain] && this.idx[domain][path] && this.idx[domain][path][key]) {
    delete this.idx[domain][path][key];
  }
  this.saveCookieToRedis(this.cookieKey, this.idx, function() {
    cb(null);
  });
};

RedisCookieStore.prototype.removeCookies = function(domain, path, cb) {
  if (this.idx[domain]) {
    if (path) {
      delete this.idx[domain][path];
    } else {
      delete this.idx[domain];
    }
  }
  this.saveCookieToRedis(this.cookieKey, this.idx, function() {
    cb(null);
  });
};

RedisCookieStore.prototype.getAllCookies = function(cb) {
  // Not support method
  cb(null);
};

RedisCookieStore.prototype.saveCookieToRedis = function(redisKey, data, cb) {
  var dataJson = JSON.stringify(data);
  this.redisClient.set(redisKey, dataJson, function(err) {
    if (err) {
      throw err;
    }
    cb();
  });
};

RedisCookieStore.prototype.getCookieFromRedis = function(redisKey, cb) {
  this.redisClient.get(redisKey, function(err, val) {
    if (err) {
      throw err;
    }
    var dataJson = val ? JSON.parse(val) : null;
    for(var domainName in dataJson) {
      for(var pathName in dataJson[domainName]) {
        for(var cookieName in dataJson[domainName][pathName]) {
          dataJson[domainName][pathName][cookieName] = tough.fromJSON(JSON.stringify(dataJson[domainName][pathName][cookieName]));
        }
      }
    }
    cb(dataJson);
  });
};
