/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
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
