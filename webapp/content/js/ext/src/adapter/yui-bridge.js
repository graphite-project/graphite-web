/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
if(typeof YAHOO == "undefined"){
    throw "Unable to load Ext, core YUI utilities (yahoo, dom, event) not found.";
}

(function(){
    var E = YAHOO.util.Event,
        D = YAHOO.util.Dom,
        CN = YAHOO.util.Connect,
        ES = YAHOO.util.Easing,
        A = YAHOO.util.Anim,
        libFlyweight,
        version = YAHOO.env.getVersion('yahoo').version.split('.'),
        mouseEnterSupported = parseInt(version[0], 10) >= 3,
        mouseCache = {},
        elContains = function(parent, child){
            if(parent && parent.firstChild){
                while(child){
                    if(child === parent){
                        return true;
                    }
                    child = child.parentNode;
                    if(child && (child.nodeType != 1)){
                        child = null;
                    }
                }
            }
            return false;
        }, checkRelatedTarget = function(e){
            return !elContains(e.currentTarget, Ext.lib.Event.getRelatedTarget(e));
        };

Ext.lib.Dom = {
    getViewWidth : function(full){
        return full ? D.getDocumentWidth() : D.getViewportWidth();
    },

    getViewHeight : function(full){
        return full ? D.getDocumentHeight() : D.getViewportHeight();
    },

    isAncestor : function(haystack, needle){
        return D.isAncestor(haystack, needle);
    },

    getRegion : function(el){
        return D.getRegion(el);
    },

    getY : function(el){
        return this.getXY(el)[1];
    },

    getX : function(el){
        return this.getXY(el)[0];
    },

    // original version based on YahooUI getXY
    // this version fixes several issues in Safari and FF
    // and boosts performance by removing the batch overhead, repetitive dom lookups and array index calls
    getXY : function(el){
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

Ext.lib.Event = {
    getPageX : function(e){
        return E.getPageX(e.browserEvent || e);
    },

    getPageY : function(e){
        return E.getPageY(e.browserEvent || e);
    },

    getXY : function(e){
        return E.getXY(e.browserEvent || e);
    },

    getTarget : function(e){
        return E.getTarget(e.browserEvent || e);
    },

    getRelatedTarget : function(e){
        return E.getRelatedTarget(e.browserEvent || e);
    },

    on : function(el, eventName, fn, scope, override){
        if((eventName == 'mouseenter' || eventName == 'mouseleave') && !mouseEnterSupported){
            var item = mouseCache[el.id] || (mouseCache[el.id] = {});
            item[eventName] = fn;
            fn = fn.createInterceptor(checkRelatedTarget);
            eventName = (eventName == 'mouseenter') ? 'mouseover' : 'mouseout';
        }
        E.on(el, eventName, fn, scope, override);
    },

    un : function(el, eventName, fn){
        if((eventName == 'mouseenter' || eventName == 'mouseleave') && !mouseEnterSupported){
            var item = mouseCache[el.id], 
                ev = item && item[eventName];

            if(ev){
                fn = ev.fn;
                delete item[eventName];
                eventName = (eventName == 'mouseenter') ? 'mouseover' : 'mouseout';
            }
        }
        E.removeListener(el, eventName, fn);;
    },

    purgeElement : function(el){
        E.purgeElement(el);
    },

    preventDefault : function(e){
        E.preventDefault(e.browserEvent || e);
    },

    stopPropagation : function(e){
        E.stopPropagation(e.browserEvent || e);
    },

    stopEvent : function(e){
        E.stopEvent(e.browserEvent || e);
    },

    onAvailable : function(el, fn, scope, override){
        return E.onAvailable(el, fn, scope, override);
    }
};

Ext.lib.Ajax = {
    request : function(method, uri, cb, data, options){
        if(options){
            var hs = options.headers;
            if(hs){
                for(var h in hs){
                    if(hs.hasOwnProperty(h)){
                        CN.initHeader(h, hs[h], false);
                    }
                }
            }
            if(options.xmlData){
                if (!hs || !hs['Content-Type']){
                    CN.initHeader('Content-Type', 'text/xml', false);
                }
                method = (method ? method : (options.method ? options.method : 'POST'));
                data = options.xmlData;
            }else if(options.jsonData){
                if (!hs || !hs['Content-Type']){
                    CN.initHeader('Content-Type', 'application/json', false);
                }
                method = (method ? method : (options.method ? options.method : 'POST'));
                data = typeof options.jsonData == 'object' ? Ext.encode(options.jsonData) : options.jsonData;
            }
        }
        return CN.asyncRequest(method, uri, cb, data);
    },

    formRequest : function(form, uri, cb, data, isUpload, sslUri){
        CN.setForm(form, isUpload, sslUri);
        return CN.asyncRequest(Ext.getDom(form).method ||'POST', uri, cb, data);
    },

    isCallInProgress : function(trans){
        return CN.isCallInProgress(trans);
    },

    abort : function(trans){
        return CN.abort(trans);
    },

    serializeForm : function(form){
        var d = CN.setForm(form.dom || form);
        CN.resetFormState();
        return d;
    }
};

Ext.lib.Region = YAHOO.util.Region;
Ext.lib.Point = YAHOO.util.Point;


Ext.lib.Anim = {
    scroll : function(el, args, duration, easing, cb, scope){
        this.run(el, args, duration, easing, cb, scope, YAHOO.util.Scroll);
    },

    motion : function(el, args, duration, easing, cb, scope){
        this.run(el, args, duration, easing, cb, scope, YAHOO.util.Motion);
    },

    color : function(el, args, duration, easing, cb, scope){
        this.run(el, args, duration, easing, cb, scope, YAHOO.util.ColorAnim);
    },

    run : function(el, args, duration, easing, cb, scope, type){
        type = type || YAHOO.util.Anim;
        if(typeof easing == "string"){
            easing = YAHOO.util.Easing[easing];
        }
        var anim = new type(el, args, duration, easing);
        anim.animateX(function(){
            Ext.callback(cb, scope);
        });
        return anim;
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
// various overrides

// add ability for callbacks with animations
if(YAHOO.util.Anim){
    YAHOO.util.Anim.prototype.animateX = function(callback, scope){
        var f = function(){
            this.onComplete.unsubscribe(f);
            if(typeof callback == "function"){
                callback.call(scope || this, this);
            }
        };
        this.onComplete.subscribe(f, this, true);
        this.animate();
    };
}

if(YAHOO.util.DragDrop && Ext.dd.DragDrop){
    YAHOO.util.DragDrop.defaultPadding = Ext.dd.DragDrop.defaultPadding;
    YAHOO.util.DragDrop.constrainTo = Ext.dd.DragDrop.constrainTo;
}

YAHOO.util.Dom.getXY = function(el) {
    var f = function(el) {
        return Ext.lib.Dom.getXY(el);
    };
    return YAHOO.util.Dom.batch(el, f, YAHOO.util.Dom, true);
};


// workaround for Safari anim duration speed problems
if(YAHOO.util.AnimMgr){
    YAHOO.util.AnimMgr.fps = 1000;
}

YAHOO.util.Region.prototype.adjust = function(t, l, b, r){
    this.top += t;
    this.left += l;
    this.right += r;
    this.bottom += b;
    return this;
};
    
YAHOO.util.Region.prototype.constrainTo = function(r) {
    this.top = this.top.constrain(r.top, r.bottom);
    this.bottom = this.bottom.constrain(r.top, r.bottom);
    this.left = this.left.constrain(r.left, r.right);
    this.right = this.right.constrain(r.left, r.right);
    return this;
};


})();