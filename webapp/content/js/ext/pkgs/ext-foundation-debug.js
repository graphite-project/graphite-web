/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
/**
 * @class Ext
 */

Ext.ns("Ext.grid", "Ext.list", "Ext.dd", "Ext.tree", "Ext.form", "Ext.menu",
       "Ext.state", "Ext.layout", "Ext.app", "Ext.ux", "Ext.chart", "Ext.direct");
    /**
     * Namespace alloted for extensions to the framework.
     * @property ux
     * @type Object
     */

Ext.apply(Ext, function(){
    var E = Ext,
        idSeed = 0,
        scrollWidth = null;

    return {
        /**
        * A reusable empty function
        * @property
        * @type Function
        */
        emptyFn : function(){},

        /**
         * URL to a 1x1 transparent gif image used by Ext to create inline icons with CSS background images.
         * In older versions of IE, this defaults to "http://extjs.com/s.gif" and you should change this to a URL on your server.
         * For other browsers it uses an inline data URL.
         * @type String
         */
        BLANK_IMAGE_URL : Ext.isIE6 || Ext.isIE7 || Ext.isAir ?
                            'http:/' + '/www.extjs.com/s.gif' :
                            'data:image/gif;base64,R0lGODlhAQABAID/AMDAwAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==',

        extendX : function(supr, fn){
            return Ext.extend(supr, fn(supr.prototype));
        },

        /**
         * Returns the current HTML document object as an {@link Ext.Element}.
         * @return Ext.Element The document
         */
        getDoc : function(){
            return Ext.get(document);
        },

        /**
         * Utility method for validating that a value is numeric, returning the specified default value if it is not.
         * @param {Mixed} value Should be a number, but any type will be handled appropriately
         * @param {Number} defaultValue The value to return if the original value is non-numeric
         * @return {Number} Value, if numeric, else defaultValue
         */
        num : function(v, defaultValue){
            v = Number(Ext.isEmpty(v) || Ext.isArray(v) || typeof v == 'boolean' || (typeof v == 'string' && v.trim().length == 0) ? NaN : v);
            return isNaN(v) ? defaultValue : v;
        },

        /**
         * <p>Utility method for returning a default value if the passed value is empty.</p>
         * <p>The value is deemed to be empty if it is<div class="mdetail-params"><ul>
         * <li>null</li>
         * <li>undefined</li>
         * <li>an empty array</li>
         * <li>a zero length string (Unless the <tt>allowBlank</tt> parameter is <tt>true</tt>)</li>
         * </ul></div>
         * @param {Mixed} value The value to test
         * @param {Mixed} defaultValue The value to return if the original value is empty
         * @param {Boolean} allowBlank (optional) true to allow zero length strings to qualify as non-empty (defaults to false)
         * @return {Mixed} value, if non-empty, else defaultValue
         */
        value : function(v, defaultValue, allowBlank){
            return Ext.isEmpty(v, allowBlank) ? defaultValue : v;
        },

        /**
         * Escapes the passed string for use in a regular expression
         * @param {String} str
         * @return {String}
         */
        escapeRe : function(s) {
            return s.replace(/([-.*+?^${}()|[\]\/\\])/g, "\\$1");
        },

        sequence : function(o, name, fn, scope){
            o[name] = o[name].createSequence(fn, scope);
        },

        /**
         * Applies event listeners to elements by selectors when the document is ready.
         * The event name is specified with an <tt>&#64;</tt> suffix.
         * <pre><code>
Ext.addBehaviors({
    // add a listener for click on all anchors in element with id foo
    '#foo a&#64;click' : function(e, t){
        // do something
    },

    // add the same listener to multiple selectors (separated by comma BEFORE the &#64;)
    '#foo a, #bar span.some-class&#64;mouseover' : function(){
        // do something
    }
});
         * </code></pre>
         * @param {Object} obj The list of behaviors to apply
         */
        addBehaviors : function(o){
            if(!Ext.isReady){
                Ext.onReady(function(){
                    Ext.addBehaviors(o);
                });
            } else {
                var cache = {}, // simple cache for applying multiple behaviors to same selector does query multiple times
                    parts,
                    b,
                    s;
                for (b in o) {
                    if ((parts = b.split('@'))[1]) { // for Object prototype breakers
                        s = parts[0];
                        if(!cache[s]){
                            cache[s] = Ext.select(s);
                        }
                        cache[s].on(parts[1], o[b]);
                    }
                }
                cache = null;
            }
        },

        /**
         * Utility method for getting the width of the browser scrollbar. This can differ depending on
         * operating system settings, such as the theme or font size.
         * @param {Boolean} force (optional) true to force a recalculation of the value.
         * @return {Number} The width of the scrollbar.
         */
        getScrollBarWidth: function(force){
            if(!Ext.isReady){
                return 0;
            }

            if(force === true || scrollWidth === null){
                    // Append our div, do our calculation and then remove it
                var div = Ext.getBody().createChild('<div class="x-hide-offsets" style="width:100px;height:50px;overflow:hidden;"><div style="height:200px;"></div></div>'),
                    child = div.child('div', true);
                var w1 = child.offsetWidth;
                div.setStyle('overflow', (Ext.isWebKit || Ext.isGecko) ? 'auto' : 'scroll');
                var w2 = child.offsetWidth;
                div.remove();
                // Need to add 2 to ensure we leave enough space
                scrollWidth = w1 - w2 + 2;
            }
            return scrollWidth;
        },


        // deprecated
        combine : function(){
            var as = arguments, l = as.length, r = [];
            for(var i = 0; i < l; i++){
                var a = as[i];
                if(Ext.isArray(a)){
                    r = r.concat(a);
                }else if(a.length !== undefined && !a.substr){
                    r = r.concat(Array.prototype.slice.call(a, 0));
                }else{
                    r.push(a);
                }
            }
            return r;
        },

        /**
         * Copies a set of named properties fom the source object to the destination object.
         * <p>example:<pre><code>
ImageComponent = Ext.extend(Ext.BoxComponent, {
    initComponent: function() {
        this.autoEl = { tag: 'img' };
        MyComponent.superclass.initComponent.apply(this, arguments);
        this.initialBox = Ext.copyTo({}, this.initialConfig, 'x,y,width,height');
    }
});
         * </code></pre>
         * @param {Object} dest The destination object.
         * @param {Object} source The source object.
         * @param {Array/String} names Either an Array of property names, or a comma-delimited list
         * of property names to copy.
         * @return {Object} The modified object.
        */
        copyTo : function(dest, source, names){
            if(typeof names == 'string'){
                names = names.split(/[,;\s]/);
            }
            Ext.each(names, function(name){
                if(source.hasOwnProperty(name)){
                    dest[name] = source[name];
                }
            }, this);
            return dest;
        },

        /**
         * Attempts to destroy any objects passed to it by removing all event listeners, removing them from the
         * DOM (if applicable) and calling their destroy functions (if available).  This method is primarily
         * intended for arguments of type {@link Ext.Element} and {@link Ext.Component}, but any subclass of
         * {@link Ext.util.Observable} can be passed in.  Any number of elements and/or components can be
         * passed into this function in a single call as separate arguments.
         * @param {Mixed} arg1 An {@link Ext.Element}, {@link Ext.Component}, or an Array of either of these to destroy
         * @param {Mixed} arg2 (optional)
         * @param {Mixed} etc... (optional)
         */
        destroy : function(){
            Ext.each(arguments, function(arg){
                if(arg){
                    if(Ext.isArray(arg)){
                        this.destroy.apply(this, arg);
                    }else if(typeof arg.destroy == 'function'){
                        arg.destroy();
                    }else if(arg.dom){
                        arg.remove();
                    }
                }
            }, this);
        },

        /**
         * Attempts to destroy and then remove a set of named properties of the passed object.
         * @param {Object} o The object (most likely a Component) who's properties you wish to destroy.
         * @param {Mixed} arg1 The name of the property to destroy and remove from the object.
         * @param {Mixed} etc... More property names to destroy and remove.
         */
        destroyMembers : function(o, arg1, arg2, etc){
            for(var i = 1, a = arguments, len = a.length; i < len; i++) {
                Ext.destroy(o[a[i]]);
                delete o[a[i]];
            }
        },

        /**
         * Creates a copy of the passed Array with falsy values removed.
         * @param {Array/NodeList} arr The Array from which to remove falsy values.
         * @return {Array} The new, compressed Array.
         */
        clean : function(arr){
            var ret = [];
            Ext.each(arr, function(v){
                if(!!v){
                    ret.push(v);
                }
            });
            return ret;
        },

        /**
         * Creates a copy of the passed Array, filtered to contain only unique values.
         * @param {Array} arr The Array to filter
         * @return {Array} The new Array containing unique values.
         */
        unique : function(arr){
            var ret = [],
                collect = {};

            Ext.each(arr, function(v) {
                if(!collect[v]){
                    ret.push(v);
                }
                collect[v] = true;
            });
            return ret;
        },

        /**
         * Recursively flattens into 1-d Array. Injects Arrays inline.
         * @param {Array} arr The array to flatten
         * @return {Array} The new, flattened array.
         */
        flatten : function(arr){
            var worker = [];
            function rFlatten(a) {
                Ext.each(a, function(v) {
                    if(Ext.isArray(v)){
                        rFlatten(v);
                    }else{
                        worker.push(v);
                    }
                });
                return worker;
            }
            return rFlatten(arr);
        },

        /**
         * Returns the minimum value in the Array.
         * @param {Array|NodeList} arr The Array from which to select the minimum value.
         * @param {Function} comp (optional) a function to perform the comparision which determines minimization.
         *                   If omitted the "<" operator will be used. Note: gt = 1; eq = 0; lt = -1
         * @return {Object} The minimum value in the Array.
         */
        min : function(arr, comp){
            var ret = arr[0];
            comp = comp || function(a,b){ return a < b ? -1 : 1; };
            Ext.each(arr, function(v) {
                ret = comp(ret, v) == -1 ? ret : v;
            });
            return ret;
        },

        /**
         * Returns the maximum value in the Array
         * @param {Array|NodeList} arr The Array from which to select the maximum value.
         * @param {Function} comp (optional) a function to perform the comparision which determines maximization.
         *                   If omitted the ">" operator will be used. Note: gt = 1; eq = 0; lt = -1
         * @return {Object} The maximum value in the Array.
         */
        max : function(arr, comp){
            var ret = arr[0];
            comp = comp || function(a,b){ return a > b ? 1 : -1; };
            Ext.each(arr, function(v) {
                ret = comp(ret, v) == 1 ? ret : v;
            });
            return ret;
        },

        /**
         * Calculates the mean of the Array
         * @param {Array} arr The Array to calculate the mean value of.
         * @return {Number} The mean.
         */
        mean : function(arr){
           return arr.length > 0 ? Ext.sum(arr) / arr.length : undefined;
        },

        /**
         * Calculates the sum of the Array
         * @param {Array} arr The Array to calculate the sum value of.
         * @return {Number} The sum.
         */
        sum : function(arr){
           var ret = 0;
           Ext.each(arr, function(v) {
               ret += v;
           });
           return ret;
        },

        /**
         * Partitions the set into two sets: a true set and a false set.
         * Example:
         * Example2:
         * <pre><code>
// Example 1:
Ext.partition([true, false, true, true, false]); // [[true, true, true], [false, false]]

// Example 2:
Ext.partition(
    Ext.query("p"),
    function(val){
        return val.className == "class1"
    }
);
// true are those paragraph elements with a className of "class1",
// false set are those that do not have that className.
         * </code></pre>
         * @param {Array|NodeList} arr The array to partition
         * @param {Function} truth (optional) a function to determine truth.  If this is omitted the element
         *                   itself must be able to be evaluated for its truthfulness.
         * @return {Array} [true<Array>,false<Array>]
         */
        partition : function(arr, truth){
            var ret = [[],[]];
            Ext.each(arr, function(v, i, a) {
                ret[ (truth && truth(v, i, a)) || (!truth && v) ? 0 : 1].push(v);
            });
            return ret;
        },

        /**
         * Invokes a method on each item in an Array.
         * <pre><code>
// Example:
Ext.invoke(Ext.query("p"), "getAttribute", "id");
// [el1.getAttribute("id"), el2.getAttribute("id"), ..., elN.getAttribute("id")]
         * </code></pre>
         * @param {Array|NodeList} arr The Array of items to invoke the method on.
         * @param {String} methodName The method name to invoke.
         * @param {...*} args Arguments to send into the method invocation.
         * @return {Array} The results of invoking the method on each item in the array.
         */
        invoke : function(arr, methodName){
            var ret = [],
                args = Array.prototype.slice.call(arguments, 2);
            Ext.each(arr, function(v,i) {
                if (v && typeof v[methodName] == 'function') {
                    ret.push(v[methodName].apply(v, args));
                } else {
                    ret.push(undefined);
                }
            });
            return ret;
        },

        /**
         * Plucks the value of a property from each item in the Array
         * <pre><code>
// Example:
Ext.pluck(Ext.query("p"), "className"); // [el1.className, el2.className, ..., elN.className]
         * </code></pre>
         * @param {Array|NodeList} arr The Array of items to pluck the value from.
         * @param {String} prop The property name to pluck from each element.
         * @return {Array} The value from each item in the Array.
         */
        pluck : function(arr, prop){
            var ret = [];
            Ext.each(arr, function(v) {
                ret.push( v[prop] );
            });
            return ret;
        },

        /**
         * <p>Zips N sets together.</p>
         * <pre><code>
// Example 1:
Ext.zip([1,2,3],[4,5,6]); // [[1,4],[2,5],[3,6]]
// Example 2:
Ext.zip(
    [ "+", "-", "+"],
    [  12,  10,  22],
    [  43,  15,  96],
    function(a, b, c){
        return "$" + a + "" + b + "." + c
    }
); // ["$+12.43", "$-10.15", "$+22.96"]
         * </code></pre>
         * @param {Arrays|NodeLists} arr This argument may be repeated. Array(s) to contribute values.
         * @param {Function} zipper (optional) The last item in the argument list. This will drive how the items are zipped together.
         * @return {Array} The zipped set.
         */
        zip : function(){
            var parts = Ext.partition(arguments, function( val ){ return typeof val != 'function'; }),
                arrs = parts[0],
                fn = parts[1][0],
                len = Ext.max(Ext.pluck(arrs, "length")),
                ret = [];

            for (var i = 0; i < len; i++) {
                ret[i] = [];
                if(fn){
                    ret[i] = fn.apply(fn, Ext.pluck(arrs, i));
                }else{
                    for (var j = 0, aLen = arrs.length; j < aLen; j++){
                        ret[i].push( arrs[j][i] );
                    }
                }
            }
            return ret;
        },

        /**
         * This is shorthand reference to {@link Ext.ComponentMgr#get}.
         * Looks up an existing {@link Ext.Component Component} by {@link Ext.Component#id id}
         * @param {String} id The component {@link Ext.Component#id id}
         * @return Ext.Component The Component, <tt>undefined</tt> if not found, or <tt>null</tt> if a
         * Class was found.
        */
        getCmp : function(id){
            return Ext.ComponentMgr.get(id);
        },

        /**
         * By default, Ext intelligently decides whether floating elements should be shimmed. If you are using flash,
         * you may want to set this to true.
         * @type Boolean
         */
        useShims: E.isIE6 || (E.isMac && E.isGecko2),

        // inpired by a similar function in mootools library
        /**
         * Returns the type of object that is passed in. If the object passed in is null or undefined it
         * return false otherwise it returns one of the following values:<div class="mdetail-params"><ul>
         * <li><b>string</b>: If the object passed is a string</li>
         * <li><b>number</b>: If the object passed is a number</li>
         * <li><b>boolean</b>: If the object passed is a boolean value</li>
         * <li><b>date</b>: If the object passed is a Date object</li>
         * <li><b>function</b>: If the object passed is a function reference</li>
         * <li><b>object</b>: If the object passed is an object</li>
         * <li><b>array</b>: If the object passed is an array</li>
         * <li><b>regexp</b>: If the object passed is a regular expression</li>
         * <li><b>element</b>: If the object passed is a DOM Element</li>
         * <li><b>nodelist</b>: If the object passed is a DOM NodeList</li>
         * <li><b>textnode</b>: If the object passed is a DOM text node and contains something other than whitespace</li>
         * <li><b>whitespace</b>: If the object passed is a DOM text node and contains only whitespace</li>
         * </ul></div>
         * @param {Mixed} object
         * @return {String}
         */
        type : function(o){
            if(o === undefined || o === null){
                return false;
            }
            if(o.htmlElement){
                return 'element';
            }
            var t = typeof o;
            if(t == 'object' && o.nodeName) {
                switch(o.nodeType) {
                    case 1: return 'element';
                    case 3: return (/\S/).test(o.nodeValue) ? 'textnode' : 'whitespace';
                }
            }
            if(t == 'object' || t == 'function') {
                switch(o.constructor) {
                    case Array: return 'array';
                    case RegExp: return 'regexp';
                    case Date: return 'date';
                }
                if(typeof o.length == 'number' && typeof o.item == 'function') {
                    return 'nodelist';
                }
            }
            return t;
        },

        intercept : function(o, name, fn, scope){
            o[name] = o[name].createInterceptor(fn, scope);
        },

        // internal
        callback : function(cb, scope, args, delay){
            if(typeof cb == 'function'){
                if(delay){
                    cb.defer(delay, scope, args || []);
                }else{
                    cb.apply(scope, args || []);
                }
            }
        }
    };
}());

/**
 * @class Function
 * These functions are available on every Function object (any JavaScript function).
 */
Ext.apply(Function.prototype, {
    /**
     * Create a combined function call sequence of the original function + the passed function.
     * The resulting function returns the results of the original function.
     * The passed fcn is called with the parameters of the original function. Example usage:
     * <pre><code>
var sayHi = function(name){
    alert('Hi, ' + name);
}

sayHi('Fred'); // alerts "Hi, Fred"

var sayGoodbye = sayHi.createSequence(function(name){
    alert('Bye, ' + name);
});

sayGoodbye('Fred'); // both alerts show
</code></pre>
     * @param {Function} fcn The function to sequence
     * @param {Object} scope (optional) The scope (<code><b>this</b></code> reference) in which the passed function is executed.
     * <b>If omitted, defaults to the scope in which the original function is called or the browser window.</b>
     * @return {Function} The new function
     */
    createSequence : function(fcn, scope){
        var method = this;
        return (typeof fcn != 'function') ?
                this :
                function(){
                    var retval = method.apply(this || window, arguments);
                    fcn.apply(scope || this || window, arguments);
                    return retval;
                };
    }
});


/**
 * @class String
 * These functions are available as static methods on the JavaScript String object.
 */
Ext.applyIf(String, {

    /**
     * Escapes the passed string for ' and \
     * @param {String} string The string to escape
     * @return {String} The escaped string
     * @static
     */
    escape : function(string) {
        return string.replace(/('|\\)/g, "\\$1");
    },

    /**
     * Pads the left side of a string with a specified character.  This is especially useful
     * for normalizing number and date strings.  Example usage:
     * <pre><code>
var s = String.leftPad('123', 5, '0');
// s now contains the string: '00123'
     * </code></pre>
     * @param {String} string The original string
     * @param {Number} size The total length of the output string
     * @param {String} char (optional) The character with which to pad the original string (defaults to empty string " ")
     * @return {String} The padded string
     * @static
     */
    leftPad : function (val, size, ch) {
        var result = String(val);
        if(!ch) {
            ch = " ";
        }
        while (result.length < size) {
            result = ch + result;
        }
        return result;
    }
});

/**
 * Utility function that allows you to easily switch a string between two alternating values.  The passed value
 * is compared to the current string, and if they are equal, the other value that was passed in is returned.  If
 * they are already different, the first value passed in is returned.  Note that this method returns the new value
 * but does not change the current string.
 * <pre><code>
// alternate sort directions
sort = sort.toggle('ASC', 'DESC');

// instead of conditional logic:
sort = (sort == 'ASC' ? 'DESC' : 'ASC');
</code></pre>
 * @param {String} value The value to compare to the current string
 * @param {String} other The new value to use if the string already equals the first value passed in
 * @return {String} The new value
 */
String.prototype.toggle = function(value, other){
    return this == value ? other : value;
};

/**
 * Trims whitespace from either end of a string, leaving spaces within the string intact.  Example:
 * <pre><code>
var s = '  foo bar  ';
alert('-' + s + '-');         //alerts "- foo bar -"
alert('-' + s.trim() + '-');  //alerts "-foo bar-"
</code></pre>
 * @return {String} The trimmed string
 */
String.prototype.trim = function(){
    var re = /^\s+|\s+$/g;
    return function(){ return this.replace(re, ""); };
}();

// here to prevent dependency on Date.js
/**
 Returns the number of milliseconds between this date and date
 @param {Date} date (optional) Defaults to now
 @return {Number} The diff in milliseconds
 @member Date getElapsed
 */
Date.prototype.getElapsed = function(date) {
    return Math.abs((date || new Date()).getTime()-this.getTime());
};


/**
 * @class Number
 */
Ext.applyIf(Number.prototype, {
    /**
     * Checks whether or not the current number is within a desired range.  If the number is already within the
     * range it is returned, otherwise the min or max value is returned depending on which side of the range is
     * exceeded.  Note that this method returns the constrained value but does not change the current number.
     * @param {Number} min The minimum number in the range
     * @param {Number} max The maximum number in the range
     * @return {Number} The constrained value if outside the range, otherwise the current value
     */
    constrain : function(min, max){
        return Math.min(Math.max(this, min), max);
    }
});
Ext.lib.Dom.getRegion = function(el) {
    return Ext.lib.Region.getRegion(el);
};	Ext.lib.Region = function(t, r, b, l) {
		var me = this;
        me.top = t;
        me[1] = t;
        me.right = r;
        me.bottom = b;
        me.left = l;
        me[0] = l;
    };

    Ext.lib.Region.prototype = {
        contains : function(region) {
	        var me = this;
            return ( region.left >= me.left &&
                     region.right <= me.right &&
                     region.top >= me.top &&
                     region.bottom <= me.bottom );

        },

        getArea : function() {
	        var me = this;
            return ( (me.bottom - me.top) * (me.right - me.left) );
        },

        intersect : function(region) {
            var me = this,
            	t = Math.max(me.top, region.top),
            	r = Math.min(me.right, region.right),
            	b = Math.min(me.bottom, region.bottom),
            	l = Math.max(me.left, region.left);

            if (b >= t && r >= l) {
                return new Ext.lib.Region(t, r, b, l);
            }
        },
        
        union : function(region) {
	        var me = this,
            	t = Math.min(me.top, region.top),
            	r = Math.max(me.right, region.right),
            	b = Math.max(me.bottom, region.bottom),
            	l = Math.min(me.left, region.left);

            return new Ext.lib.Region(t, r, b, l);
        },

        constrainTo : function(r) {
	        var me = this;
            me.top = me.top.constrain(r.top, r.bottom);
            me.bottom = me.bottom.constrain(r.top, r.bottom);
            me.left = me.left.constrain(r.left, r.right);
            me.right = me.right.constrain(r.left, r.right);
            return me;
        },

        adjust : function(t, l, b, r) {
	        var me = this;
            me.top += t;
            me.left += l;
            me.right += r;
            me.bottom += b;
            return me;
        }
    };

    Ext.lib.Region.getRegion = function(el) {
        var p = Ext.lib.Dom.getXY(el),
        	t = p[1],
        	r = p[0] + el.offsetWidth,
        	b = p[1] + el.offsetHeight,
        	l = p[0];

        return new Ext.lib.Region(t, r, b, l);
    };	Ext.lib.Point = function(x, y) {
        if (Ext.isArray(x)) {
            y = x[1];
            x = x[0];
        }
        var me = this;
        me.x = me.right = me.left = me[0] = x;
        me.y = me.top = me.bottom = me[1] = y;
    };

    Ext.lib.Point.prototype = new Ext.lib.Region();
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
/**
 * @class Ext.Template
 */
Ext.apply(Ext.Template.prototype, {
    /**
     * @cfg {Boolean} disableFormats Specify <tt>true</tt> to disable format
     * functions in the template. If the template does not contain
     * {@link Ext.util.Format format functions}, setting <code>disableFormats</code>
     * to true will reduce <code>{@link #apply}</code> time. Defaults to <tt>false</tt>.
     * <pre><code>
var t = new Ext.Template(
    '&lt;div name="{id}"&gt;',
        '&lt;span class="{cls}"&gt;{name} {value}&lt;/span&gt;',
    '&lt;/div&gt;',
    {
        compiled: true,      // {@link #compile} immediately
        disableFormats: true // reduce <code>{@link #apply}</code> time since no formatting
    }
);
     * </code></pre>
     * For a list of available format functions, see {@link Ext.util.Format}.
     */
    disableFormats : false,
    /**
     * See <code>{@link #disableFormats}</code>.
     * @type Boolean
     * @property disableFormats
     */

    /**
     * The regular expression used to match template variables
     * @type RegExp
     * @property
     * @hide repeat doc
     */
    re : /\{([\w-]+)(?:\:([\w\.]*)(?:\((.*?)?\))?)?\}/g,
    argsRe : /^\s*['"](.*)["']\s*$/,
    compileARe : /\\/g,
    compileBRe : /(\r\n|\n)/g,
    compileCRe : /'/g,

    /**
     * Returns an HTML fragment of this template with the specified values applied.
     * @param {Object/Array} values The template values. Can be an array if your params are numeric (i.e. {0}) or an object (i.e. {foo: 'bar'})
     * @return {String} The HTML fragment
     * @hide repeat doc
     */
    applyTemplate : function(values){
        var me = this,
            useF = me.disableFormats !== true,
            fm = Ext.util.Format,
            tpl = me;

        if(me.compiled){
            return me.compiled(values);
        }
        function fn(m, name, format, args){
            if (format && useF) {
                if (format.substr(0, 5) == "this.") {
                    return tpl.call(format.substr(5), values[name], values);
                } else {
                    if (args) {
                        // quoted values are required for strings in compiled templates,
                        // but for non compiled we need to strip them
                        // quoted reversed for jsmin
                        var re = me.argsRe;
                        args = args.split(',');
                        for(var i = 0, len = args.length; i < len; i++){
                            args[i] = args[i].replace(re, "$1");
                        }
                        args = [values[name]].concat(args);
                    } else {
                        args = [values[name]];
                    }
                    return fm[format].apply(fm, args);
                }
            } else {
                return values[name] !== undefined ? values[name] : "";
            }
        }
        return me.html.replace(me.re, fn);
    },

    /**
     * Compiles the template into an internal function, eliminating the RegEx overhead.
     * @return {Ext.Template} this
     * @hide repeat doc
     */
    compile : function(){
        var me = this,
            fm = Ext.util.Format,
            useF = me.disableFormats !== true,
            sep = Ext.isGecko ? "+" : ",",
            body;

        function fn(m, name, format, args){
            if(format && useF){
                args = args ? ',' + args : "";
                if(format.substr(0, 5) != "this."){
                    format = "fm." + format + '(';
                }else{
                    format = 'this.call("'+ format.substr(5) + '", ';
                    args = ", values";
                }
            }else{
                args= ''; format = "(values['" + name + "'] == undefined ? '' : ";
            }
            return "'"+ sep + format + "values['" + name + "']" + args + ")"+sep+"'";
        }

        // branched to use + in gecko and [].join() in others
        if(Ext.isGecko){
            body = "this.compiled = function(values){ return '" +
                   me.html.replace(me.compileARe, '\\\\').replace(me.compileBRe, '\\n').replace(me.compileCRe, "\\'").replace(me.re, fn) +
                    "';};";
        }else{
            body = ["this.compiled = function(values){ return ['"];
            body.push(me.html.replace(me.compileARe, '\\\\').replace(me.compileBRe, '\\n').replace(me.compileCRe, "\\'").replace(me.re, fn));
            body.push("'].join('');};");
            body = body.join('');
        }
        eval(body);
        return me;
    },

    // private function used to call members
    call : function(fnName, value, allValues){
        return this[fnName](value, allValues);
    }
});
Ext.Template.prototype.apply = Ext.Template.prototype.applyTemplate;
/**
 * @class Ext.util.Functions
 * @singleton
 */
Ext.util.Functions = {
    /**
     * Creates an interceptor function. The passed function is called before the original one. If it returns false,
     * the original one is not called. The resulting function returns the results of the original function.
     * The passed function is called with the parameters of the original function. Example usage:
     * <pre><code>
var sayHi = function(name){
    alert('Hi, ' + name);
}

sayHi('Fred'); // alerts "Hi, Fred"

// create a new function that validates input without
// directly modifying the original function:
var sayHiToFriend = Ext.createInterceptor(sayHi, function(name){
    return name == 'Brian';
});

sayHiToFriend('Fred');  // no alert
sayHiToFriend('Brian'); // alerts "Hi, Brian"
       </code></pre>
     * @param {Function} origFn The original function.
     * @param {Function} newFn The function to call before the original
     * @param {Object} scope (optional) The scope (<code><b>this</b></code> reference) in which the passed function is executed.
     * <b>If omitted, defaults to the scope in which the original function is called or the browser window.</b>
     * @return {Function} The new function
     */
    createInterceptor: function(origFn, newFn, scope) { 
        var method = origFn;
        if (!Ext.isFunction(newFn)) {
            return origFn;
        }
        else {
            return function() {
                var me = this,
                    args = arguments;
                newFn.target = me;
                newFn.method = origFn;
                return (newFn.apply(scope || me || window, args) !== false) ?
                        origFn.apply(me || window, args) :
                        null;
            };
        }
    },

    /**
     * Creates a delegate (callback) that sets the scope to obj.
     * Call directly on any function. Example: <code>Ext.createDelegate(this.myFunction, this, [arg1, arg2])</code>
     * Will create a function that is automatically scoped to obj so that the <tt>this</tt> variable inside the
     * callback points to obj. Example usage:
     * <pre><code>
var sayHi = function(name){
    // Note this use of "this.text" here.  This function expects to
    // execute within a scope that contains a text property.  In this
    // example, the "this" variable is pointing to the btn object that
    // was passed in createDelegate below.
    alert('Hi, ' + name + '. You clicked the "' + this.text + '" button.');
}

var btn = new Ext.Button({
    text: 'Say Hi',
    renderTo: Ext.getBody()
});

// This callback will execute in the scope of the
// button instance. Clicking the button alerts
// "Hi, Fred. You clicked the "Say Hi" button."
btn.on('click', Ext.createDelegate(sayHi, btn, ['Fred']));
       </code></pre>
     * @param {Function} fn The function to delegate.
     * @param {Object} scope (optional) The scope (<code><b>this</b></code> reference) in which the function is executed.
     * <b>If omitted, defaults to the browser window.</b>
     * @param {Array} args (optional) Overrides arguments for the call. (Defaults to the arguments passed by the caller)
     * @param {Boolean/Number} appendArgs (optional) if True args are appended to call args instead of overriding,
     * if a number the args are inserted at the specified position
     * @return {Function} The new function
     */
    createDelegate: function(fn, obj, args, appendArgs) {
        if (!Ext.isFunction(fn)) {
            return fn;
        }
        return function() {
            var callArgs = args || arguments;
            if (appendArgs === true) {
                callArgs = Array.prototype.slice.call(arguments, 0);
                callArgs = callArgs.concat(args);
            }
            else if (Ext.isNumber(appendArgs)) {
                callArgs = Array.prototype.slice.call(arguments, 0);
                // copy arguments first
                var applyArgs = [appendArgs, 0].concat(args);
                // create method call params
                Array.prototype.splice.apply(callArgs, applyArgs);
                // splice them in
            }
            return fn.apply(obj || window, callArgs);
        };
    },

    /**
     * Calls this function after the number of millseconds specified, optionally in a specific scope. Example usage:
     * <pre><code>
var sayHi = function(name){
    alert('Hi, ' + name);
}

// executes immediately:
sayHi('Fred');

// executes after 2 seconds:
Ext.defer(sayHi, 2000, this, ['Fred']);

// this syntax is sometimes useful for deferring
// execution of an anonymous function:
Ext.defer(function(){
    alert('Anonymous');
}, 100);
       </code></pre>
     * @param {Function} fn The function to defer.
     * @param {Number} millis The number of milliseconds for the setTimeout call (if less than or equal to 0 the function is executed immediately)
     * @param {Object} scope (optional) The scope (<code><b>this</b></code> reference) in which the function is executed.
     * <b>If omitted, defaults to the browser window.</b>
     * @param {Array} args (optional) Overrides arguments for the call. (Defaults to the arguments passed by the caller)
     * @param {Boolean/Number} appendArgs (optional) if True args are appended to call args instead of overriding,
     * if a number the args are inserted at the specified position
     * @return {Number} The timeout id that can be used with clearTimeout
     */
    defer: function(fn, millis, obj, args, appendArgs) {
        fn = Ext.util.Functions.createDelegate(fn, obj, args, appendArgs);
        if (millis > 0) {
            return setTimeout(fn, millis);
        }
        fn();
        return 0;
    },


    /**
     * Create a combined function call sequence of the original function + the passed function.
     * The resulting function returns the results of the original function.
     * The passed fcn is called with the parameters of the original function. Example usage:
     * 

var sayHi = function(name){
    alert('Hi, ' + name);
}

sayHi('Fred'); // alerts "Hi, Fred"

var sayGoodbye = Ext.createSequence(sayHi, function(name){
    alert('Bye, ' + name);
});

sayGoodbye('Fred'); // both alerts show

     * @param {Function} origFn The original function.
     * @param {Function} newFn The function to sequence
     * @param {Object} scope (optional) The scope (this reference) in which the passed function is executed.
     * If omitted, defaults to the scope in which the original function is called or the browser window.
     * @return {Function} The new function
     */
    createSequence: function(origFn, newFn, scope) {
        if (!Ext.isFunction(newFn)) {
            return origFn;
        }
        else {
            return function() {
                var retval = origFn.apply(this || window, arguments);
                newFn.apply(scope || this || window, arguments);
                return retval;
            };
        }
    }
};

/**
 * Shorthand for {@link Ext.util.Functions#defer}   
 * @param {Function} fn The function to defer.
 * @param {Number} millis The number of milliseconds for the setTimeout call (if less than or equal to 0 the function is executed immediately)
 * @param {Object} scope (optional) The scope (<code><b>this</b></code> reference) in which the function is executed.
 * <b>If omitted, defaults to the browser window.</b>
 * @param {Array} args (optional) Overrides arguments for the call. (Defaults to the arguments passed by the caller)
 * @param {Boolean/Number} appendArgs (optional) if True args are appended to call args instead of overriding,
 * if a number the args are inserted at the specified position
 * @return {Number} The timeout id that can be used with clearTimeout
 * @member Ext
 * @method defer
 */

Ext.defer = Ext.util.Functions.defer;

/**
 * Shorthand for {@link Ext.util.Functions#createInterceptor}   
 * @param {Function} origFn The original function.
 * @param {Function} newFn The function to call before the original
 * @param {Object} scope (optional) The scope (<code><b>this</b></code> reference) in which the passed function is executed.
 * <b>If omitted, defaults to the scope in which the original function is called or the browser window.</b>
 * @return {Function} The new function
 * @member Ext
 * @method defer
 */

Ext.createInterceptor = Ext.util.Functions.createInterceptor;

/**
 * Shorthand for {@link Ext.util.Functions#createSequence}
 * @param {Function} origFn The original function.
 * @param {Function} newFn The function to sequence
 * @param {Object} scope (optional) The scope (this reference) in which the passed function is executed.
 * If omitted, defaults to the scope in which the original function is called or the browser window.
 * @return {Function} The new function
 * @member Ext
 * @method defer
 */

Ext.createSequence = Ext.util.Functions.createSequence;

/**
 * Shorthand for {@link Ext.util.Functions#createDelegate}
 * @param {Function} fn The function to delegate.
 * @param {Object} scope (optional) The scope (<code><b>this</b></code> reference) in which the function is executed.
 * <b>If omitted, defaults to the browser window.</b>
 * @param {Array} args (optional) Overrides arguments for the call. (Defaults to the arguments passed by the caller)
 * @param {Boolean/Number} appendArgs (optional) if True args are appended to call args instead of overriding,
 * if a number the args are inserted at the specified position
 * @return {Function} The new function
 * @member Ext
 * @method defer
 */
Ext.createDelegate = Ext.util.Functions.createDelegate;
/**
 * @class Ext.util.Observable
 */
Ext.apply(Ext.util.Observable.prototype, function(){
    // this is considered experimental (along with beforeMethod, afterMethod, removeMethodListener?)
    // allows for easier interceptor and sequences, including cancelling and overwriting the return value of the call
    // private
    function getMethodEvent(method){
        var e = (this.methodEvents = this.methodEvents ||
        {})[method], returnValue, v, cancel, obj = this;

        if (!e) {
            this.methodEvents[method] = e = {};
            e.originalFn = this[method];
            e.methodName = method;
            e.before = [];
            e.after = [];

            var makeCall = function(fn, scope, args){
                if((v = fn.apply(scope || obj, args)) !== undefined){
                    if (typeof v == 'object') {
                        if(v.returnValue !== undefined){
                            returnValue = v.returnValue;
                        }else{
                            returnValue = v;
                        }
                        cancel = !!v.cancel;
                    }
                    else
                        if (v === false) {
                            cancel = true;
                        }
                        else {
                            returnValue = v;
                        }
                }
            };

            this[method] = function(){
                var args = Array.prototype.slice.call(arguments, 0),
                    b;
                returnValue = v = undefined;
                cancel = false;

                for(var i = 0, len = e.before.length; i < len; i++){
                    b = e.before[i];
                    makeCall(b.fn, b.scope, args);
                    if (cancel) {
                        return returnValue;
                    }
                }

                if((v = e.originalFn.apply(obj, args)) !== undefined){
                    returnValue = v;
                }

                for(var i = 0, len = e.after.length; i < len; i++){
                    b = e.after[i];
                    makeCall(b.fn, b.scope, args);
                    if (cancel) {
                        return returnValue;
                    }
                }
                return returnValue;
            };
        }
        return e;
    }

    return {
        // these are considered experimental
        // allows for easier interceptor and sequences, including cancelling and overwriting the return value of the call
        // adds an 'interceptor' called before the original method
        beforeMethod : function(method, fn, scope){
            getMethodEvent.call(this, method).before.push({
                fn: fn,
                scope: scope
            });
        },

        // adds a 'sequence' called after the original method
        afterMethod : function(method, fn, scope){
            getMethodEvent.call(this, method).after.push({
                fn: fn,
                scope: scope
            });
        },

        removeMethodListener: function(method, fn, scope){
            var e = this.getMethodEvent(method);
            for(var i = 0, len = e.before.length; i < len; i++){
                if(e.before[i].fn == fn && e.before[i].scope == scope){
                    e.before.splice(i, 1);
                    return;
                }
            }
            for(var i = 0, len = e.after.length; i < len; i++){
                if(e.after[i].fn == fn && e.after[i].scope == scope){
                    e.after.splice(i, 1);
                    return;
                }
            }
        },

        /**
         * Relays selected events from the specified Observable as if the events were fired by <tt><b>this</b></tt>.
         * @param {Object} o The Observable whose events this object is to relay.
         * @param {Array} events Array of event names to relay.
         */
        relayEvents : function(o, events){
            var me = this;
            function createHandler(ename){
                return function(){
                    return me.fireEvent.apply(me, [ename].concat(Array.prototype.slice.call(arguments, 0)));
                };
            }
            for(var i = 0, len = events.length; i < len; i++){
                var ename = events[i];
                me.events[ename] = me.events[ename] || true;
                o.on(ename, createHandler(ename), me);
            }
        },

        /**
         * <p>Enables events fired by this Observable to bubble up an owner hierarchy by calling
         * <code>this.getBubbleTarget()</code> if present. There is no implementation in the Observable base class.</p>
         * <p>This is commonly used by Ext.Components to bubble events to owner Containers. See {@link Ext.Component.getBubbleTarget}. The default
         * implementation in Ext.Component returns the Component's immediate owner. But if a known target is required, this can be overridden to
         * access the required target more quickly.</p>
         * <p>Example:</p><pre><code>
Ext.override(Ext.form.Field, {
    //  Add functionality to Field&#39;s initComponent to enable the change event to bubble
    initComponent : Ext.form.Field.prototype.initComponent.createSequence(function() {
        this.enableBubble('change');
    }),

    //  We know that we want Field&#39;s events to bubble directly to the FormPanel.
    getBubbleTarget : function() {
        if (!this.formPanel) {
            this.formPanel = this.findParentByType('form');
        }
        return this.formPanel;
    }
});

var myForm = new Ext.formPanel({
    title: 'User Details',
    items: [{
        ...
    }],
    listeners: {
        change: function() {
            // Title goes red if form has been modified.
            myForm.header.setStyle('color', 'red');
        }
    }
});
</code></pre>
         * @param {String/Array} events The event name to bubble, or an Array of event names.
         */
        enableBubble : function(events){
            var me = this;
            if(!Ext.isEmpty(events)){
                events = Ext.isArray(events) ? events : Array.prototype.slice.call(arguments, 0);
                for(var i = 0, len = events.length; i < len; i++){
                    var ename = events[i];
                    ename = ename.toLowerCase();
                    var ce = me.events[ename] || true;
                    if (typeof ce == 'boolean') {
                        ce = new Ext.util.Event(me, ename);
                        me.events[ename] = ce;
                    }
                    ce.bubble = true;
                }
            }
        }
    };
}());


/**
 * Starts capture on the specified Observable. All events will be passed
 * to the supplied function with the event name + standard signature of the event
 * <b>before</b> the event is fired. If the supplied function returns false,
 * the event will not fire.
 * @param {Observable} o The Observable to capture events from.
 * @param {Function} fn The function to call when an event is fired.
 * @param {Object} scope (optional) The scope (<code>this</code> reference) in which the function is executed. Defaults to the Observable firing the event.
 * @static
 */
Ext.util.Observable.capture = function(o, fn, scope){
    o.fireEvent = o.fireEvent.createInterceptor(fn, scope);
};


/**
 * Sets observability on the passed class constructor.<p>
 * <p>This makes any event fired on any instance of the passed class also fire a single event through
 * the <i>class</i> allowing for central handling of events on many instances at once.</p>
 * <p>Usage:</p><pre><code>
Ext.util.Observable.observeClass(Ext.data.Connection);
Ext.data.Connection.on('beforerequest', function(con, options) {
    console.log('Ajax request made to ' + options.url);
});</code></pre>
 * @param {Function} c The class constructor to make observable.
 * @param {Object} listeners An object containing a series of listeners to add. See {@link #addListener}.
 * @static
 */
Ext.util.Observable.observeClass = function(c, listeners){
    if(c){
      if(!c.fireEvent){
          Ext.apply(c, new Ext.util.Observable());
          Ext.util.Observable.capture(c.prototype, c.fireEvent, c);
      }
      if(typeof listeners == 'object'){
          c.on(listeners);
      }
      return c;
   }
};
/**
* @class Ext.EventManager
*/
Ext.apply(Ext.EventManager, function(){
   var resizeEvent,
       resizeTask,
       textEvent,
       textSize,
       D = Ext.lib.Dom,
       propRe = /^(?:scope|delay|buffer|single|stopEvent|preventDefault|stopPropagation|normalized|args|delegate)$/,
       curWidth = 0,
       curHeight = 0,
       // note 1: IE fires ONLY the keydown event on specialkey autorepeat
       // note 2: Safari < 3.1, Gecko (Mac/Linux) & Opera fire only the keypress event on specialkey autorepeat
       // (research done by @Jan Wolter at http://unixpapa.com/js/key.html)
       useKeydown = Ext.isWebKit ?
                   Ext.num(navigator.userAgent.match(/AppleWebKit\/(\d+)/)[1]) >= 525 :
                   !((Ext.isGecko && !Ext.isWindows) || Ext.isOpera);

   return {
       // private
       doResizeEvent: function(){
           var h = D.getViewHeight(),
               w = D.getViewWidth();

            //whacky problem in IE where the resize event will fire even though the w/h are the same.
            if(curHeight != h || curWidth != w){
               resizeEvent.fire(curWidth = w, curHeight = h);
            }
       },

       /**
        * Adds a listener to be notified when the browser window is resized and provides resize event buffering (100 milliseconds),
        * passes new viewport width and height to handlers.
        * @param {Function} fn      The handler function the window resize event invokes.
        * @param {Object}   scope   The scope (<code>this</code> reference) in which the handler function executes. Defaults to the browser window.
        * @param {boolean}  options Options object as passed to {@link Ext.Element#addListener}
        */
       onWindowResize : function(fn, scope, options){
           if(!resizeEvent){
               resizeEvent = new Ext.util.Event();
               resizeTask = new Ext.util.DelayedTask(this.doResizeEvent);
               Ext.EventManager.on(window, "resize", this.fireWindowResize, this);
           }
           resizeEvent.addListener(fn, scope, options);
       },

       // exposed only to allow manual firing
       fireWindowResize : function(){
           if(resizeEvent){
               resizeTask.delay(100);
           }
       },

       /**
        * Adds a listener to be notified when the user changes the active text size. Handler gets called with 2 params, the old size and the new size.
        * @param {Function} fn      The function the event invokes.
        * @param {Object}   scope   The scope (<code>this</code> reference) in which the handler function executes. Defaults to the browser window.
        * @param {boolean}  options Options object as passed to {@link Ext.Element#addListener}
        */
       onTextResize : function(fn, scope, options){
           if(!textEvent){
               textEvent = new Ext.util.Event();
               var textEl = new Ext.Element(document.createElement('div'));
               textEl.dom.className = 'x-text-resize';
               textEl.dom.innerHTML = 'X';
               textEl.appendTo(document.body);
               textSize = textEl.dom.offsetHeight;
               setInterval(function(){
                   if(textEl.dom.offsetHeight != textSize){
                       textEvent.fire(textSize, textSize = textEl.dom.offsetHeight);
                   }
               }, this.textResizeInterval);
           }
           textEvent.addListener(fn, scope, options);
       },

       /**
        * Removes the passed window resize listener.
        * @param {Function} fn        The method the event invokes
        * @param {Object}   scope    The scope of handler
        */
       removeResizeListener : function(fn, scope){
           if(resizeEvent){
               resizeEvent.removeListener(fn, scope);
           }
       },

       // private
       fireResize : function(){
           if(resizeEvent){
               resizeEvent.fire(D.getViewWidth(), D.getViewHeight());
           }
       },

        /**
        * The frequency, in milliseconds, to check for text resize events (defaults to 50)
        */
       textResizeInterval : 50,

       /**
        * Url used for onDocumentReady with using SSL (defaults to Ext.SSL_SECURE_URL)
        */
       ieDeferSrc : false,
       
       // protected, short accessor for useKeydown
       getKeyEvent : function(){
           return useKeydown ? 'keydown' : 'keypress';
       },

       // protected for use inside the framework
       // detects whether we should use keydown or keypress based on the browser.
       useKeydown: useKeydown
   };
}());

Ext.EventManager.on = Ext.EventManager.addListener;


Ext.apply(Ext.EventObjectImpl.prototype, {
   /** Key constant @type Number */
   BACKSPACE: 8,
   /** Key constant @type Number */
   TAB: 9,
   /** Key constant @type Number */
   NUM_CENTER: 12,
   /** Key constant @type Number */
   ENTER: 13,
   /** Key constant @type Number */
   RETURN: 13,
   /** Key constant @type Number */
   SHIFT: 16,
   /** Key constant @type Number */
   CTRL: 17,
   CONTROL : 17, // legacy
   /** Key constant @type Number */
   ALT: 18,
   /** Key constant @type Number */
   PAUSE: 19,
   /** Key constant @type Number */
   CAPS_LOCK: 20,
   /** Key constant @type Number */
   ESC: 27,
   /** Key constant @type Number */
   SPACE: 32,
   /** Key constant @type Number */
   PAGE_UP: 33,
   PAGEUP : 33, // legacy
   /** Key constant @type Number */
   PAGE_DOWN: 34,
   PAGEDOWN : 34, // legacy
   /** Key constant @type Number */
   END: 35,
   /** Key constant @type Number */
   HOME: 36,
   /** Key constant @type Number */
   LEFT: 37,
   /** Key constant @type Number */
   UP: 38,
   /** Key constant @type Number */
   RIGHT: 39,
   /** Key constant @type Number */
   DOWN: 40,
   /** Key constant @type Number */
   PRINT_SCREEN: 44,
   /** Key constant @type Number */
   INSERT: 45,
   /** Key constant @type Number */
   DELETE: 46,
   /** Key constant @type Number */
   ZERO: 48,
   /** Key constant @type Number */
   ONE: 49,
   /** Key constant @type Number */
   TWO: 50,
   /** Key constant @type Number */
   THREE: 51,
   /** Key constant @type Number */
   FOUR: 52,
   /** Key constant @type Number */
   FIVE: 53,
   /** Key constant @type Number */
   SIX: 54,
   /** Key constant @type Number */
   SEVEN: 55,
   /** Key constant @type Number */
   EIGHT: 56,
   /** Key constant @type Number */
   NINE: 57,
   /** Key constant @type Number */
   A: 65,
   /** Key constant @type Number */
   B: 66,
   /** Key constant @type Number */
   C: 67,
   /** Key constant @type Number */
   D: 68,
   /** Key constant @type Number */
   E: 69,
   /** Key constant @type Number */
   F: 70,
   /** Key constant @type Number */
   G: 71,
   /** Key constant @type Number */
   H: 72,
   /** Key constant @type Number */
   I: 73,
   /** Key constant @type Number */
   J: 74,
   /** Key constant @type Number */
   K: 75,
   /** Key constant @type Number */
   L: 76,
   /** Key constant @type Number */
   M: 77,
   /** Key constant @type Number */
   N: 78,
   /** Key constant @type Number */
   O: 79,
   /** Key constant @type Number */
   P: 80,
   /** Key constant @type Number */
   Q: 81,
   /** Key constant @type Number */
   R: 82,
   /** Key constant @type Number */
   S: 83,
   /** Key constant @type Number */
   T: 84,
   /** Key constant @type Number */
   U: 85,
   /** Key constant @type Number */
   V: 86,
   /** Key constant @type Number */
   W: 87,
   /** Key constant @type Number */
   X: 88,
   /** Key constant @type Number */
   Y: 89,
   /** Key constant @type Number */
   Z: 90,
   /** Key constant @type Number */
   CONTEXT_MENU: 93,
   /** Key constant @type Number */
   NUM_ZERO: 96,
   /** Key constant @type Number */
   NUM_ONE: 97,
   /** Key constant @type Number */
   NUM_TWO: 98,
   /** Key constant @type Number */
   NUM_THREE: 99,
   /** Key constant @type Number */
   NUM_FOUR: 100,
   /** Key constant @type Number */
   NUM_FIVE: 101,
   /** Key constant @type Number */
   NUM_SIX: 102,
   /** Key constant @type Number */
   NUM_SEVEN: 103,
   /** Key constant @type Number */
   NUM_EIGHT: 104,
   /** Key constant @type Number */
   NUM_NINE: 105,
   /** Key constant @type Number */
   NUM_MULTIPLY: 106,
   /** Key constant @type Number */
   NUM_PLUS: 107,
   /** Key constant @type Number */
   NUM_MINUS: 109,
   /** Key constant @type Number */
   NUM_PERIOD: 110,
   /** Key constant @type Number */
   NUM_DIVISION: 111,
   /** Key constant @type Number */
   F1: 112,
   /** Key constant @type Number */
   F2: 113,
   /** Key constant @type Number */
   F3: 114,
   /** Key constant @type Number */
   F4: 115,
   /** Key constant @type Number */
   F5: 116,
   /** Key constant @type Number */
   F6: 117,
   /** Key constant @type Number */
   F7: 118,
   /** Key constant @type Number */
   F8: 119,
   /** Key constant @type Number */
   F9: 120,
   /** Key constant @type Number */
   F10: 121,
   /** Key constant @type Number */
   F11: 122,
   /** Key constant @type Number */
   F12: 123,

   /** @private */
   isNavKeyPress : function(){
       var me = this,
           k = this.normalizeKey(me.keyCode);
       return (k >= 33 && k <= 40) ||  // Page Up/Down, End, Home, Left, Up, Right, Down
       k == me.RETURN ||
       k == me.TAB ||
       k == me.ESC;
   },

   isSpecialKey : function(){
       var k = this.normalizeKey(this.keyCode);
       return (this.type == 'keypress' && this.ctrlKey) ||
       this.isNavKeyPress() ||
       (k == this.BACKSPACE) || // Backspace
       (k >= 16 && k <= 20) || // Shift, Ctrl, Alt, Pause, Caps Lock
       (k >= 44 && k <= 46);   // Print Screen, Insert, Delete
   },

   getPoint : function(){
       return new Ext.lib.Point(this.xy[0], this.xy[1]);
   },

   /**
    * Returns true if the control, meta, shift or alt key was pressed during this event.
    * @return {Boolean}
    */
   hasModifier : function(){
       return ((this.ctrlKey || this.altKey) || this.shiftKey);
   }
});/**
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
/**
 * @class Ext.Element
 */
Ext.Element.addMethods({
    /**
     * Gets the x,y coordinates specified by the anchor position on the element.
     * @param {String} anchor (optional) The specified anchor position (defaults to "c").  See {@link #alignTo}
     * for details on supported anchor positions.
     * @param {Boolean} local (optional) True to get the local (element top/left-relative) anchor position instead
     * of page coordinates
     * @param {Object} size (optional) An object containing the size to use for calculating anchor position
     * {width: (target width), height: (target height)} (defaults to the element's current size)
     * @return {Array} [x, y] An array containing the element's x and y coordinates
     */
    getAnchorXY : function(anchor, local, s){
        //Passing a different size is useful for pre-calculating anchors,
        //especially for anchored animations that change the el size.
		anchor = (anchor || "tl").toLowerCase();
        s = s || {};
        
        var me = this,        
        	vp = me.dom == document.body || me.dom == document,
        	w = s.width || vp ? Ext.lib.Dom.getViewWidth() : me.getWidth(),
        	h = s.height || vp ? Ext.lib.Dom.getViewHeight() : me.getHeight(),         	        	
        	xy,       	
        	r = Math.round,
        	o = me.getXY(),
        	scroll = me.getScroll(),
        	extraX = vp ? scroll.left : !local ? o[0] : 0,
        	extraY = vp ? scroll.top : !local ? o[1] : 0,
        	hash = {
	        	c  : [r(w * 0.5), r(h * 0.5)],
	        	t  : [r(w * 0.5), 0],
	        	l  : [0, r(h * 0.5)],
	        	r  : [w, r(h * 0.5)],
	        	b  : [r(w * 0.5), h],
	        	tl : [0, 0],	
	        	bl : [0, h],
	        	br : [w, h],
	        	tr : [w, 0]
        	};
        
        xy = hash[anchor];	
        return [xy[0] + extraX, xy[1] + extraY]; 
    },

    /**
     * Anchors an element to another element and realigns it when the window is resized.
     * @param {Mixed} element The element to align to.
     * @param {String} position The position to align to.
     * @param {Array} offsets (optional) Offset the positioning by [x, y]
     * @param {Boolean/Object} animate (optional) True for the default animation or a standard Element animation config object
     * @param {Boolean/Number} monitorScroll (optional) True to monitor body scroll and reposition. If this parameter
     * is a number, it is used as the buffer delay (defaults to 50ms).
     * @param {Function} callback The function to call after the animation finishes
     * @return {Ext.Element} this
     */
    anchorTo : function(el, alignment, offsets, animate, monitorScroll, callback){        
	    var me = this,
            dom = me.dom,
            scroll = !Ext.isEmpty(monitorScroll),
            action = function(){
                Ext.fly(dom).alignTo(el, alignment, offsets, animate);
                Ext.callback(callback, Ext.fly(dom));
            },
            anchor = this.getAnchor();
            
        // previous listener anchor, remove it
        this.removeAnchor();
        Ext.apply(anchor, {
            fn: action,
            scroll: scroll
        });

        Ext.EventManager.onWindowResize(action, null);
        
        if(scroll){
            Ext.EventManager.on(window, 'scroll', action, null,
                {buffer: !isNaN(monitorScroll) ? monitorScroll : 50});
        }
        action.call(me); // align immediately
        return me;
    },
    
    /**
     * Remove any anchor to this element. See {@link #anchorTo}.
     * @return {Ext.Element} this
     */
    removeAnchor : function(){
        var me = this,
            anchor = this.getAnchor();
            
        if(anchor && anchor.fn){
            Ext.EventManager.removeResizeListener(anchor.fn);
            if(anchor.scroll){
                Ext.EventManager.un(window, 'scroll', anchor.fn);
            }
            delete anchor.fn;
        }
        return me;
    },
    
    // private
    getAnchor : function(){
        var data = Ext.Element.data,
            dom = this.dom;
            if (!dom) {
                return;
            }
            var anchor = data(dom, '_anchor');
            
        if(!anchor){
            anchor = data(dom, '_anchor', {});
        }
        return anchor;
    },

    /**
     * Gets the x,y coordinates to align this element with another element. See {@link #alignTo} for more info on the
     * supported position values.
     * @param {Mixed} element The element to align to.
     * @param {String} position (optional, defaults to "tl-bl?") The position to align to.
     * @param {Array} offsets (optional) Offset the positioning by [x, y]
     * @return {Array} [x, y]
     */
    getAlignToXY : function(el, p, o){	    
        el = Ext.get(el);
        
        if(!el || !el.dom){
            throw "Element.alignToXY with an element that doesn't exist";
        }
        
        o = o || [0,0];
        p = (!p || p == "?" ? "tl-bl?" : (!(/-/).test(p) && p !== "" ? "tl-" + p : p || "tl-bl")).toLowerCase();       
                
        var me = this,
        	d = me.dom,
        	a1,
        	a2,
        	x,
        	y,
        	//constrain the aligned el to viewport if necessary
        	w,
        	h,
        	r,
        	dw = Ext.lib.Dom.getViewWidth() -10, // 10px of margin for ie
        	dh = Ext.lib.Dom.getViewHeight()-10, // 10px of margin for ie
        	p1y,
        	p1x,        	
        	p2y,
        	p2x,
        	swapY,
        	swapX,
        	doc = document,
        	docElement = doc.documentElement,
        	docBody = doc.body,
        	scrollX = (docElement.scrollLeft || docBody.scrollLeft || 0)+5,
        	scrollY = (docElement.scrollTop || docBody.scrollTop || 0)+5,
        	c = false, //constrain to viewport
        	p1 = "", 
        	p2 = "",
        	m = p.match(/^([a-z]+)-([a-z]+)(\?)?$/);
        
        if(!m){
           throw "Element.alignTo with an invalid alignment " + p;
        }
        
        p1 = m[1]; 
        p2 = m[2]; 
        c = !!m[3];

        //Subtract the aligned el's internal xy from the target's offset xy
        //plus custom offset to get the aligned el's new offset xy
        a1 = me.getAnchorXY(p1, true);
        a2 = el.getAnchorXY(p2, false);

        x = a2[0] - a1[0] + o[0];
        y = a2[1] - a1[1] + o[1];

        if(c){    
	       w = me.getWidth();
           h = me.getHeight();
           r = el.getRegion();       
           //If we are at a viewport boundary and the aligned el is anchored on a target border that is
           //perpendicular to the vp border, allow the aligned el to slide on that border,
           //otherwise swap the aligned el to the opposite border of the target.
           p1y = p1.charAt(0);
           p1x = p1.charAt(p1.length-1);
           p2y = p2.charAt(0);
           p2x = p2.charAt(p2.length-1);
           swapY = ((p1y=="t" && p2y=="b") || (p1y=="b" && p2y=="t"));
           swapX = ((p1x=="r" && p2x=="l") || (p1x=="l" && p2x=="r"));          
           

           if (x + w > dw + scrollX) {
                x = swapX ? r.left-w : dw+scrollX-w;
           }
           if (x < scrollX) {
               x = swapX ? r.right : scrollX;
           }
           if (y + h > dh + scrollY) {
                y = swapY ? r.top-h : dh+scrollY-h;
            }
           if (y < scrollY){
               y = swapY ? r.bottom : scrollY;
           }
        }
        return [x,y];
    },

    /**
     * Aligns this element with another element relative to the specified anchor points. If the other element is the
     * document it aligns it to the viewport.
     * The position parameter is optional, and can be specified in any one of the following formats:
     * <ul>
     *   <li><b>Blank</b>: Defaults to aligning the element's top-left corner to the target's bottom-left corner ("tl-bl").</li>
     *   <li><b>One anchor (deprecated)</b>: The passed anchor position is used as the target element's anchor point.
     *       The element being aligned will position its top-left corner (tl) to that point.  <i>This method has been
     *       deprecated in favor of the newer two anchor syntax below</i>.</li>
     *   <li><b>Two anchors</b>: If two values from the table below are passed separated by a dash, the first value is used as the
     *       element's anchor point, and the second value is used as the target's anchor point.</li>
     * </ul>
     * In addition to the anchor points, the position parameter also supports the "?" character.  If "?" is passed at the end of
     * the position string, the element will attempt to align as specified, but the position will be adjusted to constrain to
     * the viewport if necessary.  Note that the element being aligned might be swapped to align to a different position than
     * that specified in order to enforce the viewport constraints.
     * Following are all of the supported anchor positions:
<pre>
Value  Description
-----  -----------------------------
tl     The top left corner (default)
t      The center of the top edge
tr     The top right corner
l      The center of the left edge
c      In the center of the element
r      The center of the right edge
bl     The bottom left corner
b      The center of the bottom edge
br     The bottom right corner
</pre>
Example Usage:
<pre><code>
// align el to other-el using the default positioning ("tl-bl", non-constrained)
el.alignTo("other-el");

// align the top left corner of el with the top right corner of other-el (constrained to viewport)
el.alignTo("other-el", "tr?");

// align the bottom right corner of el with the center left edge of other-el
el.alignTo("other-el", "br-l?");

// align the center of el with the bottom left corner of other-el and
// adjust the x position by -6 pixels (and the y position by 0)
el.alignTo("other-el", "c-bl", [-6, 0]);
</code></pre>
     * @param {Mixed} element The element to align to.
     * @param {String} position (optional, defaults to "tl-bl?") The position to align to.
     * @param {Array} offsets (optional) Offset the positioning by [x, y]
     * @param {Boolean/Object} animate (optional) true for the default animation or a standard Element animation config object
     * @return {Ext.Element} this
     */
    alignTo : function(element, position, offsets, animate){
	    var me = this;
        return me.setXY(me.getAlignToXY(element, position, offsets),
          		        me.preanim && !!animate ? me.preanim(arguments, 3) : false);
    },
    
    // private ==>  used outside of core
    adjustForConstraints : function(xy, parent, offsets){
        return this.getConstrainToXY(parent || document, false, offsets, xy) ||  xy;
    },

    // private ==>  used outside of core
    getConstrainToXY : function(el, local, offsets, proposedXY){   
	    var os = {top:0, left:0, bottom:0, right: 0};

        return function(el, local, offsets, proposedXY){
            el = Ext.get(el);
            offsets = offsets ? Ext.applyIf(offsets, os) : os;

            var vw, vh, vx = 0, vy = 0;
            if(el.dom == document.body || el.dom == document){
                vw =Ext.lib.Dom.getViewWidth();
                vh = Ext.lib.Dom.getViewHeight();
            }else{
                vw = el.dom.clientWidth;
                vh = el.dom.clientHeight;
                if(!local){
                    var vxy = el.getXY();
                    vx = vxy[0];
                    vy = vxy[1];
                }
            }

            var s = el.getScroll();

            vx += offsets.left + s.left;
            vy += offsets.top + s.top;

            vw -= offsets.right;
            vh -= offsets.bottom;

            var vr = vx + vw,
                vb = vy + vh,
                xy = proposedXY || (!local ? this.getXY() : [this.getLeft(true), this.getTop(true)]),
                x = xy[0], y = xy[1],
                offset = this.getConstrainOffset(),
                w = this.dom.offsetWidth + offset, 
                h = this.dom.offsetHeight + offset;

            // only move it if it needs it
            var moved = false;

            // first validate right/bottom
            if((x + w) > vr){
                x = vr - w;
                moved = true;
            }
            if((y + h) > vb){
                y = vb - h;
                moved = true;
            }
            // then make sure top/left isn't negative
            if(x < vx){
                x = vx;
                moved = true;
            }
            if(y < vy){
                y = vy;
                moved = true;
            }
            return moved ? [x, y] : false;
        };
    }(),
	    
	    
	        
//         el = Ext.get(el);
//         offsets = Ext.applyIf(offsets || {}, {top : 0, left : 0, bottom : 0, right : 0});

//         var	me = this,
//         	doc = document,
//         	s = el.getScroll(),
//         	vxy = el.getXY(),
//         	vx = offsets.left + s.left, 
//         	vy = offsets.top + s.top,            	
//         	vw = -offsets.right, 
//         	vh = -offsets.bottom, 
//         	vr,
//         	vb,
//         	xy = proposedXY || (!local ? me.getXY() : [me.getLeft(true), me.getTop(true)]),
//         	x = xy[0],
//         	y = xy[1],
//         	w = me.dom.offsetWidth, h = me.dom.offsetHeight,
//         	moved = false; // only move it if it needs it
//       
//         	
//         if(el.dom == doc.body || el.dom == doc){
//             vw += Ext.lib.Dom.getViewWidth();
//             vh += Ext.lib.Dom.getViewHeight();
//         }else{
//             vw += el.dom.clientWidth;
//             vh += el.dom.clientHeight;
//             if(!local){                    
//                 vx += vxy[0];
//                 vy += vxy[1];
//             }
//         }

//         // first validate right/bottom
//         if(x + w > vx + vw){
//             x = vx + vw - w;
//             moved = true;
//         }
//         if(y + h > vy + vh){
//             y = vy + vh - h;
//             moved = true;
//         }
//         // then make sure top/left isn't negative
//         if(x < vx){
//             x = vx;
//             moved = true;
//         }
//         if(y < vy){
//             y = vy;
//             moved = true;
//         }
//         return moved ? [x, y] : false;
//    },

    // private, used internally
    getConstrainOffset : function(){
        return 0;
    },
    
    /**
    * Calculates the x, y to center this element on the screen
    * @return {Array} The x, y values [x, y]
    */
    getCenterXY : function(){
        return this.getAlignToXY(document, 'c-c');
    },

    /**
    * Centers the Element in either the viewport, or another Element.
    * @param {Mixed} centerIn (optional) The element in which to center the element.
    */
    center : function(centerIn){
        return this.alignTo(centerIn || document, 'c-c');        
    }    
});
/**
 * @class Ext.Element
 */
Ext.Element.addMethods({
    /**
     * Creates a {@link Ext.CompositeElement} for child nodes based on the passed CSS selector (the selector should not contain an id).
     * @param {String} selector The CSS selector
     * @param {Boolean} unique (optional) True to create a unique Ext.Element for each child (defaults to false, which creates a single shared flyweight object)
     * @return {CompositeElement/CompositeElementLite} The composite element
     */
    select : function(selector, unique){
        return Ext.Element.select(selector, unique, this.dom);
    }
});/**
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
}());/**
 * @class Ext.Element
 */

// special markup used throughout Ext when box wrapping elements
Ext.Element.boxMarkup = '<div class="{0}-tl"><div class="{0}-tr"><div class="{0}-tc"></div></div></div><div class="{0}-ml"><div class="{0}-mr"><div class="{0}-mc"></div></div></div><div class="{0}-bl"><div class="{0}-br"><div class="{0}-bc"></div></div></div>';

Ext.Element.addMethods(function(){
    var INTERNAL = "_internal",
        pxMatch = /(\d+\.?\d+)px/;
    return {
        /**
         * More flexible version of {@link #setStyle} for setting style properties.
         * @param {String/Object/Function} styles A style specification string, e.g. "width:100px", or object in the form {width:"100px"}, or
         * a function which returns such a specification.
         * @return {Ext.Element} this
         */
        applyStyles : function(style){
            Ext.DomHelper.applyStyles(this.dom, style);
            return this;
        },

        /**
         * Returns an object with properties matching the styles requested.
         * For example, el.getStyles('color', 'font-size', 'width') might return
         * {'color': '#FFFFFF', 'font-size': '13px', 'width': '100px'}.
         * @param {String} style1 A style name
         * @param {String} style2 A style name
         * @param {String} etc.
         * @return {Object} The style object
         */
        getStyles : function(){
            var ret = {};
            Ext.each(arguments, function(v) {
               ret[v] = this.getStyle(v);
            },
            this);
            return ret;
        },

        // private  ==> used by ext full
        setOverflow : function(v){
            var dom = this.dom;
            if(v=='auto' && Ext.isMac && Ext.isGecko2){ // work around stupid FF 2.0/Mac scroll bar bug
                dom.style.overflow = 'hidden';
                (function(){dom.style.overflow = 'auto';}).defer(1);
            }else{
                dom.style.overflow = v;
            }
        },

       /**
        * <p>Wraps the specified element with a special 9 element markup/CSS block that renders by default as
        * a gray container with a gradient background, rounded corners and a 4-way shadow.</p>
        * <p>This special markup is used throughout Ext when box wrapping elements ({@link Ext.Button},
        * {@link Ext.Panel} when <tt>{@link Ext.Panel#frame frame=true}</tt>, {@link Ext.Window}).  The markup
        * is of this form:</p>
        * <pre><code>
    Ext.Element.boxMarkup =
    &#39;&lt;div class="{0}-tl">&lt;div class="{0}-tr">&lt;div class="{0}-tc">&lt;/div>&lt;/div>&lt;/div>
     &lt;div class="{0}-ml">&lt;div class="{0}-mr">&lt;div class="{0}-mc">&lt;/div>&lt;/div>&lt;/div>
     &lt;div class="{0}-bl">&lt;div class="{0}-br">&lt;div class="{0}-bc">&lt;/div>&lt;/div>&lt;/div>&#39;;
        * </code></pre>
        * <p>Example usage:</p>
        * <pre><code>
    // Basic box wrap
    Ext.get("foo").boxWrap();

    // You can also add a custom class and use CSS inheritance rules to customize the box look.
    // 'x-box-blue' is a built-in alternative -- look at the related CSS definitions as an example
    // for how to create a custom box wrap style.
    Ext.get("foo").boxWrap().addClass("x-box-blue");
        * </code></pre>
        * @param {String} class (optional) A base CSS class to apply to the containing wrapper element
        * (defaults to <tt>'x-box'</tt>). Note that there are a number of CSS rules that are dependent on
        * this name to make the overall effect work, so if you supply an alternate base class, make sure you
        * also supply all of the necessary rules.
        * @return {Ext.Element} The outermost wrapping element of the created box structure.
        */
        boxWrap : function(cls){
            cls = cls || 'x-box';
            var el = Ext.get(this.insertHtml("beforeBegin", "<div class='" + cls + "'>" + String.format(Ext.Element.boxMarkup, cls) + "</div>"));        //String.format('<div class="{0}">'+Ext.Element.boxMarkup+'</div>', cls)));
            Ext.DomQuery.selectNode('.' + cls + '-mc', el.dom).appendChild(this.dom);
            return el;
        },

        /**
         * Set the size of this Element. If animation is true, both width and height will be animated concurrently.
         * @param {Mixed} width The new width. This may be one of:<div class="mdetail-params"><ul>
         * <li>A Number specifying the new width in this Element's {@link #defaultUnit}s (by default, pixels).</li>
         * <li>A String used to set the CSS width style. Animation may <b>not</b> be used.
         * <li>A size object in the format <code>{width: widthValue, height: heightValue}</code>.</li>
         * </ul></div>
         * @param {Mixed} height The new height. This may be one of:<div class="mdetail-params"><ul>
         * <li>A Number specifying the new height in this Element's {@link #defaultUnit}s (by default, pixels).</li>
         * <li>A String used to set the CSS height style. Animation may <b>not</b> be used.</li>
         * </ul></div>
         * @param {Boolean/Object} animate (optional) true for the default animation or a standard Element animation config object
         * @return {Ext.Element} this
         */
        setSize : function(width, height, animate){
            var me = this;
            if(typeof width == 'object'){ // in case of object from getSize()
                height = width.height;
                width = width.width;
            }
            width = me.adjustWidth(width);
            height = me.adjustHeight(height);
            if(!animate || !me.anim){
                me.dom.style.width = me.addUnits(width);
                me.dom.style.height = me.addUnits(height);
            }else{
                me.anim({width: {to: width}, height: {to: height}}, me.preanim(arguments, 2));
            }
            return me;
        },

        /**
         * Returns either the offsetHeight or the height of this element based on CSS height adjusted by padding or borders
         * when needed to simulate offsetHeight when offsets aren't available. This may not work on display:none elements
         * if a height has not been set using CSS.
         * @return {Number}
         */
        getComputedHeight : function(){
            var me = this,
                h = Math.max(me.dom.offsetHeight, me.dom.clientHeight);
            if(!h){
                h = parseFloat(me.getStyle('height')) || 0;
                if(!me.isBorderBox()){
                    h += me.getFrameWidth('tb');
                }
            }
            return h;
        },

        /**
         * Returns either the offsetWidth or the width of this element based on CSS width adjusted by padding or borders
         * when needed to simulate offsetWidth when offsets aren't available. This may not work on display:none elements
         * if a width has not been set using CSS.
         * @return {Number}
         */
        getComputedWidth : function(){
            var w = Math.max(this.dom.offsetWidth, this.dom.clientWidth);
            if(!w){
                w = parseFloat(this.getStyle('width')) || 0;
                if(!this.isBorderBox()){
                    w += this.getFrameWidth('lr');
                }
            }
            return w;
        },

        /**
         * Returns the sum width of the padding and borders for the passed "sides". See getBorderWidth()
         for more information about the sides.
         * @param {String} sides
         * @return {Number}
         */
        getFrameWidth : function(sides, onlyContentBox){
            return onlyContentBox && this.isBorderBox() ? 0 : (this.getPadding(sides) + this.getBorderWidth(sides));
        },

        /**
         * Sets up event handlers to add and remove a css class when the mouse is over this element
         * @param {String} className
         * @return {Ext.Element} this
         */
        addClassOnOver : function(className){
            this.hover(
                function(){
                    Ext.fly(this, INTERNAL).addClass(className);
                },
                function(){
                    Ext.fly(this, INTERNAL).removeClass(className);
                }
            );
            return this;
        },

        /**
         * Sets up event handlers to add and remove a css class when this element has the focus
         * @param {String} className
         * @return {Ext.Element} this
         */
        addClassOnFocus : function(className){
            this.on("focus", function(){
                Ext.fly(this, INTERNAL).addClass(className);
            }, this.dom);
            this.on("blur", function(){
                Ext.fly(this, INTERNAL).removeClass(className);
            }, this.dom);
            return this;
        },

        /**
         * Sets up event handlers to add and remove a css class when the mouse is down and then up on this element (a click effect)
         * @param {String} className
         * @return {Ext.Element} this
         */
        addClassOnClick : function(className){
            var dom = this.dom;
            this.on("mousedown", function(){
                Ext.fly(dom, INTERNAL).addClass(className);
                var d = Ext.getDoc(),
                    fn = function(){
                        Ext.fly(dom, INTERNAL).removeClass(className);
                        d.removeListener("mouseup", fn);
                    };
                d.on("mouseup", fn);
            });
            return this;
        },

        /**
         * <p>Returns the dimensions of the element available to lay content out in.<p>
         * <p>If the element (or any ancestor element) has CSS style <code>display : none</code>, the dimensions will be zero.</p>
         * example:<pre><code>
        var vpSize = Ext.getBody().getViewSize();

        // all Windows created afterwards will have a default value of 90% height and 95% width
        Ext.Window.override({
            width: vpSize.width * 0.9,
            height: vpSize.height * 0.95
        });
        // To handle window resizing you would have to hook onto onWindowResize.
        * </code></pre>
        *
        * getViewSize utilizes clientHeight/clientWidth which excludes sizing of scrollbars.
        * To obtain the size including scrollbars, use getStyleSize
        *
        * Sizing of the document body is handled at the adapter level which handles special cases for IE and strict modes, etc.
        */

        getViewSize : function(){
            var doc = document,
                d = this.dom,
                isDoc = (d == doc || d == doc.body);

            // If the body, use Ext.lib.Dom
            if (isDoc) {
                var extdom = Ext.lib.Dom;
                return {
                    width : extdom.getViewWidth(),
                    height : extdom.getViewHeight()
                };

            // Else use clientHeight/clientWidth
            } else {
                return {
                    width : d.clientWidth,
                    height : d.clientHeight
                };
            }
        },

        /**
        * <p>Returns the dimensions of the element available to lay content out in.<p>
        *
        * getStyleSize utilizes prefers style sizing if present, otherwise it chooses the larger of offsetHeight/clientHeight and offsetWidth/clientWidth.
        * To obtain the size excluding scrollbars, use getViewSize
        *
        * Sizing of the document body is handled at the adapter level which handles special cases for IE and strict modes, etc.
        */

        getStyleSize : function(){
            var me = this,
                w, h,
                doc = document,
                d = this.dom,
                isDoc = (d == doc || d == doc.body),
                s = d.style;

            // If the body, use Ext.lib.Dom
            if (isDoc) {
                var extdom = Ext.lib.Dom;
                return {
                    width : extdom.getViewWidth(),
                    height : extdom.getViewHeight()
                };
            }
            // Use Styles if they are set
            if(s.width && s.width != 'auto'){
                w = parseFloat(s.width);
                if(me.isBorderBox()){
                   w -= me.getFrameWidth('lr');
                }
            }
            // Use Styles if they are set
            if(s.height && s.height != 'auto'){
                h = parseFloat(s.height);
                if(me.isBorderBox()){
                   h -= me.getFrameWidth('tb');
                }
            }
            // Use getWidth/getHeight if style not set.
            return {width: w || me.getWidth(true), height: h || me.getHeight(true)};
        },

        /**
         * Returns the size of the element.
         * @param {Boolean} contentSize (optional) true to get the width/size minus borders and padding
         * @return {Object} An object containing the element's size {width: (element width), height: (element height)}
         */
        getSize : function(contentSize){
            return {width: this.getWidth(contentSize), height: this.getHeight(contentSize)};
        },

        /**
         * Forces the browser to repaint this element
         * @return {Ext.Element} this
         */
        repaint : function(){
            var dom = this.dom;
            this.addClass("x-repaint");
            setTimeout(function(){
                Ext.fly(dom).removeClass("x-repaint");
            }, 1);
            return this;
        },

        /**
         * Disables text selection for this element (normalized across browsers)
         * @return {Ext.Element} this
         */
        unselectable : function(){
            this.dom.unselectable = "on";
            return this.swallowEvent("selectstart", true).
                        applyStyles("-moz-user-select:none;-khtml-user-select:none;").
                        addClass("x-unselectable");
        },

        /**
         * Returns an object with properties top, left, right and bottom representing the margins of this element unless sides is passed,
         * then it returns the calculated width of the sides (see getPadding)
         * @param {String} sides (optional) Any combination of l, r, t, b to get the sum of those sides
         * @return {Object/Number}
         */
        getMargins : function(side){
            var me = this,
                key,
                hash = {t:"top", l:"left", r:"right", b: "bottom"},
                o = {};

            if (!side) {
                for (key in me.margins){
                    o[hash[key]] = parseFloat(me.getStyle(me.margins[key])) || 0;
                }
                return o;
            } else {
                return me.addStyles.call(me, side, me.margins);
            }
        }
    };
}());
/**
 * @class Ext.Element
 */
Ext.Element.addMethods({
    /**
     * Sets the element's box. Use getBox() on another element to get a box obj. If animate is true then width, height, x and y will be animated concurrently.
     * @param {Object} box The box to fill {x, y, width, height}
     * @param {Boolean} adjust (optional) Whether to adjust for box-model issues automatically
     * @param {Boolean/Object} animate (optional) true for the default animation or a standard Element animation config object
     * @return {Ext.Element} this
     */
    setBox : function(box, adjust, animate){
        var me = this,
        	w = box.width, 
        	h = box.height;
        if((adjust && !me.autoBoxAdjust) && !me.isBorderBox()){
           w -= (me.getBorderWidth("lr") + me.getPadding("lr"));
           h -= (me.getBorderWidth("tb") + me.getPadding("tb"));
        }
        me.setBounds(box.x, box.y, w, h, me.animTest.call(me, arguments, animate, 2));
        return me;
    },

    /**
     * Return an object defining the area of this Element which can be passed to {@link #setBox} to
     * set another Element's size/location to match this element.
     * @param {Boolean} contentBox (optional) If true a box for the content of the element is returned.
     * @param {Boolean} local (optional) If true the element's left and top are returned instead of page x/y.
     * @return {Object} box An object in the format<pre><code>
{
    x: &lt;Element's X position>,
    y: &lt;Element's Y position>,
    width: &lt;Element's width>,
    height: &lt;Element's height>,
    bottom: &lt;Element's lower bound>,
    right: &lt;Element's rightmost bound>
}
</code></pre>
     * The returned object may also be addressed as an Array where index 0 contains the X position
     * and index 1 contains the Y position. So the result may also be used for {@link #setXY}
     */
	getBox : function(contentBox, local) {	    
	    var me = this,
        	xy,
        	left,
        	top,
        	getBorderWidth = me.getBorderWidth,
        	getPadding = me.getPadding, 
        	l,
        	r,
        	t,
        	b;
        if(!local){
            xy = me.getXY();
        }else{
            left = parseInt(me.getStyle("left"), 10) || 0;
            top = parseInt(me.getStyle("top"), 10) || 0;
            xy = [left, top];
        }
        var el = me.dom, w = el.offsetWidth, h = el.offsetHeight, bx;
        if(!contentBox){
            bx = {x: xy[0], y: xy[1], 0: xy[0], 1: xy[1], width: w, height: h};
        }else{
            l = getBorderWidth.call(me, "l") + getPadding.call(me, "l");
            r = getBorderWidth.call(me, "r") + getPadding.call(me, "r");
            t = getBorderWidth.call(me, "t") + getPadding.call(me, "t");
            b = getBorderWidth.call(me, "b") + getPadding.call(me, "b");
            bx = {x: xy[0]+l, y: xy[1]+t, 0: xy[0]+l, 1: xy[1]+t, width: w-(l+r), height: h-(t+b)};
        }
        bx.right = bx.x + bx.width;
        bx.bottom = bx.y + bx.height;
        return bx;
	},
	
    /**
     * Move this element relative to its current position.
     * @param {String} direction Possible values are: "l" (or "left"), "r" (or "right"), "t" (or "top", or "up"), "b" (or "bottom", or "down").
     * @param {Number} distance How far to move the element in pixels
     * @param {Boolean/Object} animate (optional) true for the default animation or a standard Element animation config object
     * @return {Ext.Element} this
     */
     move : function(direction, distance, animate){
        var me = this,        	
        	xy = me.getXY(),
        	x = xy[0],
        	y = xy[1],        	
        	left = [x - distance, y],
        	right = [x + distance, y],
        	top = [x, y - distance],
        	bottom = [x, y + distance],
	       	hash = {
	        	l :	left,
	        	left : left,
	        	r : right,
	        	right : right,
	        	t : top,
	        	top : top,
	        	up : top,
	        	b : bottom, 
	        	bottom : bottom,
	        	down : bottom	        		
	        };
        
 	    direction = direction.toLowerCase();    
 	    me.moveTo(hash[direction][0], hash[direction][1], me.animTest.call(me, arguments, animate, 2));
    },
    
    /**
     * Quick set left and top adding default units
     * @param {String} left The left CSS property value
     * @param {String} top The top CSS property value
     * @return {Ext.Element} this
     */
     setLeftTop : function(left, top){
	    var me = this,
	    	style = me.dom.style;
        style.left = me.addUnits(left);
        style.top = me.addUnits(top);
        return me;
    },
    
    /**
     * Returns the region of the given element.
     * The element must be part of the DOM tree to have a region (display:none or elements not appended return false).
     * @return {Region} A Ext.lib.Region containing "top, left, bottom, right" member data.
     */
    getRegion : function(){
        return Ext.lib.Dom.getRegion(this.dom);
    },
    
    /**
     * Sets the element's position and size in one shot. If animation is true then width, height, x and y will be animated concurrently.
     * @param {Number} x X value for new position (coordinates are page-based)
     * @param {Number} y Y value for new position (coordinates are page-based)
     * @param {Mixed} width The new width. This may be one of:<div class="mdetail-params"><ul>
     * <li>A Number specifying the new width in this Element's {@link #defaultUnit}s (by default, pixels)</li>
     * <li>A String used to set the CSS width style. Animation may <b>not</b> be used.
     * </ul></div>
     * @param {Mixed} height The new height. This may be one of:<div class="mdetail-params"><ul>
     * <li>A Number specifying the new height in this Element's {@link #defaultUnit}s (by default, pixels)</li>
     * <li>A String used to set the CSS height style. Animation may <b>not</b> be used.</li>
     * </ul></div>
     * @param {Boolean/Object} animate (optional) true for the default animation or a standard Element animation config object
     * @return {Ext.Element} this
     */
    setBounds : function(x, y, width, height, animate){
	    var me = this;
        if (!animate || !me.anim) {
            me.setSize(width, height);
            me.setLocation(x, y);
        } else {
            me.anim({points: {to: [x, y]}, 
            		 width: {to: me.adjustWidth(width)}, 
            		 height: {to: me.adjustHeight(height)}},
                     me.preanim(arguments, 4), 
                     'motion');
        }
        return me;
    },

    /**
     * Sets the element's position and size the specified region. If animation is true then width, height, x and y will be animated concurrently.
     * @param {Ext.lib.Region} region The region to fill
     * @param {Boolean/Object} animate (optional) true for the default animation or a standard Element animation config object
     * @return {Ext.Element} this
     */
    setRegion : function(region, animate) {
        return this.setBounds(region.left, region.top, region.right-region.left, region.bottom-region.top, this.animTest.call(this, arguments, animate, 1));
    }
});/**
 * @class Ext.Element
 */
Ext.Element.addMethods({
    /**
     * Scrolls this element the specified scroll point. It does NOT do bounds checking so if you scroll to a weird value it will try to do it. For auto bounds checking, use scroll().
     * @param {String} side Either "left" for scrollLeft values or "top" for scrollTop values.
     * @param {Number} value The new scroll value
     * @param {Boolean/Object} animate (optional) true for the default animation or a standard Element animation config object
     * @return {Element} this
     */
    scrollTo : function(side, value, animate) {
        //check if we're scrolling top or left
        var top = /top/i.test(side),
            me = this,
            dom = me.dom,
            prop;
        if (!animate || !me.anim) {
            // just setting the value, so grab the direction
            prop = 'scroll' + (top ? 'Top' : 'Left');
            dom[prop] = value;
        }
        else {
            // if scrolling top, we need to grab scrollLeft, if left, scrollTop
            prop = 'scroll' + (top ? 'Left' : 'Top');
            me.anim({scroll: {to: top ? [dom[prop], value] : [value, dom[prop]]}}, me.preanim(arguments, 2), 'scroll');
        }
        return me;
    },
    
    /**
     * Scrolls this element into view within the passed container.
     * @param {Mixed} container (optional) The container element to scroll (defaults to document.body).  Should be a
     * string (id), dom node, or Ext.Element.
     * @param {Boolean} hscroll (optional) False to disable horizontal scroll (defaults to true)
     * @return {Ext.Element} this
     */
    scrollIntoView : function(container, hscroll) {
        var c = Ext.getDom(container) || Ext.getBody().dom,
            el = this.dom,
            o = this.getOffsetsTo(c),
            l = o[0] + c.scrollLeft,
            t = o[1] + c.scrollTop,
            b = t + el.offsetHeight,
            r = l + el.offsetWidth,
            ch = c.clientHeight,
            ct = parseInt(c.scrollTop, 10),
            cl = parseInt(c.scrollLeft, 10),
            cb = ct + ch,
            cr = cl + c.clientWidth;

        if (el.offsetHeight > ch || t < ct) {
            c.scrollTop = t;
        }
        else if (b > cb) {
            c.scrollTop = b-ch;
        }
        // corrects IE, other browsers will ignore
        c.scrollTop = c.scrollTop;

        if (hscroll !== false) {
            if (el.offsetWidth > c.clientWidth || l < cl) {
                c.scrollLeft = l;
            }
            else if (r > cr) {
                c.scrollLeft = r - c.clientWidth;
            }
            c.scrollLeft = c.scrollLeft;
        }
        return this;
    },

    // private
    scrollChildIntoView : function(child, hscroll) {
        Ext.fly(child, '_scrollChildIntoView').scrollIntoView(this, hscroll);
    },
    
    /**
     * Scrolls this element the specified direction. Does bounds checking to make sure the scroll is
     * within this element's scrollable range.
     * @param {String} direction Possible values are: "l" (or "left"), "r" (or "right"), "t" (or "top", or "up"), "b" (or "bottom", or "down").
     * @param {Number} distance How far to scroll the element in pixels
     * @param {Boolean/Object} animate (optional) true for the default animation or a standard Element animation config object
     * @return {Boolean} Returns true if a scroll was triggered or false if the element
     * was scrolled as far as it could go.
     */
     scroll : function(direction, distance, animate) {
        if (!this.isScrollable()) {
            return false;
        }
        var el = this.dom,
            l = el.scrollLeft, t = el.scrollTop,
            w = el.scrollWidth, h = el.scrollHeight,
            cw = el.clientWidth, ch = el.clientHeight,
            scrolled = false, v,
            hash = {
                l: Math.min(l + distance, w-cw),
                r: v = Math.max(l - distance, 0),
                t: Math.max(t - distance, 0),
                b: Math.min(t + distance, h-ch)
            };
            hash.d = hash.b;
            hash.u = hash.t;
        
        direction = direction.substr(0, 1);
        if ((v = hash[direction]) > -1) {
            scrolled = true;
            this.scrollTo(direction == 'l' || direction == 'r' ? 'left' : 'top', v, this.preanim(arguments, 2));
        }
        return scrolled;
    }
});/**
 * @class Ext.Element
 */
Ext.Element.addMethods(
    function() {
        var VISIBILITY      = "visibility",
            DISPLAY         = "display",
            HIDDEN          = "hidden",
            NONE            = "none",
            XMASKED         = "x-masked",
            XMASKEDRELATIVE = "x-masked-relative",
            data            = Ext.Element.data;

        return {
            /**
             * Checks whether the element is currently visible using both visibility and display properties.
             * @param {Boolean} deep (optional) True to walk the dom and see if parent elements are hidden (defaults to false)
             * @return {Boolean} True if the element is currently visible, else false
             */
            isVisible : function(deep) {
                var vis = !this.isStyle(VISIBILITY, HIDDEN) && !this.isStyle(DISPLAY, NONE),
                    p   = this.dom.parentNode;
                
                if (deep !== true || !vis) {
                    return vis;
                }
                
                while (p && !(/^body/i.test(p.tagName))) {
                    if (!Ext.fly(p, '_isVisible').isVisible()) {
                        return false;
                    }
                    p = p.parentNode;
                }
                return true;
            },

            /**
             * Returns true if display is not "none"
             * @return {Boolean}
             */
            isDisplayed : function() {
                return !this.isStyle(DISPLAY, NONE);
            },

            /**
             * Convenience method for setVisibilityMode(Element.DISPLAY)
             * @param {String} display (optional) What to set display to when visible
             * @return {Ext.Element} this
             */
            enableDisplayMode : function(display) {
                this.setVisibilityMode(Ext.Element.DISPLAY);
                
                if (!Ext.isEmpty(display)) {
                    data(this.dom, 'originalDisplay', display);
                }
                
                return this;
            },

            /**
             * Puts a mask over this element to disable user interaction. Requires core.css.
             * This method can only be applied to elements which accept child nodes.
             * @param {String} msg (optional) A message to display in the mask
             * @param {String} msgCls (optional) A css class to apply to the msg element
             * @return {Element} The mask element
             */
            mask : function(msg, msgCls) {
                var me  = this,
                    dom = me.dom,
                    dh  = Ext.DomHelper,
                    EXTELMASKMSG = "ext-el-mask-msg",
                    el,
                    mask;

                if (!(/^body/i.test(dom.tagName) && me.getStyle('position') == 'static')) {
                    me.addClass(XMASKEDRELATIVE);
                }
                if (el = data(dom, 'maskMsg')) {
                    el.remove();
                }
                if (el = data(dom, 'mask')) {
                    el.remove();
                }

                mask = dh.append(dom, {cls : "ext-el-mask"}, true);
                data(dom, 'mask', mask);

                me.addClass(XMASKED);
                mask.setDisplayed(true);
                
                if (typeof msg == 'string') {
                    var mm = dh.append(dom, {cls : EXTELMASKMSG, cn:{tag:'div'}}, true);
                    data(dom, 'maskMsg', mm);
                    mm.dom.className = msgCls ? EXTELMASKMSG + " " + msgCls : EXTELMASKMSG;
                    mm.dom.firstChild.innerHTML = msg;
                    mm.setDisplayed(true);
                    mm.center(me);
                }
                
                // ie will not expand full height automatically
                if (Ext.isIE && !(Ext.isIE7 && Ext.isStrict) && me.getStyle('height') == 'auto') {
                    mask.setSize(undefined, me.getHeight());
                }
                
                return mask;
            },

            /**
             * Removes a previously applied mask.
             */
            unmask : function() {
                var me      = this,
                    dom     = me.dom,
                    mask    = data(dom, 'mask'),
                    maskMsg = data(dom, 'maskMsg');

                if (mask) {
                    if (maskMsg) {
                        maskMsg.remove();
                        data(dom, 'maskMsg', undefined);
                    }
                    
                    mask.remove();
                    data(dom, 'mask', undefined);
                    me.removeClass([XMASKED, XMASKEDRELATIVE]);
                }
            },

            /**
             * Returns true if this element is masked
             * @return {Boolean}
             */
            isMasked : function() {
                var m = data(this.dom, 'mask');
                return m && m.isVisible();
            },

            /**
             * Creates an iframe shim for this element to keep selects and other windowed objects from
             * showing through.
             * @return {Ext.Element} The new shim element
             */
            createShim : function() {
                var el = document.createElement('iframe'),
                    shim;
                
                el.frameBorder = '0';
                el.className = 'ext-shim';
                el.src = Ext.SSL_SECURE_URL;
                shim = Ext.get(this.dom.parentNode.insertBefore(el, this.dom));
                shim.autoBoxAdjust = false;
                return shim;
            }
        };
    }()
);/**
 * @class Ext.Element
 */
Ext.Element.addMethods({
    /**
     * Convenience method for constructing a KeyMap
     * @param {Number/Array/Object/String} key Either a string with the keys to listen for, the numeric key code, array of key codes or an object with the following options:
     * <code>{key: (number or array), shift: (true/false), ctrl: (true/false), alt: (true/false)}</code>
     * @param {Function} fn The function to call
     * @param {Object} scope (optional) The scope (<code>this</code> reference) in which the specified function is executed. Defaults to this Element.
     * @return {Ext.KeyMap} The KeyMap created
     */
    addKeyListener : function(key, fn, scope){
        var config;
        if(typeof key != 'object' || Ext.isArray(key)){
            config = {
                key: key,
                fn: fn,
                scope: scope
            };
        }else{
            config = {
                key : key.key,
                shift : key.shift,
                ctrl : key.ctrl,
                alt : key.alt,
                fn: fn,
                scope: scope
            };
        }
        return new Ext.KeyMap(this, config);
    },

    /**
     * Creates a KeyMap for this element
     * @param {Object} config The KeyMap config. See {@link Ext.KeyMap} for more details
     * @return {Ext.KeyMap} The KeyMap created
     */
    addKeyMap : function(config){
        return new Ext.KeyMap(this, config);
    }
});

//Import the newly-added Ext.Element functions into CompositeElementLite. We call this here because
//Element.keys.js is the last extra Ext.Element include in the ext-all.js build
Ext.CompositeElementLite.importElementMethods();/**
 * @class Ext.CompositeElementLite
 */
Ext.apply(Ext.CompositeElementLite.prototype, {
    addElements : function(els, root){
        if(!els){
            return this;
        }
        if(typeof els == "string"){
            els = Ext.Element.selectorFunction(els, root);
        }
        var yels = this.elements;
        Ext.each(els, function(e) {
            yels.push(Ext.get(e));
        });
        return this;
    },

    /**
     * Returns the first Element
     * @return {Ext.Element}
     */
    first : function(){
        return this.item(0);
    },

    /**
     * Returns the last Element
     * @return {Ext.Element}
     */
    last : function(){
        return this.item(this.getCount()-1);
    },

    /**
     * Returns true if this composite contains the passed element
     * @param el {Mixed} The id of an element, or an Ext.Element, or an HtmlElement to find within the composite collection.
     * @return Boolean
     */
    contains : function(el){
        return this.indexOf(el) != -1;
    },

    /**
    * Removes the specified element(s).
    * @param {Mixed} el The id of an element, the Element itself, the index of the element in this composite
    * or an array of any of those.
    * @param {Boolean} removeDom (optional) True to also remove the element from the document
    * @return {CompositeElement} this
    */
    removeElement : function(keys, removeDom){
        var me = this,
            els = this.elements,
            el;
        Ext.each(keys, function(val){
            if ((el = (els[val] || els[val = me.indexOf(val)]))) {
                if(removeDom){
                    if(el.dom){
                        el.remove();
                    }else{
                        Ext.removeNode(el);
                    }
                }
                els.splice(val, 1);
            }
        });
        return this;
    }
});
/**
 * @class Ext.CompositeElement
 * @extends Ext.CompositeElementLite
 * <p>This class encapsulates a <i>collection</i> of DOM elements, providing methods to filter
 * members, or to perform collective actions upon the whole set.</p>
 * <p>Although they are not listed, this class supports all of the methods of {@link Ext.Element} and
 * {@link Ext.Fx}. The methods from these classes will be performed on all the elements in this collection.</p>
 * <p>All methods return <i>this</i> and can be chained.</p>
 * Usage:
<pre><code>
var els = Ext.select("#some-el div.some-class", true);
// or select directly from an existing element
var el = Ext.get('some-el');
el.select('div.some-class', true);

els.setWidth(100); // all elements become 100 width
els.hide(true); // all elements fade out and hide
// or
els.setWidth(100).hide(true);
</code></pre>
 */
Ext.CompositeElement = Ext.extend(Ext.CompositeElementLite, {
    
    constructor : function(els, root){
        this.elements = [];
        this.add(els, root);
    },
    
    // private
    getElement : function(el){
        // In this case just return it, since we already have a reference to it
        return el;
    },
    
    // private
    transformElement : function(el){
        return Ext.get(el);
    }

    /**
    * Adds elements to this composite.
    * @param {String/Array} els A string CSS selector, an array of elements or an element
    * @return {CompositeElement} this
    */

    /**
     * Returns the Element object at the specified index
     * @param {Number} index
     * @return {Ext.Element}
     */

    /**
     * Iterates each <code>element</code> in this <code>composite</code>
     * calling the supplied function using {@link Ext#each}.
     * @param {Function} fn The function to be called with each
     * <code>element</code>. If the supplied function returns <tt>false</tt>,
     * iteration stops. This function is called with the following arguments:
     * <div class="mdetail-params"><ul>
     * <li><code>element</code> : <i>Ext.Element</i><div class="sub-desc">The element at the current <code>index</code>
     * in the <code>composite</code></div></li>
     * <li><code>composite</code> : <i>Object</i> <div class="sub-desc">This composite.</div></li>
     * <li><code>index</code> : <i>Number</i> <div class="sub-desc">The current index within the <code>composite</code> </div></li>
     * </ul></div>
     * @param {Object} scope (optional) The scope (<code><this</code> reference) in which the specified function is executed.
     * Defaults to the <code>element</code> at the current <code>index</code>
     * within the composite.
     * @return {CompositeElement} this
     */
});

/**
 * Selects elements based on the passed CSS selector to enable {@link Ext.Element Element} methods
 * to be applied to many related elements in one statement through the returned {@link Ext.CompositeElement CompositeElement} or
 * {@link Ext.CompositeElementLite CompositeElementLite} object.
 * @param {String/Array} selector The CSS selector or an array of elements
 * @param {Boolean} unique (optional) true to create a unique Ext.Element for each element (defaults to a shared flyweight object)
 * @param {HTMLElement/String} root (optional) The root element of the query or id of the root
 * @return {CompositeElementLite/CompositeElement}
 * @member Ext.Element
 * @method select
 */
Ext.Element.select = function(selector, unique, root){
    var els;
    if(typeof selector == "string"){
        els = Ext.Element.selectorFunction(selector, root);
    }else if(selector.length !== undefined){
        els = selector;
    }else{
        throw "Invalid selector";
    }

    return (unique === true) ? new Ext.CompositeElement(els) : new Ext.CompositeElementLite(els);
};

/**
 * Selects elements based on the passed CSS selector to enable {@link Ext.Element Element} methods
 * to be applied to many related elements in one statement through the returned {@link Ext.CompositeElement CompositeElement} or
 * {@link Ext.CompositeElementLite CompositeElementLite} object.
 * @param {String/Array} selector The CSS selector or an array of elements
 * @param {Boolean} unique (optional) true to create a unique Ext.Element for each element (defaults to a shared flyweight object)
 * @param {HTMLElement/String} root (optional) The root element of the query or id of the root
 * @return {CompositeElementLite/CompositeElement}
 * @member Ext
 * @method select
 */
Ext.select = Ext.Element.select;/**
 * @class Ext.Updater
 * @extends Ext.util.Observable
 * Provides AJAX-style update capabilities for Element objects.  Updater can be used to {@link #update}
 * an {@link Ext.Element} once, or you can use {@link #startAutoRefresh} to set up an auto-updating
 * {@link Ext.Element Element} on a specific interval.<br><br>
 * Usage:<br>
 * <pre><code>
 * var el = Ext.get("foo"); // Get Ext.Element object
 * var mgr = el.getUpdater();
 * mgr.update({
        url: "http://myserver.com/index.php",
        params: {
            param1: "foo",
            param2: "bar"
        }
 * });
 * ...
 * mgr.formUpdate("myFormId", "http://myserver.com/index.php");
 * <br>
 * // or directly (returns the same Updater instance)
 * var mgr = new Ext.Updater("myElementId");
 * mgr.startAutoRefresh(60, "http://myserver.com/index.php");
 * mgr.on("update", myFcnNeedsToKnow);
 * <br>
 * // short handed call directly from the element object
 * Ext.get("foo").load({
        url: "bar.php",
        scripts: true,
        params: "param1=foo&amp;param2=bar",
        text: "Loading Foo..."
 * });
 * </code></pre>
 * @constructor
 * Create new Updater directly.
 * @param {Mixed} el The element to update
 * @param {Boolean} forceNew (optional) By default the constructor checks to see if the passed element already
 * has an Updater and if it does it returns the same instance. This will skip that check (useful for extending this class).
 */
Ext.UpdateManager = Ext.Updater = Ext.extend(Ext.util.Observable,
function() {
    var BEFOREUPDATE = "beforeupdate",
        UPDATE = "update",
        FAILURE = "failure";

    // private
    function processSuccess(response){
        var me = this;
        me.transaction = null;
        if (response.argument.form && response.argument.reset) {
            try { // put in try/catch since some older FF releases had problems with this
                response.argument.form.reset();
            } catch(e){}
        }
        if (me.loadScripts) {
            me.renderer.render(me.el, response, me,
               updateComplete.createDelegate(me, [response]));
        } else {
            me.renderer.render(me.el, response, me);
            updateComplete.call(me, response);
        }
    }

    // private
    function updateComplete(response, type, success){
        this.fireEvent(type || UPDATE, this.el, response);
        if(Ext.isFunction(response.argument.callback)){
            response.argument.callback.call(response.argument.scope, this.el, Ext.isEmpty(success) ? true : false, response, response.argument.options);
        }
    }

    // private
    function processFailure(response){
        updateComplete.call(this, response, FAILURE, !!(this.transaction = null));
    }

    return {
        constructor: function(el, forceNew){
            var me = this;
            el = Ext.get(el);
            if(!forceNew && el.updateManager){
                return el.updateManager;
            }
            /**
             * The Element object
             * @type Ext.Element
             */
            me.el = el;
            /**
             * Cached url to use for refreshes. Overwritten every time update() is called unless "discardUrl" param is set to true.
             * @type String
             */
            me.defaultUrl = null;

            me.addEvents(
                /**
                 * @event beforeupdate
                 * Fired before an update is made, return false from your handler and the update is cancelled.
                 * @param {Ext.Element} el
                 * @param {String/Object/Function} url
                 * @param {String/Object} params
                 */
                BEFOREUPDATE,
                /**
                 * @event update
                 * Fired after successful update is made.
                 * @param {Ext.Element} el
                 * @param {Object} oResponseObject The response Object
                 */
                UPDATE,
                /**
                 * @event failure
                 * Fired on update failure.
                 * @param {Ext.Element} el
                 * @param {Object} oResponseObject The response Object
                 */
                FAILURE
            );

            Ext.apply(me, Ext.Updater.defaults);
            /**
             * Blank page URL to use with SSL file uploads (defaults to {@link Ext.Updater.defaults#sslBlankUrl}).
             * @property sslBlankUrl
             * @type String
             */
            /**
             * Whether to append unique parameter on get request to disable caching (defaults to {@link Ext.Updater.defaults#disableCaching}).
             * @property disableCaching
             * @type Boolean
             */
            /**
             * Text for loading indicator (defaults to {@link Ext.Updater.defaults#indicatorText}).
             * @property indicatorText
             * @type String
             */
            /**
             * Whether to show indicatorText when loading (defaults to {@link Ext.Updater.defaults#showLoadIndicator}).
             * @property showLoadIndicator
             * @type String
             */
            /**
             * Timeout for requests or form posts in seconds (defaults to {@link Ext.Updater.defaults#timeout}).
             * @property timeout
             * @type Number
             */
            /**
             * True to process scripts in the output (defaults to {@link Ext.Updater.defaults#loadScripts}).
             * @property loadScripts
             * @type Boolean
             */

            /**
             * Transaction object of the current executing transaction, or null if there is no active transaction.
             */
            me.transaction = null;
            /**
             * Delegate for refresh() prebound to "this", use myUpdater.refreshDelegate.createCallback(arg1, arg2) to bind arguments
             * @type Function
             */
            me.refreshDelegate = me.refresh.createDelegate(me);
            /**
             * Delegate for update() prebound to "this", use myUpdater.updateDelegate.createCallback(arg1, arg2) to bind arguments
             * @type Function
             */
            me.updateDelegate = me.update.createDelegate(me);
            /**
             * Delegate for formUpdate() prebound to "this", use myUpdater.formUpdateDelegate.createCallback(arg1, arg2) to bind arguments
             * @type Function
             */
            me.formUpdateDelegate = (me.formUpdate || function(){}).createDelegate(me);

            /**
             * The renderer for this Updater (defaults to {@link Ext.Updater.BasicRenderer}).
             */
            me.renderer = me.renderer || me.getDefaultRenderer();

            Ext.Updater.superclass.constructor.call(me);
        },

        /**
         * Sets the content renderer for this Updater. See {@link Ext.Updater.BasicRenderer#render} for more details.
         * @param {Object} renderer The object implementing the render() method
         */
        setRenderer : function(renderer){
            this.renderer = renderer;
        },

        /**
         * Returns the current content renderer for this Updater. See {@link Ext.Updater.BasicRenderer#render} for more details.
         * @return {Object}
         */
        getRenderer : function(){
           return this.renderer;
        },

        /**
         * This is an overrideable method which returns a reference to a default
         * renderer class if none is specified when creating the Ext.Updater.
         * Defaults to {@link Ext.Updater.BasicRenderer}
         */
        getDefaultRenderer: function() {
            return new Ext.Updater.BasicRenderer();
        },

        /**
         * Sets the default URL used for updates.
         * @param {String/Function} defaultUrl The url or a function to call to get the url
         */
        setDefaultUrl : function(defaultUrl){
            this.defaultUrl = defaultUrl;
        },

        /**
         * Get the Element this Updater is bound to
         * @return {Ext.Element} The element
         */
        getEl : function(){
            return this.el;
        },

        /**
         * Performs an <b>asynchronous</b> request, updating this element with the response.
         * If params are specified it uses POST, otherwise it uses GET.<br><br>
         * <b>Note:</b> Due to the asynchronous nature of remote server requests, the Element
         * will not have been fully updated when the function returns. To post-process the returned
         * data, use the callback option, or an <b><code>update</code></b> event handler.
         * @param {Object} options A config object containing any of the following options:<ul>
         * <li>url : <b>String/Function</b><p class="sub-desc">The URL to request or a function which
         * <i>returns</i> the URL (defaults to the value of {@link Ext.Ajax#url} if not specified).</p></li>
         * <li>method : <b>String</b><p class="sub-desc">The HTTP method to
         * use. Defaults to POST if the <code>params</code> argument is present, otherwise GET.</p></li>
         * <li>params : <b>String/Object/Function</b><p class="sub-desc">The
         * parameters to pass to the server (defaults to none). These may be specified as a url-encoded
         * string, or as an object containing properties which represent parameters,
         * or as a function, which returns such an object.</p></li>
         * <li>scripts : <b>Boolean</b><p class="sub-desc">If <code>true</code>
         * any &lt;script&gt; tags embedded in the response text will be extracted
         * and executed (defaults to {@link Ext.Updater.defaults#loadScripts}). If this option is specified,
         * the callback will be called <i>after</i> the execution of the scripts.</p></li>
         * <li>callback : <b>Function</b><p class="sub-desc">A function to
         * be called when the response from the server arrives. The following
         * parameters are passed:<ul>
         * <li><b>el</b> : Ext.Element<p class="sub-desc">The Element being updated.</p></li>
         * <li><b>success</b> : Boolean<p class="sub-desc">True for success, false for failure.</p></li>
         * <li><b>response</b> : XMLHttpRequest<p class="sub-desc">The XMLHttpRequest which processed the update.</p></li>
         * <li><b>options</b> : Object<p class="sub-desc">The config object passed to the update call.</p></li></ul>
         * </p></li>
         * <li>scope : <b>Object</b><p class="sub-desc">The scope in which
         * to execute the callback (The callback's <code>this</code> reference.) If the
         * <code>params</code> argument is a function, this scope is used for that function also.</p></li>
         * <li>discardUrl : <b>Boolean</b><p class="sub-desc">By default, the URL of this request becomes
         * the default URL for this Updater object, and will be subsequently used in {@link #refresh}
         * calls.  To bypass this behavior, pass <code>discardUrl:true</code> (defaults to false).</p></li>
         * <li>timeout : <b>Number</b><p class="sub-desc">The number of seconds to wait for a response before
         * timing out (defaults to {@link Ext.Updater.defaults#timeout}).</p></li>
         * <li>text : <b>String</b><p class="sub-desc">The text to use as the innerHTML of the
         * {@link Ext.Updater.defaults#indicatorText} div (defaults to 'Loading...').  To replace the entire div, not
         * just the text, override {@link Ext.Updater.defaults#indicatorText} directly.</p></li>
         * <li>nocache : <b>Boolean</b><p class="sub-desc">Only needed for GET
         * requests, this option causes an extra, auto-generated parameter to be appended to the request
         * to defeat caching (defaults to {@link Ext.Updater.defaults#disableCaching}).</p></li></ul>
         * <p>
         * For example:
    <pre><code>
    um.update({
        url: "your-url.php",
        params: {param1: "foo", param2: "bar"}, // or a URL encoded string
        callback: yourFunction,
        scope: yourObject, //(optional scope)
        discardUrl: true,
        nocache: true,
        text: "Loading...",
        timeout: 60,
        scripts: false // Save time by avoiding RegExp execution.
    });
    </code></pre>
         */
        update : function(url, params, callback, discardUrl){
            var me = this,
                cfg,
                callerScope;

            if(me.fireEvent(BEFOREUPDATE, me.el, url, params) !== false){
                if(Ext.isObject(url)){ // must be config object
                    cfg = url;
                    url = cfg.url;
                    params = params || cfg.params;
                    callback = callback || cfg.callback;
                    discardUrl = discardUrl || cfg.discardUrl;
                    callerScope = cfg.scope;
                    if(!Ext.isEmpty(cfg.nocache)){me.disableCaching = cfg.nocache;};
                    if(!Ext.isEmpty(cfg.text)){me.indicatorText = '<div class="loading-indicator">'+cfg.text+"</div>";};
                    if(!Ext.isEmpty(cfg.scripts)){me.loadScripts = cfg.scripts;};
                    if(!Ext.isEmpty(cfg.timeout)){me.timeout = cfg.timeout;};
                }
                me.showLoading();

                if(!discardUrl){
                    me.defaultUrl = url;
                }
                if(Ext.isFunction(url)){
                    url = url.call(me);
                }

                var o = Ext.apply({}, {
                    url : url,
                    params: (Ext.isFunction(params) && callerScope) ? params.createDelegate(callerScope) : params,
                    success: processSuccess,
                    failure: processFailure,
                    scope: me,
                    callback: undefined,
                    timeout: (me.timeout*1000),
                    disableCaching: me.disableCaching,
                    argument: {
                        "options": cfg,
                        "url": url,
                        "form": null,
                        "callback": callback,
                        "scope": callerScope || window,
                        "params": params
                    }
                }, cfg);

                me.transaction = Ext.Ajax.request(o);
            }
        },

        /**
         * <p>Performs an asynchronous form post, updating this element with the response. If the form has the attribute
         * enctype="<a href="http://www.faqs.org/rfcs/rfc2388.html">multipart/form-data</a>", it assumes it's a file upload.
         * Uses this.sslBlankUrl for SSL file uploads to prevent IE security warning.</p>
         * <p>File uploads are not performed using normal "Ajax" techniques, that is they are <b>not</b>
         * performed using XMLHttpRequests. Instead the form is submitted in the standard manner with the
         * DOM <code>&lt;form></code> element temporarily modified to have its
         * <a href="http://www.w3.org/TR/REC-html40/present/frames.html#adef-target">target</a> set to refer
         * to a dynamically generated, hidden <code>&lt;iframe></code> which is inserted into the document
         * but removed after the return data has been gathered.</p>
         * <p>Be aware that file upload packets, sent with the content type <a href="http://www.faqs.org/rfcs/rfc2388.html">multipart/form-data</a>
         * and some server technologies (notably JEE) may require some custom processing in order to
         * retrieve parameter names and parameter values from the packet content.</p>
         * @param {String/HTMLElement} form The form Id or form element
         * @param {String} url (optional) The url to pass the form to. If omitted the action attribute on the form will be used.
         * @param {Boolean} reset (optional) Whether to try to reset the form after the update
         * @param {Function} callback (optional) Callback when transaction is complete. The following
         * parameters are passed:<ul>
         * <li><b>el</b> : Ext.Element<p class="sub-desc">The Element being updated.</p></li>
         * <li><b>success</b> : Boolean<p class="sub-desc">True for success, false for failure.</p></li>
         * <li><b>response</b> : XMLHttpRequest<p class="sub-desc">The XMLHttpRequest which processed the update.</p></li></ul>
         */
        formUpdate : function(form, url, reset, callback){
            var me = this;
            if(me.fireEvent(BEFOREUPDATE, me.el, form, url) !== false){
                if(Ext.isFunction(url)){
                    url = url.call(me);
                }
                form = Ext.getDom(form);
                me.transaction = Ext.Ajax.request({
                    form: form,
                    url:url,
                    success: processSuccess,
                    failure: processFailure,
                    scope: me,
                    timeout: (me.timeout*1000),
                    argument: {
                        "url": url,
                        "form": form,
                        "callback": callback,
                        "reset": reset
                    }
                });
                me.showLoading.defer(1, me);
            }
        },

        /**
         * Set this element to auto refresh.  Can be canceled by calling {@link #stopAutoRefresh}.
         * @param {Number} interval How often to update (in seconds).
         * @param {String/Object/Function} url (optional) The url for this request, a config object in the same format
         * supported by {@link #load}, or a function to call to get the url (defaults to the last used url).  Note that while
         * the url used in a load call can be reused by this method, other load config options will not be reused and must be
         * sepcified as part of a config object passed as this paramter if needed.
         * @param {String/Object} params (optional) The parameters to pass as either a url encoded string
         * "&param1=1&param2=2" or as an object {param1: 1, param2: 2}
         * @param {Function} callback (optional) Callback when transaction is complete - called with signature (oElement, bSuccess)
         * @param {Boolean} refreshNow (optional) Whether to execute the refresh now, or wait the interval
         */
        startAutoRefresh : function(interval, url, params, callback, refreshNow){
            var me = this;
            if(refreshNow){
                me.update(url || me.defaultUrl, params, callback, true);
            }
            if(me.autoRefreshProcId){
                clearInterval(me.autoRefreshProcId);
            }
            me.autoRefreshProcId = setInterval(me.update.createDelegate(me, [url || me.defaultUrl, params, callback, true]), interval * 1000);
        },

        /**
         * Stop auto refresh on this element.
         */
        stopAutoRefresh : function(){
            if(this.autoRefreshProcId){
                clearInterval(this.autoRefreshProcId);
                delete this.autoRefreshProcId;
            }
        },

        /**
         * Returns true if the Updater is currently set to auto refresh its content (see {@link #startAutoRefresh}), otherwise false.
         */
        isAutoRefreshing : function(){
           return !!this.autoRefreshProcId;
        },

        /**
         * Display the element's "loading" state. By default, the element is updated with {@link #indicatorText}. This
         * method may be overridden to perform a custom action while this Updater is actively updating its contents.
         */
        showLoading : function(){
            if(this.showLoadIndicator){
                this.el.dom.innerHTML = this.indicatorText;
            }
        },

        /**
         * Aborts the currently executing transaction, if any.
         */
        abort : function(){
            if(this.transaction){
                Ext.Ajax.abort(this.transaction);
            }
        },

        /**
         * Returns true if an update is in progress, otherwise false.
         * @return {Boolean}
         */
        isUpdating : function(){
            return this.transaction ? Ext.Ajax.isLoading(this.transaction) : false;
        },

        /**
         * Refresh the element with the last used url or defaultUrl. If there is no url, it returns immediately
         * @param {Function} callback (optional) Callback when transaction is complete - called with signature (oElement, bSuccess)
         */
        refresh : function(callback){
            if(this.defaultUrl){
                this.update(this.defaultUrl, null, callback, true);
            }
        }
    };
}());

/**
 * @class Ext.Updater.defaults
 * The defaults collection enables customizing the default properties of Updater
 */
Ext.Updater.defaults = {
   /**
     * Timeout for requests or form posts in seconds (defaults to 30 seconds).
     * @type Number
     */
    timeout : 30,
    /**
     * True to append a unique parameter to GET requests to disable caching (defaults to false).
     * @type Boolean
     */
    disableCaching : false,
    /**
     * Whether or not to show {@link #indicatorText} during loading (defaults to true).
     * @type Boolean
     */
    showLoadIndicator : true,
    /**
     * Text for loading indicator (defaults to '&lt;div class="loading-indicator"&gt;Loading...&lt;/div&gt;').
     * @type String
     */
    indicatorText : '<div class="loading-indicator">Loading...</div>',
     /**
     * True to process scripts by default (defaults to false).
     * @type Boolean
     */
    loadScripts : false,
    /**
    * Blank page URL to use with SSL file uploads (defaults to {@link Ext#SSL_SECURE_URL} if set, or "javascript:false").
    * @type String
    */
    sslBlankUrl : Ext.SSL_SECURE_URL
};


/**
 * Static convenience method. <b>This method is deprecated in favor of el.load({url:'foo.php', ...})</b>.
 * Usage:
 * <pre><code>Ext.Updater.updateElement("my-div", "stuff.php");</code></pre>
 * @param {Mixed} el The element to update
 * @param {String} url The url
 * @param {String/Object} params (optional) Url encoded param string or an object of name/value pairs
 * @param {Object} options (optional) A config object with any of the Updater properties you want to set - for
 * example: {disableCaching:true, indicatorText: "Loading data..."}
 * @static
 * @deprecated
 * @member Ext.Updater
 */
Ext.Updater.updateElement = function(el, url, params, options){
    var um = Ext.get(el).getUpdater();
    Ext.apply(um, options);
    um.update(url, params, options ? options.callback : null);
};

/**
 * @class Ext.Updater.BasicRenderer
 * <p>This class is a base class implementing a simple render method which updates an element using results from an Ajax request.</p>
 * <p>The BasicRenderer updates the element's innerHTML with the responseText. To perform a custom render (i.e. XML or JSON processing),
 * create an object with a conforming {@link #render} method and pass it to setRenderer on the Updater.</p>
 */
Ext.Updater.BasicRenderer = function(){};

Ext.Updater.BasicRenderer.prototype = {
    /**
     * This method is called when an Ajax response is received, and an Element needs updating.
     * @param {Ext.Element} el The element being rendered
     * @param {Object} xhr The XMLHttpRequest object
     * @param {Updater} updateManager The calling update manager
     * @param {Function} callback A callback that will need to be called if loadScripts is true on the Updater
     */
     render : function(el, response, updateManager, callback){
        el.update(response.responseText, updateManager.loadScripts, callback);
    }
};/**
 * @class Date
 *
 * The date parsing and formatting syntax contains a subset of
 * <a href="http://www.php.net/date">PHP's date() function</a>, and the formats that are
 * supported will provide results equivalent to their PHP versions.
 *
 * The following is a list of all currently supported formats:
 * <pre>
Format  Description                                                               Example returned values
------  -----------------------------------------------------------------------   -----------------------
  d     Day of the month, 2 digits with leading zeros                             01 to 31
  D     A short textual representation of the day of the week                     Mon to Sun
  j     Day of the month without leading zeros                                    1 to 31
  l     A full textual representation of the day of the week                      Sunday to Saturday
  N     ISO-8601 numeric representation of the day of the week                    1 (for Monday) through 7 (for Sunday)
  S     English ordinal suffix for the day of the month, 2 characters             st, nd, rd or th. Works well with j
  w     Numeric representation of the day of the week                             0 (for Sunday) to 6 (for Saturday)
  z     The day of the year (starting from 0)                                     0 to 364 (365 in leap years)
  W     ISO-8601 week number of year, weeks starting on Monday                    01 to 53
  F     A full textual representation of a month, such as January or March        January to December
  m     Numeric representation of a month, with leading zeros                     01 to 12
  M     A short textual representation of a month                                 Jan to Dec
  n     Numeric representation of a month, without leading zeros                  1 to 12
  t     Number of days in the given month                                         28 to 31
  L     Whether it's a leap year                                                  1 if it is a leap year, 0 otherwise.
  o     ISO-8601 year number (identical to (Y), but if the ISO week number (W)    Examples: 1998 or 2004
        belongs to the previous or next year, that year is used instead)
  Y     A full numeric representation of a year, 4 digits                         Examples: 1999 or 2003
  y     A two digit representation of a year                                      Examples: 99 or 03
  a     Lowercase Ante meridiem and Post meridiem                                 am or pm
  A     Uppercase Ante meridiem and Post meridiem                                 AM or PM
  g     12-hour format of an hour without leading zeros                           1 to 12
  G     24-hour format of an hour without leading zeros                           0 to 23
  h     12-hour format of an hour with leading zeros                              01 to 12
  H     24-hour format of an hour with leading zeros                              00 to 23
  i     Minutes, with leading zeros                                               00 to 59
  s     Seconds, with leading zeros                                               00 to 59
  u     Decimal fraction of a second                                              Examples:
        (minimum 1 digit, arbitrary number of digits allowed)                     001 (i.e. 0.001s) or
                                                                                  100 (i.e. 0.100s) or
                                                                                  999 (i.e. 0.999s) or
                                                                                  999876543210 (i.e. 0.999876543210s)
  O     Difference to Greenwich time (GMT) in hours and minutes                   Example: +1030
  P     Difference to Greenwich time (GMT) with colon between hours and minutes   Example: -08:00
  T     Timezone abbreviation of the machine running the code                     Examples: EST, MDT, PDT ...
  Z     Timezone offset in seconds (negative if west of UTC, positive if east)    -43200 to 50400
  c     ISO 8601 date
        Notes:                                                                    Examples:
        1) If unspecified, the month / day defaults to the current month / day,   1991 or
           the time defaults to midnight, while the timezone defaults to the      1992-10 or
           browser's timezone. If a time is specified, it must include both hours 1993-09-20 or
           and minutes. The "T" delimiter, seconds, milliseconds and timezone     1994-08-19T16:20+01:00 or
           are optional.                                                          1995-07-18T17:21:28-02:00 or
        2) The decimal fraction of a second, if specified, must contain at        1996-06-17T18:22:29.98765+03:00 or
           least 1 digit (there is no limit to the maximum number                 1997-05-16T19:23:30,12345-0400 or
           of digits allowed), and may be delimited by either a '.' or a ','      1998-04-15T20:24:31.2468Z or
        Refer to the examples on the right for the various levels of              1999-03-14T20:24:32Z or
        date-time granularity which are supported, or see                         2000-02-13T21:25:33
        http://www.w3.org/TR/NOTE-datetime for more info.                         2001-01-12 22:26:34
  U     Seconds since the Unix Epoch (January 1 1970 00:00:00 GMT)                1193432466 or -2138434463
  M$    Microsoft AJAX serialized dates                                           \/Date(1238606590509)\/ (i.e. UTC milliseconds since epoch) or
                                                                                  \/Date(1238606590509+0800)\/
</pre>
 *
 * Example usage (note that you must escape format specifiers with '\\' to render them as character literals):
 * <pre><code>
// Sample date:
// 'Wed Jan 10 2007 15:05:01 GMT-0600 (Central Standard Time)'

var dt = new Date('1/10/2007 03:05:01 PM GMT-0600');
document.write(dt.format('Y-m-d'));                           // 2007-01-10
document.write(dt.format('F j, Y, g:i a'));                   // January 10, 2007, 3:05 pm
document.write(dt.format('l, \\t\\he jS \\of F Y h:i:s A'));  // Wednesday, the 10th of January 2007 03:05:01 PM
</code></pre>
 *
 * Here are some standard date/time patterns that you might find helpful.  They
 * are not part of the source of Date.js, but to use them you can simply copy this
 * block of code into any script that is included after Date.js and they will also become
 * globally available on the Date object.  Feel free to add or remove patterns as needed in your code.
 * <pre><code>
Date.patterns = {
    ISO8601Long:"Y-m-d H:i:s",
    ISO8601Short:"Y-m-d",
    ShortDate: "n/j/Y",
    LongDate: "l, F d, Y",
    FullDateTime: "l, F d, Y g:i:s A",
    MonthDay: "F d",
    ShortTime: "g:i A",
    LongTime: "g:i:s A",
    SortableDateTime: "Y-m-d\\TH:i:s",
    UniversalSortableDateTime: "Y-m-d H:i:sO",
    YearMonth: "F, Y"
};
</code></pre>
 *
 * Example usage:
 * <pre><code>
var dt = new Date();
document.write(dt.format(Date.patterns.ShortDate));
</code></pre>
 * <p>Developer-written, custom formats may be used by supplying both a formatting and a parsing function
 * which perform to specialized requirements. The functions are stored in {@link #parseFunctions} and {@link #formatFunctions}.</p>
 */

/*
 * Most of the date-formatting functions below are the excellent work of Baron Schwartz.
 * (see http://www.xaprb.com/blog/2005/12/12/javascript-closures-for-runtime-efficiency/)
 * They generate precompiled functions from format patterns instead of parsing and
 * processing each pattern every time a date is formatted. These functions are available
 * on every Date object.
 */

(function() {

/**
 * Global flag which determines if strict date parsing should be used.
 * Strict date parsing will not roll-over invalid dates, which is the
 * default behaviour of javascript Date objects.
 * (see {@link #parseDate} for more information)
 * Defaults to <tt>false</tt>.
 * @static
 * @type Boolean
*/
Date.useStrict = false;


// create private copy of Ext's String.format() method
// - to remove unnecessary dependency
// - to resolve namespace conflict with M$-Ajax's implementation
function xf(format) {
    var args = Array.prototype.slice.call(arguments, 1);
    return format.replace(/\{(\d+)\}/g, function(m, i) {
        return args[i];
    });
}


// private
Date.formatCodeToRegex = function(character, currentGroup) {
    // Note: currentGroup - position in regex result array (see notes for Date.parseCodes below)
    var p = Date.parseCodes[character];

    if (p) {
      p = typeof p == 'function'? p() : p;
      Date.parseCodes[character] = p; // reassign function result to prevent repeated execution
    }

    return p ? Ext.applyIf({
      c: p.c ? xf(p.c, currentGroup || "{0}") : p.c
    }, p) : {
        g:0,
        c:null,
        s:Ext.escapeRe(character) // treat unrecognised characters as literals
    };
};

// private shorthand for Date.formatCodeToRegex since we'll be using it fairly often
var $f = Date.formatCodeToRegex;

Ext.apply(Date, {
    /**
     * <p>An object hash in which each property is a date parsing function. The property name is the
     * format string which that function parses.</p>
     * <p>This object is automatically populated with date parsing functions as
     * date formats are requested for Ext standard formatting strings.</p>
     * <p>Custom parsing functions may be inserted into this object, keyed by a name which from then on
     * may be used as a format string to {@link #parseDate}.<p>
     * <p>Example:</p><pre><code>
Date.parseFunctions['x-date-format'] = myDateParser;
</code></pre>
     * <p>A parsing function should return a Date object, and is passed the following parameters:<div class="mdetail-params"><ul>
     * <li><code>date</code> : String<div class="sub-desc">The date string to parse.</div></li>
     * <li><code>strict</code> : Boolean<div class="sub-desc">True to validate date strings while parsing
     * (i.e. prevent javascript Date "rollover") (The default must be false).
     * Invalid date strings should return null when parsed.</div></li>
     * </ul></div></p>
     * <p>To enable Dates to also be <i>formatted</i> according to that format, a corresponding
     * formatting function must be placed into the {@link #formatFunctions} property.
     * @property parseFunctions
     * @static
     * @type Object
     */
    parseFunctions: {
        "M$": function(input, strict) {
            // note: the timezone offset is ignored since the M$ Ajax server sends
            // a UTC milliseconds-since-Unix-epoch value (negative values are allowed)
            var re = new RegExp('\\/Date\\(([-+])?(\\d+)(?:[+-]\\d{4})?\\)\\/');
            var r = (input || '').match(re);
            return r? new Date(((r[1] || '') + r[2]) * 1) : null;
        }
    },
    parseRegexes: [],

    /**
     * <p>An object hash in which each property is a date formatting function. The property name is the
     * format string which corresponds to the produced formatted date string.</p>
     * <p>This object is automatically populated with date formatting functions as
     * date formats are requested for Ext standard formatting strings.</p>
     * <p>Custom formatting functions may be inserted into this object, keyed by a name which from then on
     * may be used as a format string to {@link #format}. Example:</p><pre><code>
Date.formatFunctions['x-date-format'] = myDateFormatter;
</code></pre>
     * <p>A formatting function should return a string representation of the passed Date object, and is passed the following parameters:<div class="mdetail-params"><ul>
     * <li><code>date</code> : Date<div class="sub-desc">The Date to format.</div></li>
     * </ul></div></p>
     * <p>To enable date strings to also be <i>parsed</i> according to that format, a corresponding
     * parsing function must be placed into the {@link #parseFunctions} property.
     * @property formatFunctions
     * @static
     * @type Object
     */
    formatFunctions: {
        "M$": function() {
            // UTC milliseconds since Unix epoch (M$-AJAX serialized date format (MRSF))
            return '\\/Date(' + this.getTime() + ')\\/';
        }
    },

    y2kYear : 50,

    /**
     * Date interval constant
     * @static
     * @type String
     */
    MILLI : "ms",

    /**
     * Date interval constant
     * @static
     * @type String
     */
    SECOND : "s",

    /**
     * Date interval constant
     * @static
     * @type String
     */
    MINUTE : "mi",

    /** Date interval constant
     * @static
     * @type String
     */
    HOUR : "h",

    /**
     * Date interval constant
     * @static
     * @type String
     */
    DAY : "d",

    /**
     * Date interval constant
     * @static
     * @type String
     */
    MONTH : "mo",

    /**
     * Date interval constant
     * @static
     * @type String
     */
    YEAR : "y",

    /**
     * <p>An object hash containing default date values used during date parsing.</p>
     * <p>The following properties are available:<div class="mdetail-params"><ul>
     * <li><code>y</code> : Number<div class="sub-desc">The default year value. (defaults to undefined)</div></li>
     * <li><code>m</code> : Number<div class="sub-desc">The default 1-based month value. (defaults to undefined)</div></li>
     * <li><code>d</code> : Number<div class="sub-desc">The default day value. (defaults to undefined)</div></li>
     * <li><code>h</code> : Number<div class="sub-desc">The default hour value. (defaults to undefined)</div></li>
     * <li><code>i</code> : Number<div class="sub-desc">The default minute value. (defaults to undefined)</div></li>
     * <li><code>s</code> : Number<div class="sub-desc">The default second value. (defaults to undefined)</div></li>
     * <li><code>ms</code> : Number<div class="sub-desc">The default millisecond value. (defaults to undefined)</div></li>
     * </ul></div></p>
     * <p>Override these properties to customize the default date values used by the {@link #parseDate} method.</p>
     * <p><b>Note: In countries which experience Daylight Saving Time (i.e. DST), the <tt>h</tt>, <tt>i</tt>, <tt>s</tt>
     * and <tt>ms</tt> properties may coincide with the exact time in which DST takes effect.
     * It is the responsiblity of the developer to account for this.</b></p>
     * Example Usage:
     * <pre><code>
// set default day value to the first day of the month
Date.defaults.d = 1;

// parse a February date string containing only year and month values.
// setting the default day value to 1 prevents weird date rollover issues
// when attempting to parse the following date string on, for example, March 31st 2009.
Date.parseDate('2009-02', 'Y-m'); // returns a Date object representing February 1st 2009
</code></pre>
     * @property defaults
     * @static
     * @type Object
     */
    defaults: {},

    /**
     * An array of textual day names.
     * Override these values for international dates.
     * Example:
     * <pre><code>
Date.dayNames = [
    'SundayInYourLang',
    'MondayInYourLang',
    ...
];
</code></pre>
     * @type Array
     * @static
     */
    dayNames : [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday"
    ],

    /**
     * An array of textual month names.
     * Override these values for international dates.
     * Example:
     * <pre><code>
Date.monthNames = [
    'JanInYourLang',
    'FebInYourLang',
    ...
];
</code></pre>
     * @type Array
     * @static
     */
    monthNames : [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December"
    ],

    /**
     * An object hash of zero-based javascript month numbers (with short month names as keys. note: keys are case-sensitive).
     * Override these values for international dates.
     * Example:
     * <pre><code>
Date.monthNumbers = {
    'ShortJanNameInYourLang':0,
    'ShortFebNameInYourLang':1,
    ...
};
</code></pre>
     * @type Object
     * @static
     */
    monthNumbers : {
        Jan:0,
        Feb:1,
        Mar:2,
        Apr:3,
        May:4,
        Jun:5,
        Jul:6,
        Aug:7,
        Sep:8,
        Oct:9,
        Nov:10,
        Dec:11
    },

    /**
     * Get the short month name for the given month number.
     * Override this function for international dates.
     * @param {Number} month A zero-based javascript month number.
     * @return {String} The short month name.
     * @static
     */
    getShortMonthName : function(month) {
        return Date.monthNames[month].substring(0, 3);
    },

    /**
     * Get the short day name for the given day number.
     * Override this function for international dates.
     * @param {Number} day A zero-based javascript day number.
     * @return {String} The short day name.
     * @static
     */
    getShortDayName : function(day) {
        return Date.dayNames[day].substring(0, 3);
    },

    /**
     * Get the zero-based javascript month number for the given short/full month name.
     * Override this function for international dates.
     * @param {String} name The short/full month name.
     * @return {Number} The zero-based javascript month number.
     * @static
     */
    getMonthNumber : function(name) {
        // handle camel casing for english month names (since the keys for the Date.monthNumbers hash are case sensitive)
        return Date.monthNumbers[name.substring(0, 1).toUpperCase() + name.substring(1, 3).toLowerCase()];
    },

    /**
     * The base format-code to formatting-function hashmap used by the {@link #format} method.
     * Formatting functions are strings (or functions which return strings) which
     * will return the appropriate value when evaluated in the context of the Date object
     * from which the {@link #format} method is called.
     * Add to / override these mappings for custom date formatting.
     * Note: Date.format() treats characters as literals if an appropriate mapping cannot be found.
     * Example:
     * <pre><code>
Date.formatCodes.x = "String.leftPad(this.getDate(), 2, '0')";
(new Date()).format("X"); // returns the current day of the month
</code></pre>
     * @type Object
     * @static
     */
    formatCodes : {
        d: "String.leftPad(this.getDate(), 2, '0')",
        D: "Date.getShortDayName(this.getDay())", // get localised short day name
        j: "this.getDate()",
        l: "Date.dayNames[this.getDay()]",
        N: "(this.getDay() ? this.getDay() : 7)",
        S: "this.getSuffix()",
        w: "this.getDay()",
        z: "this.getDayOfYear()",
        W: "String.leftPad(this.getWeekOfYear(), 2, '0')",
        F: "Date.monthNames[this.getMonth()]",
        m: "String.leftPad(this.getMonth() + 1, 2, '0')",
        M: "Date.getShortMonthName(this.getMonth())", // get localised short month name
        n: "(this.getMonth() + 1)",
        t: "this.getDaysInMonth()",
        L: "(this.isLeapYear() ? 1 : 0)",
        o: "(this.getFullYear() + (this.getWeekOfYear() == 1 && this.getMonth() > 0 ? +1 : (this.getWeekOfYear() >= 52 && this.getMonth() < 11 ? -1 : 0)))",
        Y: "String.leftPad(this.getFullYear(), 4, '0')",
        y: "('' + this.getFullYear()).substring(2, 4)",
        a: "(this.getHours() < 12 ? 'am' : 'pm')",
        A: "(this.getHours() < 12 ? 'AM' : 'PM')",
        g: "((this.getHours() % 12) ? this.getHours() % 12 : 12)",
        G: "this.getHours()",
        h: "String.leftPad((this.getHours() % 12) ? this.getHours() % 12 : 12, 2, '0')",
        H: "String.leftPad(this.getHours(), 2, '0')",
        i: "String.leftPad(this.getMinutes(), 2, '0')",
        s: "String.leftPad(this.getSeconds(), 2, '0')",
        u: "String.leftPad(this.getMilliseconds(), 3, '0')",
        O: "this.getGMTOffset()",
        P: "this.getGMTOffset(true)",
        T: "this.getTimezone()",
        Z: "(this.getTimezoneOffset() * -60)",

        c: function() { // ISO-8601 -- GMT format
            for (var c = "Y-m-dTH:i:sP", code = [], i = 0, l = c.length; i < l; ++i) {
                var e = c.charAt(i);
                code.push(e == "T" ? "'T'" : Date.getFormatCode(e)); // treat T as a character literal
            }
            return code.join(" + ");
        },
        /*
        c: function() { // ISO-8601 -- UTC format
            return [
              "this.getUTCFullYear()", "'-'",
              "String.leftPad(this.getUTCMonth() + 1, 2, '0')", "'-'",
              "String.leftPad(this.getUTCDate(), 2, '0')",
              "'T'",
              "String.leftPad(this.getUTCHours(), 2, '0')", "':'",
              "String.leftPad(this.getUTCMinutes(), 2, '0')", "':'",
              "String.leftPad(this.getUTCSeconds(), 2, '0')",
              "'Z'"
            ].join(" + ");
        },
        */

        U: "Math.round(this.getTime() / 1000)"
    },

    /**
     * Checks if the passed Date parameters will cause a javascript Date "rollover".
     * @param {Number} year 4-digit year
     * @param {Number} month 1-based month-of-year
     * @param {Number} day Day of month
     * @param {Number} hour (optional) Hour
     * @param {Number} minute (optional) Minute
     * @param {Number} second (optional) Second
     * @param {Number} millisecond (optional) Millisecond
     * @return {Boolean} true if the passed parameters do not cause a Date "rollover", false otherwise.
     * @static
     */
    isValid : function(y, m, d, h, i, s, ms) {
        // setup defaults
        h = h || 0;
        i = i || 0;
        s = s || 0;
        ms = ms || 0;

        // Special handling for year < 100
        var dt = new Date(y < 100 ? 100 : y, m - 1, d, h, i, s, ms).add(Date.YEAR, y < 100 ? y - 100 : 0);

        return y == dt.getFullYear() &&
            m == dt.getMonth() + 1 &&
            d == dt.getDate() &&
            h == dt.getHours() &&
            i == dt.getMinutes() &&
            s == dt.getSeconds() &&
            ms == dt.getMilliseconds();
    },

    /**
     * Parses the passed string using the specified date format.
     * Note that this function expects normal calendar dates, meaning that months are 1-based (i.e. 1 = January).
     * The {@link #defaults} hash will be used for any date value (i.e. year, month, day, hour, minute, second or millisecond)
     * which cannot be found in the passed string. If a corresponding default date value has not been specified in the {@link #defaults} hash,
     * the current date's year, month, day or DST-adjusted zero-hour time value will be used instead.
     * Keep in mind that the input date string must precisely match the specified format string
     * in order for the parse operation to be successful (failed parse operations return a null value).
     * <p>Example:</p><pre><code>
//dt = Fri May 25 2007 (current date)
var dt = new Date();

//dt = Thu May 25 2006 (today&#39;s month/day in 2006)
dt = Date.parseDate("2006", "Y");

//dt = Sun Jan 15 2006 (all date parts specified)
dt = Date.parseDate("2006-01-15", "Y-m-d");

//dt = Sun Jan 15 2006 15:20:01
dt = Date.parseDate("2006-01-15 3:20:01 PM", "Y-m-d g:i:s A");

// attempt to parse Sun Feb 29 2006 03:20:01 in strict mode
dt = Date.parseDate("2006-02-29 03:20:01", "Y-m-d H:i:s", true); // returns null
</code></pre>
     * @param {String} input The raw date string.
     * @param {String} format The expected date string format.
     * @param {Boolean} strict (optional) True to validate date strings while parsing (i.e. prevents javascript Date "rollover")
                        (defaults to false). Invalid date strings will return null when parsed.
     * @return {Date} The parsed Date.
     * @static
     */
    parseDate : function(input, format, strict) {
        var p = Date.parseFunctions;
        if (p[format] == null) {
            Date.createParser(format);
        }
        return p[format](input, Ext.isDefined(strict) ? strict : Date.useStrict);
    },

    // private
    getFormatCode : function(character) {
        var f = Date.formatCodes[character];

        if (f) {
          f = typeof f == 'function'? f() : f;
          Date.formatCodes[character] = f; // reassign function result to prevent repeated execution
        }

        // note: unknown characters are treated as literals
        return f || ("'" + String.escape(character) + "'");
    },

    // private
    createFormat : function(format) {
        var code = [],
            special = false,
            ch = '';

        for (var i = 0; i < format.length; ++i) {
            ch = format.charAt(i);
            if (!special && ch == "\\") {
                special = true;
            } else if (special) {
                special = false;
                code.push("'" + String.escape(ch) + "'");
            } else {
                code.push(Date.getFormatCode(ch));
            }
        }
        Date.formatFunctions[format] = new Function("return " + code.join('+'));
    },

    // private
    createParser : function() {
        var code = [
            "var dt, y, m, d, h, i, s, ms, o, z, zz, u, v,",
                "def = Date.defaults,",
                "results = String(input).match(Date.parseRegexes[{0}]);", // either null, or an array of matched strings

            "if(results){",
                "{1}",

                "if(u != null){", // i.e. unix time is defined
                    "v = new Date(u * 1000);", // give top priority to UNIX time
                "}else{",
                    // create Date object representing midnight of the current day;
                    // this will provide us with our date defaults
                    // (note: clearTime() handles Daylight Saving Time automatically)
                    "dt = (new Date()).clearTime();",

                    // date calculations (note: these calculations create a dependency on Ext.num())
                    "y = Ext.num(y, Ext.num(def.y, dt.getFullYear()));",
                    "m = Ext.num(m, Ext.num(def.m - 1, dt.getMonth()));",
                    "d = Ext.num(d, Ext.num(def.d, dt.getDate()));",

                    // time calculations (note: these calculations create a dependency on Ext.num())
                    "h  = Ext.num(h, Ext.num(def.h, dt.getHours()));",
                    "i  = Ext.num(i, Ext.num(def.i, dt.getMinutes()));",
                    "s  = Ext.num(s, Ext.num(def.s, dt.getSeconds()));",
                    "ms = Ext.num(ms, Ext.num(def.ms, dt.getMilliseconds()));",

                    "if(z >= 0 && y >= 0){",
                        // both the year and zero-based day of year are defined and >= 0.
                        // these 2 values alone provide sufficient info to create a full date object

                        // create Date object representing January 1st for the given year
                        // handle years < 100 appropriately
                        "v = new Date(y < 100 ? 100 : y, 0, 1, h, i, s, ms).add(Date.YEAR, y < 100 ? y - 100 : 0);",

                        // then add day of year, checking for Date "rollover" if necessary
                        "v = !strict? v : (strict === true && (z <= 364 || (v.isLeapYear() && z <= 365))? v.add(Date.DAY, z) : null);",
                    "}else if(strict === true && !Date.isValid(y, m + 1, d, h, i, s, ms)){", // check for Date "rollover"
                        "v = null;", // invalid date, so return null
                    "}else{",
                        // plain old Date object
                        // handle years < 100 properly
                        "v = new Date(y < 100 ? 100 : y, m, d, h, i, s, ms).add(Date.YEAR, y < 100 ? y - 100 : 0);",
                    "}",
                "}",
            "}",

            "if(v){",
                // favour UTC offset over GMT offset
                "if(zz != null){",
                    // reset to UTC, then add offset
                    "v = v.add(Date.SECOND, -v.getTimezoneOffset() * 60 - zz);",
                "}else if(o){",
                    // reset to GMT, then add offset
                    "v = v.add(Date.MINUTE, -v.getTimezoneOffset() + (sn == '+'? -1 : 1) * (hr * 60 + mn));",
                "}",
            "}",

            "return v;"
        ].join('\n');

        return function(format) {
            var regexNum = Date.parseRegexes.length,
                currentGroup = 1,
                calc = [],
                regex = [],
                special = false,
                ch = "",
                i = 0,
                obj,
                last;

            for (; i < format.length; ++i) {
                ch = format.charAt(i);
                if (!special && ch == "\\") {
                    special = true;
                } else if (special) {
                    special = false;
                    regex.push(String.escape(ch));
                } else {
                    obj = $f(ch, currentGroup);
                    currentGroup += obj.g;
                    regex.push(obj.s);
                    if (obj.g && obj.c) {
                        if (obj.calcLast) {
                            last = obj.c;
                        } else {
                            calc.push(obj.c);
                        }
                    }
                }
            }
            
            if (last) {
                calc.push(last);
            }

            Date.parseRegexes[regexNum] = new RegExp("^" + regex.join('') + "$", 'i');
            Date.parseFunctions[format] = new Function("input", "strict", xf(code, regexNum, calc.join('')));
        };
    }(),

    // private
    parseCodes : {
        /*
         * Notes:
         * g = {Number} calculation group (0 or 1. only group 1 contributes to date calculations.)
         * c = {String} calculation method (required for group 1. null for group 0. {0} = currentGroup - position in regex result array)
         * s = {String} regex pattern. all matches are stored in results[], and are accessible by the calculation mapped to 'c'
         */
        d: {
            g:1,
            c:"d = parseInt(results[{0}], 10);\n",
            s:"(\\d{2})" // day of month with leading zeroes (01 - 31)
        },
        j: {
            g:1,
            c:"d = parseInt(results[{0}], 10);\n",
            s:"(\\d{1,2})" // day of month without leading zeroes (1 - 31)
        },
        D: function() {
            for (var a = [], i = 0; i < 7; a.push(Date.getShortDayName(i)), ++i); // get localised short day names
            return {
                g:0,
                c:null,
                s:"(?:" + a.join("|") +")"
            };
        },
        l: function() {
            return {
                g:0,
                c:null,
                s:"(?:" + Date.dayNames.join("|") + ")"
            };
        },
        N: {
            g:0,
            c:null,
            s:"[1-7]" // ISO-8601 day number (1 (monday) - 7 (sunday))
        },
        S: {
            g:0,
            c:null,
            s:"(?:st|nd|rd|th)"
        },
        w: {
            g:0,
            c:null,
            s:"[0-6]" // javascript day number (0 (sunday) - 6 (saturday))
        },
        z: {
            g:1,
            c:"z = parseInt(results[{0}], 10);\n",
            s:"(\\d{1,3})" // day of the year (0 - 364 (365 in leap years))
        },
        W: {
            g:0,
            c:null,
            s:"(?:\\d{2})" // ISO-8601 week number (with leading zero)
        },
        F: function() {
            return {
                g:1,
                c:"m = parseInt(Date.getMonthNumber(results[{0}]), 10);\n", // get localised month number
                s:"(" + Date.monthNames.join("|") + ")"
            };
        },
        M: function() {
            for (var a = [], i = 0; i < 12; a.push(Date.getShortMonthName(i)), ++i); // get localised short month names
            return Ext.applyIf({
                s:"(" + a.join("|") + ")"
            }, $f("F"));
        },
        m: {
            g:1,
            c:"m = parseInt(results[{0}], 10) - 1;\n",
            s:"(\\d{2})" // month number with leading zeros (01 - 12)
        },
        n: {
            g:1,
            c:"m = parseInt(results[{0}], 10) - 1;\n",
            s:"(\\d{1,2})" // month number without leading zeros (1 - 12)
        },
        t: {
            g:0,
            c:null,
            s:"(?:\\d{2})" // no. of days in the month (28 - 31)
        },
        L: {
            g:0,
            c:null,
            s:"(?:1|0)"
        },
        o: function() {
            return $f("Y");
        },
        Y: {
            g:1,
            c:"y = parseInt(results[{0}], 10);\n",
            s:"(\\d{4})" // 4-digit year
        },
        y: {
            g:1,
            c:"var ty = parseInt(results[{0}], 10);\n"
                + "y = ty > Date.y2kYear ? 1900 + ty : 2000 + ty;\n", // 2-digit year
            s:"(\\d{1,2})"
        },
        /**
         * In the am/pm parsing routines, we allow both upper and lower case 
         * even though it doesn't exactly match the spec. It gives much more flexibility
         * in being able to specify case insensitive regexes.
         */
        a: function(){
            return $f("A");
        },
        A: {
            // We need to calculate the hour before we apply AM/PM when parsing
            calcLast: true,
            g:1,
            c:"if (/(am)/i.test(results[{0}])) {\n"
                + "if (!h || h == 12) { h = 0; }\n"
                + "} else { if (!h || h < 12) { h = (h || 0) + 12; }}",
            s:"(AM|PM|am|pm)"
        },
        g: function() {
            return $f("G");
        },
        G: {
            g:1,
            c:"h = parseInt(results[{0}], 10);\n",
            s:"(\\d{1,2})" // 24-hr format of an hour without leading zeroes (0 - 23)
        },
        h: function() {
            return $f("H");
        },
        H: {
            g:1,
            c:"h = parseInt(results[{0}], 10);\n",
            s:"(\\d{2})" //  24-hr format of an hour with leading zeroes (00 - 23)
        },
        i: {
            g:1,
            c:"i = parseInt(results[{0}], 10);\n",
            s:"(\\d{2})" // minutes with leading zeros (00 - 59)
        },
        s: {
            g:1,
            c:"s = parseInt(results[{0}], 10);\n",
            s:"(\\d{2})" // seconds with leading zeros (00 - 59)
        },
        u: {
            g:1,
            c:"ms = results[{0}]; ms = parseInt(ms, 10)/Math.pow(10, ms.length - 3);\n",
            s:"(\\d+)" // decimal fraction of a second (minimum = 1 digit, maximum = unlimited)
        },
        O: {
            g:1,
            c:[
                "o = results[{0}];",
                "var sn = o.substring(0,1),", // get + / - sign
                    "hr = o.substring(1,3)*1 + Math.floor(o.substring(3,5) / 60),", // get hours (performs minutes-to-hour conversion also, just in case)
                    "mn = o.substring(3,5) % 60;", // get minutes
                "o = ((-12 <= (hr*60 + mn)/60) && ((hr*60 + mn)/60 <= 14))? (sn + String.leftPad(hr, 2, '0') + String.leftPad(mn, 2, '0')) : null;\n" // -12hrs <= GMT offset <= 14hrs
            ].join("\n"),
            s: "([+\-]\\d{4})" // GMT offset in hrs and mins
        },
        P: {
            g:1,
            c:[
                "o = results[{0}];",
                "var sn = o.substring(0,1),", // get + / - sign
                    "hr = o.substring(1,3)*1 + Math.floor(o.substring(4,6) / 60),", // get hours (performs minutes-to-hour conversion also, just in case)
                    "mn = o.substring(4,6) % 60;", // get minutes
                "o = ((-12 <= (hr*60 + mn)/60) && ((hr*60 + mn)/60 <= 14))? (sn + String.leftPad(hr, 2, '0') + String.leftPad(mn, 2, '0')) : null;\n" // -12hrs <= GMT offset <= 14hrs
            ].join("\n"),
            s: "([+\-]\\d{2}:\\d{2})" // GMT offset in hrs and mins (with colon separator)
        },
        T: {
            g:0,
            c:null,
            s:"[A-Z]{1,4}" // timezone abbrev. may be between 1 - 4 chars
        },
        Z: {
            g:1,
            c:"zz = results[{0}] * 1;\n" // -43200 <= UTC offset <= 50400
                  + "zz = (-43200 <= zz && zz <= 50400)? zz : null;\n",
            s:"([+\-]?\\d{1,5})" // leading '+' sign is optional for UTC offset
        },
        c: function() {
            var calc = [],
                arr = [
                    $f("Y", 1), // year
                    $f("m", 2), // month
                    $f("d", 3), // day
                    $f("h", 4), // hour
                    $f("i", 5), // minute
                    $f("s", 6), // second
                    {c:"ms = results[7] || '0'; ms = parseInt(ms, 10)/Math.pow(10, ms.length - 3);\n"}, // decimal fraction of a second (minimum = 1 digit, maximum = unlimited)
                    {c:[ // allow either "Z" (i.e. UTC) or "-0530" or "+08:00" (i.e. UTC offset) timezone delimiters. assumes local timezone if no timezone is specified
                        "if(results[8]) {", // timezone specified
                            "if(results[8] == 'Z'){",
                                "zz = 0;", // UTC
                            "}else if (results[8].indexOf(':') > -1){",
                                $f("P", 8).c, // timezone offset with colon separator
                            "}else{",
                                $f("O", 8).c, // timezone offset without colon separator
                            "}",
                        "}"
                    ].join('\n')}
                ];

            for (var i = 0, l = arr.length; i < l; ++i) {
                calc.push(arr[i].c);
            }

            return {
                g:1,
                c:calc.join(""),
                s:[
                    arr[0].s, // year (required)
                    "(?:", "-", arr[1].s, // month (optional)
                        "(?:", "-", arr[2].s, // day (optional)
                            "(?:",
                                "(?:T| )?", // time delimiter -- either a "T" or a single blank space
                                arr[3].s, ":", arr[4].s,  // hour AND minute, delimited by a single colon (optional). MUST be preceded by either a "T" or a single blank space
                                "(?::", arr[5].s, ")?", // seconds (optional)
                                "(?:(?:\\.|,)(\\d+))?", // decimal fraction of a second (e.g. ",12345" or ".98765") (optional)
                                "(Z|(?:[-+]\\d{2}(?::)?\\d{2}))?", // "Z" (UTC) or "-0530" (UTC offset without colon delimiter) or "+08:00" (UTC offset with colon delimiter) (optional)
                            ")?",
                        ")?",
                    ")?"
                ].join("")
            };
        },
        U: {
            g:1,
            c:"u = parseInt(results[{0}], 10);\n",
            s:"(-?\\d+)" // leading minus sign indicates seconds before UNIX epoch
        }
    }
});

}());

Ext.apply(Date.prototype, {
    // private
    dateFormat : function(format) {
        if (Date.formatFunctions[format] == null) {
            Date.createFormat(format);
        }
        return Date.formatFunctions[format].call(this);
    },

    /**
     * Get the timezone abbreviation of the current date (equivalent to the format specifier 'T').
     *
     * Note: The date string returned by the javascript Date object's toString() method varies
     * between browsers (e.g. FF vs IE) and system region settings (e.g. IE in Asia vs IE in America).
     * For a given date string e.g. "Thu Oct 25 2007 22:55:35 GMT+0800 (Malay Peninsula Standard Time)",
     * getTimezone() first tries to get the timezone abbreviation from between a pair of parentheses
     * (which may or may not be present), failing which it proceeds to get the timezone abbreviation
     * from the GMT offset portion of the date string.
     * @return {String} The abbreviated timezone name (e.g. 'CST', 'PDT', 'EDT', 'MPST' ...).
     */
    getTimezone : function() {
        // the following list shows the differences between date strings from different browsers on a WinXP SP2 machine from an Asian locale:
        //
        // Opera  : "Thu, 25 Oct 2007 22:53:45 GMT+0800" -- shortest (weirdest) date string of the lot
        // Safari : "Thu Oct 25 2007 22:55:35 GMT+0800 (Malay Peninsula Standard Time)" -- value in parentheses always gives the correct timezone (same as FF)
        // FF     : "Thu Oct 25 2007 22:55:35 GMT+0800 (Malay Peninsula Standard Time)" -- value in parentheses always gives the correct timezone
        // IE     : "Thu Oct 25 22:54:35 UTC+0800 2007" -- (Asian system setting) look for 3-4 letter timezone abbrev
        // IE     : "Thu Oct 25 17:06:37 PDT 2007" -- (American system setting) look for 3-4 letter timezone abbrev
        //
        // this crazy regex attempts to guess the correct timezone abbreviation despite these differences.
        // step 1: (?:\((.*)\) -- find timezone in parentheses
        // step 2: ([A-Z]{1,4})(?:[\-+][0-9]{4})?(?: -?\d+)?) -- if nothing was found in step 1, find timezone from timezone offset portion of date string
        // step 3: remove all non uppercase characters found in step 1 and 2
        return this.toString().replace(/^.* (?:\((.*)\)|([A-Z]{1,4})(?:[\-+][0-9]{4})?(?: -?\d+)?)$/, "$1$2").replace(/[^A-Z]/g, "");
    },

    /**
     * Get the offset from GMT of the current date (equivalent to the format specifier 'O').
     * @param {Boolean} colon (optional) true to separate the hours and minutes with a colon (defaults to false).
     * @return {String} The 4-character offset string prefixed with + or - (e.g. '-0600').
     */
    getGMTOffset : function(colon) {
        return (this.getTimezoneOffset() > 0 ? "-" : "+")
            + String.leftPad(Math.floor(Math.abs(this.getTimezoneOffset()) / 60), 2, "0")
            + (colon ? ":" : "")
            + String.leftPad(Math.abs(this.getTimezoneOffset() % 60), 2, "0");
    },

    /**
     * Get the numeric day number of the year, adjusted for leap year.
     * @return {Number} 0 to 364 (365 in leap years).
     */
    getDayOfYear: function() {
        var num = 0,
            d = this.clone(),
            m = this.getMonth(),
            i;

        for (i = 0, d.setDate(1), d.setMonth(0); i < m; d.setMonth(++i)) {
            num += d.getDaysInMonth();
        }
        return num + this.getDate() - 1;
    },

    /**
     * Get the numeric ISO-8601 week number of the year.
     * (equivalent to the format specifier 'W', but without a leading zero).
     * @return {Number} 1 to 53
     */
    getWeekOfYear : function() {
        // adapted from http://www.merlyn.demon.co.uk/weekcalc.htm
        var ms1d = 864e5, // milliseconds in a day
            ms7d = 7 * ms1d; // milliseconds in a week

        return function() { // return a closure so constants get calculated only once
            var DC3 = Date.UTC(this.getFullYear(), this.getMonth(), this.getDate() + 3) / ms1d, // an Absolute Day Number
                AWN = Math.floor(DC3 / 7), // an Absolute Week Number
                Wyr = new Date(AWN * ms7d).getUTCFullYear();

            return AWN - Math.floor(Date.UTC(Wyr, 0, 7) / ms7d) + 1;
        };
    }(),

    /**
     * Checks if the current date falls within a leap year.
     * @return {Boolean} True if the current date falls within a leap year, false otherwise.
     */
    isLeapYear : function() {
        var year = this.getFullYear();
        return !!((year & 3) == 0 && (year % 100 || (year % 400 == 0 && year)));
    },

    /**
     * Get the first day of the current month, adjusted for leap year.  The returned value
     * is the numeric day index within the week (0-6) which can be used in conjunction with
     * the {@link #monthNames} array to retrieve the textual day name.
     * Example:
     * <pre><code>
var dt = new Date('1/10/2007');
document.write(Date.dayNames[dt.getFirstDayOfMonth()]); //output: 'Monday'
</code></pre>
     * @return {Number} The day number (0-6).
     */
    getFirstDayOfMonth : function() {
        var day = (this.getDay() - (this.getDate() - 1)) % 7;
        return (day < 0) ? (day + 7) : day;
    },

    /**
     * Get the last day of the current month, adjusted for leap year.  The returned value
     * is the numeric day index within the week (0-6) which can be used in conjunction with
     * the {@link #monthNames} array to retrieve the textual day name.
     * Example:
     * <pre><code>
var dt = new Date('1/10/2007');
document.write(Date.dayNames[dt.getLastDayOfMonth()]); //output: 'Wednesday'
</code></pre>
     * @return {Number} The day number (0-6).
     */
    getLastDayOfMonth : function() {
        return this.getLastDateOfMonth().getDay();
    },


    /**
     * Get the date of the first day of the month in which this date resides.
     * @return {Date}
     */
    getFirstDateOfMonth : function() {
        return new Date(this.getFullYear(), this.getMonth(), 1);
    },

    /**
     * Get the date of the last day of the month in which this date resides.
     * @return {Date}
     */
    getLastDateOfMonth : function() {
        return new Date(this.getFullYear(), this.getMonth(), this.getDaysInMonth());
    },

    /**
     * Get the number of days in the current month, adjusted for leap year.
     * @return {Number} The number of days in the month.
     */
    getDaysInMonth: function() {
        var daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

        return function() { // return a closure for efficiency
            var m = this.getMonth();

            return m == 1 && this.isLeapYear() ? 29 : daysInMonth[m];
        };
    }(),

    /**
     * Get the English ordinal suffix of the current day (equivalent to the format specifier 'S').
     * @return {String} 'st, 'nd', 'rd' or 'th'.
     */
    getSuffix : function() {
        switch (this.getDate()) {
            case 1:
            case 21:
            case 31:
                return "st";
            case 2:
            case 22:
                return "nd";
            case 3:
            case 23:
                return "rd";
            default:
                return "th";
        }
    },

    /**
     * Creates and returns a new Date instance with the exact same date value as the called instance.
     * Dates are copied and passed by reference, so if a copied date variable is modified later, the original
     * variable will also be changed.  When the intention is to create a new variable that will not
     * modify the original instance, you should create a clone.
     *
     * Example of correctly cloning a date:
     * <pre><code>
//wrong way:
var orig = new Date('10/1/2006');
var copy = orig;
copy.setDate(5);
document.write(orig);  //returns 'Thu Oct 05 2006'!

//correct way:
var orig = new Date('10/1/2006');
var copy = orig.clone();
copy.setDate(5);
document.write(orig);  //returns 'Thu Oct 01 2006'
</code></pre>
     * @return {Date} The new Date instance.
     */
    clone : function() {
        return new Date(this.getTime());
    },

    /**
     * Checks if the current date is affected by Daylight Saving Time (DST).
     * @return {Boolean} True if the current date is affected by DST.
     */
    isDST : function() {
        // adapted from http://extjs.com/forum/showthread.php?p=247172#post247172
        // courtesy of @geoffrey.mcgill
        return new Date(this.getFullYear(), 0, 1).getTimezoneOffset() != this.getTimezoneOffset();
    },

    /**
     * Attempts to clear all time information from this Date by setting the time to midnight of the same day,
     * automatically adjusting for Daylight Saving Time (DST) where applicable.
     * (note: DST timezone information for the browser's host operating system is assumed to be up-to-date)
     * @param {Boolean} clone true to create a clone of this date, clear the time and return it (defaults to false).
     * @return {Date} this or the clone.
     */
    clearTime : function(clone) {
        if (clone) {
            return this.clone().clearTime();
        }

        // get current date before clearing time
        var d = this.getDate();

        // clear time
        this.setHours(0);
        this.setMinutes(0);
        this.setSeconds(0);
        this.setMilliseconds(0);

        if (this.getDate() != d) { // account for DST (i.e. day of month changed when setting hour = 0)
            // note: DST adjustments are assumed to occur in multiples of 1 hour (this is almost always the case)
            // refer to http://www.timeanddate.com/time/aboutdst.html for the (rare) exceptions to this rule

            // increment hour until cloned date == current date
            for (var hr = 1, c = this.add(Date.HOUR, hr); c.getDate() != d; hr++, c = this.add(Date.HOUR, hr));

            this.setDate(d);
            this.setHours(c.getHours());
        }

        return this;
    },

    /**
     * Provides a convenient method for performing basic date arithmetic. This method
     * does not modify the Date instance being called - it creates and returns
     * a new Date instance containing the resulting date value.
     *
     * Examples:
     * <pre><code>
// Basic usage:
var dt = new Date('10/29/2006').add(Date.DAY, 5);
document.write(dt); //returns 'Fri Nov 03 2006 00:00:00'

// Negative values will be subtracted:
var dt2 = new Date('10/1/2006').add(Date.DAY, -5);
document.write(dt2); //returns 'Tue Sep 26 2006 00:00:00'

// You can even chain several calls together in one line:
var dt3 = new Date('10/1/2006').add(Date.DAY, 5).add(Date.HOUR, 8).add(Date.MINUTE, -30);
document.write(dt3); //returns 'Fri Oct 06 2006 07:30:00'
</code></pre>
     *
     * @param {String} interval A valid date interval enum value.
     * @param {Number} value The amount to add to the current date.
     * @return {Date} The new Date instance.
     */
    add : function(interval, value) {
        var d = this.clone();
        if (!interval || value === 0) return d;

        switch(interval.toLowerCase()) {
            case Date.MILLI:
                d.setMilliseconds(this.getMilliseconds() + value);
                break;
            case Date.SECOND:
                d.setSeconds(this.getSeconds() + value);
                break;
            case Date.MINUTE:
                d.setMinutes(this.getMinutes() + value);
                break;
            case Date.HOUR:
                d.setHours(this.getHours() + value);
                break;
            case Date.DAY:
                d.setDate(this.getDate() + value);
                break;
            case Date.MONTH:
                var day = this.getDate();
                if (day > 28) {
                    day = Math.min(day, this.getFirstDateOfMonth().add('mo', value).getLastDateOfMonth().getDate());
                }
                d.setDate(day);
                d.setMonth(this.getMonth() + value);
                break;
            case Date.YEAR:
                d.setFullYear(this.getFullYear() + value);
                break;
        }
        return d;
    },

    /**
     * Checks if this date falls on or between the given start and end dates.
     * @param {Date} start Start date
     * @param {Date} end End date
     * @return {Boolean} true if this date falls on or between the given start and end dates.
     */
    between : function(start, end) {
        var t = this.getTime();
        return start.getTime() <= t && t <= end.getTime();
    }
});


/**
 * Formats a date given the supplied format string.
 * @param {String} format The format string.
 * @return {String} The formatted date.
 * @method format
 */
Date.prototype.format = Date.prototype.dateFormat;


// private
if (Ext.isSafari && (navigator.userAgent.match(/WebKit\/(\d+)/)[1] || NaN) < 420) {
    Ext.apply(Date.prototype, {
        _xMonth : Date.prototype.setMonth,
        _xDate  : Date.prototype.setDate,

        // Bug in Safari 1.3, 2.0 (WebKit build < 420)
        // Date.setMonth does not work consistently if iMonth is not 0-11
        setMonth : function(num) {
            if (num <= -1) {
                var n = Math.ceil(-num),
                    back_year = Math.ceil(n / 12),
                    month = (n % 12) ? 12 - n % 12 : 0;

                this.setFullYear(this.getFullYear() - back_year);

                return this._xMonth(month);
            } else {
                return this._xMonth(num);
            }
        },

        // Bug in setDate() method (resolved in WebKit build 419.3, so to be safe we target Webkit builds < 420)
        // The parameter for Date.setDate() is converted to a signed byte integer in Safari
        // http://brianary.blogspot.com/2006/03/safari-date-bug.html
        setDate : function(d) {
            // use setTime() to workaround setDate() bug
            // subtract current day of month in milliseconds, then add desired day of month in milliseconds
            return this.setTime(this.getTime() - (this.getDate() - d) * 864e5);
        }
    });
}



/* Some basic Date tests... (requires Firebug)

Date.parseDate('', 'c'); // call Date.parseDate() once to force computation of regex string so we can console.log() it
console.log('Insane Regex for "c" format: %o', Date.parseCodes.c.s); // view the insane regex for the "c" format specifier

// standard tests
console.group('Standard Date.parseDate() Tests');
    console.log('Date.parseDate("2009-01-05T11:38:56", "c")               = %o', Date.parseDate("2009-01-05T11:38:56", "c")); // assumes browser's timezone setting
    console.log('Date.parseDate("2009-02-04T12:37:55.001000", "c")        = %o', Date.parseDate("2009-02-04T12:37:55.001000", "c")); // assumes browser's timezone setting
    console.log('Date.parseDate("2009-03-03T13:36:54,101000Z", "c")       = %o', Date.parseDate("2009-03-03T13:36:54,101000Z", "c")); // UTC
    console.log('Date.parseDate("2009-04-02T14:35:53.901000-0530", "c")   = %o', Date.parseDate("2009-04-02T14:35:53.901000-0530", "c")); // GMT-0530
    console.log('Date.parseDate("2009-05-01T15:34:52,9876000+08:00", "c") = %o', Date.parseDate("2009-05-01T15:34:52,987600+08:00", "c")); // GMT+08:00
console.groupEnd();

// ISO-8601 format as specified in http://www.w3.org/TR/NOTE-datetime
// -- accepts ALL 6 levels of date-time granularity
console.group('ISO-8601 Granularity Test (see http://www.w3.org/TR/NOTE-datetime)');
    console.log('Date.parseDate("1997", "c")                              = %o', Date.parseDate("1997", "c")); // YYYY (e.g. 1997)
    console.log('Date.parseDate("1997-07", "c")                           = %o', Date.parseDate("1997-07", "c")); // YYYY-MM (e.g. 1997-07)
    console.log('Date.parseDate("1997-07-16", "c")                        = %o', Date.parseDate("1997-07-16", "c")); // YYYY-MM-DD (e.g. 1997-07-16)
    console.log('Date.parseDate("1997-07-16T19:20+01:00", "c")            = %o', Date.parseDate("1997-07-16T19:20+01:00", "c")); // YYYY-MM-DDThh:mmTZD (e.g. 1997-07-16T19:20+01:00)
    console.log('Date.parseDate("1997-07-16T19:20:30+01:00", "c")         = %o', Date.parseDate("1997-07-16T19:20:30+01:00", "c")); // YYYY-MM-DDThh:mm:ssTZD (e.g. 1997-07-16T19:20:30+01:00)
    console.log('Date.parseDate("1997-07-16T19:20:30.45+01:00", "c")      = %o', Date.parseDate("1997-07-16T19:20:30.45+01:00", "c")); // YYYY-MM-DDThh:mm:ss.sTZD (e.g. 1997-07-16T19:20:30.45+01:00)
    console.log('Date.parseDate("1997-07-16 19:20:30.45+01:00", "c")      = %o', Date.parseDate("1997-07-16 19:20:30.45+01:00", "c")); // YYYY-MM-DD hh:mm:ss.sTZD (e.g. 1997-07-16T19:20:30.45+01:00)
    console.log('Date.parseDate("1997-13-16T19:20:30.45+01:00", "c", true)= %o', Date.parseDate("1997-13-16T19:20:30.45+01:00", "c", true)); // strict date parsing with invalid month value
console.groupEnd();

*/
/**
 * @class Ext.util.MixedCollection
 * @extends Ext.util.Observable
 * A Collection class that maintains both numeric indexes and keys and exposes events.
 * @constructor
 * @param {Boolean} allowFunctions Specify <tt>true</tt> if the {@link #addAll}
 * function should add function references to the collection. Defaults to
 * <tt>false</tt>.
 * @param {Function} keyFn A function that can accept an item of the type(s) stored in this MixedCollection
 * and return the key value for that item.  This is used when available to look up the key on items that
 * were passed without an explicit key parameter to a MixedCollection method.  Passing this parameter is
 * equivalent to providing an implementation for the {@link #getKey} method.
 */
Ext.util.MixedCollection = function(allowFunctions, keyFn){
    this.items = [];
    this.map = {};
    this.keys = [];
    this.length = 0;
    this.addEvents(
        /**
         * @event clear
         * Fires when the collection is cleared.
         */
        'clear',
        /**
         * @event add
         * Fires when an item is added to the collection.
         * @param {Number} index The index at which the item was added.
         * @param {Object} o The item added.
         * @param {String} key The key associated with the added item.
         */
        'add',
        /**
         * @event replace
         * Fires when an item is replaced in the collection.
         * @param {String} key he key associated with the new added.
         * @param {Object} old The item being replaced.
         * @param {Object} new The new item.
         */
        'replace',
        /**
         * @event remove
         * Fires when an item is removed from the collection.
         * @param {Object} o The item being removed.
         * @param {String} key (optional) The key associated with the removed item.
         */
        'remove',
        'sort'
    );
    this.allowFunctions = allowFunctions === true;
    if(keyFn){
        this.getKey = keyFn;
    }
    Ext.util.MixedCollection.superclass.constructor.call(this);
};

Ext.extend(Ext.util.MixedCollection, Ext.util.Observable, {

    /**
     * @cfg {Boolean} allowFunctions Specify <tt>true</tt> if the {@link #addAll}
     * function should add function references to the collection. Defaults to
     * <tt>false</tt>.
     */
    allowFunctions : false,

    /**
     * Adds an item to the collection. Fires the {@link #add} event when complete.
     * @param {String} key <p>The key to associate with the item, or the new item.</p>
     * <p>If a {@link #getKey} implementation was specified for this MixedCollection,
     * or if the key of the stored items is in a property called <tt><b>id</b></tt>,
     * the MixedCollection will be able to <i>derive</i> the key for the new item.
     * In this case just pass the new item in this parameter.</p>
     * @param {Object} o The item to add.
     * @return {Object} The item added.
     */
    add : function(key, o){
        if(arguments.length == 1){
            o = arguments[0];
            key = this.getKey(o);
        }
        if(typeof key != 'undefined' && key !== null){
            var old = this.map[key];
            if(typeof old != 'undefined'){
                return this.replace(key, o);
            }
            this.map[key] = o;
        }
        this.length++;
        this.items.push(o);
        this.keys.push(key);
        this.fireEvent('add', this.length-1, o, key);
        return o;
    },

    /**
      * MixedCollection has a generic way to fetch keys if you implement getKey.  The default implementation
      * simply returns <b><code>item.id</code></b> but you can provide your own implementation
      * to return a different value as in the following examples:<pre><code>
// normal way
var mc = new Ext.util.MixedCollection();
mc.add(someEl.dom.id, someEl);
mc.add(otherEl.dom.id, otherEl);
//and so on

// using getKey
var mc = new Ext.util.MixedCollection();
mc.getKey = function(el){
   return el.dom.id;
};
mc.add(someEl);
mc.add(otherEl);

// or via the constructor
var mc = new Ext.util.MixedCollection(false, function(el){
   return el.dom.id;
});
mc.add(someEl);
mc.add(otherEl);
     * </code></pre>
     * @param {Object} item The item for which to find the key.
     * @return {Object} The key for the passed item.
     */
    getKey : function(o){
         return o.id;
    },

    /**
     * Replaces an item in the collection. Fires the {@link #replace} event when complete.
     * @param {String} key <p>The key associated with the item to replace, or the replacement item.</p>
     * <p>If you supplied a {@link #getKey} implementation for this MixedCollection, or if the key
     * of your stored items is in a property called <tt><b>id</b></tt>, then the MixedCollection
     * will be able to <i>derive</i> the key of the replacement item. If you want to replace an item
     * with one having the same key value, then just pass the replacement item in this parameter.</p>
     * @param o {Object} o (optional) If the first parameter passed was a key, the item to associate
     * with that key.
     * @return {Object}  The new item.
     */
    replace : function(key, o){
        if(arguments.length == 1){
            o = arguments[0];
            key = this.getKey(o);
        }
        var old = this.map[key];
        if(typeof key == 'undefined' || key === null || typeof old == 'undefined'){
             return this.add(key, o);
        }
        var index = this.indexOfKey(key);
        this.items[index] = o;
        this.map[key] = o;
        this.fireEvent('replace', key, old, o);
        return o;
    },

    /**
     * Adds all elements of an Array or an Object to the collection.
     * @param {Object/Array} objs An Object containing properties which will be added
     * to the collection, or an Array of values, each of which are added to the collection.
     * Functions references will be added to the collection if <code>{@link #allowFunctions}</code>
     * has been set to <tt>true</tt>.
     */
    addAll : function(objs){
        if(arguments.length > 1 || Ext.isArray(objs)){
            var args = arguments.length > 1 ? arguments : objs;
            for(var i = 0, len = args.length; i < len; i++){
                this.add(args[i]);
            }
        }else{
            for(var key in objs){
                if(this.allowFunctions || typeof objs[key] != 'function'){
                    this.add(key, objs[key]);
                }
            }
        }
    },

    /**
     * Executes the specified function once for every item in the collection, passing the following arguments:
     * <div class="mdetail-params"><ul>
     * <li><b>item</b> : Mixed<p class="sub-desc">The collection item</p></li>
     * <li><b>index</b> : Number<p class="sub-desc">The item's index</p></li>
     * <li><b>length</b> : Number<p class="sub-desc">The total number of items in the collection</p></li>
     * </ul></div>
     * The function should return a boolean value. Returning false from the function will stop the iteration.
     * @param {Function} fn The function to execute for each item.
     * @param {Object} scope (optional) The scope (<code>this</code> reference) in which the function is executed. Defaults to the current item in the iteration.
     */
    each : function(fn, scope){
        var items = [].concat(this.items); // each safe for removal
        for(var i = 0, len = items.length; i < len; i++){
            if(fn.call(scope || items[i], items[i], i, len) === false){
                break;
            }
        }
    },

    /**
     * Executes the specified function once for every key in the collection, passing each
     * key, and its associated item as the first two parameters.
     * @param {Function} fn The function to execute for each item.
     * @param {Object} scope (optional) The scope (<code>this</code> reference) in which the function is executed. Defaults to the browser window.
     */
    eachKey : function(fn, scope){
        for(var i = 0, len = this.keys.length; i < len; i++){
            fn.call(scope || window, this.keys[i], this.items[i], i, len);
        }
    },

    /**
     * Returns the first item in the collection which elicits a true return value from the
     * passed selection function.
     * @param {Function} fn The selection function to execute for each item.
     * @param {Object} scope (optional) The scope (<code>this</code> reference) in which the function is executed. Defaults to the browser window.
     * @return {Object} The first item in the collection which returned true from the selection function.
     */
    find : function(fn, scope){
        for(var i = 0, len = this.items.length; i < len; i++){
            if(fn.call(scope || window, this.items[i], this.keys[i])){
                return this.items[i];
            }
        }
        return null;
    },

    /**
     * Inserts an item at the specified index in the collection. Fires the {@link #add} event when complete.
     * @param {Number} index The index to insert the item at.
     * @param {String} key The key to associate with the new item, or the item itself.
     * @param {Object} o (optional) If the second parameter was a key, the new item.
     * @return {Object} The item inserted.
     */
    insert : function(index, key, o){
        if(arguments.length == 2){
            o = arguments[1];
            key = this.getKey(o);
        }
        if(this.containsKey(key)){
            this.suspendEvents();
            this.removeKey(key);
            this.resumeEvents();
        }
        if(index >= this.length){
            return this.add(key, o);
        }
        this.length++;
        this.items.splice(index, 0, o);
        if(typeof key != 'undefined' && key !== null){
            this.map[key] = o;
        }
        this.keys.splice(index, 0, key);
        this.fireEvent('add', index, o, key);
        return o;
    },

    /**
     * Remove an item from the collection.
     * @param {Object} o The item to remove.
     * @return {Object} The item removed or false if no item was removed.
     */
    remove : function(o){
        return this.removeAt(this.indexOf(o));
    },

    /**
     * Remove an item from a specified index in the collection. Fires the {@link #remove} event when complete.
     * @param {Number} index The index within the collection of the item to remove.
     * @return {Object} The item removed or false if no item was removed.
     */
    removeAt : function(index){
        if(index < this.length && index >= 0){
            this.length--;
            var o = this.items[index];
            this.items.splice(index, 1);
            var key = this.keys[index];
            if(typeof key != 'undefined'){
                delete this.map[key];
            }
            this.keys.splice(index, 1);
            this.fireEvent('remove', o, key);
            return o;
        }
        return false;
    },

    /**
     * Removed an item associated with the passed key fom the collection.
     * @param {String} key The key of the item to remove.
     * @return {Object} The item removed or false if no item was removed.
     */
    removeKey : function(key){
        return this.removeAt(this.indexOfKey(key));
    },

    /**
     * Returns the number of items in the collection.
     * @return {Number} the number of items in the collection.
     */
    getCount : function(){
        return this.length;
    },

    /**
     * Returns index within the collection of the passed Object.
     * @param {Object} o The item to find the index of.
     * @return {Number} index of the item. Returns -1 if not found.
     */
    indexOf : function(o){
        return this.items.indexOf(o);
    },

    /**
     * Returns index within the collection of the passed key.
     * @param {String} key The key to find the index of.
     * @return {Number} index of the key.
     */
    indexOfKey : function(key){
        return this.keys.indexOf(key);
    },

    /**
     * Returns the item associated with the passed key OR index.
     * Key has priority over index.  This is the equivalent
     * of calling {@link #key} first, then if nothing matched calling {@link #itemAt}.
     * @param {String/Number} key The key or index of the item.
     * @return {Object} If the item is found, returns the item.  If the item was not found, returns <tt>undefined</tt>.
     * If an item was found, but is a Class, returns <tt>null</tt>.
     */
    item : function(key){
        var mk = this.map[key],
            item = mk !== undefined ? mk : (typeof key == 'number') ? this.items[key] : undefined;
        return typeof item != 'function' || this.allowFunctions ? item : null; // for prototype!
    },

    /**
     * Returns the item at the specified index.
     * @param {Number} index The index of the item.
     * @return {Object} The item at the specified index.
     */
    itemAt : function(index){
        return this.items[index];
    },

    /**
     * Returns the item associated with the passed key.
     * @param {String/Number} key The key of the item.
     * @return {Object} The item associated with the passed key.
     */
    key : function(key){
        return this.map[key];
    },

    /**
     * Returns true if the collection contains the passed Object as an item.
     * @param {Object} o  The Object to look for in the collection.
     * @return {Boolean} True if the collection contains the Object as an item.
     */
    contains : function(o){
        return this.indexOf(o) != -1;
    },

    /**
     * Returns true if the collection contains the passed Object as a key.
     * @param {String} key The key to look for in the collection.
     * @return {Boolean} True if the collection contains the Object as a key.
     */
    containsKey : function(key){
        return typeof this.map[key] != 'undefined';
    },

    /**
     * Removes all items from the collection.  Fires the {@link #clear} event when complete.
     */
    clear : function(){
        this.length = 0;
        this.items = [];
        this.keys = [];
        this.map = {};
        this.fireEvent('clear');
    },

    /**
     * Returns the first item in the collection.
     * @return {Object} the first item in the collection..
     */
    first : function(){
        return this.items[0];
    },

    /**
     * Returns the last item in the collection.
     * @return {Object} the last item in the collection..
     */
    last : function(){
        return this.items[this.length-1];
    },

    /**
     * @private
     * Performs the actual sorting based on a direction and a sorting function. Internally,
     * this creates a temporary array of all items in the MixedCollection, sorts it and then writes
     * the sorted array data back into this.items and this.keys
     * @param {String} property Property to sort by ('key', 'value', or 'index')
     * @param {String} dir (optional) Direction to sort 'ASC' or 'DESC'. Defaults to 'ASC'.
     * @param {Function} fn (optional) Comparison function that defines the sort order.
     * Defaults to sorting by numeric value.
     */
    _sort : function(property, dir, fn){
        var i, len,
            dsc   = String(dir).toUpperCase() == 'DESC' ? -1 : 1,

            //this is a temporary array used to apply the sorting function
            c     = [],
            keys  = this.keys,
            items = this.items;

        //default to a simple sorter function if one is not provided
        fn = fn || function(a, b) {
            return a - b;
        };

        //copy all the items into a temporary array, which we will sort
        for(i = 0, len = items.length; i < len; i++){
            c[c.length] = {
                key  : keys[i],
                value: items[i],
                index: i
            };
        }

        //sort the temporary array
        c.sort(function(a, b){
            var v = fn(a[property], b[property]) * dsc;
            if(v === 0){
                v = (a.index < b.index ? -1 : 1);
            }
            return v;
        });

        //copy the temporary array back into the main this.items and this.keys objects
        for(i = 0, len = c.length; i < len; i++){
            items[i] = c[i].value;
            keys[i]  = c[i].key;
        }

        this.fireEvent('sort', this);
    },

    /**
     * Sorts this collection by <b>item</b> value with the passed comparison function.
     * @param {String} direction (optional) 'ASC' or 'DESC'. Defaults to 'ASC'.
     * @param {Function} fn (optional) Comparison function that defines the sort order.
     * Defaults to sorting by numeric value.
     */
    sort : function(dir, fn){
        this._sort('value', dir, fn);
    },

    /**
     * Reorders each of the items based on a mapping from old index to new index. Internally this
     * just translates into a sort. The 'sort' event is fired whenever reordering has occured.
     * @param {Object} mapping Mapping from old item index to new item index
     */
    reorder: function(mapping) {
        this.suspendEvents();

        var items = this.items,
            index = 0,
            length = items.length,
            order = [],
            remaining = [],
            oldIndex;

        //object of {oldPosition: newPosition} reversed to {newPosition: oldPosition}
        for (oldIndex in mapping) {
            order[mapping[oldIndex]] = items[oldIndex];
        }

        for (index = 0; index < length; index++) {
            if (mapping[index] == undefined) {
                remaining.push(items[index]);
            }
        }

        for (index = 0; index < length; index++) {
            if (order[index] == undefined) {
                order[index] = remaining.shift();
            }
        }

        this.clear();
        this.addAll(order);

        this.resumeEvents();
        this.fireEvent('sort', this);
    },

    /**
     * Sorts this collection by <b>key</b>s.
     * @param {String} direction (optional) 'ASC' or 'DESC'. Defaults to 'ASC'.
     * @param {Function} fn (optional) Comparison function that defines the sort order.
     * Defaults to sorting by case insensitive string.
     */
    keySort : function(dir, fn){
        this._sort('key', dir, fn || function(a, b){
            var v1 = String(a).toUpperCase(), v2 = String(b).toUpperCase();
            return v1 > v2 ? 1 : (v1 < v2 ? -1 : 0);
        });
    },

    /**
     * Returns a range of items in this collection
     * @param {Number} startIndex (optional) The starting index. Defaults to 0.
     * @param {Number} endIndex (optional) The ending index. Defaults to the last item.
     * @return {Array} An array of items
     */
    getRange : function(start, end){
        var items = this.items;
        if(items.length < 1){
            return [];
        }
        start = start || 0;
        end = Math.min(typeof end == 'undefined' ? this.length-1 : end, this.length-1);
        var i, r = [];
        if(start <= end){
            for(i = start; i <= end; i++) {
                r[r.length] = items[i];
            }
        }else{
            for(i = start; i >= end; i--) {
                r[r.length] = items[i];
            }
        }
        return r;
    },

    /**
     * Filter the <i>objects</i> in this collection by a specific property.
     * Returns a new collection that has been filtered.
     * @param {String} property A property on your objects
     * @param {String/RegExp} value Either string that the property values
     * should start with or a RegExp to test against the property
     * @param {Boolean} anyMatch (optional) True to match any part of the string, not just the beginning
     * @param {Boolean} caseSensitive (optional) True for case sensitive comparison (defaults to False).
     * @return {MixedCollection} The new filtered collection
     */
    filter : function(property, value, anyMatch, caseSensitive){
        if(Ext.isEmpty(value, false)){
            return this.clone();
        }
        value = this.createValueMatcher(value, anyMatch, caseSensitive);
        return this.filterBy(function(o){
            return o && value.test(o[property]);
        });
    },

    /**
     * Filter by a function. Returns a <i>new</i> collection that has been filtered.
     * The passed function will be called with each object in the collection.
     * If the function returns true, the value is included otherwise it is filtered.
     * @param {Function} fn The function to be called, it will receive the args o (the object), k (the key)
     * @param {Object} scope (optional) The scope (<code>this</code> reference) in which the function is executed. Defaults to this MixedCollection.
     * @return {MixedCollection} The new filtered collection
     */
    filterBy : function(fn, scope){
        var r = new Ext.util.MixedCollection();
        r.getKey = this.getKey;
        var k = this.keys, it = this.items;
        for(var i = 0, len = it.length; i < len; i++){
            if(fn.call(scope||this, it[i], k[i])){
                r.add(k[i], it[i]);
            }
        }
        return r;
    },

    /**
     * Finds the index of the first matching object in this collection by a specific property/value.
     * @param {String} property The name of a property on your objects.
     * @param {String/RegExp} value A string that the property values
     * should start with or a RegExp to test against the property.
     * @param {Number} start (optional) The index to start searching at (defaults to 0).
     * @param {Boolean} anyMatch (optional) True to match any part of the string, not just the beginning.
     * @param {Boolean} caseSensitive (optional) True for case sensitive comparison.
     * @return {Number} The matched index or -1
     */
    findIndex : function(property, value, start, anyMatch, caseSensitive){
        if(Ext.isEmpty(value, false)){
            return -1;
        }
        value = this.createValueMatcher(value, anyMatch, caseSensitive);
        return this.findIndexBy(function(o){
            return o && value.test(o[property]);
        }, null, start);
    },

    /**
     * Find the index of the first matching object in this collection by a function.
     * If the function returns <i>true</i> it is considered a match.
     * @param {Function} fn The function to be called, it will receive the args o (the object), k (the key).
     * @param {Object} scope (optional) The scope (<code>this</code> reference) in which the function is executed. Defaults to this MixedCollection.
     * @param {Number} start (optional) The index to start searching at (defaults to 0).
     * @return {Number} The matched index or -1
     */
    findIndexBy : function(fn, scope, start){
        var k = this.keys, it = this.items;
        for(var i = (start||0), len = it.length; i < len; i++){
            if(fn.call(scope||this, it[i], k[i])){
                return i;
            }
        }
        return -1;
    },

    /**
     * Returns a regular expression based on the given value and matching options. This is used internally for finding and filtering,
     * and by Ext.data.Store#filter
     * @private
     * @param {String} value The value to create the regex for. This is escaped using Ext.escapeRe
     * @param {Boolean} anyMatch True to allow any match - no regex start/end line anchors will be added. Defaults to false
     * @param {Boolean} caseSensitive True to make the regex case sensitive (adds 'i' switch to regex). Defaults to false.
     * @param {Boolean} exactMatch True to force exact match (^ and $ characters added to the regex). Defaults to false. Ignored if anyMatch is true.
     */
    createValueMatcher : function(value, anyMatch, caseSensitive, exactMatch) {
        if (!value.exec) { // not a regex
            var er = Ext.escapeRe;
            value = String(value);

            if (anyMatch === true) {
                value = er(value);
            } else {
                value = '^' + er(value);
                if (exactMatch === true) {
                    value += '$';
                }
            }
            value = new RegExp(value, caseSensitive ? '' : 'i');
         }
         return value;
    },

    /**
     * Creates a shallow copy of this collection
     * @return {MixedCollection}
     */
    clone : function(){
        var r = new Ext.util.MixedCollection();
        var k = this.keys, it = this.items;
        for(var i = 0, len = it.length; i < len; i++){
            r.add(k[i], it[i]);
        }
        r.getKey = this.getKey;
        return r;
    }
});
/**
 * This method calls {@link #item item()}.
 * Returns the item associated with the passed key OR index. Key has priority
 * over index.  This is the equivalent of calling {@link #key} first, then if
 * nothing matched calling {@link #itemAt}.
 * @param {String/Number} key The key or index of the item.
 * @return {Object} If the item is found, returns the item.  If the item was
 * not found, returns <tt>undefined</tt>. If an item was found, but is a Class,
 * returns <tt>null</tt>.
 */
Ext.util.MixedCollection.prototype.get = Ext.util.MixedCollection.prototype.item;
/**
 * @class Ext.AbstractManager
 * @extends Object
 * Base Manager class - extended by ComponentMgr and PluginMgr
 */
Ext.AbstractManager = Ext.extend(Object, {
    typeName: 'type',
    
    constructor: function(config) {
        Ext.apply(this, config || {});
        
        /**
         * Contains all of the items currently managed
         * @property all
         * @type Ext.util.MixedCollection
         */
        this.all = new Ext.util.MixedCollection();
        
        this.types = {};
    },
    
    /**
     * Returns a component by {@link Ext.Component#id id}.
     * For additional details see {@link Ext.util.MixedCollection#get}.
     * @param {String} id The component {@link Ext.Component#id id}
     * @return Ext.Component The Component, <code>undefined</code> if not found, or <code>null</code> if a
     * Class was found.
     */
    get : function(id){
        return this.all.get(id);
    },
    
    /**
     * Registers an item to be managed
     * @param {Mixed} item The item to register
     */
    register: function(item) {
        this.all.add(item);
    },
    
    /**
     * Unregisters a component by removing it from this manager
     * @param {Mixed} item The item to unregister
     */
    unregister: function(item) {
        this.all.remove(item);        
    },
    
    /**
     * <p>Registers a new Component constructor, keyed by a new
     * {@link Ext.Component#xtype}.</p>
     * <p>Use this method (or its alias {@link Ext#reg Ext.reg}) to register new
     * subclasses of {@link Ext.Component} so that lazy instantiation may be used when specifying
     * child Components.
     * see {@link Ext.Container#items}</p>
     * @param {String} xtype The mnemonic string by which the Component class may be looked up.
     * @param {Constructor} cls The new Component class.
     */
    registerType : function(type, cls){
        this.types[type] = cls;
        cls[this.typeName] = type;
    },
    
    /**
     * Checks if a Component type is registered.
     * @param {Ext.Component} xtype The mnemonic string by which the Component class may be looked up
     * @return {Boolean} Whether the type is registered.
     */
    isRegistered : function(type){
        return this.types[type] !== undefined;    
    },
    
    /**
     * Creates and returns an instance of whatever this manager manages, based on the supplied type and config object
     * @param {Object} config The config object
     * @param {String} defaultType If no type is discovered in the config object, we fall back to this type
     * @return {Mixed} The instance of whatever this manager is managing
     */
    create: function(config, defaultType) {
        var type        = config[this.typeName] || config.type || defaultType,
            Constructor = this.types[type];
        
        if (Constructor == undefined) {
            throw new Error(String.format("The '{0}' type has not been registered with this manager", type));
        }
        
        return new Constructor(config);
    },
    
    /**
     * Registers a function that will be called when a Component with the specified id is added to the manager. This will happen on instantiation.
     * @param {String} id The component {@link Ext.Component#id id}
     * @param {Function} fn The callback function
     * @param {Object} scope The scope (<code>this</code> reference) in which the callback is executed. Defaults to the Component.
     */
    onAvailable : function(id, fn, scope){
        var all = this.all;
        
        all.on("add", function(index, o){
            if (o.id == id) {
                fn.call(scope || o, o);
                all.un("add", fn, scope);
            }
        });
    }
});/**
 * @class Ext.util.Format
 * Reusable data formatting functions
 * @singleton
 */
Ext.util.Format = function() {
    var trimRe         = /^\s+|\s+$/g,
        stripTagsRE    = /<\/?[^>]+>/gi,
        stripScriptsRe = /(?:<script.*?>)((\n|\r|.)*?)(?:<\/script>)/ig,
        nl2brRe        = /\r?\n/g;

    return {
        /**
         * Truncate a string and add an ellipsis ('...') to the end if it exceeds the specified length
         * @param {String} value The string to truncate
         * @param {Number} length The maximum length to allow before truncating
         * @param {Boolean} word True to try to find a common work break
         * @return {String} The converted text
         */
        ellipsis : function(value, len, word) {
            if (value && value.length > len) {
                if (word) {
                    var vs    = value.substr(0, len - 2),
                        index = Math.max(vs.lastIndexOf(' '), vs.lastIndexOf('.'), vs.lastIndexOf('!'), vs.lastIndexOf('?'));
                    if (index == -1 || index < (len - 15)) {
                        return value.substr(0, len - 3) + "...";
                    } else {
                        return vs.substr(0, index) + "...";
                    }
                } else {
                    return value.substr(0, len - 3) + "...";
                }
            }
            return value;
        },

        /**
         * Checks a reference and converts it to empty string if it is undefined
         * @param {Mixed} value Reference to check
         * @return {Mixed} Empty string if converted, otherwise the original value
         */
        undef : function(value) {
            return value !== undefined ? value : "";
        },

        /**
         * Checks a reference and converts it to the default value if it's empty
         * @param {Mixed} value Reference to check
         * @param {String} defaultValue The value to insert of it's undefined (defaults to "")
         * @return {String}
         */
        defaultValue : function(value, defaultValue) {
            return value !== undefined && value !== '' ? value : defaultValue;
        },

        /**
         * Convert certain characters (&, <, >, and ') to their HTML character equivalents for literal display in web pages.
         * @param {String} value The string to encode
         * @return {String} The encoded text
         */
        htmlEncode : function(value) {
            return !value ? value : String(value).replace(/&/g, "&amp;").replace(/>/g, "&gt;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
        },

        /**
         * Convert certain characters (&, <, >, and ') from their HTML character equivalents.
         * @param {String} value The string to decode
         * @return {String} The decoded text
         */
        htmlDecode : function(value) {
            return !value ? value : String(value).replace(/&gt;/g, ">").replace(/&lt;/g, "<").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
        },

        /**
         * Trims any whitespace from either side of a string
         * @param {String} value The text to trim
         * @return {String} The trimmed text
         */
        trim : function(value) {
            return String(value).replace(trimRe, "");
        },

        /**
         * Returns a substring from within an original string
         * @param {String} value The original text
         * @param {Number} start The start index of the substring
         * @param {Number} length The length of the substring
         * @return {String} The substring
         */
        substr : function(value, start, length) {
            return String(value).substr(start, length);
        },

        /**
         * Converts a string to all lower case letters
         * @param {String} value The text to convert
         * @return {String} The converted text
         */
        lowercase : function(value) {
            return String(value).toLowerCase();
        },

        /**
         * Converts a string to all upper case letters
         * @param {String} value The text to convert
         * @return {String} The converted text
         */
        uppercase : function(value) {
            return String(value).toUpperCase();
        },

        /**
         * Converts the first character only of a string to upper case
         * @param {String} value The text to convert
         * @return {String} The converted text
         */
        capitalize : function(value) {
            return !value ? value : value.charAt(0).toUpperCase() + value.substr(1).toLowerCase();
        },

        // private
        call : function(value, fn) {
            if (arguments.length > 2) {
                var args = Array.prototype.slice.call(arguments, 2);
                args.unshift(value);
                return eval(fn).apply(window, args);
            } else {
                return eval(fn).call(window, value);
            }
        },

        /**
         * Format a number as US currency
         * @param {Number/String} value The numeric value to format
         * @return {String} The formatted currency string
         */
        usMoney : function(v) {
            v = (Math.round((v-0)*100))/100;
            v = (v == Math.floor(v)) ? v + ".00" : ((v*10 == Math.floor(v*10)) ? v + "0" : v);
            v = String(v);
            var ps = v.split('.'),
                whole = ps[0],
                sub = ps[1] ? '.'+ ps[1] : '.00',
                r = /(\d+)(\d{3})/;
            while (r.test(whole)) {
                whole = whole.replace(r, '$1' + ',' + '$2');
            }
            v = whole + sub;
            if (v.charAt(0) == '-') {
                return '-$' + v.substr(1);
            }
            return "$" +  v;
        },

        /**
         * Parse a value into a formatted date using the specified format pattern.
         * @param {String/Date} value The value to format (Strings must conform to the format expected by the javascript Date object's <a href="http://www.w3schools.com/jsref/jsref_parse.asp">parse()</a> method)
         * @param {String} format (optional) Any valid date format string (defaults to 'm/d/Y')
         * @return {String} The formatted date string
         */
        date : function(v, format) {
            if (!v) {
                return "";
            }
            if (!Ext.isDate(v)) {
                v = new Date(Date.parse(v));
            }
            return v.dateFormat(format || "m/d/Y");
        },

        /**
         * Returns a date rendering function that can be reused to apply a date format multiple times efficiently
         * @param {String} format Any valid date format string
         * @return {Function} The date formatting function
         */
        dateRenderer : function(format) {
            return function(v) {
                return Ext.util.Format.date(v, format);
            };
        },

        /**
         * Strips all HTML tags
         * @param {Mixed} value The text from which to strip tags
         * @return {String} The stripped text
         */
        stripTags : function(v) {
            return !v ? v : String(v).replace(stripTagsRE, "");
        },

        /**
         * Strips all script tags
         * @param {Mixed} value The text from which to strip script tags
         * @return {String} The stripped text
         */
        stripScripts : function(v) {
            return !v ? v : String(v).replace(stripScriptsRe, "");
        },

        /**
         * Simple format for a file size (xxx bytes, xxx KB, xxx MB)
         * @param {Number/String} size The numeric value to format
         * @return {String} The formatted file size
         */
        fileSize : function(size) {
            if (size < 1024) {
                return size + " bytes";
            } else if (size < 1048576) {
                return (Math.round(((size*10) / 1024))/10) + " KB";
            } else {
                return (Math.round(((size*10) / 1048576))/10) + " MB";
            }
        },

        /**
         * It does simple math for use in a template, for example:<pre><code>
         * var tpl = new Ext.Template('{value} * 10 = {value:math("* 10")}');
         * </code></pre>
         * @return {Function} A function that operates on the passed value.
         */
        math : function(){
            var fns = {};
            
            return function(v, a){
                if (!fns[a]) {
                    fns[a] = new Function('v', 'return v ' + a + ';');
                }
                return fns[a](v);
            };
        }(),

        /**
         * Rounds the passed number to the required decimal precision.
         * @param {Number/String} value The numeric value to round.
         * @param {Number} precision The number of decimal places to which to round the first parameter's value.
         * @return {Number} The rounded value.
         */
        round : function(value, precision) {
            var result = Number(value);
            if (typeof precision == 'number') {
                precision = Math.pow(10, precision);
                result = Math.round(value * precision) / precision;
            }
            return result;
        },

        /**
         * Formats the number according to the format string.
         * <div style="margin-left:40px">examples (123456.789):
         * <div style="margin-left:10px">
         * 0 - (123456) show only digits, no precision<br>
         * 0.00 - (123456.78) show only digits, 2 precision<br>
         * 0.0000 - (123456.7890) show only digits, 4 precision<br>
         * 0,000 - (123,456) show comma and digits, no precision<br>
         * 0,000.00 - (123,456.78) show comma and digits, 2 precision<br>
         * 0,0.00 - (123,456.78) shortcut method, show comma and digits, 2 precision<br>
         * To reverse the grouping (,) and decimal (.) for international numbers, add /i to the end.
         * For example: 0.000,00/i
         * </div></div>
         * @param {Number} v The number to format.
         * @param {String} format The way you would like to format this text.
         * @return {String} The formatted number.
         */
        number: function(v, format) {
            if (!format) {
                return v;
            }
            v = Ext.num(v, NaN);
            if (isNaN(v)) {
                return '';
            }
            var comma = ',',
                dec   = '.',
                i18n  = false,
                neg   = v < 0;

            v = Math.abs(v);
            if (format.substr(format.length - 2) == '/i') {
                format = format.substr(0, format.length - 2);
                i18n   = true;
                comma  = '.';
                dec    = ',';
            }

            var hasComma = format.indexOf(comma) != -1,
                psplit   = (i18n ? format.replace(/[^\d\,]/g, '') : format.replace(/[^\d\.]/g, '')).split(dec);

            if (1 < psplit.length) {
                v = v.toFixed(psplit[1].length);
            } else if(2 < psplit.length) {
                throw ('NumberFormatException: invalid format, formats should have no more than 1 period: ' + format);
            } else {
                v = v.toFixed(0);
            }

            var fnum = v.toString();

            psplit = fnum.split('.');

            if (hasComma) {
                var cnum = psplit[0], 
                    parr = [], 
                    j    = cnum.length, 
                    m    = Math.floor(j / 3),
                    n    = cnum.length % 3 || 3,
                    i;

                for (i = 0; i < j; i += n) {
                    if (i != 0) {
                        n = 3;
                    }
                    
                    parr[parr.length] = cnum.substr(i, n);
                    m -= 1;
                }
                fnum = parr.join(comma);
                if (psplit[1]) {
                    fnum += dec + psplit[1];
                }
            } else {
                if (psplit[1]) {
                    fnum = psplit[0] + dec + psplit[1];
                }
            }

            return (neg ? '-' : '') + format.replace(/[\d,?\.?]+/, fnum);
        },

        /**
         * Returns a number rendering function that can be reused to apply a number format multiple times efficiently
         * @param {String} format Any valid number format string for {@link #number}
         * @return {Function} The number formatting function
         */
        numberRenderer : function(format) {
            return function(v) {
                return Ext.util.Format.number(v, format);
            };
        },

        /**
         * Selectively do a plural form of a word based on a numeric value. For example, in a template,
         * {commentCount:plural("Comment")}  would result in "1 Comment" if commentCount was 1 or would be "x Comments"
         * if the value is 0 or greater than 1.
         * @param {Number} value The value to compare against
         * @param {String} singular The singular form of the word
         * @param {String} plural (optional) The plural form of the word (defaults to the singular with an "s")
         */
        plural : function(v, s, p) {
            return v +' ' + (v == 1 ? s : (p ? p : s+'s'));
        },

        /**
         * Converts newline characters to the HTML tag &lt;br/>
         * @param {String} The string value to format.
         * @return {String} The string with embedded &lt;br/> tags in place of newlines.
         */
        nl2br : function(v) {
            return Ext.isEmpty(v) ? '' : v.replace(nl2brRe, '<br/>');
        }
    };
}();
/**
 * @class Ext.XTemplate
 * @extends Ext.Template
 * <p>A template class that supports advanced functionality like:<div class="mdetail-params"><ul>
 * <li>Autofilling arrays using templates and sub-templates</li>
 * <li>Conditional processing with basic comparison operators</li>
 * <li>Basic math function support</li>
 * <li>Execute arbitrary inline code with special built-in template variables</li>
 * <li>Custom member functions</li>
 * <li>Many special tags and built-in operators that aren't defined as part of
 * the API, but are supported in the templates that can be created</li>
 * </ul></div></p>
 * <p>XTemplate provides the templating mechanism built into:<div class="mdetail-params"><ul>
 * <li>{@link Ext.DataView}</li>
 * <li>{@link Ext.ListView}</li>
 * <li>{@link Ext.form.ComboBox}</li>
 * <li>{@link Ext.grid.TemplateColumn}</li>
 * <li>{@link Ext.grid.GroupingView}</li>
 * <li>{@link Ext.menu.Item}</li>
 * <li>{@link Ext.layout.MenuLayout}</li>
 * <li>{@link Ext.ColorPalette}</li>
 * </ul></div></p>
 *
 * <p>For example usage {@link #XTemplate see the constructor}.</p>
 *
 * @constructor
 * The {@link Ext.Template#Template Ext.Template constructor} describes
 * the acceptable parameters to pass to the constructor. The following
 * examples demonstrate all of the supported features.</p>
 *
 * <div class="mdetail-params"><ul>
 *
 * <li><b><u>Sample Data</u></b>
 * <div class="sub-desc">
 * <p>This is the data object used for reference in each code example:</p>
 * <pre><code>
var data = {
    name: 'Jack Slocum',
    title: 'Lead Developer',
    company: 'Ext JS, LLC',
    email: 'jack@extjs.com',
    address: '4 Red Bulls Drive',
    city: 'Cleveland',
    state: 'Ohio',
    zip: '44102',
    drinks: ['Red Bull', 'Coffee', 'Water'],
    kids: [{
        name: 'Sara Grace',
        age:3
    },{
        name: 'Zachary',
        age:2
    },{
        name: 'John James',
        age:0
    }]
};
 * </code></pre>
 * </div>
 * </li>
 *
 *
 * <li><b><u>Auto filling of arrays</u></b>
 * <div class="sub-desc">
 * <p>The <b><tt>tpl</tt></b> tag and the <b><tt>for</tt></b> operator are used
 * to process the provided data object:
 * <ul>
 * <li>If the value specified in <tt>for</tt> is an array, it will auto-fill,
 * repeating the template block inside the <tt>tpl</tt> tag for each item in the
 * array.</li>
 * <li>If <tt>for="."</tt> is specified, the data object provided is examined.</li>
 * <li>While processing an array, the special variable <tt>{#}</tt>
 * will provide the current array index + 1 (starts at 1, not 0).</li>
 * </ul>
 * </p>
 * <pre><code>
&lt;tpl <b>for</b>=".">...&lt;/tpl>       // loop through array at root node
&lt;tpl <b>for</b>="foo">...&lt;/tpl>     // loop through array at foo node
&lt;tpl <b>for</b>="foo.bar">...&lt;/tpl> // loop through array at foo.bar node
 * </code></pre>
 * Using the sample data above:
 * <pre><code>
var tpl = new Ext.XTemplate(
    '&lt;p>Kids: ',
    '&lt;tpl <b>for</b>=".">',       // process the data.kids node
        '&lt;p>{#}. {name}&lt;/p>',  // use current array index to autonumber
    '&lt;/tpl>&lt;/p>'
);
tpl.overwrite(panel.body, data.kids); // pass the kids property of the data object
 * </code></pre>
 * <p>An example illustrating how the <b><tt>for</tt></b> property can be leveraged
 * to access specified members of the provided data object to populate the template:</p>
 * <pre><code>
var tpl = new Ext.XTemplate(
    '&lt;p>Name: {name}&lt;/p>',
    '&lt;p>Title: {title}&lt;/p>',
    '&lt;p>Company: {company}&lt;/p>',
    '&lt;p>Kids: ',
    '&lt;tpl <b>for="kids"</b>>',     // interrogate the kids property within the data
        '&lt;p>{name}&lt;/p>',
    '&lt;/tpl>&lt;/p>'
);
tpl.overwrite(panel.body, data);  // pass the root node of the data object
 * </code></pre>
 * <p>Flat arrays that contain values (and not objects) can be auto-rendered
 * using the special <b><tt>{.}</tt></b> variable inside a loop.  This variable
 * will represent the value of the array at the current index:</p>
 * <pre><code>
var tpl = new Ext.XTemplate(
    '&lt;p>{name}\&#39;s favorite beverages:&lt;/p>',
    '&lt;tpl for="drinks">',
       '&lt;div> - {.}&lt;/div>',
    '&lt;/tpl>'
);
tpl.overwrite(panel.body, data);
 * </code></pre>
 * <p>When processing a sub-template, for example while looping through a child array,
 * you can access the parent object's members via the <b><tt>parent</tt></b> object:</p>
 * <pre><code>
var tpl = new Ext.XTemplate(
    '&lt;p>Name: {name}&lt;/p>',
    '&lt;p>Kids: ',
    '&lt;tpl for="kids">',
        '&lt;tpl if="age > 1">',
            '&lt;p>{name}&lt;/p>',
            '&lt;p>Dad: {<b>parent</b>.name}&lt;/p>',
        '&lt;/tpl>',
    '&lt;/tpl>&lt;/p>'
);
tpl.overwrite(panel.body, data);
 * </code></pre>
 * </div>
 * </li>
 *
 *
 * <li><b><u>Conditional processing with basic comparison operators</u></b>
 * <div class="sub-desc">
 * <p>The <b><tt>tpl</tt></b> tag and the <b><tt>if</tt></b> operator are used
 * to provide conditional checks for deciding whether or not to render specific
 * parts of the template. Notes:<div class="sub-desc"><ul>
 * <li>Double quotes must be encoded if used within the conditional</li>
 * <li>There is no <tt>else</tt> operator &mdash; if needed, two opposite
 * <tt>if</tt> statements should be used.</li>
 * </ul></div>
 * <pre><code>
&lt;tpl if="age &gt; 1 &amp;&amp; age &lt; 10">Child&lt;/tpl>
&lt;tpl if="age >= 10 && age < 18">Teenager&lt;/tpl>
&lt;tpl <b>if</b>="this.isGirl(name)">...&lt;/tpl>
&lt;tpl <b>if</b>="id==\'download\'">...&lt;/tpl>
&lt;tpl <b>if</b>="needsIcon">&lt;img src="{icon}" class="{iconCls}"/>&lt;/tpl>
// no good:
&lt;tpl if="name == "Jack"">Hello&lt;/tpl>
// encode &#34; if it is part of the condition, e.g.
&lt;tpl if="name == &#38;quot;Jack&#38;quot;">Hello&lt;/tpl>
 * </code></pre>
 * Using the sample data above:
 * <pre><code>
var tpl = new Ext.XTemplate(
    '&lt;p>Name: {name}&lt;/p>',
    '&lt;p>Kids: ',
    '&lt;tpl for="kids">',
        '&lt;tpl if="age > 1">',
            '&lt;p>{name}&lt;/p>',
        '&lt;/tpl>',
    '&lt;/tpl>&lt;/p>'
);
tpl.overwrite(panel.body, data);
 * </code></pre>
 * </div>
 * </li>
 *
 *
 * <li><b><u>Basic math support</u></b>
 * <div class="sub-desc">
 * <p>The following basic math operators may be applied directly on numeric
 * data values:</p><pre>
 * + - * /
 * </pre>
 * For example:
 * <pre><code>
var tpl = new Ext.XTemplate(
    '&lt;p>Name: {name}&lt;/p>',
    '&lt;p>Kids: ',
    '&lt;tpl for="kids">',
        '&lt;tpl if="age &amp;gt; 1">',  // <-- Note that the &gt; is encoded
            '&lt;p>{#}: {name}&lt;/p>',  // <-- Auto-number each item
            '&lt;p>In 5 Years: {age+5}&lt;/p>',  // <-- Basic math
            '&lt;p>Dad: {parent.name}&lt;/p>',
        '&lt;/tpl>',
    '&lt;/tpl>&lt;/p>'
);
tpl.overwrite(panel.body, data);
</code></pre>
 * </div>
 * </li>
 *
 *
 * <li><b><u>Execute arbitrary inline code with special built-in template variables</u></b>
 * <div class="sub-desc">
 * <p>Anything between <code>{[ ... ]}</code> is considered code to be executed
 * in the scope of the template. There are some special variables available in that code:
 * <ul>
 * <li><b><tt>values</tt></b>: The values in the current scope. If you are using
 * scope changing sub-templates, you can change what <tt>values</tt> is.</li>
 * <li><b><tt>parent</tt></b>: The scope (values) of the ancestor template.</li>
 * <li><b><tt>xindex</tt></b>: If you are in a looping template, the index of the
 * loop you are in (1-based).</li>
 * <li><b><tt>xcount</tt></b>: If you are in a looping template, the total length
 * of the array you are looping.</li>
 * <li><b><tt>fm</tt></b>: An alias for <tt>Ext.util.Format</tt>.</li>
 * </ul>
 * This example demonstrates basic row striping using an inline code block and the
 * <tt>xindex</tt> variable:</p>
 * <pre><code>
var tpl = new Ext.XTemplate(
    '&lt;p>Name: {name}&lt;/p>',
    '&lt;p>Company: {[values.company.toUpperCase() + ", " + values.title]}&lt;/p>',
    '&lt;p>Kids: ',
    '&lt;tpl for="kids">',
       '&lt;div class="{[xindex % 2 === 0 ? "even" : "odd"]}">',
        '{name}',
        '&lt;/div>',
    '&lt;/tpl>&lt;/p>'
);
tpl.overwrite(panel.body, data);
 * </code></pre>
 * </div>
 * </li>
 *
 * <li><b><u>Template member functions</u></b>
 * <div class="sub-desc">
 * <p>One or more member functions can be specified in a configuration
 * object passed into the XTemplate constructor for more complex processing:</p>
 * <pre><code>
var tpl = new Ext.XTemplate(
    '&lt;p>Name: {name}&lt;/p>',
    '&lt;p>Kids: ',
    '&lt;tpl for="kids">',
        '&lt;tpl if="this.isGirl(name)">',
            '&lt;p>Girl: {name} - {age}&lt;/p>',
        '&lt;/tpl>',
        // use opposite if statement to simulate 'else' processing:
        '&lt;tpl if="this.isGirl(name) == false">',
            '&lt;p>Boy: {name} - {age}&lt;/p>',
        '&lt;/tpl>',
        '&lt;tpl if="this.isBaby(age)">',
            '&lt;p>{name} is a baby!&lt;/p>',
        '&lt;/tpl>',
    '&lt;/tpl>&lt;/p>',
    {
        // XTemplate configuration:
        compiled: true,
        disableFormats: true,
        // member functions:
        isGirl: function(name){
            return name == 'Sara Grace';
        },
        isBaby: function(age){
            return age < 1;
        }
    }
);
tpl.overwrite(panel.body, data);
 * </code></pre>
 * </div>
 * </li>
 *
 * </ul></div>
 *
 * @param {Mixed} config
 */
Ext.XTemplate = function(){
    Ext.XTemplate.superclass.constructor.apply(this, arguments);

    var me = this,
        s = me.html,
        re = /<tpl\b[^>]*>((?:(?=([^<]+))\2|<(?!tpl\b[^>]*>))*?)<\/tpl>/,
        nameRe = /^<tpl\b[^>]*?for="(.*?)"/,
        ifRe = /^<tpl\b[^>]*?if="(.*?)"/,
        execRe = /^<tpl\b[^>]*?exec="(.*?)"/,
        m,
        id = 0,
        tpls = [],
        VALUES = 'values',
        PARENT = 'parent',
        XINDEX = 'xindex',
        XCOUNT = 'xcount',
        RETURN = 'return ',
        WITHVALUES = 'with(values){ ';

    s = ['<tpl>', s, '</tpl>'].join('');

    while((m = s.match(re))){
        var m2 = m[0].match(nameRe),
            m3 = m[0].match(ifRe),
            m4 = m[0].match(execRe),
            exp = null,
            fn = null,
            exec = null,
            name = m2 && m2[1] ? m2[1] : '';

       if (m3) {
           exp = m3 && m3[1] ? m3[1] : null;
           if(exp){
               fn = new Function(VALUES, PARENT, XINDEX, XCOUNT, WITHVALUES + RETURN +(Ext.util.Format.htmlDecode(exp))+'; }');
           }
       }
       if (m4) {
           exp = m4 && m4[1] ? m4[1] : null;
           if(exp){
               exec = new Function(VALUES, PARENT, XINDEX, XCOUNT, WITHVALUES +(Ext.util.Format.htmlDecode(exp))+'; }');
           }
       }
       if(name){
           switch(name){
               case '.': name = new Function(VALUES, PARENT, WITHVALUES + RETURN + VALUES + '; }'); break;
               case '..': name = new Function(VALUES, PARENT, WITHVALUES + RETURN + PARENT + '; }'); break;
               default: name = new Function(VALUES, PARENT, WITHVALUES + RETURN + name + '; }');
           }
       }
       tpls.push({
            id: id,
            target: name,
            exec: exec,
            test: fn,
            body: m[1]||''
        });
       s = s.replace(m[0], '{xtpl'+ id + '}');
       ++id;
    }
    for(var i = tpls.length-1; i >= 0; --i){
        me.compileTpl(tpls[i]);
    }
    me.master = tpls[tpls.length-1];
    me.tpls = tpls;
};
Ext.extend(Ext.XTemplate, Ext.Template, {
    // private
    re : /\{([\w-\.\#]+)(?:\:([\w\.]*)(?:\((.*?)?\))?)?(\s?[\+\-\*\\]\s?[\d\.\+\-\*\\\(\)]+)?\}/g,
    // private
    codeRe : /\{\[((?:\\\]|.|\n)*?)\]\}/g,

    // private
    applySubTemplate : function(id, values, parent, xindex, xcount){
        var me = this,
            len,
            t = me.tpls[id],
            vs,
            buf = [];
        if ((t.test && !t.test.call(me, values, parent, xindex, xcount)) ||
            (t.exec && t.exec.call(me, values, parent, xindex, xcount))) {
            return '';
        }
        vs = t.target ? t.target.call(me, values, parent) : values;
        len = vs.length;
        parent = t.target ? values : parent;
        if(t.target && Ext.isArray(vs)){
            for(var i = 0, len = vs.length; i < len; i++){
                buf[buf.length] = t.compiled.call(me, vs[i], parent, i+1, len);
            }
            return buf.join('');
        }
        return t.compiled.call(me, vs, parent, xindex, xcount);
    },

    // private
    compileTpl : function(tpl){
        var fm = Ext.util.Format,
            useF = this.disableFormats !== true,
            sep = Ext.isGecko ? "+" : ",",
            body;

        function fn(m, name, format, args, math){
            if(name.substr(0, 4) == 'xtpl'){
                return "'"+ sep +'this.applySubTemplate('+name.substr(4)+', values, parent, xindex, xcount)'+sep+"'";
            }
            var v;
            if(name === '.'){
                v = 'values';
            }else if(name === '#'){
                v = 'xindex';
            }else if(name.indexOf('.') != -1){
                v = name;
            }else{
                v = "values['" + name + "']";
            }
            if(math){
                v = '(' + v + math + ')';
            }
            if (format && useF) {
                args = args ? ',' + args : "";
                if(format.substr(0, 5) != "this."){
                    format = "fm." + format + '(';
                }else{
                    format = 'this.call("'+ format.substr(5) + '", ';
                    args = ", values";
                }
            } else {
                args= ''; format = "("+v+" === undefined ? '' : ";
            }
            return "'"+ sep + format + v + args + ")"+sep+"'";
        }

        function codeFn(m, code){
            // Single quotes get escaped when the template is compiled, however we want to undo this when running code.
            return "'" + sep + '(' + code.replace(/\\'/g, "'") + ')' + sep + "'";
        }

        // branched to use + in gecko and [].join() in others
        if(Ext.isGecko){
            body = "tpl.compiled = function(values, parent, xindex, xcount){ return '" +
                   tpl.body.replace(/(\r\n|\n)/g, '\\n').replace(/'/g, "\\'").replace(this.re, fn).replace(this.codeRe, codeFn) +
                    "';};";
        }else{
            body = ["tpl.compiled = function(values, parent, xindex, xcount){ return ['"];
            body.push(tpl.body.replace(/(\r\n|\n)/g, '\\n').replace(/'/g, "\\'").replace(this.re, fn).replace(this.codeRe, codeFn));
            body.push("'].join('');};");
            body = body.join('');
        }
        eval(body);
        return this;
    },

    /**
     * Returns an HTML fragment of this template with the specified values applied.
     * @param {Object} values The template values. Can be an array if your params are numeric (i.e. {0}) or an object (i.e. {foo: 'bar'})
     * @return {String} The HTML fragment
     */
    applyTemplate : function(values){
        return this.master.compiled.call(this, values, {}, 1, 1);
    },

    /**
     * Compile the template to a function for optimized performance.  Recommended if the template will be used frequently.
     * @return {Function} The compiled function
     */
    compile : function(){return this;}

    /**
     * @property re
     * @hide
     */
    /**
     * @property disableFormats
     * @hide
     */
    /**
     * @method set
     * @hide
     */

});
/**
 * Alias for {@link #applyTemplate}
 * Returns an HTML fragment of this template with the specified values applied.
 * @param {Object/Array} values The template values. Can be an array if your params are numeric (i.e. {0}) or an object (i.e. {foo: 'bar'})
 * @return {String} The HTML fragment
 * @member Ext.XTemplate
 * @method apply
 */
Ext.XTemplate.prototype.apply = Ext.XTemplate.prototype.applyTemplate;

/**
 * Creates a template from the passed element's value (<i>display:none</i> textarea, preferred) or innerHTML.
 * @param {String/HTMLElement} el A DOM element or its id
 * @return {Ext.Template} The created template
 * @static
 */
Ext.XTemplate.from = function(el){
    el = Ext.getDom(el);
    return new Ext.XTemplate(el.value || el.innerHTML);
};
/**
 * @class Ext.util.CSS
 * Utility class for manipulating CSS rules
 * @singleton
 */
Ext.util.CSS = function(){
	var rules = null;
   	var doc = document;

    var camelRe = /(-[a-z])/gi;
    var camelFn = function(m, a){ return a.charAt(1).toUpperCase(); };

   return {
   /**
    * Creates a stylesheet from a text blob of rules.
    * These rules will be wrapped in a STYLE tag and appended to the HEAD of the document.
    * @param {String} cssText The text containing the css rules
    * @param {String} id An id to add to the stylesheet for later removal
    * @return {StyleSheet}
    */
   createStyleSheet : function(cssText, id){
       var ss;
       var head = doc.getElementsByTagName("head")[0];
       var rules = doc.createElement("style");
       rules.setAttribute("type", "text/css");
       if(id){
           rules.setAttribute("id", id);
       }
       if(Ext.isIE){
           head.appendChild(rules);
           ss = rules.styleSheet;
           ss.cssText = cssText;
       }else{
           try{
                rules.appendChild(doc.createTextNode(cssText));
           }catch(e){
               rules.cssText = cssText;
           }
           head.appendChild(rules);
           ss = rules.styleSheet ? rules.styleSheet : (rules.sheet || doc.styleSheets[doc.styleSheets.length-1]);
       }
       this.cacheStyleSheet(ss);
       return ss;
   },

   /**
    * Removes a style or link tag by id
    * @param {String} id The id of the tag
    */
   removeStyleSheet : function(id){
       var existing = doc.getElementById(id);
       if(existing){
           existing.parentNode.removeChild(existing);
       }
   },

   /**
    * Dynamically swaps an existing stylesheet reference for a new one
    * @param {String} id The id of an existing link tag to remove
    * @param {String} url The href of the new stylesheet to include
    */
   swapStyleSheet : function(id, url){
       this.removeStyleSheet(id);
       var ss = doc.createElement("link");
       ss.setAttribute("rel", "stylesheet");
       ss.setAttribute("type", "text/css");
       ss.setAttribute("id", id);
       ss.setAttribute("href", url);
       doc.getElementsByTagName("head")[0].appendChild(ss);
   },
   
   /**
    * Refresh the rule cache if you have dynamically added stylesheets
    * @return {Object} An object (hash) of rules indexed by selector
    */
   refreshCache : function(){
       return this.getRules(true);
   },

   // private
   cacheStyleSheet : function(ss){
       if(!rules){
           rules = {};
       }
       try{// try catch for cross domain access issue
           var ssRules = ss.cssRules || ss.rules;
           for(var j = ssRules.length-1; j >= 0; --j){
               rules[ssRules[j].selectorText.toLowerCase()] = ssRules[j];
           }
       }catch(e){}
   },
   
   /**
    * Gets all css rules for the document
    * @param {Boolean} refreshCache true to refresh the internal cache
    * @return {Object} An object (hash) of rules indexed by selector
    */
   getRules : function(refreshCache){
   		if(rules === null || refreshCache){
   			rules = {};
   			var ds = doc.styleSheets;
   			for(var i =0, len = ds.length; i < len; i++){
   			    try{
    		        this.cacheStyleSheet(ds[i]);
    		    }catch(e){} 
	        }
   		}
   		return rules;
   	},
   	
   	/**
    * Gets an an individual CSS rule by selector(s)
    * @param {String/Array} selector The CSS selector or an array of selectors to try. The first selector that is found is returned.
    * @param {Boolean} refreshCache true to refresh the internal cache if you have recently updated any rules or added styles dynamically
    * @return {CSSRule} The CSS rule or null if one is not found
    */
   getRule : function(selector, refreshCache){
   		var rs = this.getRules(refreshCache);
   		if(!Ext.isArray(selector)){
   		    return rs[selector.toLowerCase()];
   		}
   		for(var i = 0; i < selector.length; i++){
			if(rs[selector[i]]){
				return rs[selector[i].toLowerCase()];
			}
		}
		return null;
   	},
   	
   	
   	/**
    * Updates a rule property
    * @param {String/Array} selector If it's an array it tries each selector until it finds one. Stops immediately once one is found.
    * @param {String} property The css property
    * @param {String} value The new value for the property
    * @return {Boolean} true If a rule was found and updated
    */
   updateRule : function(selector, property, value){
   		if(!Ext.isArray(selector)){
   			var rule = this.getRule(selector);
   			if(rule){
   				rule.style[property.replace(camelRe, camelFn)] = value;
   				return true;
   			}
   		}else{
   			for(var i = 0; i < selector.length; i++){
   				if(this.updateRule(selector[i], property, value)){
   					return true;
   				}
   			}
   		}
   		return false;
   	}
   };	
}();/**
 @class Ext.util.ClickRepeater
 @extends Ext.util.Observable

 A wrapper class which can be applied to any element. Fires a "click" event while the
 mouse is pressed. The interval between firings may be specified in the config but
 defaults to 20 milliseconds.

 Optionally, a CSS class may be applied to the element during the time it is pressed.

 @cfg {Mixed} el The element to act as a button.
 @cfg {Number} delay The initial delay before the repeating event begins firing.
 Similar to an autorepeat key delay.
 @cfg {Number} interval The interval between firings of the "click" event. Default 20 ms.
 @cfg {String} pressClass A CSS class name to be applied to the element while pressed.
 @cfg {Boolean} accelerate True if autorepeating should start slowly and accelerate.
           "interval" and "delay" are ignored.
 @cfg {Boolean} preventDefault True to prevent the default click event
 @cfg {Boolean} stopDefault True to stop the default click event

 @history
    2007-02-02 jvs Original code contributed by Nige "Animal" White
    2007-02-02 jvs Renamed to ClickRepeater
    2007-02-03 jvs Modifications for FF Mac and Safari

 @constructor
 @param {Mixed} el The element to listen on
 @param {Object} config
 */
Ext.util.ClickRepeater = Ext.extend(Ext.util.Observable, {
    
    constructor : function(el, config){
        this.el = Ext.get(el);
        this.el.unselectable();

        Ext.apply(this, config);

        this.addEvents(
        /**
         * @event mousedown
         * Fires when the mouse button is depressed.
         * @param {Ext.util.ClickRepeater} this
         * @param {Ext.EventObject} e
         */
        "mousedown",
        /**
         * @event click
         * Fires on a specified interval during the time the element is pressed.
         * @param {Ext.util.ClickRepeater} this
         * @param {Ext.EventObject} e
         */
        "click",
        /**
         * @event mouseup
         * Fires when the mouse key is released.
         * @param {Ext.util.ClickRepeater} this
         * @param {Ext.EventObject} e
         */
        "mouseup"
        );

        if(!this.disabled){
            this.disabled = true;
            this.enable();
        }

        // allow inline handler
        if(this.handler){
            this.on("click", this.handler,  this.scope || this);
        }

        Ext.util.ClickRepeater.superclass.constructor.call(this);        
    },
    
    interval : 20,
    delay: 250,
    preventDefault : true,
    stopDefault : false,
    timer : 0,

    /**
     * Enables the repeater and allows events to fire.
     */
    enable: function(){
        if(this.disabled){
            this.el.on('mousedown', this.handleMouseDown, this);
            if (Ext.isIE){
                this.el.on('dblclick', this.handleDblClick, this);
            }
            if(this.preventDefault || this.stopDefault){
                this.el.on('click', this.eventOptions, this);
            }
        }
        this.disabled = false;
    },

    /**
     * Disables the repeater and stops events from firing.
     */
    disable: function(/* private */ force){
        if(force || !this.disabled){
            clearTimeout(this.timer);
            if(this.pressClass){
                this.el.removeClass(this.pressClass);
            }
            Ext.getDoc().un('mouseup', this.handleMouseUp, this);
            this.el.removeAllListeners();
        }
        this.disabled = true;
    },

    /**
     * Convenience function for setting disabled/enabled by boolean.
     * @param {Boolean} disabled
     */
    setDisabled: function(disabled){
        this[disabled ? 'disable' : 'enable']();
    },

    eventOptions: function(e){
        if(this.preventDefault){
            e.preventDefault();
        }
        if(this.stopDefault){
            e.stopEvent();
        }
    },

    // private
    destroy : function() {
        this.disable(true);
        Ext.destroy(this.el);
        this.purgeListeners();
    },

    handleDblClick : function(e){
        clearTimeout(this.timer);
        this.el.blur();

        this.fireEvent("mousedown", this, e);
        this.fireEvent("click", this, e);
    },

    // private
    handleMouseDown : function(e){
        clearTimeout(this.timer);
        this.el.blur();
        if(this.pressClass){
            this.el.addClass(this.pressClass);
        }
        this.mousedownTime = new Date();

        Ext.getDoc().on("mouseup", this.handleMouseUp, this);
        this.el.on("mouseout", this.handleMouseOut, this);

        this.fireEvent("mousedown", this, e);
        this.fireEvent("click", this, e);

        // Do not honor delay or interval if acceleration wanted.
        if (this.accelerate) {
            this.delay = 400;
        }
        this.timer = this.click.defer(this.delay || this.interval, this, [e]);
    },

    // private
    click : function(e){
        this.fireEvent("click", this, e);
        this.timer = this.click.defer(this.accelerate ?
            this.easeOutExpo(this.mousedownTime.getElapsed(),
                400,
                -390,
                12000) :
            this.interval, this, [e]);
    },

    easeOutExpo : function (t, b, c, d) {
        return (t==d) ? b+c : c * (-Math.pow(2, -10 * t/d) + 1) + b;
    },

    // private
    handleMouseOut : function(){
        clearTimeout(this.timer);
        if(this.pressClass){
            this.el.removeClass(this.pressClass);
        }
        this.el.on("mouseover", this.handleMouseReturn, this);
    },

    // private
    handleMouseReturn : function(){
        this.el.un("mouseover", this.handleMouseReturn, this);
        if(this.pressClass){
            this.el.addClass(this.pressClass);
        }
        this.click();
    },

    // private
    handleMouseUp : function(e){
        clearTimeout(this.timer);
        this.el.un("mouseover", this.handleMouseReturn, this);
        this.el.un("mouseout", this.handleMouseOut, this);
        Ext.getDoc().un("mouseup", this.handleMouseUp, this);
        this.el.removeClass(this.pressClass);
        this.fireEvent("mouseup", this, e);
    }
});/**
 * @class Ext.KeyNav
 * <p>Provides a convenient wrapper for normalized keyboard navigation.  KeyNav allows you to bind
 * navigation keys to function calls that will get called when the keys are pressed, providing an easy
 * way to implement custom navigation schemes for any UI component.</p>
 * <p>The following are all of the possible keys that can be implemented: enter, left, right, up, down, tab, esc,
 * pageUp, pageDown, del, home, end.  Usage:</p>
 <pre><code>
var nav = new Ext.KeyNav("my-element", {
    "left" : function(e){
        this.moveLeft(e.ctrlKey);
    },
    "right" : function(e){
        this.moveRight(e.ctrlKey);
    },
    "enter" : function(e){
        this.save();
    },
    scope : this
});
</code></pre>
 * @constructor
 * @param {Mixed} el The element to bind to
 * @param {Object} config The config
 */
Ext.KeyNav = function(el, config){
    this.el = Ext.get(el);
    Ext.apply(this, config);
    if(!this.disabled){
        this.disabled = true;
        this.enable();
    }
};

Ext.KeyNav.prototype = {
    /**
     * @cfg {Boolean} disabled
     * True to disable this KeyNav instance (defaults to false)
     */
    disabled : false,
    /**
     * @cfg {String} defaultEventAction
     * The method to call on the {@link Ext.EventObject} after this KeyNav intercepts a key.  Valid values are
     * {@link Ext.EventObject#stopEvent}, {@link Ext.EventObject#preventDefault} and
     * {@link Ext.EventObject#stopPropagation} (defaults to 'stopEvent')
     */
    defaultEventAction: "stopEvent",
    /**
     * @cfg {Boolean} forceKeyDown
     * Handle the keydown event instead of keypress (defaults to false).  KeyNav automatically does this for IE since
     * IE does not propagate special keys on keypress, but setting this to true will force other browsers to also
     * handle keydown instead of keypress.
     */
    forceKeyDown : false,

    // private
    relay : function(e){
        var k = e.getKey(),
            h = this.keyToHandler[k];
        if(h && this[h]){
            if(this.doRelay(e, this[h], h) !== true){
                e[this.defaultEventAction]();
            }
        }
    },

    // private
    doRelay : function(e, h, hname){
        return h.call(this.scope || this, e, hname);
    },

    // possible handlers
    enter : false,
    left : false,
    right : false,
    up : false,
    down : false,
    tab : false,
    esc : false,
    pageUp : false,
    pageDown : false,
    del : false,
    home : false,
    end : false,

    // quick lookup hash
    keyToHandler : {
        37 : "left",
        39 : "right",
        38 : "up",
        40 : "down",
        33 : "pageUp",
        34 : "pageDown",
        46 : "del",
        36 : "home",
        35 : "end",
        13 : "enter",
        27 : "esc",
        9  : "tab"
    },
    
    stopKeyUp: function(e) {
        var k = e.getKey();

        if (k >= 37 && k <= 40) {
            // *** bugfix - safari 2.x fires 2 keyup events on cursor keys
            // *** (note: this bugfix sacrifices the "keyup" event originating from keyNav elements in Safari 2)
            e.stopEvent();
        }
    },
    
    /**
     * Destroy this KeyNav (this is the same as calling disable).
     */
    destroy: function(){
        this.disable();    
    },

	/**
	 * Enable this KeyNav
	 */
	enable: function() {
        if (this.disabled) {
            if (Ext.isSafari2) {
                // call stopKeyUp() on "keyup" event
                this.el.on('keyup', this.stopKeyUp, this);
            }

            this.el.on(this.isKeydown()? 'keydown' : 'keypress', this.relay, this);
            this.disabled = false;
        }
    },

	/**
	 * Disable this KeyNav
	 */
	disable: function() {
        if (!this.disabled) {
            if (Ext.isSafari2) {
                // remove "keyup" event handler
                this.el.un('keyup', this.stopKeyUp, this);
            }

            this.el.un(this.isKeydown()? 'keydown' : 'keypress', this.relay, this);
            this.disabled = true;
        }
    },
    
    /**
     * Convenience function for setting disabled/enabled by boolean.
     * @param {Boolean} disabled
     */
    setDisabled : function(disabled){
        this[disabled ? "disable" : "enable"]();
    },
    
    // private
    isKeydown: function(){
        return this.forceKeyDown || Ext.EventManager.useKeydown;
    }
};
/**
 * @class Ext.KeyMap
 * Handles mapping keys to actions for an element. One key map can be used for multiple actions.
 * The constructor accepts the same config object as defined by {@link #addBinding}.
 * If you bind a callback function to a KeyMap, anytime the KeyMap handles an expected key
 * combination it will call the function with this signature (if the match is a multi-key
 * combination the callback will still be called only once): (String key, Ext.EventObject e)
 * A KeyMap can also handle a string representation of keys.<br />
 * Usage:
 <pre><code>
// map one key by key code
var map = new Ext.KeyMap("my-element", {
    key: 13, // or Ext.EventObject.ENTER
    fn: myHandler,
    scope: myObject
});

// map multiple keys to one action by string
var map = new Ext.KeyMap("my-element", {
    key: "a\r\n\t",
    fn: myHandler,
    scope: myObject
});

// map multiple keys to multiple actions by strings and array of codes
var map = new Ext.KeyMap("my-element", [
    {
        key: [10,13],
        fn: function(){ alert("Return was pressed"); }
    }, {
        key: "abc",
        fn: function(){ alert('a, b or c was pressed'); }
    }, {
        key: "\t",
        ctrl:true,
        shift:true,
        fn: function(){ alert('Control + shift + tab was pressed.'); }
    }
]);
</code></pre>
 * <b>Note: A KeyMap starts enabled</b>
 * @constructor
 * @param {Mixed} el The element to bind to
 * @param {Object} config The config (see {@link #addBinding})
 * @param {String} eventName (optional) The event to bind to (defaults to "keydown")
 */
Ext.KeyMap = function(el, config, eventName){
    this.el  = Ext.get(el);
    this.eventName = eventName || "keydown";
    this.bindings = [];
    if(config){
        this.addBinding(config);
    }
    this.enable();
};

Ext.KeyMap.prototype = {
    /**
     * True to stop the event from bubbling and prevent the default browser action if the
     * key was handled by the KeyMap (defaults to false)
     * @type Boolean
     */
    stopEvent : false,

    /**
     * Add a new binding to this KeyMap. The following config object properties are supported:
     * <pre>
Property    Type             Description
----------  ---------------  ----------------------------------------------------------------------
key         String/Array     A single keycode or an array of keycodes to handle
shift       Boolean          True to handle key only when shift is pressed, False to handle the key only when shift is not pressed (defaults to undefined)
ctrl        Boolean          True to handle key only when ctrl is pressed, False to handle the key only when ctrl is not pressed (defaults to undefined)
alt         Boolean          True to handle key only when alt is pressed, False to handle the key only when alt is not pressed (defaults to undefined)
handler     Function         The function to call when KeyMap finds the expected key combination
fn          Function         Alias of handler (for backwards-compatibility)
scope       Object           The scope of the callback function
stopEvent   Boolean          True to stop the event from bubbling and prevent the default browser action if the key was handled by the KeyMap (defaults to false)
</pre>
     *
     * Usage:
     * <pre><code>
// Create a KeyMap
var map = new Ext.KeyMap(document, {
    key: Ext.EventObject.ENTER,
    fn: handleKey,
    scope: this
});

//Add a new binding to the existing KeyMap later
map.addBinding({
    key: 'abc',
    shift: true,
    fn: handleKey,
    scope: this
});
</code></pre>
     * @param {Object/Array} config A single KeyMap config or an array of configs
     */
	addBinding : function(config){
        if(Ext.isArray(config)){
            Ext.each(config, function(c){
                this.addBinding(c);
            }, this);
            return;
        }
        var keyCode = config.key,
            fn = config.fn || config.handler,
            scope = config.scope;

	if (config.stopEvent) {
	    this.stopEvent = config.stopEvent;    
	}	

        if(typeof keyCode == "string"){
            var ks = [];
            var keyString = keyCode.toUpperCase();
            for(var j = 0, len = keyString.length; j < len; j++){
                ks.push(keyString.charCodeAt(j));
            }
            keyCode = ks;
        }
        var keyArray = Ext.isArray(keyCode);
        
        var handler = function(e){
            if(this.checkModifiers(config, e)){
                var k = e.getKey();
                if(keyArray){
                    for(var i = 0, len = keyCode.length; i < len; i++){
                        if(keyCode[i] == k){
                          if(this.stopEvent){
                              e.stopEvent();
                          }
                          fn.call(scope || window, k, e);
                          return;
                        }
                    }
                }else{
                    if(k == keyCode){
                        if(this.stopEvent){
                           e.stopEvent();
                        }
                        fn.call(scope || window, k, e);
                    }
                }
            }
        };
        this.bindings.push(handler);
	},
    
    // private
    checkModifiers: function(config, e){
        var val, key, keys = ['shift', 'ctrl', 'alt'];
        for (var i = 0, len = keys.length; i < len; ++i){
            key = keys[i];
            val = config[key];
            if(!(val === undefined || (val === e[key + 'Key']))){
                return false;
            }
        }
        return true;
    },

    /**
     * Shorthand for adding a single key listener
     * @param {Number/Array/Object} key Either the numeric key code, array of key codes or an object with the
     * following options:
     * {key: (number or array), shift: (true/false), ctrl: (true/false), alt: (true/false)}
     * @param {Function} fn The function to call
     * @param {Object} scope (optional) The scope (<code>this</code> reference) in which the function is executed. Defaults to the browser window.
     */
    on : function(key, fn, scope){
        var keyCode, shift, ctrl, alt;
        if(typeof key == "object" && !Ext.isArray(key)){
            keyCode = key.key;
            shift = key.shift;
            ctrl = key.ctrl;
            alt = key.alt;
        }else{
            keyCode = key;
        }
        this.addBinding({
            key: keyCode,
            shift: shift,
            ctrl: ctrl,
            alt: alt,
            fn: fn,
            scope: scope
        });
    },

    // private
    handleKeyDown : function(e){
	    if(this.enabled){ //just in case
    	    var b = this.bindings;
    	    for(var i = 0, len = b.length; i < len; i++){
    	        b[i].call(this, e);
    	    }
	    }
	},

	/**
	 * Returns true if this KeyMap is enabled
	 * @return {Boolean}
	 */
	isEnabled : function(){
	    return this.enabled;
	},

	/**
	 * Enables this KeyMap
	 */
	enable: function(){
		if(!this.enabled){
		    this.el.on(this.eventName, this.handleKeyDown, this);
		    this.enabled = true;
		}
	},

	/**
	 * Disable this KeyMap
	 */
	disable: function(){
		if(this.enabled){
		    this.el.removeListener(this.eventName, this.handleKeyDown, this);
		    this.enabled = false;
		}
	},
    
    /**
     * Convenience function for setting disabled/enabled by boolean.
     * @param {Boolean} disabled
     */
    setDisabled : function(disabled){
        this[disabled ? "disable" : "enable"]();
    }
};/**
 * @class Ext.util.TextMetrics
 * Provides precise pixel measurements for blocks of text so that you can determine exactly how high and
 * wide, in pixels, a given block of text will be. Note that when measuring text, it should be plain text and
 * should not contain any HTML, otherwise it may not be measured correctly.
 * @singleton
 */
Ext.util.TextMetrics = function(){
    var shared;
    return {
        /**
         * Measures the size of the specified text
         * @param {String/HTMLElement} el The element, dom node or id from which to copy existing CSS styles
         * that can affect the size of the rendered text
         * @param {String} text The text to measure
         * @param {Number} fixedWidth (optional) If the text will be multiline, you have to set a fixed width
         * in order to accurately measure the text height
         * @return {Object} An object containing the text's size {width: (width), height: (height)}
         */
        measure : function(el, text, fixedWidth){
            if(!shared){
                shared = Ext.util.TextMetrics.Instance(el, fixedWidth);
            }
            shared.bind(el);
            shared.setFixedWidth(fixedWidth || 'auto');
            return shared.getSize(text);
        },

        /**
         * Return a unique TextMetrics instance that can be bound directly to an element and reused.  This reduces
         * the overhead of multiple calls to initialize the style properties on each measurement.
         * @param {String/HTMLElement} el The element, dom node or id that the instance will be bound to
         * @param {Number} fixedWidth (optional) If the text will be multiline, you have to set a fixed width
         * in order to accurately measure the text height
         * @return {Ext.util.TextMetrics.Instance} instance The new instance
         */
        createInstance : function(el, fixedWidth){
            return Ext.util.TextMetrics.Instance(el, fixedWidth);
        }
    };
}();

Ext.util.TextMetrics.Instance = function(bindTo, fixedWidth){
    var ml = new Ext.Element(document.createElement('div'));
    document.body.appendChild(ml.dom);
    ml.position('absolute');
    ml.setLeftTop(-1000, -1000);
    ml.hide();

    if(fixedWidth){
        ml.setWidth(fixedWidth);
    }

    var instance = {
        /**
         * <p><b>Only available on the instance returned from {@link #createInstance}, <u>not</u> on the singleton.</b></p>
         * Returns the size of the specified text based on the internal element's style and width properties
         * @param {String} text The text to measure
         * @return {Object} An object containing the text's size {width: (width), height: (height)}
         */
        getSize : function(text){
            ml.update(text);
            var s = ml.getSize();
            ml.update('');
            return s;
        },

        /**
         * <p><b>Only available on the instance returned from {@link #createInstance}, <u>not</u> on the singleton.</b></p>
         * Binds this TextMetrics instance to an element from which to copy existing CSS styles
         * that can affect the size of the rendered text
         * @param {String/HTMLElement} el The element, dom node or id
         */
        bind : function(el){
            ml.setStyle(
                Ext.fly(el).getStyles('font-size','font-style', 'font-weight', 'font-family','line-height', 'text-transform', 'letter-spacing')
            );
        },

        /**
         * <p><b>Only available on the instance returned from {@link #createInstance}, <u>not</u> on the singleton.</b></p>
         * Sets a fixed width on the internal measurement element.  If the text will be multiline, you have
         * to set a fixed width in order to accurately measure the text height.
         * @param {Number} width The width to set on the element
         */
        setFixedWidth : function(width){
            ml.setWidth(width);
        },

        /**
         * <p><b>Only available on the instance returned from {@link #createInstance}, <u>not</u> on the singleton.</b></p>
         * Returns the measured width of the specified text
         * @param {String} text The text to measure
         * @return {Number} width The width in pixels
         */
        getWidth : function(text){
            ml.dom.style.width = 'auto';
            return this.getSize(text).width;
        },

        /**
         * <p><b>Only available on the instance returned from {@link #createInstance}, <u>not</u> on the singleton.</b></p>
         * Returns the measured height of the specified text.  For multiline text, be sure to call
         * {@link #setFixedWidth} if necessary.
         * @param {String} text The text to measure
         * @return {Number} height The height in pixels
         */
        getHeight : function(text){
            return this.getSize(text).height;
        }
    };

    instance.bind(bindTo);

    return instance;
};

Ext.Element.addMethods({
    /**
     * Returns the width in pixels of the passed text, or the width of the text in this Element.
     * @param {String} text The text to measure. Defaults to the innerHTML of the element.
     * @param {Number} min (Optional) The minumum value to return.
     * @param {Number} max (Optional) The maximum value to return.
     * @return {Number} The text width in pixels.
     * @member Ext.Element getTextWidth
     */
    getTextWidth : function(text, min, max){
        return (Ext.util.TextMetrics.measure(this.dom, Ext.value(text, this.dom.innerHTML, true)).width).constrain(min || 0, max || 1000000);
    }
});
/**
 * @class Ext.util.Cookies
 * Utility class for managing and interacting with cookies.
 * @singleton
 */
Ext.util.Cookies = {
    /**
     * Create a cookie with the specified name and value. Additional settings
     * for the cookie may be optionally specified (for example: expiration,
     * access restriction, SSL).
     * @param {String} name The name of the cookie to set. 
     * @param {Mixed} value The value to set for the cookie.
     * @param {Object} expires (Optional) Specify an expiration date the
     * cookie is to persist until.  Note that the specified Date object will
     * be converted to Greenwich Mean Time (GMT). 
     * @param {String} path (Optional) Setting a path on the cookie restricts
     * access to pages that match that path. Defaults to all pages (<tt>'/'</tt>). 
     * @param {String} domain (Optional) Setting a domain restricts access to
     * pages on a given domain (typically used to allow cookie access across
     * subdomains). For example, "extjs.com" will create a cookie that can be
     * accessed from any subdomain of extjs.com, including www.extjs.com,
     * support.extjs.com, etc.
     * @param {Boolean} secure (Optional) Specify true to indicate that the cookie
     * should only be accessible via SSL on a page using the HTTPS protocol.
     * Defaults to <tt>false</tt>. Note that this will only work if the page
     * calling this code uses the HTTPS protocol, otherwise the cookie will be
     * created with default options.
     */
    set : function(name, value){
        var argv = arguments;
        var argc = arguments.length;
        var expires = (argc > 2) ? argv[2] : null;
        var path = (argc > 3) ? argv[3] : '/';
        var domain = (argc > 4) ? argv[4] : null;
        var secure = (argc > 5) ? argv[5] : false;
        document.cookie = name + "=" + escape(value) + ((expires === null) ? "" : ("; expires=" + expires.toGMTString())) + ((path === null) ? "" : ("; path=" + path)) + ((domain === null) ? "" : ("; domain=" + domain)) + ((secure === true) ? "; secure" : "");
    },

    /**
     * Retrieves cookies that are accessible by the current page. If a cookie
     * does not exist, <code>get()</code> returns <tt>null</tt>.  The following
     * example retrieves the cookie called "valid" and stores the String value
     * in the variable <tt>validStatus</tt>.
     * <pre><code>
     * var validStatus = Ext.util.Cookies.get("valid");
     * </code></pre>
     * @param {String} name The name of the cookie to get
     * @return {Mixed} Returns the cookie value for the specified name;
     * null if the cookie name does not exist.
     */
    get : function(name){
        var arg = name + "=";
        var alen = arg.length;
        var clen = document.cookie.length;
        var i = 0;
        var j = 0;
        while(i < clen){
            j = i + alen;
            if(document.cookie.substring(i, j) == arg){
                return Ext.util.Cookies.getCookieVal(j);
            }
            i = document.cookie.indexOf(" ", i) + 1;
            if(i === 0){
                break;
            }
        }
        return null;
    },

    /**
     * Removes a cookie with the provided name from the browser
     * if found by setting its expiration date to sometime in the past. 
     * @param {String} name The name of the cookie to remove
     */
    clear : function(name){
        if(Ext.util.Cookies.get(name)){
            document.cookie = name + "=" + "; expires=Thu, 01-Jan-70 00:00:01 GMT";
        }
    },
    /**
     * @private
     */
    getCookieVal : function(offset){
        var endstr = document.cookie.indexOf(";", offset);
        if(endstr == -1){
            endstr = document.cookie.length;
        }
        return unescape(document.cookie.substring(offset, endstr));
    }
};/**
 * Framework-wide error-handler.  Developers can override this method to provide
 * custom exception-handling.  Framework errors will often extend from the base
 * Ext.Error class.
 * @param {Object/Error} e The thrown exception object.
 */
Ext.handleError = function(e) {
    throw e;
};

/**
 * @class Ext.Error
 * @extends Error
 * <p>A base error class. Future implementations are intended to provide more
 * robust error handling throughout the framework (<b>in the debug build only</b>)
 * to check for common errors and problems. The messages issued by this class
 * will aid error checking. Error checks will be automatically removed in the
 * production build so that performance is not negatively impacted.</p>
 * <p>Some sample messages currently implemented:</p><pre>
"DataProxy attempted to execute an API-action but found an undefined
url / function. Please review your Proxy url/api-configuration."
 * </pre><pre>
"Could not locate your "root" property in your server response.
Please review your JsonReader config to ensure the config-property
"root" matches the property your server-response.  See the JsonReader
docs for additional assistance."
 * </pre>
 * <p>An example of the code used for generating error messages:</p><pre><code>
try {
    generateError({
        foo: 'bar'
    });
}
catch (e) {
    console.error(e);
}
function generateError(data) {
    throw new Ext.Error('foo-error', data);
}
 * </code></pre>
 * @param {String} message
 */
Ext.Error = function(message) {
    // Try to read the message from Ext.Error.lang
    this.message = (this.lang[message]) ? this.lang[message] : message;
};

Ext.Error.prototype = new Error();
Ext.apply(Ext.Error.prototype, {
    // protected.  Extensions place their error-strings here.
    lang: {},

    name: 'Ext.Error',
    /**
     * getName
     * @return {String}
     */
    getName : function() {
        return this.name;
    },
    /**
     * getMessage
     * @return {String}
     */
    getMessage : function() {
        return this.message;
    },
    /**
     * toJson
     * @return {String}
     */
    toJson : function() {
        return Ext.encode(this);
    }
});
