/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
/**
 * @class Ext.DomHelper
 */
Ext.apply(Ext.DomHelper,
function(){
    var pub,
        afterbegin = 'afterbegin',
        afterend = 'afterend',
        beforebegin = 'beforebegin',
        beforeend = 'beforeend',
        confRe = /tag|children|cn|html$/i;

    // private
    function doInsert(el, o, returnElement, pos, sibling, append){
        el = Ext.getDom(el);
        var newNode;
        if (pub.useDom) {
            newNode = createDom(o, null);
            if (append) {
                el.appendChild(newNode);
            } else {
                (sibling == 'firstChild' ? el : el.parentNode).insertBefore(newNode, el[sibling] || el);
            }
        } else {
            newNode = Ext.DomHelper.insertHtml(pos, el, Ext.DomHelper.createHtml(o));
        }
        return returnElement ? Ext.get(newNode, true) : newNode;
    }

    // build as dom
    /** @ignore */
    function createDom(o, parentNode){
        var el,
            doc = document,
            useSet,
            attr,
            val,
            cn;

        if (Ext.isArray(o)) {                       // Allow Arrays of siblings to be inserted
            el = doc.createDocumentFragment(); // in one shot using a DocumentFragment
            for (var i = 0, l = o.length; i < l; i++) {
                createDom(o[i], el);
            }
        } else if (typeof o == 'string') {         // Allow a string as a child spec.
            el = doc.createTextNode(o);
        } else {
            el = doc.createElement( o.tag || 'div' );
            useSet = !!el.setAttribute; // In IE some elements don't have setAttribute
            for (var attr in o) {
                if(!confRe.test(attr)){
                    val = o[attr];
                    if(attr == 'cls'){
                        el.className = val;
                    }else{
                        if(useSet){
                            el.setAttribute(attr, val);
                        }else{
                            el[attr] = val;
                        }
                    }
                }
            }
            Ext.DomHelper.applyStyles(el, o.style);

            if ((cn = o.children || o.cn)) {
                createDom(cn, el);
            } else if (o.html) {
                el.innerHTML = o.html;
            }
        }
        if(parentNode){
           parentNode.appendChild(el);
        }
        return el;
    }

    pub = {
        /**
         * Creates a new Ext.Template from the DOM object spec.
         * @param {Object} o The DOM object spec (and children)
         * @return {Ext.Template} The new template
         */
        createTemplate : function(o){
            var html = Ext.DomHelper.createHtml(o);
            return new Ext.Template(html);
        },

        /** True to force the use of DOM instead of html fragments @type Boolean */
        useDom : false,

        /**
         * Creates new DOM element(s) and inserts them before el.
         * @param {Mixed} el The context element
         * @param {Object/String} o The DOM object spec (and children) or raw HTML blob
         * @param {Boolean} returnElement (optional) true to return a Ext.Element
         * @return {HTMLElement/Ext.Element} The new node
         * @hide (repeat)
         */
        insertBefore : function(el, o, returnElement){
            return doInsert(el, o, returnElement, beforebegin);
        },

        /**
         * Creates new DOM element(s) and inserts them after el.
         * @param {Mixed} el The context element
         * @param {Object} o The DOM object spec (and children)
         * @param {Boolean} returnElement (optional) true to return a Ext.Element
         * @return {HTMLElement/Ext.Element} The new node
         * @hide (repeat)
         */
        insertAfter : function(el, o, returnElement){
            return doInsert(el, o, returnElement, afterend, 'nextSibling');
        },

        /**
         * Creates new DOM element(s) and inserts them as the first child of el.
         * @param {Mixed} el The context element
         * @param {Object/String} o The DOM object spec (and children) or raw HTML blob
         * @param {Boolean} returnElement (optional) true to return a Ext.Element
         * @return {HTMLElement/Ext.Element} The new node
         * @hide (repeat)
         */
        insertFirst : function(el, o, returnElement){
            return doInsert(el, o, returnElement, afterbegin, 'firstChild');
        },

        /**
         * Creates new DOM element(s) and appends them to el.
         * @param {Mixed} el The context element
         * @param {Object/String} o The DOM object spec (and children) or raw HTML blob
         * @param {Boolean} returnElement (optional) true to return a Ext.Element
         * @return {HTMLElement/Ext.Element} The new node
         * @hide (repeat)
         */
        append: function(el, o, returnElement){
            return doInsert(el, o, returnElement, beforeend, '', true);
        },

        /**
         * Creates new DOM element(s) without inserting them to the document.
         * @param {Object/String} o The DOM object spec (and children) or raw HTML blob
         * @return {HTMLElement} The new uninserted node
         */
        createDom: createDom
    };
    return pub;
}());
