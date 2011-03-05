/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
Imgorg.DirectCombo = Ext.extend(Ext.form.ComboBox, {
    displayField: 'text',
    valueField: 'id',
    triggerAction: 'all',
    queryAction: 'name',
    forceSelection: true,
    mode: 'remote',
    
    initComponent: function() {
        this.store = new Ext.data.DirectStore(Ext.apply({
            api: this.api,
            root: '',
            fields: this.fields || ['text', 'id']
        }, this.storeConfig));
        
        Imgorg.DirectCombo.superclass.initComponent.call(this);
    }
});

Imgorg.TagCombo = Ext.extend(Imgorg.DirectCombo,{
    forceSelection: false,
    storeConfig: {
        id: 'tag-store'
    },
    initComponent: function() {
        Ext.apply(this.storeConfig, {
            directFn: Imgorg.ss.Tags.load
        });
        Imgorg.TagCombo.superclass.initComponent.call(this);
    }
});
Ext.reg('img-tagcombo', Imgorg.TagCombo);

Imgorg.TagMultiCombo = Ext.extend(Ext.ux.MultiCombo,{
    listClass: 'label-combo',
    displayField: 'text',
    valueField: 'id',
    
    initComponent: function() {
        this.store = new Ext.data.DirectStore(Ext.apply({
            directFn: Imgorg.ss.Tags.load,
            root: '',
            autoLoad: true,
            fields: this.fields || ['text', 'id']
        }, this.storeConfig));
        this.plugins =new Ext.ux.MultiCombo.Checkable({});
        Imgorg.DirectCombo.superclass.initComponent.call(this);
    }
});
Ext.reg('img-tagmulticombo', Imgorg.TagMultiCombo);

Imgorg.AlbumCombo = Ext.extend(Imgorg.DirectCombo, {
    storeConfig: {
        id: 'album-store'
    },
    initComponent: function() {
        Ext.apply(this.storeConfig, {
            directFn: Imgorg.ss.Albums.getAllInfo
        });
        Imgorg.AlbumCombo.superclass.initComponent.call(this);
    }
});
Ext.reg('img-albumcombo', Imgorg.AlbumCombo);
