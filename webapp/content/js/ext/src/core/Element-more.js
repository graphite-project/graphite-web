/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
/**
 * @class Ext.Element
 */
Ext.Element.addMethods({
    /**
     * Stops the specified event(s) from bubbling and optionally prevents the default action
     * @param {String/Array} eventName an event / array of events to stop from bubbling
     * @param {Boolean} preventDefault (optional) true to prevent the default action too
     * @return {Ext.Element} this
     */
    swallowEvent : function(eventName, preventDefault) {
        var me = this;
        function fn(e) {
            e.stopPropagation();
            if (preventDefault) {
                e.preventDefault();
            }
        }
        
        if (Ext.isArray(eventName)) {
            Ext.each(eventName, function(e) {
                 me.on(e, fn);
            });
            return me;
        }
        me.on(eventName, fn);
        return me;
    },

    /**
     * Create an event handler on this element such that when the event fires and is handled by this element,
     * it will be relayed to another object (i.e., fired again as if it originated from that object instead).
     * @param {String} eventName The type of event to relay
     * @param {Object} object Any object that extends {@link Ext.util.Observable} that will provide the context
     * for firing the relayed event
     */
    relayEvent : function(eventName, observable) {
        this.on(eventName, function(e) {
            observable.fireEvent(eventName, e);
        });
    },

    /**
     * Removes worthless text nodes
     * @param {Boolean} forceReclean (optional) By default the element
     * keeps track if it has been cleaned already so
     * you can call this over and over. However, if you update the element and
     * need to force a reclean, you can pass true.
     */
    clean : function(forceReclean) {
        var me  = this,
            dom = me.dom,
            n   = dom.firstChild,
            ni  = -1;

        if (Ext.Element.data(dom, 'isCleaned') && forceReclean !== true) {
            return me;
        }

        while (n) {
            var nx = n.nextSibling;
            if (n.nodeType == 3 && !(/\S/.test(n.nodeValue))) {
                dom.removeChild(n);
            } else {
                n.nodeIndex = ++ni;
            }
            n = nx;
        }
        
        Ext.Element.data(dom, 'isCleaned', true);
        return me;
    },

    /**
     * Direct access to the Updater {@link Ext.Updater#update} method. The method takes the same object
     * parameter as {@link Ext.Updater#update}
     * @return {Ext.Element} this
     */
    load : function() {
        var updateManager = this.getUpdater();
        updateManager.update.apply(updateManager, arguments);
        
        return this;
    },

    /**
    * Gets this element's {@link Ext.Updater Updater}
    * @return {Ext.Updater} The Updater
    */
    getUpdater : function() {
        return this.updateManager || (this.updateManager = new Ext.Updater(this));
    },

    /**
    * Update the innerHTML of this element, optionally searching for and processing scripts
    * @param {String} html The new HTML
    * @param {Boolean} loadScripts (optional) True to look for and process scripts (defaults to false)
    * @param {Function} callback (optional) For async script loading you can be notified when the update completes
    * @return {Ext.Element} this
     */
    update : function(html, loadScripts, callback) {
        if (!this.dom) {
            return this;
        }
        html = html || "";

        if (loadScripts !== true) {
            this.dom.innerHTML = html;
            if (typeof callback == 'function') {
                callback();
            }
            return this;
        }

        var id  = Ext.id(),
            dom = this.dom;

        html += '<span id="' + id + '"></span>';

        Ext.lib.Event.onAvailable(id, function() {
            var DOC    = document,
                hd     = DOC.getElementsByTagName("head")[0],
                re     = /(?:<script([^>]*)?>)((\n|\r|.)*?)(?:<\/script>)/ig,
                srcRe  = /\ssrc=([\'\"])(.*?)\1/i,
                typeRe = /\stype=([\'\"])(.*?)\1/i,
                match,
                attrs,
                srcMatch,
                typeMatch,
                el,
                s;

            while ((match = re.exec(html))) {
                attrs = match[1];
                srcMatch = attrs ? attrs.match(srcRe) : false;
                if (srcMatch && srcMatch[2]) {
                   s = DOC.createElement("script");
                   s.src = srcMatch[2];
                   typeMatch = attrs.match(typeRe);
                   if (typeMatch && typeMatch[2]) {
                       s.type = typeMatch[2];
                   }
                   hd.appendChild(s);
                } else if (match[2] && match[2].length > 0) {
                    if (window.execScript) {
                       window.execScript(match[2]);
                    } else {
                       window.eval(match[2]);
                    }
                }
            }
            
            el = DOC.getElementById(id);
            if (el) {
                Ext.removeNode(el);
            }
            
            if (typeof callback == 'function') {
                callback();
            }
        });
        dom.innerHTML = html.replace(/(?:<script.*?>)((\n|\r|.)*?)(?:<\/script>)/ig, "");
        return this;
    },

    // inherit docs, overridden so we can add removeAnchor
    removeAllListeners : function() {
        this.removeAnchor();
        Ext.EventManager.removeAll(this.dom);
        return this;
    },

    /**
     * Creates a proxy element of this element
     * @param {String/Object} config The class name of the proxy element or a DomHelper config object
     * @param {String/HTMLElement} renderTo (optional) The element or element id to render the proxy to (defaults to document.body)
     * @param {Boolean} matchBox (optional) True to align and size the proxy to this element now (defaults to false)
     * @return {Ext.Element} The new proxy element
     */
    createProxy : function(config, renderTo, matchBox) {
        config = (typeof config == 'object') ? config : {tag : "div", cls: config};

        var me = this,
            proxy = renderTo ? Ext.DomHelper.append(renderTo, config, true) :
                               Ext.DomHelper.insertBefore(me.dom, config, true);

        if (matchBox && me.setBox && me.getBox) { // check to make sure Element.position.js is loaded
           proxy.setBox(me.getBox());
        }
        return proxy;
    }
});

Ext.Element.prototype.getUpdateManager = Ext.Element.prototype.getUpdater;
