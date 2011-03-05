/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
Ext.ns('Ext.ux');

Ext.ux.JSONP = (function(){
    var _queue = [],
        _current = null,
        _nextRequest = function() {
            _current = null;
            if(_queue.length) {
                _current = _queue.shift();
    			_current.script.src = _current.url + '?' + _current.params;
    			document.getElementsByTagName('head')[0].appendChild(_current.script);
            }
        };

    return {
        request: function(url, o) {
            if(!url) {
                return;
            }
            var me = this;

            o.params = o.params || {};
            if(o.callbackKey) {
                o.params[o.callbackKey] = 'Ext.ux.JSONP.callback';
            }
            var params = Ext.urlEncode(o.params);

            var script = document.createElement('script');
			script.type = 'text/javascript';

            if(o.isRawJSON) {
                if(Ext.isIE) {
                    Ext.fly(script).on('readystatechange', function() {
                        if(script.readyState == 'complete') {
                            var data = script.innerHTML;
                            if(data.length) {
                                me.callback(Ext.decode(data));
                            }
                        }
                    });
                }
                else {
                     Ext.fly(script).on('load', function() {
                        var data = script.innerHTML;
                        if(data.length) {
                            me.callback(Ext.decode(data));
                        }
                    });
                }
            }

            _queue.push({
                url: url,
                script: script,
                callback: o.callback || function(){},
                scope: o.scope || window,
                params: params || null
            });

            if(!_current) {
                _nextRequest();
            }
        },

        callback: function(json) {
            _current.callback.apply(_current.scope, [json]);
            Ext.fly(_current.script).removeAllListeners();
            document.getElementsByTagName('head')[0].removeChild(_current.script);
            _nextRequest();
        }
    }
})();