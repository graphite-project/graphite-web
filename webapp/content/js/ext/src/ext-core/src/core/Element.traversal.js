/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
/**
 * @class Ext.Element
 */
Ext.Element.addMethods(function(){
	var PARENTNODE = 'parentNode',
		NEXTSIBLING = 'nextSibling',
		PREVIOUSSIBLING = 'previousSibling',
		DQ = Ext.DomQuery,
		GET = Ext.get;
	
	return {
		/**
	     * Looks at this node and then at parent nodes for a match of the passed simple selector (e.g. div.some-class or span:first-child)
	     * @param {String} selector The simple selector to test
	     * @param {Number/Mixed} maxDepth (optional) The max depth to search as a number or element (defaults to 50 || document.body)
	     * @param {Boolean} returnEl (optional) True to return a Ext.Element object instead of DOM node
	     * @return {HTMLElement} The matching DOM node (or null if no match was found)
	     */
	    findParent : function(simpleSelector, maxDepth, returnEl){
	        var p = this.dom,
	        	b = document.body, 
	        	depth = 0, 	        	
	        	stopEl;	        
            if(Ext.isGecko && Object.prototype.toString.call(p) == '[object XULElement]') {
                return null;
            }
	        maxDepth = maxDepth || 50;
	        if (isNaN(maxDepth)) {
	            stopEl = Ext.getDom(maxDepth);
	            maxDepth = Number.MAX_VALUE;
	        }
	        while(p && p.nodeType == 1 && depth < maxDepth && p != b && p != stopEl){
	            if(DQ.is(p, simpleSelector)){
	                return returnEl ? GET(p) : p;
	            }
	            depth++;
	            p = p.parentNode;
	        }
	        return null;
	    },
	
	    /**
	     * Looks at parent nodes for a match of the passed simple selector (e.g. div.some-class or span:first-child)
	     * @param {String} selector The simple selector to test
	     * @param {Number/Mixed} maxDepth (optional) The max depth to
	            search as a number or element (defaults to 10 || document.body)
	     * @param {Boolean} returnEl (optional) True to return a Ext.Element object instead of DOM node
	     * @return {HTMLElement} The matching DOM node (or null if no match was found)
	     */
	    findParentNode : function(simpleSelector, maxDepth, returnEl){
	        var p = Ext.fly(this.dom.parentNode, '_internal');
	        return p ? p.findParent(simpleSelector, maxDepth, returnEl) : null;
	    },
	
	    /**
	     * Walks up the dom looking for a parent node that matches the passed simple selector (e.g. div.some-class or span:first-child).
	     * This is a shortcut for findParentNode() that always returns an Ext.Element.
	     * @param {String} selector The simple selector to test
	     * @param {Number/Mixed} maxDepth (optional) The max depth to
	            search as a number or element (defaults to 10 || document.body)
	     * @return {Ext.Element} The matching DOM node (or null if no match was found)
	     */
	    up : function(simpleSelector, maxDepth){
	        return this.findParentNode(simpleSelector, maxDepth, true);
	    },
	
	    /**
	     * Creates a {@link Ext.CompositeElement} for child nodes based on the passed CSS selector (the selector should not contain an id).
	     * @param {String} selector The CSS selector
	     * @return {CompositeElement/CompositeElementLite} The composite element
	     */
	    select : function(selector){
	        return Ext.Element.select(selector, this.dom);
	    },
	
	    /**
	     * Selects child nodes based on the passed CSS selector (the selector should not contain an id).
	     * @param {String} selector The CSS selector
	     * @return {Array} An array of the matched nodes
	     */
	    query : function(selector){
	        return DQ.select(selector, this.dom);
	    },
	
	    /**
	     * Selects a single child at any depth below this element based on the passed CSS selector (the selector should not contain an id).
	     * @param {String} selector The CSS selector
	     * @param {Boolean} returnDom (optional) True to return the DOM node instead of Ext.Element (defaults to false)
	     * @return {HTMLElement/Ext.Element} The child Ext.Element (or DOM node if returnDom = true)
	     */
	    child : function(selector, returnDom){
	        var n = DQ.selectNode(selector, this.dom);
	        return returnDom ? n : GET(n);
	    },
	
	    /**
	     * Selects a single *direct* child based on the passed CSS selector (the selector should not contain an id).
	     * @param {String} selector The CSS selector
	     * @param {Boolean} returnDom (optional) True to return the DOM node instead of Ext.Element (defaults to false)
	     * @return {HTMLElement/Ext.Element} The child Ext.Element (or DOM node if returnDom = true)
	     */
	    down : function(selector, returnDom){
	        var n = DQ.selectNode(" > " + selector, this.dom);
	        return returnDom ? n : GET(n);
	    },
	
		 /**
	     * Gets the parent node for this element, optionally chaining up trying to match a selector
	     * @param {String} selector (optional) Find a parent node that matches the passed simple selector
	     * @param {Boolean} returnDom (optional) True to return a raw dom node instead of an Ext.Element
	     * @return {Ext.Element/HTMLElement} The parent node or null
		 */
	    parent : function(selector, returnDom){
	        return this.matchNode(PARENTNODE, PARENTNODE, selector, returnDom);
	    },
	
	     /**
	     * Gets the next sibling, skipping text nodes
	     * @param {String} selector (optional) Find the next sibling that matches the passed simple selector
	     * @param {Boolean} returnDom (optional) True to return a raw dom node instead of an Ext.Element
	     * @return {Ext.Element/HTMLElement} The next sibling or null
		 */
	    next : function(selector, returnDom){
	        return this.matchNode(NEXTSIBLING, NEXTSIBLING, selector, returnDom);
	    },
	
	    /**
	     * Gets the previous sibling, skipping text nodes
	     * @param {String} selector (optional) Find the previous sibling that matches the passed simple selector
	     * @param {Boolean} returnDom (optional) True to return a raw dom node instead of an Ext.Element
	     * @return {Ext.Element/HTMLElement} The previous sibling or null
		 */
	    prev : function(selector, returnDom){
	        return this.matchNode(PREVIOUSSIBLING, PREVIOUSSIBLING, selector, returnDom);
	    },
	
	
	    /**
	     * Gets the first child, skipping text nodes
	     * @param {String} selector (optional) Find the next sibling that matches the passed simple selector
	     * @param {Boolean} returnDom (optional) True to return a raw dom node instead of an Ext.Element
	     * @return {Ext.Element/HTMLElement} The first child or null
		 */
	    first : function(selector, returnDom){
	        return this.matchNode(NEXTSIBLING, 'firstChild', selector, returnDom);
	    },
	
	    /**
	     * Gets the last child, skipping text nodes
	     * @param {String} selector (optional) Find the previous sibling that matches the passed simple selector
	     * @param {Boolean} returnDom (optional) True to return a raw dom node instead of an Ext.Element
	     * @return {Ext.Element/HTMLElement} The last child or null
		 */
	    last : function(selector, returnDom){
	        return this.matchNode(PREVIOUSSIBLING, 'lastChild', selector, returnDom);
	    },
	    
	    matchNode : function(dir, start, selector, returnDom){
	        var n = this.dom[start];
	        while(n){
	            if(n.nodeType == 1 && (!selector || DQ.is(n, selector))){
	                return !returnDom ? GET(n) : n;
	            }
	            n = n[dir];
	        }
	        return null;
	    }	
    };
}());