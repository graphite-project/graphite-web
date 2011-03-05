/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
/**
 * @class Ext.layout.AutoLayout
 * <p>The AutoLayout is the default layout manager delegated by {@link Ext.Container} to
 * render any child Components when no <tt>{@link Ext.Container#layout layout}</tt> is configured into
 * a {@link Ext.Container Container}.</tt>.  AutoLayout provides only a passthrough of any layout calls
 * to any child containers.</p>
 */
Ext.layout.AutoLayout = Ext.extend(Ext.layout.ContainerLayout, {
    type: 'auto',

    monitorResize: true,

    onLayout : function(ct, target){
        Ext.layout.AutoLayout.superclass.onLayout.call(this, ct, target);
        var cs = this.getRenderedItems(ct), len = cs.length, i, c;
        for(i = 0; i < len; i++){
            c = cs[i];
            if (c.doLayout){
                // Shallow layout children
                c.doLayout(true);
            }
        }
    }
});

Ext.Container.LAYOUTS['auto'] = Ext.layout.AutoLayout;
