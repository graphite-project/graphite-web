/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
/**
 * @class Ext.layout.AbsoluteLayout
 * @extends Ext.layout.AnchorLayout
 * <p>This is a layout that inherits the anchoring of <b>{@link Ext.layout.AnchorLayout}</b> and adds the
 * ability for x/y positioning using the standard x and y component config options.</p>
 * <p>This class is intended to be extended or created via the <tt><b>{@link Ext.Container#layout layout}</b></tt>
 * configuration property.  See <tt><b>{@link Ext.Container#layout}</b></tt> for additional details.</p>
 * <p>Example usage:</p>
 * <pre><code>
var form = new Ext.form.FormPanel({
    title: 'Absolute Layout',
    layout:'absolute',
    layoutConfig: {
        // layout-specific configs go here
        extraCls: 'x-abs-layout-item',
    },
    baseCls: 'x-plain',
    url:'save-form.php',
    defaultType: 'textfield',
    items: [{
        x: 0,
        y: 5,
        xtype:'label',
        text: 'Send To:'
    },{
        x: 60,
        y: 0,
        name: 'to',
        anchor:'100%'  // anchor width by percentage
    },{
        x: 0,
        y: 35,
        xtype:'label',
        text: 'Subject:'
    },{
        x: 60,
        y: 30,
        name: 'subject',
        anchor: '100%'  // anchor width by percentage
    },{
        x:0,
        y: 60,
        xtype: 'textarea',
        name: 'msg',
        anchor: '100% 100%'  // anchor width and height
    }]
});
</code></pre>
 */
Ext.layout.AbsoluteLayout = Ext.extend(Ext.layout.AnchorLayout, {

    extraCls: 'x-abs-layout-item',

    type: 'absolute',

    onLayout : function(ct, target){
        target.position();
        this.paddingLeft = target.getPadding('l');
        this.paddingTop = target.getPadding('t');
        Ext.layout.AbsoluteLayout.superclass.onLayout.call(this, ct, target);
    },

    // private
    adjustWidthAnchor : function(value, comp){
        return value ? value - comp.getPosition(true)[0] + this.paddingLeft : value;
    },

    // private
    adjustHeightAnchor : function(value, comp){
        return  value ? value - comp.getPosition(true)[1] + this.paddingTop : value;
    }
    /**
     * @property activeItem
     * @hide
     */
});
Ext.Container.LAYOUTS['absolute'] = Ext.layout.AbsoluteLayout;
