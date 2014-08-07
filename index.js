var util = require('util');
var url = require('url');

module.exports = function (everyauth) {
  if (! everyauth.oauth2) {
    everyauth.oauth2 = require("everyauth-oauth2")(everyauth);
  }
  everyauth.facebook =
  everyauth.oauth2.submodule('facebook')
  .configurable({
    scope: 'specify types of access: See http://developers.facebook.com/docs/authentication/permissions/'
  , fields: 'specify returned fields: See http:/developers.facebook.com/docs/reference/api/user/'
  })

  .apiHost('https://graph.facebook.com')
  .oauthHost('https://graph.facebook.com')
  .authPath('https://www.facebook.com/dialog/oauth')

  .authQueryParam('scope', function () {
    return this._scope && this.scope();
  })

  .authCallbackDidErr( function (req) {
    var parsedUrl = url.parse(req.url, true);
    return parsedUrl.query && !!parsedUrl.query.error;
  })

  .fetchOAuthUser( function (accessToken) {
    var p = this.Promise();
    var fieldsQuery = "";
    if (this._fields && this._fields.length > 0){
        fieldsQuery = "?fields=" + this.fields();
    }
    this.oauth.get(this.apiHost() + '/me' + fieldsQuery, accessToken, function (err, data) {
      if (err) return p.fail(err);
      var oauthUser = JSON.parse(data);
      p.fulfill(oauthUser);
    })
    return p;
  })
  .moduleErrback( function (err, seqValues) {
    if (err instanceof Error) {
      var next = seqValues.next;
      return next(err);
    } else if (err.extra) {
      var facebookResponse = err.extra.res;
      var serverResponse = seqValues.res;
      serverResponse.writeHead(
          facebookResponse.statusCode
        , facebookResponse.headers);
      serverResponse.end(err.extra.data);
    } else if (err.statusCode) {
      var serverResponse = seqValues.res;
      serverResponse.writeHead(err.statusCode);
      serverResponse.end(err.data);
    } else {
      console.error(err);
      throw new Error('Unsupported error type');
    }
  })
  ;

  everyauth.facebook.mobile = function (isMobile) {
    if (isMobile) {
      this.authPath('https://m.facebook.com/dialog/oauth');
    }
    return this;
  };

  everyauth.facebook.popup = function (isPopup) {
    if (isPopup) {
      this.authQueryParam('display', 'popup');
    }
    return this;
  };

  everyauth.facebook.AuthCallbackError = AuthCallbackError;

  return everyauth.facebook;
};

function AuthCallbackError (req) {
  Error.call(this);
  Error.captureStackTrace(this, arguments.callee);
  this.name = 'AuthCallbackError';
  var parsedUrl = url.parse(req.url, true);
  this.message = parsedUrl.query.error_description;
}
util.inherits(AuthCallbackError, Error);
