/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
Imgorg.ImagePanel = Ext.extend(Ext.Panel,{
    closable: true,
    border: false,
    tagTpl: new Ext.XTemplate(
        '<h3 class="image-prop-header">Tags</h3>',
        '<tpl for=".">',
            '<div class="image-prop">{text}</div>',
        '</tpl>'
    ),
    albumTpl: new Ext.XTemplate(
        '<h3 class="image-prop-header">Album</h3>',
        '<tpl for=".">',
            '<div class="image-prop">{text}</div>',
        '</tpl>'
    ),
    infoTpl: new Ext.XTemplate(
        '<h3 class="image-prop-header">File Info</h3>',
        '<div class="image-prop">Filename: {FileName}</div>',
        '<div class="image-prop">Size: {FileSize:fileSize}</div>',
        '<div class="image-prop">Height: {[values["COMPUTED"].Height]}</div>',
        '<div class="image-prop">Width: {[values["COMPUTED"].Width]}</div>'
    ),
    initComponent: function() {
        Ext.apply(this,{
            layout: 'border',
            items: [{
                border: false,
                region: 'center',
                html: '<div style="text-align:center;"><img src="'+this.url+'"/></div>',
                autoScroll: true
            },{
                border: false,
                region: 'east',
                itemId: 'image-properties',
                width: 250,
                title: 'Properties',
                collapsible: true,
                style: 'border-left: 1px solid #99BBE8'
            }]
        });
        Imgorg.ImagePanel.superclass.initComponent.call(this);
    },
    
    afterRender: function() {
        Imgorg.ImagePanel.superclass.afterRender.call(this);
        Imgorg.ss.Images.getInfo({image: this.imageData.id}, this.onGetInfo, this);
        Imgorg.ss.Albums.getAlbums({image: this.imageData.id}, this.onGetAlbums,this);
        Imgorg.ss.Tags.getTags({image: this.imageData.id}, this.onGetTags, this);
    },
    
    onGetInfo: function(data, resp) {
        var prop = this.getComponent('image-properties');
        this.infoTpl.append(prop.body, data)
    },
    
    onGetTags: function(data, resp) {
        var prop = this.getComponent('image-properties');
        this.tagTpl.append(prop.body, data);
    },
    
    onGetAlbums: function(data, resp) {
        var prop = this.getComponent('image-properties');
        this.albumTpl.append(prop.body, data);
    }
});
Ext.reg('img-panel',Imgorg.ImagePanel);
