var _ = require('underscore');
var util = require('util');
var FeedBase = require('./feed-base');

function NewsInbox(session, limit) {
  this.limit = parseInt(limit) || null;
  FeedBase.apply(this, arguments);
}
util.inherits(NewsInbox, FeedBase);

module.exports = NewsInbox;
var Request = require('../request');
var Story = require('../story');


NewsInbox.prototype.get = function () {
  var that = this;
  return new Request(this.session)
    .setMethod('GET')
    .setResource('newsInbox', {
      cursor: this.getCursor()
    })
    .send()
    .then(function(json) {
      that.newStories = json.new_stories;
      var stroires = _.map(that.newStories, function (story) {
        return new Story(that.session, story);
      })
      return stroires;
    })
};