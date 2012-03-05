flex = {
    api_url : 'http://api.flexpi.com:3001/'
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
	    flex.socket.on('connect', function (data) {
		    callback();
		});
	});
}

/**
 * Public method
 * Add new stats 
 * @param  {string}   key      defined variable name
 * @param  {string}   value    saved value 
 * @param  {Function} callback function called after succesfully save
 * @return {object}   response object with status and message
 */
flex.stats = function(key, value, callback) {
	flex.socket.emit('stats', { 
		'app_id': flex.appData.app_id,
		'key' : key,
		'value' : value
	},  function (data) {
    	callback(data);
    });
};