/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
/**
 * @class Ext.Template
 * <p>Represents an HTML fragment template. Templates may be {@link #compile precompiled}
 * for greater performance.</p>
 * <p>For example usage {@link #Template see the constructor}.</p>
 *
 * @constructor
 * An instance of this class may be created by passing to the constructor either
 * a single argument, or multiple arguments:
 * <div class="mdetail-params"><ul>
 * <li><b>single argument</b> : String/Array
 * <div class="sub-desc">
 * The single argument may be either a String or an Array:<ul>
 * <li><tt>String</tt> : </li><pre><code>
var t = new Ext.Template("&lt;div>Hello {0}.&lt;/div>");
t.{@link #append}('some-element', ['foo']);
 * </code></pre>
 * <li><tt>Array</tt> : </li>
 * An Array will be combined with <code>join('')</code>.
<pre><code>
var t = new Ext.Template([
    '&lt;div name="{id}"&gt;',
        '&lt;span class="{cls}"&gt;{name:trim} {value:ellipsis(10)}&lt;/span&gt;',
    '&lt;/div&gt;',
]);
t.{@link #compile}();
t.{@link #append}('some-element', {id: 'myid', cls: 'myclass', name: 'foo', value: 'bar'});
</code></pre>
 * </ul></div></li>
 * <li><b>multiple arguments</b> : String, Object, Array, ...
 * <div class="sub-desc">
 * Multiple arguments will be combined with <code>join('')</code>.
 * <pre><code>
var t = new Ext.Template(
    '&lt;div name="{id}"&gt;',
        '&lt;span class="{cls}"&gt;{name} {value}&lt;/span&gt;',
    '&lt;/div&gt;',
    // a configuration object:
    {
        compiled: true,      // {@link #compile} immediately
        disableFormats: true // See Notes below.
    }
);
 * </code></pre>
 * <p><b>Notes</b>:</p>
 * <div class="mdetail-params"><ul>
 * <li>Formatting and <code>disableFormats</code> are not applicable for Ext Core.</li>
 * <li>For a list of available format functions, see {@link Ext.util.Format}.</li>
 * <li><code>disableFormats</code> reduces <code>{@link #apply}</code> time
 * when no formatting is required.</li>
 * </ul></div>
 * </div></li>
 * </ul></div>
 * @param {Mixed} config
 */
Ext.Template = function(html){
    var me = this,
        a = arguments,
        buf = [],
        v;

    if (Ext.isArray(html)) {
        html = html.join("");
    } else if (a.length > 1) {
        for(var i = 0, len = a.length; i < len; i++){
            v = a[i];
            if(typeof v == 'object'){
                Ext.apply(me, v);
            } else {
                buf.push(v);
            }
        };
        html = buf.join('');
    }

    /**@private*/
    me.html = html;
    /**
     * @cfg {Boolean} compiled Specify <tt>true</tt> to compile the template
     * immediately (see <code>{@link #compile}</code>).
     * Defaults to <tt>false</tt>.
     */
    if (me.compiled) {
        me.compile();
    }
};
Ext.Template.prototype = {
    /**
     * @cfg {RegExp} re The regular expression used to match template variables.
     * Defaults to:<pre><code>
     * re : /\{([\w-]+)\}/g                                     // for Ext Core
     * re : /\{([\w-]+)(?:\:([\w\.]*)(?:\((.*?)?\))?)?\}/g      // for Ext JS
     * </code></pre>
     */
    re : /\{([\w-]+)\}/g,
    /**
     * See <code>{@link #re}</code>.
     * @type RegExp
     * @property re
     */

    /**
     * Returns an HTML fragment of this template with the specified <code>values</code> applied.
     * @param {Object/Array} values
     * The template values. Can be an array if the params are numeric (i.e. <code>{0}</code>)
     * or an object (i.e. <code>{foo: 'bar'}</code>).
     * @return {String} The HTML fragment
     */
    applyTemplate : function(values){
        var me = this;

        return me.compiled ?
                me.compiled(values) :
                me.html.replace(me.re, function(m, name){
                    return values[name] !== undefined ? values[name] : "";
                });
    },

    /**
     * Sets the HTML used as the template and optionally compiles it.
     * @param {String} html
     * @param {Boolean} compile (optional) True to compile the template (defaults to undefined)
     * @return {Ext.Template} this
     */
    set : function(html, compile){
        var me = this;
        me.html = html;
        me.compiled = null;
        return compile ? me.compile() : me;
    },

    /**
     * Compiles the template into an internal function, eliminating the RegEx overhead.
     * @return {Ext.Template} this
     */
    compile : function(){
        var me = this,
            sep = Ext.isGecko ? "+" : ",";

        function fn(m, name){
            name = "values['" + name + "']";
            return "'"+ sep + '(' + name + " == undefined ? '' : " + name + ')' + sep + "'";
        }

        eval("this.compiled = function(values){ return " + (Ext.isGecko ? "'" : "['") +
             me.html.replace(/\\/g, '\\\\').replace(/(\r\n|\n)/g, '\\n').replace(/'/g, "\\'").replace(this.re, fn) +
             (Ext.isGecko ?  "';};" : "'].join('');};"));
        return me;
    },

    /**
     * Applies the supplied values to the template and inserts the new node(s) as the first child of el.
     * @param {Mixed} el The context element
     * @param {Object/Array} values The template values. Can be an array if your params are numeric (i.e. {0}) or an object (i.e. {foo: 'bar'})
     * @param {Boolean} returnElement (optional) true to return a Ext.Element (defaults to undefined)
     * @return {HTMLElement/Ext.Element} The new node or Element
     */
    insertFirst: function(el, values, returnElement){
        return this.doInsert('afterBegin', el, values, returnElement);
    },

    /**
     * Applies the supplied values to the template and inserts the new node(s) before el.
     * @param {Mixed} el The context element
     * @param {Object/Array} values The template values. Can be an array if your params are numeric (i.e. {0}) or an object (i.e. {foo: 'bar'})
     * @param {Boolean} returnElement (optional) true to return a Ext.Element (defaults to undefined)
     * @return {HTMLElement/Ext.Element} The new node or Element
     */
    insertBefore: function(el, values, returnElement){
        return this.doInsert('beforeBegin', el, values, returnElement);
    },

    /**
     * Applies the supplied values to the template and inserts the new node(s) after el.
     * @param {Mixed} el The context element
     * @param {Object/Array} values The template values. Can be an array if your params are numeric (i.e. {0}) or an object (i.e. {foo: 'bar'})
     * @param {Boolean} returnElement (optional) true to return a Ext.Element (defaults to undefined)
     * @return {HTMLElement/Ext.Element} The new node or Element
     */
    insertAfter : function(el, values, returnElement){
        return this.doInsert('afterEnd', el, values, returnElement);
    },

    /**
     * Applies the supplied <code>values</code> to the template and appends
     * the new node(s) to the specified <code>el</code>.
     * <p>For example usage {@link #Template see the constructor}.</p>
     * @param {Mixed} el The context element
     * @param {Object/Array} values
     * The template values. Can be an array if the params are numeric (i.e. <code>{0}</code>)
     * or an object (i.e. <code>{foo: 'bar'}</code>).
     * @param {Boolean} returnElement (optional) true to return an Ext.Element (defaults to undefined)
     * @return {HTMLElement/Ext.Element} The new node or Element
     */
    append : function(el, values, returnElement){
        return this.doInsert('beforeEnd', el, values, returnElement);
    },

    doInsert : function(where, el, values, returnEl){
        el = Ext.getDom(el);
        var newNode = Ext.DomHelper.insertHtml(where, el, this.applyTemplate(values));
        return returnEl ? Ext.get(newNode, true) : newNode;
    },

    /**
     * Applies the supplied values to the template and overwrites the content of el with the new node(s).
     * @param {Mixed} el The context element
     * @param {Object/Array} values The template values. Can be an array if your params are numeric (i.e. {0}) or an object (i.e. {foo: 'bar'})
     * @param {Boolean} returnElement (optional) true to return a Ext.Element (defaults to undefined)
     * @return {HTMLElement/Ext.Element} The new node or Element
     */
    overwrite : function(el, values, returnElement){
        el = Ext.getDom(el);
        el.innerHTML = this.applyTemplate(values);
        return returnElement ? Ext.get(el.firstChild, true) : el.firstChild;
    }
};
/**
 * Alias for {@link #applyTemplate}
 * Returns an HTML fragment of this template with the specified <code>values</code> applied.
 * @param {Object/Array} values
 * The template values. Can be an array if the params are numeric (i.e. <code>{0}</code>)
 * or an object (i.e. <code>{foo: 'bar'}</code>).
 * @return {String} The HTML fragment
 * @member Ext.Template
 * @method apply
 */
Ext.Template.prototype.apply = Ext.Template.prototype.applyTemplate;

/**
 * Creates a template from the passed element's value (<i>display:none</i> textarea, preferred) or innerHTML.
 * @param {String/HTMLElement} el A DOM element or its id
 * @param {Object} config A configuration object
 * @return {Ext.Template} The created template
 * @static
 */
Ext.Template.from = function(el, config){
    el = Ext.getDom(el);
    return new Ext.Template(el.value || el.innerHTML, config || '');
};
