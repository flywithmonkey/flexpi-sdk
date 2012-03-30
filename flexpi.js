flex = {
    api_url : 'http://api.flexpi.com:3001/',
    social : { facebook : {}, browserid : {}, gg : {callback : {login : false, logout: false}} },
    payment : { cart : {}, transactions: {}, cartData : [], paypal : {} },
    settings : {
        social : {
            facebook : {},
            gg : {ready: false}
        },
        payment : {
            paypal : {}
        }
    }
};

flex.extend = function(obj1, obj2) {
  for (var p in obj2) {
    try {
      if ( obj2[p].constructor==Object ) {
        obj1[p] = flex.extend(obj1[p], obj2[p]);//MergeRecursive(obj1[p], obj2[p]);
      } else {
        obj1[p] = obj2[p];
      }
    } catch(e) {
      obj1[p] = obj2[p];
    }
  }
  return obj1;
};

flex.loader = function (c, d, aa) {
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
            if(typeof aa != 'undefined') {
                a.id = aa;
            }
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
        if (typeof data.code != 'undefined') {
            flex.settings = data;
        } else {
            flex.settings = flex.extend(flex.settings, data);
        } 
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
        return { error: { code: 401, message: "First configure FlexSocial with Facebook." } }
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
 * be blocked by most of browsers.
 * 
 * @param  Function callback function with result of authentication 
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
 * Logout user of your site and Facebook
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
 * Multi Friend Selector Dialog allows sending user to select multiple recipient users.
 * Requests are only available for Desktop Canvas apps, not websites. 
 * Accepting a request will direct user to the Canvas Page URL of the app that sent the Request.
 * 
 * @param  Object   data     Parameters for Apprequests Dialog
 * @param  Function callback Callback function with Requests Object ID and, an array of the recipient user IDs for the request that was created.
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
 * flex.social.facebook.getLoginStatus allows you to determine if a user is logged in to Facebook and has authenticated your app.
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
 * Get loged user data. if user is not logged - it will show login form, and return user data after succesful login
 * 
 * @param  Function callback Function with user data as parameter
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

flex.social.browserid.verify = function(assertion, callback) {
    flex.socket.emit('browseridVerify', { 
        'app_id': flex.appData.app_id,
        'assertion' : assertion,
        'audience' : window.location.hostname
    }, function (res) {
        if (typeof callback != 'undefined') {
            callback(res);
        }
    });
}

/**
 * Initialize browserid services - load script from browserid.org.
 * @param  Function [callback] [Optional] Callback after initialization.
 */
flex.social.browserid.init = function(callback) {
    var scripts = [];
    scripts[0] = 'https://browserid.org/include.js';

    flex.loader(scripts, function () {
        if (typeof callback != 'undefined') {
            callback();
        }
    }, 'flex-social-script-browserID');
}

/**
 * Display popup with browswer id login and return user data after succesfuly authentication.
 * @param  Function [callback] [Optional] Function with encoded asertion data.
 */
flex.social.browserid.login = function(callback) {
    if(document.getElementById('flex-social-script-browserID')){
        navigator.id.get(function(assertion) {
            if (assertion) {
                flex.social.browserid.verify(assertion, function(res){
                    if (typeof callback != 'undefined') {
                        callback(true, res, assertion);
                    };
                });
            } else {
                if (typeof callback != 'undefined') {
                    callback(false, {});
                }
            }
        }, {allowPersistent: true});
    } else {
        return false;
    }
}

/**
 * Logout user from browser id
 * @param  Function [callback] [Optional] Function after succesfuly logout.
 */
flex.social.browserid.logout = function(callback){
    window.navigator.id.logout(function(){
        if (typeof callback != 'undefined') {
            callback();
        }
    });
}

/**
 * Initialize GG JS API
 * @param  [Function] callback [Optional] Function after initialization
 */
flex.social.gg.init = function(callback) {
    if (typeof flex.settings.social.gg.client_id == 'undefined') {
        return { error: { code: 401, message: "First configure FlexSocial with GG." } }
    }

    if(!document.getElementById('flex-social-script-gg')){
        var scripts = [],
            date = new Date();
        scripts[0] = '//login.gg.pl/js/libs/0.9/gg.js';

        flex.loader(scripts, function () {}, 'flex-social-script-gg');
        window.ggReady = function() {
            flex.settings.social.gg.ready = true;
            gg.initialize({
                client_id:  flex.settings.social.gg.client_id,
                urlhashUri: flex.settings.social.gg.urlhashUri 
            }, function(res){
                if (typeof flex.social.gg.callback.login == 'function') {
                    flex.social.gg.callback.login(res); 
                }
            }, function(res) {
                if (typeof flex.social.gg.callback.logout == 'function') {
                    flex.social.gg.callback.logout(res);
                }
            });
            if (typeof callback != 'undefined') {
                callback();
            }
        }
    } else {
        callback();
    };
}

/**
 * Show popup with login box
 * @param  Function [callback]     [Optional] Function after succesfull login
 * @param  Function [errorCalback] [Optional] Function after login error
 */
flex.social.gg.login = function(callback, errorCalback) {
    if(!flex.settings.social.gg.ready){
        return { error: { code: 401, message: "First run 'flex.social.gg.init'." } }
    }

    if (typeof callback != 'undefined') {
        flex.social.gg.callback.login = callback;
    }
    gg.Connect.login(function(){
        if (typeof errorCalback != 'undefined') {
            errorCalback();
        }
    });
}

/**
 * Logout user from GG
 * @param  Function callback [Optional] Function after succesfull logout
 */
flex.social.gg.logout = function(callback) {
    if(!flex.settings.social.gg.ready){
        return { error: { code: 401, message: "First run 'flex.social.gg.init'." } }
    }

    if (typeof callback != 'undefined') {
        flex.social.gg.callback.logout = callback;
    }
    gg.Connect.logout();
}

/**
 * Get user login status
 * @param  Function [callback] [Optional] Function run after login status checking with status as parameter
 */
flex.social.gg.getLoginStatus = function(callback) {
    if(!flex.settings.social.gg.ready){
        return { error: { code: 401, message: "First run 'flex.social.gg.init'." } }
    }

    gg.Connect.getLoginStatus(function(res){
        if (typeof callback != 'undefined') {
            callback(res);
        }
    });
    
}

/**
 * Get user data from GG
 * @param  Function callback [Optional] Function with user data as parameter
 */
flex.social.gg.getUser = function(callback) {
    if(!flex.settings.social.gg.ready){
        return { error: { code: 401, message: "First run 'flex.social.gg.init'." } }
    }

    flex.social.gg.getLoginStatus(function(res) {
        var getUser = function(){
            gg.api.pubdir.get(res.userId, function(user){
                if (typeof callback != 'undefined') {
                    callback(user);
                }
            });
        };

        if(typeof res.userId == 'undefined') {
            flex.social.gg.login(function(){
                flex.social.gg.getLoginStatus(function(res) {
                    getUser();
                });
            });
        } else {
            getUser();
        }
    });
}

/**
 * Get GG object
 * @return object GG object
 */
flex.social.gg.getGg = function() {
    if(!flex.settings.social.gg.ready){
        return { error: { code: 401, message: "First run 'flex.social.gg.init'." } }
    }

    return gg;
}

/* --------------------------- flex.payment--------------------------- */

/**
 * Init flex.payment - load store.js for localstorage support.
 * 
 * @param  Function callback   Function with cart object as response after properly store.js loading.
 * @param  string   [cartId]   [Optional] Invidual id for cart identification - with this id You can later get transaction status.
 */
flex.payment.init = function(callback, cartId) {
    var scripts = [],
        date = new Date();
    scripts[0] = '//flexpi.com/api/store.js';

    flex.loader(scripts, function () {
        if (typeof cartId == 'undefined') {
            cartId = date.getTime()+'_'+Math.floor(Math.random()*101);
        }

        if (typeof store.get('cart') != 'undefined') {
            flex.payment.cartData = store.get('cart');
        } else {
            flex.payment.transactions.cartId = cartId;
            store.set('transactions', flex.payment.transactions);
        }

        store.set('cart', flex.payment.cartData);
        if (typeof callback != 'undefined') {
            callback(flex.payment.cartData);
        }
    });
}

/**
 * Get object with cart items.
 * 
 * @return object Cart Object
 */
flex.payment.cart.get = function() {
    return flex.payment.cartData;
}

/**
 * Get cart Id - with this id You can get transaction status.
 * 
 * @return string
 */
flex.payment.cart.getId =  function() {
    if (typeof store != 'undefined') {
        return store.get('transactions').cartId;
    } else {
        return { error: { code: 401, message: "First run 'flex.payment.init'." } }
    }
}

/**
 * Add item to cart
 * 
 * @param  string       item_name   Name for product
 * @param  float        amount      Amount for single item
 * @param  integer      quantity    Single item quantity
 * @param  Function     [callback]  [Optional] Function with cart elements as parameter
 
 * @return object       Just added item.
 */
flex.payment.cart.add = function(item_name, amount, quantity, callback) {
    var number = flex.payment.cartData.length;
    flex.payment.cartData[number] = {
        'item_name' : item_name,
        'amount' : amount,
        'quantity' : quantity
    };
    store.set('cart', flex.payment.cartData);
    if (typeof callback != 'undefined') {
        callback(flex.payment.cartData);
    }

    return flex.payment.cartData[number];
}

/**
 * Remove item from cart.
 * 
 * @param  integer  index    Index from cart array
 * @param  Function [callback] [Optional] Function with new cart object as parameter
 */
flex.payment.cart.remove = function(index, callback) {
    var temp = [];
    if (typeof flex.payment.cartData[index] != 'undefined') {
        delete flex.payment.cartData[index];        
    }

    for (i=0; i <= flex.payment.cartData.length; i++) {
        if (typeof flex.payment.cartData[i] != 'undefined') {
            temp.push(flex.payment.cartData[i]);
        }
    }

    flex.payment.cartData = temp;
    
    store.set('cart', flex.payment.cartData);
    if (typeof callback != 'undefined') {
        callback(flex.payment.cartData);
    }
}

/**
 * Get transaction status.
 * 
 * @param  string   transactionId   Saved before cart id - You can get it with flex.payment.cart.getId
 * @param  Function [callback]      [Optional] Function with transaction status as response
 */
flex.payment.transactions.get = function(transactionId, callback) {
    flex.socket.emit('getPaymentTransaction', { 
        'app_id': flex.appData.app_id,
        'transactionId' : transactionId
    }, function (res) {
        if (typeof callback != 'undefined') {
            callback(res);
        }
    });
}

/**
 * Clear all transactions and cart data from user localstorage.
 * 
 * @return bollean/object Returns true if there is no problem and error object if flex.payment.init was not run before
 */
flex.payment.transactions.clear = function() {
    if (typeof store != 'undefined') {
         store.remove('transactions');
         store.remove('cart');
         return true;
    } else {
        return { error: { code: 401, message: "First run 'flex.payment.init'." } }
    }
}

/**
 *  Append to container PayPal transaction form.
 *  But before, You must run flex.payment.init and add elements to cart with flex.payment.cart.add
 * 
 * @param  string elementId   Div id - apended form will be here
 * @param  string buttonValue Text for form submit value
 */
flex.payment.paypal.createFormView = function(elementId, buttonValue) {
    var container   = document.getElementById(elementId);

    if (flex.payment.paypal.init() != true ) {
        return flex.payment.paypal.init();
    }

    if (typeof container == 'undefined') {
        return { error: { code: 404, message: "Element "+elementId+" dont exist." } }
    }

    if (flex.payment.cartData.length == 0) {
        return { error: { code: 401, message: "Cart doesn't have any items" } }
    }

    if (typeof buttonValue == 'undefined') {
        buttonValue = 'Pay with Paypal';
    }

    var form        = document.createElement("form");
        form.setAttribute('action', 'https://www.paypal.com/cgi-bin/webscr');
        form.setAttribute('method', 'post');
        form.setAttribute('id', 'flex-payment-paypal');

    var cart        = document.createElement("input"); 
        cart.setAttribute('hidden', true); 
        cart.setAttribute('name', 'cmd');
        cart.setAttribute('value', '_cart');

    var custom      = document.createElement("input");
        custom.setAttribute('hidden', true);
        custom.setAttribute('name', 'custom');
        custom.setAttribute('value', store.get('transactions').cartId+'___'+flex.appData.app_id);

    var upload      = document.createElement("input");
        upload.setAttribute('hidden', true);
        upload.setAttribute('name', 'upload');
        upload.setAttribute('value', 1);

    var currency      = document.createElement("input");
        currency.setAttribute('hidden', true);
        currency.setAttribute('name', 'currency_code');
        currency.setAttribute('value', flex.settings.payment.paypal.currency);

    var notify_url      = document.createElement("input");
        notify_url.setAttribute('hidden', true);
        notify_url.setAttribute('name', 'notify_url');
        notify_url.setAttribute('value', 'http://flexpi.com/api/payment/paypal/ipn');

    var business      = document.createElement("input");
        business.setAttribute('hidden', true);
        business.setAttribute('name', 'business');
        business.setAttribute('value', flex.settings.payment.paypal.email);
        

    form.appendChild(cart);
    form.appendChild(custom);
    form.appendChild(upload);
    form.appendChild(currency);
    form.appendChild(business);

    var item_name,
        amount,
        quantity;

    for (i=0; i < flex.payment.cartData.length; i++) {
        item_name      = document.createElement("input");
        item_name.setAttribute('hidden', true);
        item_name.setAttribute('name', 'item_name_'+(i+1));
        item_name.setAttribute('value', flex.payment.cartData[i].item_name);

        amount      = document.createElement("input");
        amount.setAttribute('hidden', true);
        amount.setAttribute('name', 'amount_'+(i+1));
        amount.setAttribute('value', flex.payment.cartData[i].amount.toFixed(2));

        quantity      = document.createElement("input");
        quantity.setAttribute('hidden', true);
        quantity.setAttribute('name', 'quantity_'+(i+1));
        quantity.setAttribute('value', parseInt(flex.payment.cartData[i].quantity, 10));

        form.appendChild(item_name);
        form.appendChild(amount);
        form.appendChild(quantity);
    }

    var submit      = document.createElement("input");
        submit.setAttribute('type', 'submit');
        submit.setAttribute('class', 'flex-payment-paypal-send');
        submit.setAttribute('value', buttonValue);

    form.appendChild(submit);

    container.appendChild(form);
}

/**
 * Check PayPal configuration.
 * 
 * @return bollean/object Returns true, if there is no problem and error object if PayPal was not configured
 */
flex.payment.paypal.init = function(){
    if (
        typeof flex.settings.payment.paypal.email == 'undefined' || 
        typeof flex.settings.payment.paypal.currency == 'undefined'
    ) {
        return { error: { code: 401, message: "First configure FlexPayment for PayPal." } }
    }

    return true;
}