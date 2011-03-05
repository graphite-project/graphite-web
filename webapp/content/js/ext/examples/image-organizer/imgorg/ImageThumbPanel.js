/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
Imgorg.ImageThumbPanel = Ext.extend(Ext.Panel, {
    minWidth: 80,
    title: 'All Photos',
    
    initComponent: function() {
        this.tfId = 'tag-filter-'+Ext.id();
        
        var sliderValue = 0;
        var p = Ext.state.Manager.getProvider();
        if (p) {
            sliderValue = Ext.num(p.get('sliderValue'), 0);
        }
        
        Ext.apply(this,{
            layout:'fit',
            cls: 'images-view',
            items:Ext.apply({
                xtype: 'img-dv',
                itemId: 'imgorg-dv'
            },this.dvConfig||{}),
            bbar:['Tags:',{
                xtype: 'img-tagmulticombo',
                id: this.tfId,
                listeners: {
                    select: function(combo, record, idx) {
                        var vals = combo.getValue();
                        this.tagFilter(vals);
                        return true;
                    },
                    clearall: function(combo) {
                        this.clearFilter();
                    },
                    scope: this
                }
            },'->',{
                xtype: 'slider',
                itemId: 'size-slider',
                width: 200,
                style: 'margin-right:20px;',
                value: sliderValue,
                plugins: new Ext.slider.Tip({
                    getText: function(slider){
                        return String.format('<b>{0}%</b>', 100+slider.getValue()*3);
                    }
                }),
                listeners: {
                    change: this.onChange,
                    scope: this
                }
            }]
        });
        Imgorg.ImageThumbPanel.superclass.initComponent.call(this);
        this.on('activate', this.onActivate, this);
    },
    
    afterRender: function() {
        Imgorg.ImageThumbPanel.superclass.afterRender.call(this);
        this.view = this.getComponent('imgorg-dv');
        (function() {
            this.dragZone = new ImageDragZone(this.view, {
                containerScroll:true,
                ddGroup: 'organizerDD'
            });
        }).defer(100, this);
    },
    
    onActivate: function() {
        this.reload();
        var p = Ext.state.Manager.getProvider();
        if (p) {
            sliderValue = Ext.num(p.get('sliderValue'), 0);
            var slider = this.getBottomToolbar().getComponent('size-slider');
            slider.setValue(sliderValue);
            this.onChange(slider);
        }
    },
    
    onChange: function(slider, e) {
        var p = Ext.state.Manager.getProvider();
        if (p) {
            p.set('sliderValue', slider.getValue());
        }
        Ext.util.CSS.updateRule('.images-view .thumb img','height',this.minWidth+slider.getValue()*3);
    },
    
    tagFilter: function(vals) {
        if (this.view.store.lastOptions.params) {
            var album = this.view.store.lastOptions.params.album;
        }
        
        this.view.store.load({
            params: {
                tags: vals,
                album: album
            }
        });
    },
    
    clearFilter: function() {
        var album = this.view.store.lastOptions.params.album;
        this.view.store.load({
            params: {
                album: album
            }
        });
        Ext.getCmp(this.tfId).reset();
    },
    
    albumFilter: function(album) {
        this.getComponent('imgorg-dv').store.load({
            params: {
                album: album.id
            }
        });
    },
    
    reload: function() {
        this.view.store.reload();
    }
});
Ext.reg('img-thumbpanel', Imgorg.ImageThumbPanel);


ImageDragZone = function(view, config){
    this.view = view;
    ImageDragZone.superclass.constructor.call(this, view.getEl(), config);
};
Ext.extend(ImageDragZone, Ext.dd.DragZone, {
    // We don't want to register our image elements, so let's 
    // override the default registry lookup to fetch the image 
    // from the event instead
    getDragData : function(e){
        var target = e.getTarget('.thumb-wrap');
        if(target){
            var view = this.view;
            if(!view.isSelected(target)){
                view.onClick(e);
            }
            var selNodes = view.getSelectedNodes();
            var dragData = {
                nodes: selNodes
            };
            if(selNodes.length == 1){
                dragData.ddel = target;
                dragData.single = true;
            }else{
                var div = document.createElement('div'); // create the multi element drag "ghost"
                div.className = 'multi-proxy';
                for(var i = 0, len = selNodes.length; i < len; i++){
                    div.appendChild(selNodes[i].firstChild.firstChild.cloneNode(true)); // image nodes only
                    if((i+1) % 3 == 0){
                        div.appendChild(document.createElement('br'));
                    }
                }
                var count = document.createElement('div'); // selected image count
                count.innerHTML = i + ' images selected';
                div.appendChild(count);
                
                dragData.ddel = div;
                dragData.multi = true;
            }
            return dragData;
        }
        return false;
    },

    // this method is called by the TreeDropZone after a node drop
    // to get the new tree node (there are also other way, but this is easiest)
    getTreeNode : function(){
        var treeNodes = [];
        var nodeData = this.view.getRecords(this.dragData.nodes);
        for(var i = 0, len = nodeData.length; i < len; i++){
            var data = nodeData[i].data;
            treeNodes.push(new Ext.tree.TreeNode({
                text: data.name,
                icon: '../view/'+data.url,
                data: data,
                leaf:true,
                cls: 'image-node'
            }));
        }
        return treeNodes;
    },
    
    // the default action is to "highlight" after a bad drop
    // but since an image can't be highlighted, let's frame it 
    afterRepair:function(){
        for(var i = 0, len = this.dragData.nodes.length; i < len; i++){
            Ext.fly(this.dragData.nodes[i]).frame('#8db2e3', 1);
        }
        this.dragging = false;    
    },
    
    // override the default repairXY with one offset for the margins and padding
    getRepairXY : function(e){
        if(!this.dragData.multi){
            var xy = Ext.Element.fly(this.dragData.ddel).getXY();
            xy[0]+=3;xy[1]+=3;
            return xy;
        }
        return false;
    }
});