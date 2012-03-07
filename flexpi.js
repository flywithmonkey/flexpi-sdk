flex = {
    api_url : 'http://api.flexpi.com:3001/',
    social : { facebook : {} },
    settings : {
        social : {
            facebook : {}
        }
    }
};

flex.extend = function(obj1, obj2) {
  for (var p in obj2) {
    try {
      if ( obj2[p].constructor==Object ) {
        obj1[p] = MergeRecursive(obj1[p], obj2[p]);
      } else {
        obj1[p] = obj2[p];
      }
    } catch(e) {
      obj1[p] = obj2[p];
    }
  }
  return obj1;
};

flex.loader = function (c, d) {
    for (var b = c.length, 
        e = b, 
        f = function () {
            if (!(this.readyState &&
                    this.readyState !== "complete" &&
                    this.readyState !== "loaded"
                )) {
                this.onload = this.onreadystatechange = null;
                --e || d()
            }
        },
        g = document.getElementsByTagName("head")[0], 
        i = function (h) {
            var a = document.createElement("script");
            a.async = true;
            a.src = h;
            a.onload = a.onreadystatechange = f;
            g.appendChild(a)
        }; b;
    ) i(c[--b]);
};

flex.connect = function(data, callback) {
	flex.appData = data;
	var scripts = [];
	scripts[0] = flex.api_url+'socket.io/socket.io.js';

	flex.loader(scripts, function () {
	    flex.socket = io.connect(flex.api_url);
	    flex.socket.on('connect', function (res) {
            flex.readSettings();
		    if (typeof callback != 'undefined') {
                callback(res);
            }
		});
	});
}

flex.readSettings = function() {
    flex.socket.emit('settings', { 
        'app_id': flex.appData.app_id
    },  function (data) {
        flex.settings = flex.extend(flex.settings, data); 
    });
}

/* --------------------------- flex.stats --------------------------- */

/**
 * Add new stats 
 * @param  string   key      defined variable name
 * @param  string   value    saved value 
 * @param  Function callback function called after succesfully save
 */
flex.stats = function(key, value, callback) {
	flex.socket.emit('stats', { 
		'app_id': flex.appData.app_id,
		'key' : key,
		'value' : value
	}, function (res) {
        if (typeof callback != 'undefined') {
            callback(res);
        }
    });
};

/* --------------------------- flex.social --------------------------- */

/**
 * Init Facebook jssdk API.
 * 
 * @param  Function callback If user has FB object run provided function
 * @param  String   lang     Api language
 */
flex.social.facebook.init = function(callback, lang) {
    if (typeof flex.settings.social.facebook.appId == 'undefined') {
        return { error: { code: 401, message: "First configure FlexSocial." } }
    }

    if (typeof FB != 'undefined') {
        if (typeof callback != 'undefined') {
            callback();
        }

        return true;
    };

    var scripts = [],
        facebookSettings = flex.settings.social.facebook;

    if (lang == undefined) {
        lang = facebookSettings.lang;
    }

    var g = document.getElementsByTagName("head")[0],
        a = document.createElement("div");

    if (g.length == 0) {
        a.id = 'fb-root';
        g.appendChild(a,g.firstChild);
    }

    scripts[0] = '//connect.facebook.net/'+lang+'/all.js';

    flex.loader(scripts, function () {
        window.fbAsyncInit = function() {
            FB.init({
                appId      : facebookSettings.appId,
                status     : true,
                cookie     : true,
                xfbml      : true,
                oauth      : true
            });

            if (typeof callback != 'undefined') {
                callback();
            }
        };
    });
}

/**
 * Check whether the user is present in the Facebook frame 
 * @return Boolean
 */
flex.social.facebook.isFacebookFrame = function() {
    if (window != window.top) {
        return true;
    };

    return false;
}

/**
 * The Feed Dialog prompts the user to publish an individual story to a profile's feed.
 * 
 * @param  object   data     {message, name, link, picture}
 * @param  Function callback Function with facebook feed response
 */
flex.social.facebook.feed = function(data, callback) {
    flex.social.facebook.init(function(){
        FB.ui({
            method: 'feed',
            message: data.message,
            name: data.name,
            link: data.link,
            picture: data.picture,
        }, function(res){
            if (typeof callback != 'undefined') {
                callback(res);
            }
        });
    });
    
};

/**
 * Calling flex.social.facebook.login results attempting 
 * to open a popup window. As such, this method should only be 
 * called after a user click event, otherwise the popup window will 
 * be blocked by most browsers.
 * 
 * @param  Function callback function with authentication result
 * @param  object   scope    comas seperated list of user permissions
 */
flex.social.facebook.login = function(callback, scope){
    if(scope == undefined) {
        scope = {};
    }

    flex.social.facebook.init(function(){
        FB.login(function(res){
            if (typeof callback != 'undefined') {
                callback(res);
            }
        }, { scope: scope });
    });
};

/**
 * Log the user out of your site and Facebook
 * 
 * @param  Function callback function with login status
 */
flex.social.facebook.logout = function(callback){
    flex.social.facebook.init(function(){
        FB.logout(function(res) {
            if (typeof callback != 'undefined') {
                callback(res);
            }
        });
    });
};

/**
 * Multi Friend Selector Dialog allowing the sending user to select multiple recipient users.
 * Requests are only available for Desktop Canvas apps and not websites. 
 * Accepting a request will direct the user to the Canvas Page URL of the app that sent the Request.
 * 
 * @param  Object   data     Parameters for Apprequests Dialog
 * @param  Function callback Callback function with Request Object ID and, an array of the recipient user IDs for the request that was created.
 */
flex.social.facebook.requests = function(data, callback){
    if (!flex.social.facebook.isFacebookFrame()) {
        return false;
    }

    if (data != undefined) {
        data = flex.extend({method: 'apprequests', message: 'My Great Request'}, data);
    }

    flex.social.facebook.init(function(){
        FB.ui(data, function(res){
            if (typeof callback != 'undefined') {
                callback(res);
            }
        });
    });
};

/**
 * The Send Dialog lets people to send content to specific friends. They’ll have the option to 
 * privately share a link as a Facebook message, Group post or email.
 * 
 * @param  Object data Provide link, and link name
 */
flex.social.facebook.message = function(data){
    var defaultData = {method: 'send', link : 'http://www.flexpi.com', name : 'FlexPi - games services'};
    if (data != undefined) {
        data = flex.extend(defaultData, data);
    } else {
        data = defaultData;
    }

    flex.social.facebook.init(function(){
        FB.ui(data);
    });
};

/**
 * Get pure Facebook jssdk object
 * 
 * @return Object Facebook jssdk object
 */
flex.social.facebook.getFb = function(){
    return FB;
}

/**
 * flex.social.getLoginStatus allows you to determine if a user is logged in to Facebook and has authenticated your app.
 * 
 * @param  Function callback function with login status as response
 */
flex.social.facebook.getLoginStatus = function(callback) {
    flex.social.facebook.init(function(){
        FB.getLoginStatus(function(res){
            if (typeof callback != 'undefined') {
                callback(res);
            }
        });
    });
};

/**
 * Get loged user data. if user is not logged - it will show login form, and return user data afters succesful login
 * 
 * @param  Function callback Function wit user data as parameter
 */
flex.social.facebook.getUser = function(callback) {
    flex.social.facebook.init(function(){
        flex.social.facebook.getLoginStatus(function(res){
            if (res.status === 'connected') {
                FB.api('/me', function(res) {
                  callback(res);
                });
            } else {
                callback({
                    error: {
                        code: 2500,
                        message: "An active access token must be used to query information about the current user.",
                        type: "OAuthException"
                    }
                });
            }
        });
    });
}