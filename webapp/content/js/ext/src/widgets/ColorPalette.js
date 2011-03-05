/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
/**
 * @class Ext.ColorPalette
 * @extends Ext.Component
 * Simple color palette class for choosing colors.  The palette can be rendered to any container.<br />
 * Here's an example of typical usage:
 * <pre><code>
var cp = new Ext.ColorPalette({value:'993300'});  // initial selected color
cp.render('my-div');

cp.on('select', function(palette, selColor){
    // do something with selColor
});
</code></pre>
 * @constructor
 * Create a new ColorPalette
 * @param {Object} config The config object
 * @xtype colorpalette
 */
Ext.ColorPalette = Ext.extend(Ext.Component, {
	/**
	 * @cfg {String} tpl An existing XTemplate instance to be used in place of the default template for rendering the component.
	 */
    /**
     * @cfg {String} itemCls
     * The CSS class to apply to the containing element (defaults to 'x-color-palette')
     */
    itemCls : 'x-color-palette',
    /**
     * @cfg {String} value
     * The initial color to highlight (should be a valid 6-digit color hex code without the # symbol).  Note that
     * the hex codes are case-sensitive.
     */
    value : null,
    /**
     * @cfg {String} clickEvent
     * The DOM event that will cause a color to be selected. This can be any valid event name (dblclick, contextmenu). 
     * Defaults to <tt>'click'</tt>.
     */
    clickEvent :'click',
    // private
    ctype : 'Ext.ColorPalette',

    /**
     * @cfg {Boolean} allowReselect If set to true then reselecting a color that is already selected fires the {@link #select} event
     */
    allowReselect : false,

    /**
     * <p>An array of 6-digit color hex code strings (without the # symbol).  This array can contain any number
     * of colors, and each hex code should be unique.  The width of the palette is controlled via CSS by adjusting
     * the width property of the 'x-color-palette' class (or assigning a custom class), so you can balance the number
     * of colors with the width setting until the box is symmetrical.</p>
     * <p>You can override individual colors if needed:</p>
     * <pre><code>
var cp = new Ext.ColorPalette();
cp.colors[0] = 'FF0000';  // change the first box to red
</code></pre>

Or you can provide a custom array of your own for complete control:
<pre><code>
var cp = new Ext.ColorPalette();
cp.colors = ['000000', '993300', '333300'];
</code></pre>
     * @type Array
     */
    colors : [
        '000000', '993300', '333300', '003300', '003366', '000080', '333399', '333333',
        '800000', 'FF6600', '808000', '008000', '008080', '0000FF', '666699', '808080',
        'FF0000', 'FF9900', '99CC00', '339966', '33CCCC', '3366FF', '800080', '969696',
        'FF00FF', 'FFCC00', 'FFFF00', '00FF00', '00FFFF', '00CCFF', '993366', 'C0C0C0',
        'FF99CC', 'FFCC99', 'FFFF99', 'CCFFCC', 'CCFFFF', '99CCFF', 'CC99FF', 'FFFFFF'
    ],

    /**
     * @cfg {Function} handler
     * Optional. A function that will handle the select event of this palette.
     * The handler is passed the following parameters:<div class="mdetail-params"><ul>
     * <li><code>palette</code> : ColorPalette<div class="sub-desc">The {@link #palette Ext.ColorPalette}.</div></li>
     * <li><code>color</code> : String<div class="sub-desc">The 6-digit color hex code (without the # symbol).</div></li>
     * </ul></div>
     */
    /**
     * @cfg {Object} scope
     * The scope (<tt><b>this</b></tt> reference) in which the <code>{@link #handler}</code>
     * function will be called.  Defaults to this ColorPalette instance.
     */
    
    // private
    initComponent : function(){
        Ext.ColorPalette.superclass.initComponent.call(this);
        this.addEvents(
            /**
             * @event select
             * Fires when a color is selected
             * @param {ColorPalette} this
             * @param {String} color The 6-digit color hex code (without the # symbol)
             */
            'select'
        );

        if(this.handler){
            this.on('select', this.handler, this.scope, true);
        }    
    },

    // private
    onRender : function(container, position){
        this.autoEl = {
            tag: 'div',
            cls: this.itemCls
        };
        Ext.ColorPalette.superclass.onRender.call(this, container, position);
        var t = this.tpl || new Ext.XTemplate(
            '<tpl for="."><a href="#" class="color-{.}" hidefocus="on"><em><span style="background:#{.}" unselectable="on">&#160;</span></em></a></tpl>'
        );
        t.overwrite(this.el, this.colors);
        this.mon(this.el, this.clickEvent, this.handleClick, this, {delegate: 'a'});
        if(this.clickEvent != 'click'){
        	this.mon(this.el, 'click', Ext.emptyFn, this, {delegate: 'a', preventDefault: true});
        }
    },

    // private
    afterRender : function(){
        Ext.ColorPalette.superclass.afterRender.call(this);
        if(this.value){
            var s = this.value;
            this.value = null;
            this.select(s, true);
        }
    },

    // private
    handleClick : function(e, t){
        e.preventDefault();
        if(!this.disabled){
            var c = t.className.match(/(?:^|\s)color-(.{6})(?:\s|$)/)[1];
            this.select(c.toUpperCase());
        }
    },

    /**
     * Selects the specified color in the palette (fires the {@link #select} event)
     * @param {String} color A valid 6-digit color hex code (# will be stripped if included)
     * @param {Boolean} suppressEvent (optional) True to stop the select event from firing. Defaults to <tt>false</tt>.
     */
    select : function(color, suppressEvent){
        color = color.replace('#', '');
        if(color != this.value || this.allowReselect){
            var el = this.el;
            if(this.value){
                el.child('a.color-'+this.value).removeClass('x-color-palette-sel');
            }
            el.child('a.color-'+color).addClass('x-color-palette-sel');
            this.value = color;
            if(suppressEvent !== true){
                this.fireEvent('select', this, color);
            }
        }
    }

    /**
     * @cfg {String} autoEl @hide
     */
});
Ext.reg('colorpalette', Ext.ColorPalette);