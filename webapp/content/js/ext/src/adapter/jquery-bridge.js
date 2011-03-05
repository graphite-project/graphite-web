/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
if(typeof jQuery == "undefined"){
    throw "Unable to load Ext, jQuery not found.";
}

(function(){
var libFlyweight;

Ext.lib.Dom = {
    getViewWidth : function(full){
        // jQuery doesn't report full window size on document query, so max both
        return full ? Math.max(jQuery(document).width(),jQuery(window).width()) : jQuery(window).width();
    },

    getViewHeight : function(full){
        // jQuery doesn't report full window size on document query, so max both
        return full ? Math.max(jQuery(document).height(),jQuery(window).height()) : jQuery(window).height();
    },

    isAncestor : function(p, c){
        var ret = false;

        p = Ext.getDom(p);
        c = Ext.getDom(c);
        if (p && c) {
            if (p.contains) {
                return p.contains(c);
            } else if (p.compareDocumentPosition) {
                return !!(p.compareDocumentPosition(c) & 16);
            } else {
                while (c = c.parentNode) {
                    ret = c == p || ret;
                }
            }
        }
        return ret;
    },

    getRegion : function(el){
        return Ext.lib.Region.getRegion(el);
    },

    //////////////////////////////////////////////////////////////////////////////////////
    // Use of jQuery.offset() removed to promote consistent behavior across libs.
    // JVS 05/23/07
    //////////////////////////////////////////////////////////////////////////////////////

    getY : function(el){
        return this.getXY(el)[1];
    },

    getX : function(el){
        return this.getXY(el)[0];
    },

    getXY : function(el) {
        var p, pe, b, scroll, bd = (document.body || document.documentElement);
        el = Ext.getDom(el);

        if(el == bd){
            return [0, 0];
        }

        if (el.getBoundingClientRect) {
            b = el.getBoundingClientRect();
            scroll = fly(document).getScroll();
            return [Math.round(b.left + scroll.left), Math.round(b.top + scroll.top)];
        }
        var x = 0, y = 0;

        p = el;

        var hasAbsolute = fly(el).getStyle("position") == "absolute";

        while (p) {

            x += p.offsetLeft;
            y += p.offsetTop;

            if (!hasAbsolute && fly(p).getStyle("position") == "absolute") {
                hasAbsolute = true;
            }

            if (Ext.isGecko) {
                pe = fly(p);

                var bt = parseInt(pe.getStyle("borderTopWidth"), 10) || 0;
                var bl = parseInt(pe.getStyle("borderLeftWidth"), 10) || 0;


                x += bl;
                y += bt;


                if (p != el && pe.getStyle('overflow') != 'visible') {
                    x += bl;
                    y += bt;
                }
            }
            p = p.offsetParent;
        }

        if (Ext.isSafari && hasAbsolute) {
            x -= bd.offsetLeft;
            y -= bd.offsetTop;
        }

        if (Ext.isGecko && !hasAbsolute) {
            var dbd = fly(bd);
            x += parseInt(dbd.getStyle("borderLeftWidth"), 10) || 0;
            y += parseInt(dbd.getStyle("borderTopWidth"), 10) || 0;
        }

        p = el.parentNode;
        while (p && p != bd) {
            if (!Ext.isOpera || (p.tagName != 'TR' && fly(p).getStyle("display") != "inline")) {
                x -= p.scrollLeft;
                y -= p.scrollTop;
            }
            p = p.parentNode;
        }
        return [x, y];
    },

    setXY : function(el, xy){
        el = Ext.fly(el, '_setXY');
        el.position();
        var pts = el.translatePoints(xy);
        if(xy[0] !== false){
            el.dom.style.left = pts.left + "px";
        }
        if(xy[1] !== false){
            el.dom.style.top = pts.top + "px";
        }
    },

    setX : function(el, x){
        this.setXY(el, [x, false]);
    },

    setY : function(el, y){
        this.setXY(el, [false, y]);
    }
};

// all lib flyweight calls use their own flyweight to prevent collisions with developer flyweights
function fly(el){
    if(!libFlyweight){
        libFlyweight = new Ext.Element.Flyweight();
    }
    libFlyweight.dom = el;
    return libFlyweight;
}
Ext.lib.Event = {
    getPageX : function(e){
        e = e.browserEvent || e;
        return e.pageX;
    },

    getPageY : function(e){
        e = e.browserEvent || e;
        return e.pageY;
    },

    getXY : function(e){
        e = e.browserEvent || e;
        return [e.pageX, e.pageY];
    },

    getTarget : function(e){
        return e.target;
    },

    // all Ext events will go through event manager which provides scoping
    on : function(el, eventName, fn, scope, override){
        jQuery(el).bind(eventName, fn);
    },

    un : function(el, eventName, fn){
        jQuery(el).unbind(eventName, fn);
    },

    purgeElement : function(el){
        jQuery(el).unbind();
    },

    preventDefault : function(e){
        e = e.browserEvent || e;
        if(e.preventDefault){
            e.preventDefault();
        }else{
            e.returnValue = false;
        }
    },

    stopPropagation : function(e){
        e = e.browserEvent || e;
        if(e.stopPropagation){
            e.stopPropagation();
        }else{
            e.cancelBubble = true;
        }
    },

    stopEvent : function(e){
        this.preventDefault(e);
        this.stopPropagation(e);
    },

    onAvailable : function(id, fn, scope){
        var start = new Date();
        var f = function(){
            if(start.getElapsed() > 10000){
                clearInterval(iid);
            }
            var el = document.getElementById(id);
            if(el){
                clearInterval(iid);
                fn.call(scope||window, el);
            }
        };
        var iid = setInterval(f, 50);
    },

    resolveTextNode: Ext.isGecko ? function(node){
        if(!node){
            return;
        }
        var s = HTMLElement.prototype.toString.call(node);
        if(s == '[xpconnect wrapped native prototype]' || s == '[object XULElement]'){
            return;
        }
        return node.nodeType == 3 ? node.parentNode : node;
    } : function(node){
        return node && node.nodeType == 3 ? node.parentNode : node;
    },

    getRelatedTarget: function(ev) {
        ev = ev.browserEvent || ev;
        var t = ev.relatedTarget;
        if (!t) {
            if (ev.type == "mouseout") {
                t = ev.toElement;
            } else if (ev.type == "mouseover") {
                t = ev.fromElement;
            }
        }

        return this.resolveTextNode(t);
    }
};

Ext.lib.Ajax = function(){
    var createComplete = function(cb){
         return function(xhr, status){
            if((status == 'error' || status == 'timeout') && cb.failure){
                cb.failure.call(cb.scope||window, createResponse(cb, xhr));
            }else if(cb.success){
                cb.success.call(cb.scope||window, createResponse(cb, xhr));
            }
         };
    };

    var createResponse = function(cb, xhr){
        var headerObj = {},
            headerStr,
            t,
            s;

        try {
            headerStr = xhr.getAllResponseHeaders();
            Ext.each(headerStr.replace(/\r\n/g, '\n').split('\n'), function(v){
                t = v.indexOf(':');
                if(t >= 0){
                    s = v.substr(0, t).toLowerCase();
                    if(v.charAt(t + 1) == ' '){
                        ++t;
                    }
                    headerObj[s] = v.substr(t + 1);
                }
            });
        } catch(e) {}

        return {
            responseText: xhr.responseText,
            responseXML : xhr.responseXML,
            argument: cb.argument,
            status: xhr.status,
            statusText: xhr.statusText,
            getResponseHeader : function(header){
                return headerObj[header.toLowerCase()];
            },
            getAllResponseHeaders : function(){
                return headerStr;
            }
        };
    };
    return {
        request : function(method, uri, cb, data, options){
            var o = {
                type: method,
                url: uri,
                data: data,
                timeout: cb.timeout,
                complete: createComplete(cb)
            };

            if(options){
                var hs = options.headers;
                if(options.xmlData){
                    o.data = options.xmlData;
                    o.processData = false;
                    o.type = (method ? method : (options.method ? options.method : 'POST'));
                    if (!hs || !hs['Content-Type']){
                        o.contentType = 'text/xml';
                    }
                }else if(options.jsonData){
                    o.data = typeof options.jsonData == 'object' ? Ext.encode(options.jsonData) : options.jsonData;
                    o.processData = false;
                    o.type = (method ? method : (options.method ? options.method : 'POST'));
                    if (!hs || !hs['Content-Type']){
                        o.contentType = 'application/json';
                    }
                }
                if(hs){
                    o.beforeSend = function(xhr){
                        for (var h in hs) {
                            if (hs.hasOwnProperty(h)) {
                                xhr.setRequestHeader(h, hs[h]);
                            }
                        }
                    };
                }
            }
            jQuery.ajax(o);
        },

        formRequest : function(form, uri, cb, data, isUpload, sslUri){
            jQuery.ajax({
                type: Ext.getDom(form).method ||'POST',
                url: uri,
                data: jQuery(form).serialize()+(data?'&'+data:''),
                timeout: cb.timeout,
                complete: createComplete(cb)
            });
        },

        isCallInProgress : function(trans){
            return false;
        },

        abort : function(trans){
            return false;
        },

        serializeForm : function(form){
            return jQuery(form.dom||form).serialize();
        }
    };
}();

Ext.lib.Anim = function(){
    var createAnim = function(cb, scope){
        var animated = true;
        return {
            stop : function(skipToLast){
                // do nothing
            },

            isAnimated : function(){
                return animated;
            },

            proxyCallback : function(){
                animated = false;
                Ext.callback(cb, scope);
            }
        };
    };
    return {
        scroll : function(el, args, duration, easing, cb, scope){
            // scroll anim not supported so just scroll immediately
            var anim = createAnim(cb, scope);
            el = Ext.getDom(el);
            if(typeof args.scroll.to[0] == 'number'){
                el.scrollLeft = args.scroll.to[0];
            }
            if(typeof args.scroll.to[1] == 'number'){
                el.scrollTop = args.scroll.to[1];
            }
            anim.proxyCallback();
            return anim;
        },

        motion : function(el, args, duration, easing, cb, scope){
            return this.run(el, args, duration, easing, cb, scope);
        },

        color : function(el, args, duration, easing, cb, scope){
            // color anim not supported, so execute callback immediately
            var anim = createAnim(cb, scope);
            anim.proxyCallback();
            return anim;
        },

        run : function(el, args, duration, easing, cb, scope, type){
            var anim = createAnim(cb, scope), e = Ext.fly(el, '_animrun');
            var o = {};
            for(var k in args){
                switch(k){   // jquery doesn't support, so convert
                    case 'points':
                        var by, pts;
                        e.position();
                        if(by = args.points.by){
                            var xy = e.getXY();
                            pts = e.translatePoints([xy[0]+by[0], xy[1]+by[1]]);
                        }else{
                            pts = e.translatePoints(args.points.to);
                        }
                        o.left = pts.left;
                        o.top = pts.top;
                        if(!parseInt(e.getStyle('left'), 10)){ // auto bug
                            e.setLeft(0);
                        }
                        if(!parseInt(e.getStyle('top'), 10)){
                            e.setTop(0);
                        }
                        if(args.points.from){
                            e.setXY(args.points.from);
                        }
                    break;
                    case 'width':
                        o.width = args.width.to;
                        if (args.width.from)
                            e.setWidth(args.width.from);
                    break;
                    case 'height':
                        o.height = args.height.to;
                        if (args.height.from)
                            e.setHeight(args.height.from);
                    break;
                    case 'opacity':
                        o.opacity = args.opacity.to;
                        if (args.opacity.from)
                            e.setOpacity(args.opacity.from);
                    break;
                    case 'left':
                        o.left = args.left.to;
                        if (args.left.from)
                            e.setLeft(args.left.from);
                    break;
                    case 'top':
                        o.top = args.top.to;
                        if (args.top.from)
                            e.setTop(args.top.from);
                    break;
                        // jQuery can't handle callback, scope, and xy arguments, so break here
                    case 'callback':
                    case 'scope':
                    case 'xy':
                    break;

                    default:
                        o[k] = args[k].to;
                        if (args[k].from)
                            e.setStyle(k, args[k].from);
                    break;
                }
            }
            // TODO: find out about easing plug in?
            jQuery(el).animate(o, duration*1000, undefined, anim.proxyCallback);
            return anim;
        }
    };
}();


Ext.lib.Region = function(t, r, b, l) {
    this.top = t;
    this[1] = t;
    this.right = r;
    this.bottom = b;
    this.left = l;
    this[0] = l;
};

Ext.lib.Region.prototype = {
    contains : function(region) {
        return ( region.left   >= this.left   &&
                 region.right  <= this.right  &&
                 region.top    >= this.top    &&
                 region.bottom <= this.bottom    );

    },

    getArea : function() {
        return ( (this.bottom - this.top) * (this.right - this.left) );
    },

    intersect : function(region) {
        var t = Math.max( this.top,    region.top    );
        var r = Math.min( this.right,  region.right  );
        var b = Math.min( this.bottom, region.bottom );
        var l = Math.max( this.left,   region.left   );

        if (b >= t && r >= l) {
            return new Ext.lib.Region(t, r, b, l);
        } else {
            return null;
        }
    },
    union : function(region) {
        var t = Math.min( this.top,    region.top    );
        var r = Math.max( this.right,  region.right  );
        var b = Math.max( this.bottom, region.bottom );
        var l = Math.min( this.left,   region.left   );

        return new Ext.lib.Region(t, r, b, l);
    },

    constrainTo : function(r) {
            this.top = this.top.constrain(r.top, r.bottom);
            this.bottom = this.bottom.constrain(r.top, r.bottom);
            this.left = this.left.constrain(r.left, r.right);
            this.right = this.right.constrain(r.left, r.right);
            return this;
    },

    adjust : function(t, l, b, r){
        this.top += t;
        this.left += l;
        this.right += r;
        this.bottom += b;
        return this;
    }
};

Ext.lib.Region.getRegion = function(el) {
    var p = Ext.lib.Dom.getXY(el);

    var t = p[1];
    var r = p[0] + el.offsetWidth;
    var b = p[1] + el.offsetHeight;
    var l = p[0];

    return new Ext.lib.Region(t, r, b, l);
};

Ext.lib.Point = function(x, y) {
   if (Ext.isArray(x)) {
      y = x[1];
      x = x[0];
   }
    this.x = this.right = this.left = this[0] = x;
    this.y = this.top = this.bottom = this[1] = y;
};

Ext.lib.Point.prototype = new Ext.lib.Region();

// prevent IE leaks
if(Ext.isIE) {
    function fnCleanUp() {
        var p = Function.prototype;
        delete p.createSequence;
        delete p.defer;
        delete p.createDelegate;
        delete p.createCallback;
        delete p.createInterceptor;

        window.detachEvent("onunload", fnCleanUp);
    }
    window.attachEvent("onunload", fnCleanUp);
}
})();