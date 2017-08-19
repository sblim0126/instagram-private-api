var util = require("util");
var _ = require("underscore");
var Resource = require("./resource");


function Story(session, params) {
  Resource.apply(this, arguments);
}

util.inherits(Story, Resource);
module.exports = Story;

Story.prototype.parseParams = function (json) {
  var hash = {};
  hash.story_type = json.story_type;
  hash.accountId = json.args.profile_id;
  hash.text = json.args.text;
  hash.media = json.args.media;
  hash.pk = json.pk;
  return hash;
};
