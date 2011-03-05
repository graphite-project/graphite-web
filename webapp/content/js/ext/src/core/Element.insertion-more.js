/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
/**
 * @class Ext.Element
 */
Ext.apply(Ext.Element.prototype, function() {
	var GETDOM = Ext.getDom,
		GET = Ext.get,
		DH = Ext.DomHelper;
	
	return {	
		/**
	     * Inserts (or creates) the passed element (or DomHelper config) as a sibling of this element
	     * @param {Mixed/Object/Array} el The id, element to insert or a DomHelper config to create and insert *or* an array of any of those.
	     * @param {String} where (optional) 'before' or 'after' defaults to before
	     * @param {Boolean} returnDom (optional) True to return the raw DOM element instead of Ext.Element
	     * @return {Ext.Element} The inserted Element. If an array is passed, the last inserted element is returned.
	     */
	    insertSibling: function(el, where, returnDom){
	        var me = this,
	        	rt,
                isAfter = (where || 'before').toLowerCase() == 'after',
                insertEl;
	        	
	        if(Ext.isArray(el)){
                insertEl = me;
	            Ext.each(el, function(e) {
		            rt = Ext.fly(insertEl, '_internal').insertSibling(e, where, returnDom);
                    if(isAfter){
                        insertEl = rt;
                    }
	            });
	            return rt;
	        }
	                
	        el = el || {};
	       	
            if(el.nodeType || el.dom){
                rt = me.dom.parentNode.insertBefore(GETDOM(el), isAfter ? me.dom.nextSibling : me.dom);
                if (!returnDom) {
                    rt = GET(rt);
                }
            }else{
                if (isAfter && !me.dom.nextSibling) {
                    rt = DH.append(me.dom.parentNode, el, !returnDom);
                } else {                    
                    rt = DH[isAfter ? 'insertAfter' : 'insertBefore'](me.dom, el, !returnDom);
                }
            }
	        return rt;
	    }
    };
}());