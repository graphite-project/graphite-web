/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
/**
 * @class Ext.DataView
 * @extends Ext.BoxComponent
 * A mechanism for displaying data using custom layout templates and formatting. DataView uses an {@link Ext.XTemplate}
 * as its internal templating mechanism, and is bound to an {@link Ext.data.Store}
 * so that as the data in the store changes the view is automatically updated to reflect the changes.  The view also
 * provides built-in behavior for many common events that can occur for its contained items including click, doubleclick,
 * mouseover, mouseout, etc. as well as a built-in selection model. <b>In order to use these features, an {@link #itemSelector}
 * config must be provided for the DataView to determine what nodes it will be working with.</b>
 *
 * <p>The example below binds a DataView to a {@link Ext.data.Store} and renders it into an {@link Ext.Panel}.</p>
 * <pre><code>
var store = new Ext.data.JsonStore({
    url: 'get-images.php',
    root: 'images',
    fields: [
        'name', 'url',
        {name:'size', type: 'float'},
        {name:'lastmod', type:'date', dateFormat:'timestamp'}
    ]
});
store.load();

var tpl = new Ext.XTemplate(
    '&lt;tpl for="."&gt;',
        '&lt;div class="thumb-wrap" id="{name}"&gt;',
        '&lt;div class="thumb"&gt;&lt;img src="{url}" title="{name}"&gt;&lt;/div&gt;',
        '&lt;span class="x-editable"&gt;{shortName}&lt;/span&gt;&lt;/div&gt;',
    '&lt;/tpl&gt;',
    '&lt;div class="x-clear"&gt;&lt;/div&gt;'
);

var panel = new Ext.Panel({
    id:'images-view',
    frame:true,
    width:535,
    autoHeight:true,
    collapsible:true,
    layout:'fit',
    title:'Simple DataView',

    items: new Ext.DataView({
        store: store,
        tpl: tpl,
        autoHeight:true,
        multiSelect: true,
        overClass:'x-view-over',
        itemSelector:'div.thumb-wrap',
        emptyText: 'No images to display'
    })
});
panel.render(document.body);
</code></pre>
 * @constructor
 * Create a new DataView
 * @param {Object} config The config object
 * @xtype dataview
 */
Ext.DataView = Ext.extend(Ext.BoxComponent, {
    /**
     * @cfg {String/Array} tpl
     * The HTML fragment or an array of fragments that will make up the template used by this DataView.  This should
     * be specified in the same format expected by the constructor of {@link Ext.XTemplate}.
     */
    /**
     * @cfg {Ext.data.Store} store
     * The {@link Ext.data.Store} to bind this DataView to.
     */
    /**
     * @cfg {String} itemSelector
     * <b>This is a required setting</b>. A simple CSS selector (e.g. <tt>div.some-class</tt> or 
     * <tt>span:first-child</tt>) that will be used to determine what nodes this DataView will be
     * working with.
     */
    /**
     * @cfg {Boolean} multiSelect
     * True to allow selection of more than one item at a time, false to allow selection of only a single item
     * at a time or no selection at all, depending on the value of {@link #singleSelect} (defaults to false).
     */
    /**
     * @cfg {Boolean} singleSelect
     * True to allow selection of exactly one item at a time, false to allow no selection at all (defaults to false).
     * Note that if {@link #multiSelect} = true, this value will be ignored.
     */
    /**
     * @cfg {Boolean} simpleSelect
     * True to enable multiselection by clicking on multiple items without requiring the user to hold Shift or Ctrl,
     * false to force the user to hold Ctrl or Shift to select more than on item (defaults to false).
     */
    /**
     * @cfg {String} overClass
     * A CSS class to apply to each item in the view on mouseover (defaults to undefined).
     */
    /**
     * @cfg {String} loadingText
     * A string to display during data load operations (defaults to undefined).  If specified, this text will be
     * displayed in a loading div and the view's contents will be cleared while loading, otherwise the view's
     * contents will continue to display normally until the new data is loaded and the contents are replaced.
     */
    /**
     * @cfg {String} selectedClass
     * A CSS class to apply to each selected item in the view (defaults to 'x-view-selected').
     */
    selectedClass : "x-view-selected",
    /**
     * @cfg {String} emptyText
     * The text to display in the view when there is no data to display (defaults to '').
     */
    emptyText : "",

    /**
     * @cfg {Boolean} deferEmptyText True to defer emptyText being applied until the store's first load
     */
    deferEmptyText: true,
    /**
     * @cfg {Boolean} trackOver True to enable mouseenter and mouseleave events
     */
    trackOver: false,
    
    /**
     * @cfg {Boolean} blockRefresh Set this to true to ignore datachanged events on the bound store. This is useful if
     * you wish to provide custom transition animations via a plugin (defaults to false)
     */
    blockRefresh: false,

    //private
    last: false,

    // private
    initComponent : function(){
        Ext.DataView.superclass.initComponent.call(this);
        if(Ext.isString(this.tpl) || Ext.isArray(this.tpl)){
            this.tpl = new Ext.XTemplate(this.tpl);
        }

        this.addEvents(
            /**
             * @event beforeclick
             * Fires before a click is processed. Returns false to cancel the default action.
             * @param {Ext.DataView} this
             * @param {Number} index The index of the target node
             * @param {HTMLElement} node The target node
             * @param {Ext.EventObject} e The raw event object
             */
            "beforeclick",
            /**
             * @event click
             * Fires when a template node is clicked.
             * @param {Ext.DataView} this
             * @param {Number} index The index of the target node
             * @param {HTMLElement} node The target node
             * @param {Ext.EventObject} e The raw event object
             */
            "click",
            /**
             * @event mouseenter
             * Fires when the mouse enters a template node. trackOver:true or an overClass must be set to enable this event.
             * @param {Ext.DataView} this
             * @param {Number} index The index of the target node
             * @param {HTMLElement} node The target node
             * @param {Ext.EventObject} e The raw event object
             */
            "mouseenter",
            /**
             * @event mouseleave
             * Fires when the mouse leaves a template node. trackOver:true or an overClass must be set to enable this event.
             * @param {Ext.DataView} this
             * @param {Number} index The index of the target node
             * @param {HTMLElement} node The target node
             * @param {Ext.EventObject} e The raw event object
             */
            "mouseleave",
            /**
             * @event containerclick
             * Fires when a click occurs and it is not on a template node.
             * @param {Ext.DataView} this
             * @param {Ext.EventObject} e The raw event object
             */
            "containerclick",
            /**
             * @event dblclick
             * Fires when a template node is double clicked.
             * @param {Ext.DataView} this
             * @param {Number} index The index of the target node
             * @param {HTMLElement} node The target node
             * @param {Ext.EventObject} e The raw event object
             */
            "dblclick",
            /**
             * @event contextmenu
             * Fires when a template node is right clicked.
             * @param {Ext.DataView} this
             * @param {Number} index The index of the target node
             * @param {HTMLElement} node The target node
             * @param {Ext.EventObject} e The raw event object
             */
            "contextmenu",
            /**
             * @event containercontextmenu
             * Fires when a right click occurs that is not on a template node.
             * @param {Ext.DataView} this
             * @param {Ext.EventObject} e The raw event object
             */
            "containercontextmenu",
            /**
             * @event selectionchange
             * Fires when the selected nodes change.
             * @param {Ext.DataView} this
             * @param {Array} selections Array of the selected nodes
             */
            "selectionchange",

            /**
             * @event beforeselect
             * Fires before a selection is made. If any handlers return false, the selection is cancelled.
             * @param {Ext.DataView} this
             * @param {HTMLElement} node The node to be selected
             * @param {Array} selections Array of currently selected nodes
             */
            "beforeselect"
        );

        this.store = Ext.StoreMgr.lookup(this.store);
        this.all = new Ext.CompositeElementLite();
        this.selected = new Ext.CompositeElementLite();
    },

    // private
    afterRender : function(){
        Ext.DataView.superclass.afterRender.call(this);

		this.mon(this.getTemplateTarget(), {
            "click": this.onClick,
            "dblclick": this.onDblClick,
            "contextmenu": this.onContextMenu,
            scope:this
        });

        if(this.overClass || this.trackOver){
            this.mon(this.getTemplateTarget(), {
                "mouseover": this.onMouseOver,
                "mouseout": this.onMouseOut,
                scope:this
            });
        }

        if(this.store){
            this.bindStore(this.store, true);
        }
    },

    /**
     * Refreshes the view by reloading the data from the store and re-rendering the template.
     */
    refresh : function() {
        this.clearSelections(false, true);
        var el = this.getTemplateTarget(),
            records = this.store.getRange();
            
        el.update('');
        if(records.length < 1){
            if(!this.deferEmptyText || this.hasSkippedEmptyText){
                el.update(this.emptyText);
            }
            this.all.clear();
        }else{
            this.tpl.overwrite(el, this.collectData(records, 0));
            this.all.fill(Ext.query(this.itemSelector, el.dom));
            this.updateIndexes(0);
        }
        this.hasSkippedEmptyText = true;
    },

    getTemplateTarget: function(){
        return this.el;
    },

    /**
     * Function which can be overridden to provide custom formatting for each Record that is used by this
     * DataView's {@link #tpl template} to render each node.
     * @param {Array/Object} data The raw data object that was used to create the Record.
     * @param {Number} recordIndex the index number of the Record being prepared for rendering.
     * @param {Record} record The Record being prepared for rendering.
     * @return {Array/Object} The formatted data in a format expected by the internal {@link #tpl template}'s overwrite() method.
     * (either an array if your params are numeric (i.e. {0}) or an object (i.e. {foo: 'bar'}))
     */
    prepareData : function(data){
        return data;
    },

    /**
     * <p>Function which can be overridden which returns the data object passed to this
     * DataView's {@link #tpl template} to render the whole DataView.</p>
     * <p>This is usually an Array of data objects, each element of which is processed by an
     * {@link Ext.XTemplate XTemplate} which uses <tt>'&lt;tpl for="."&gt;'</tt> to iterate over its supplied
     * data object as an Array. However, <i>named</i> properties may be placed into the data object to
     * provide non-repeating data such as headings, totals etc.</p>
     * @param {Array} records An Array of {@link Ext.data.Record}s to be rendered into the DataView.
     * @param {Number} startIndex the index number of the Record being prepared for rendering.
     * @return {Array} An Array of data objects to be processed by a repeating XTemplate. May also
     * contain <i>named</i> properties.
     */
    collectData : function(records, startIndex){
        var r = [],
            i = 0,
            len = records.length;
        for(; i < len; i++){
            r[r.length] = this.prepareData(records[i].data, startIndex + i, records[i]);
        }
        return r;
    },

    // private
    bufferRender : function(records, index){
        var div = document.createElement('div');
        this.tpl.overwrite(div, this.collectData(records, index));
        return Ext.query(this.itemSelector, div);
    },

    // private
    onUpdate : function(ds, record){
        var index = this.store.indexOf(record);
        if(index > -1){
            var sel = this.isSelected(index),
                original = this.all.elements[index],
                node = this.bufferRender([record], index)[0];

            this.all.replaceElement(index, node, true);
            if(sel){
                this.selected.replaceElement(original, node);
                this.all.item(index).addClass(this.selectedClass);
            }
            this.updateIndexes(index, index);
        }
    },

    // private
    onAdd : function(ds, records, index){
        if(this.all.getCount() === 0){
            this.refresh();
            return;
        }
        var nodes = this.bufferRender(records, index), n, a = this.all.elements;
        if(index < this.all.getCount()){
            n = this.all.item(index).insertSibling(nodes, 'before', true);
            a.splice.apply(a, [index, 0].concat(nodes));
        }else{
            n = this.all.last().insertSibling(nodes, 'after', true);
            a.push.apply(a, nodes);
        }
        this.updateIndexes(index);
    },

    // private
    onRemove : function(ds, record, index){
        this.deselect(index);
        this.all.removeElement(index, true);
        this.updateIndexes(index);
        if (this.store.getCount() === 0){
            this.refresh();
        }
    },

    /**
     * Refreshes an individual node's data from the store.
     * @param {Number} index The item's data index in the store
     */
    refreshNode : function(index){
        this.onUpdate(this.store, this.store.getAt(index));
    },

    // private
    updateIndexes : function(startIndex, endIndex){
        var ns = this.all.elements;
        startIndex = startIndex || 0;
        endIndex = endIndex || ((endIndex === 0) ? 0 : (ns.length - 1));
        for(var i = startIndex; i <= endIndex; i++){
            ns[i].viewIndex = i;
        }
    },
    
    /**
     * Returns the store associated with this DataView.
     * @return {Ext.data.Store} The store
     */
    getStore : function(){
        return this.store;
    },

    /**
     * Changes the data store bound to this view and refreshes it.
     * @param {Store} store The store to bind to this view
     */
    bindStore : function(store, initial){
        if(!initial && this.store){
            if(store !== this.store && this.store.autoDestroy){
                this.store.destroy();
            }else{
                this.store.un("beforeload", this.onBeforeLoad, this);
                this.store.un("datachanged", this.onDataChanged, this);
                this.store.un("add", this.onAdd, this);
                this.store.un("remove", this.onRemove, this);
                this.store.un("update", this.onUpdate, this);
                this.store.un("clear", this.refresh, this);
            }
            if(!store){
                this.store = null;
            }
        }
        if(store){
            store = Ext.StoreMgr.lookup(store);
            store.on({
                scope: this,
                beforeload: this.onBeforeLoad,
                datachanged: this.onDataChanged,
                add: this.onAdd,
                remove: this.onRemove,
                update: this.onUpdate,
                clear: this.refresh
            });
        }
        this.store = store;
        if(store){
            this.refresh();
        }
    },
    
    /**
     * @private
     * Calls this.refresh if this.blockRefresh is not true
     */
    onDataChanged: function() {
        if (this.blockRefresh !== true) {
            this.refresh.apply(this, arguments);
        }
    },

    /**
     * Returns the template node the passed child belongs to, or null if it doesn't belong to one.
     * @param {HTMLElement} node
     * @return {HTMLElement} The template node
     */
    findItemFromChild : function(node){
        return Ext.fly(node).findParent(this.itemSelector, this.getTemplateTarget());
    },

    // private
    onClick : function(e){
        var item = e.getTarget(this.itemSelector, this.getTemplateTarget()),
            index;
        if(item){
            index = this.indexOf(item);
            if(this.onItemClick(item, index, e) !== false){
                this.fireEvent("click", this, index, item, e);
            }
        }else{
            if(this.fireEvent("containerclick", this, e) !== false){
                this.onContainerClick(e);
            }
        }
    },

    onContainerClick : function(e){
        this.clearSelections();
    },

    // private
    onContextMenu : function(e){
        var item = e.getTarget(this.itemSelector, this.getTemplateTarget());
        if(item){
            this.fireEvent("contextmenu", this, this.indexOf(item), item, e);
        }else{
            this.fireEvent("containercontextmenu", this, e);
        }
    },

    // private
    onDblClick : function(e){
        var item = e.getTarget(this.itemSelector, this.getTemplateTarget());
        if(item){
            this.fireEvent("dblclick", this, this.indexOf(item), item, e);
        }
    },

    // private
    onMouseOver : function(e){
        var item = e.getTarget(this.itemSelector, this.getTemplateTarget());
        if(item && item !== this.lastItem){
            this.lastItem = item;
            Ext.fly(item).addClass(this.overClass);
            this.fireEvent("mouseenter", this, this.indexOf(item), item, e);
        }
    },

    // private
    onMouseOut : function(e){
        if(this.lastItem){
            if(!e.within(this.lastItem, true, true)){
                Ext.fly(this.lastItem).removeClass(this.overClass);
                this.fireEvent("mouseleave", this, this.indexOf(this.lastItem), this.lastItem, e);
                delete this.lastItem;
            }
        }
    },

    // private
    onItemClick : function(item, index, e){
        if(this.fireEvent("beforeclick", this, index, item, e) === false){
            return false;
        }
        if(this.multiSelect){
            this.doMultiSelection(item, index, e);
            e.preventDefault();
        }else if(this.singleSelect){
            this.doSingleSelection(item, index, e);
            e.preventDefault();
        }
        return true;
    },

    // private
    doSingleSelection : function(item, index, e){
        if(e.ctrlKey && this.isSelected(index)){
            this.deselect(index);
        }else{
            this.select(index, false);
        }
    },

    // private
    doMultiSelection : function(item, index, e){
        if(e.shiftKey && this.last !== false){
            var last = this.last;
            this.selectRange(last, index, e.ctrlKey);
            this.last = last; // reset the last
        }else{
            if((e.ctrlKey||this.simpleSelect) && this.isSelected(index)){
                this.deselect(index);
            }else{
                this.select(index, e.ctrlKey || e.shiftKey || this.simpleSelect);
            }
        }
    },

    /**
     * Gets the number of selected nodes.
     * @return {Number} The node count
     */
    getSelectionCount : function(){
        return this.selected.getCount();
    },

    /**
     * Gets the currently selected nodes.
     * @return {Array} An array of HTMLElements
     */
    getSelectedNodes : function(){
        return this.selected.elements;
    },

    /**
     * Gets the indexes of the selected nodes.
     * @return {Array} An array of numeric indexes
     */
    getSelectedIndexes : function(){
        var indexes = [], 
            selected = this.selected.elements,
            i = 0,
            len = selected.length;
            
        for(; i < len; i++){
            indexes.push(selected[i].viewIndex);
        }
        return indexes;
    },

    /**
     * Gets an array of the selected records
     * @return {Array} An array of {@link Ext.data.Record} objects
     */
    getSelectedRecords : function(){
        return this.getRecords(this.selected.elements);
    },

    /**
     * Gets an array of the records from an array of nodes
     * @param {Array} nodes The nodes to evaluate
     * @return {Array} records The {@link Ext.data.Record} objects
     */
    getRecords : function(nodes){
        var records = [], 
            i = 0,
            len = nodes.length;
            
        for(; i < len; i++){
            records[records.length] = this.store.getAt(nodes[i].viewIndex);
        }
        return records;
    },

    /**
     * Gets a record from a node
     * @param {HTMLElement} node The node to evaluate
     * @return {Record} record The {@link Ext.data.Record} object
     */
    getRecord : function(node){
        return this.store.getAt(node.viewIndex);
    },

    /**
     * Clears all selections.
     * @param {Boolean} suppressEvent (optional) True to skip firing of the selectionchange event
     */
    clearSelections : function(suppressEvent, skipUpdate){
        if((this.multiSelect || this.singleSelect) && this.selected.getCount() > 0){
            if(!skipUpdate){
                this.selected.removeClass(this.selectedClass);
            }
            this.selected.clear();
            this.last = false;
            if(!suppressEvent){
                this.fireEvent("selectionchange", this, this.selected.elements);
            }
        }
    },

    /**
     * Returns true if the passed node is selected, else false.
     * @param {HTMLElement/Number/Ext.data.Record} node The node, node index or record to check
     * @return {Boolean} True if selected, else false
     */
    isSelected : function(node){
        return this.selected.contains(this.getNode(node));
    },

    /**
     * Deselects a node.
     * @param {HTMLElement/Number/Record} node The node, node index or record to deselect
     */
    deselect : function(node){
        if(this.isSelected(node)){
            node = this.getNode(node);
            this.selected.removeElement(node);
            if(this.last == node.viewIndex){
                this.last = false;
            }
            Ext.fly(node).removeClass(this.selectedClass);
            this.fireEvent("selectionchange", this, this.selected.elements);
        }
    },

    /**
     * Selects a set of nodes.
     * @param {Array/HTMLElement/String/Number/Ext.data.Record} nodeInfo An HTMLElement template node, index of a template node,
     * id of a template node, record associated with a node or an array of any of those to select
     * @param {Boolean} keepExisting (optional) true to keep existing selections
     * @param {Boolean} suppressEvent (optional) true to skip firing of the selectionchange vent
     */
    select : function(nodeInfo, keepExisting, suppressEvent){
        if(Ext.isArray(nodeInfo)){
            if(!keepExisting){
                this.clearSelections(true);
            }
            for(var i = 0, len = nodeInfo.length; i < len; i++){
                this.select(nodeInfo[i], true, true);
            }
            if(!suppressEvent){
                this.fireEvent("selectionchange", this, this.selected.elements);
            }
        } else{
            var node = this.getNode(nodeInfo);
            if(!keepExisting){
                this.clearSelections(true);
            }
            if(node && !this.isSelected(node)){
                if(this.fireEvent("beforeselect", this, node, this.selected.elements) !== false){
                    Ext.fly(node).addClass(this.selectedClass);
                    this.selected.add(node);
                    this.last = node.viewIndex;
                    if(!suppressEvent){
                        this.fireEvent("selectionchange", this, this.selected.elements);
                    }
                }
            }
        }
    },

    /**
     * Selects a range of nodes. All nodes between start and end are selected.
     * @param {Number} start The index of the first node in the range
     * @param {Number} end The index of the last node in the range
     * @param {Boolean} keepExisting (optional) True to retain existing selections
     */
    selectRange : function(start, end, keepExisting){
        if(!keepExisting){
            this.clearSelections(true);
        }
        this.select(this.getNodes(start, end), true);
    },

    /**
     * Gets a template node.
     * @param {HTMLElement/String/Number/Ext.data.Record} nodeInfo An HTMLElement template node, index of a template node, 
     * the id of a template node or the record associated with the node.
     * @return {HTMLElement} The node or null if it wasn't found
     */
    getNode : function(nodeInfo){
        if(Ext.isString(nodeInfo)){
            return document.getElementById(nodeInfo);
        }else if(Ext.isNumber(nodeInfo)){
            return this.all.elements[nodeInfo];
        }else if(nodeInfo instanceof Ext.data.Record){
            var idx = this.store.indexOf(nodeInfo);
            return this.all.elements[idx];
        }
        return nodeInfo;
    },

    /**
     * Gets a range nodes.
     * @param {Number} start (optional) The index of the first node in the range
     * @param {Number} end (optional) The index of the last node in the range
     * @return {Array} An array of nodes
     */
    getNodes : function(start, end){
        var ns = this.all.elements,
            nodes = [],
            i;
            
        start = start || 0;
        end = !Ext.isDefined(end) ? Math.max(ns.length - 1, 0) : end;
        if(start <= end){
            for(i = start; i <= end && ns[i]; i++){
                nodes.push(ns[i]);
            }
        } else{
            for(i = start; i >= end && ns[i]; i--){
                nodes.push(ns[i]);
            }
        }
        return nodes;
    },

    /**
     * Finds the index of the passed node.
     * @param {HTMLElement/String/Number/Record} nodeInfo An HTMLElement template node, index of a template node, the id of a template node
     * or a record associated with a node.
     * @return {Number} The index of the node or -1
     */
    indexOf : function(node){
        node = this.getNode(node);
        if(Ext.isNumber(node.viewIndex)){
            return node.viewIndex;
        }
        return this.all.indexOf(node);
    },

    // private
    onBeforeLoad : function(){
        if(this.loadingText){
            this.clearSelections(false, true);
            this.getTemplateTarget().update('<div class="loading-indicator">'+this.loadingText+'</div>');
            this.all.clear();
        }
    },

    onDestroy : function(){
        this.all.clear();
        this.selected.clear();
        Ext.DataView.superclass.onDestroy.call(this);
        this.bindStore(null);
    }
});

/**
 * Changes the data store bound to this view and refreshes it. (deprecated in favor of bindStore)
 * @param {Store} store The store to bind to this view
 */
Ext.DataView.prototype.setStore = Ext.DataView.prototype.bindStore;

Ext.reg('dataview', Ext.DataView);
