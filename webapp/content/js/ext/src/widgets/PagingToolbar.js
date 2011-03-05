/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
/**
 * @class Ext.PagingToolbar
 * @extends Ext.Toolbar
 * <p>As the amount of records increases, the time required for the browser to render
 * them increases. Paging is used to reduce the amount of data exchanged with the client.
 * Note: if there are more records/rows than can be viewed in the available screen area, vertical
 * scrollbars will be added.</p>
 * <p>Paging is typically handled on the server side (see exception below). The client sends
 * parameters to the server side, which the server needs to interpret and then respond with the
 * approprate data.</p>
 * <p><b>Ext.PagingToolbar</b> is a specialized toolbar that is bound to a {@link Ext.data.Store}
 * and provides automatic paging control. This Component {@link Ext.data.Store#load load}s blocks
 * of data into the <tt>{@link #store}</tt> by passing {@link Ext.data.Store#paramNames paramNames} used for
 * paging criteria.</p>
 * <p>PagingToolbar is typically used as one of the Grid's toolbars:</p>
 * <pre><code>
Ext.QuickTips.init(); // to display button quicktips

var myStore = new Ext.data.Store({
    reader: new Ext.data.JsonReader({
        {@link Ext.data.JsonReader#totalProperty totalProperty}: 'results', 
        ...
    }),
    ...
});

var myPageSize = 25;  // server script should only send back 25 items at a time

var grid = new Ext.grid.GridPanel({
    ...
    store: myStore,
    bbar: new Ext.PagingToolbar({
        {@link #store}: myStore,       // grid and PagingToolbar using same store
        {@link #displayInfo}: true,
        {@link #pageSize}: myPageSize,
        {@link #prependButtons}: true,
        items: [
            'text 1'
        ]
    })
});
 * </code></pre>
 *
 * <p>To use paging, pass the paging requirements to the server when the store is first loaded.</p>
 * <pre><code>
store.load({
    params: {
        // specify params for the first page load if using paging
        start: 0,          
        limit: myPageSize,
        // other params
        foo:   'bar'
    }
});
 * </code></pre>
 * 
 * <p>If using {@link Ext.data.Store#autoLoad store's autoLoad} configuration:</p>
 * <pre><code>
var myStore = new Ext.data.Store({
    {@link Ext.data.Store#autoLoad autoLoad}: {params:{start: 0, limit: 25}},
    ...
});
 * </code></pre>
 * 
 * <p>The packet sent back from the server would have this form:</p>
 * <pre><code>
{
    "success": true,
    "results": 2000, 
    "rows": [ // <b>*Note:</b> this must be an Array 
        { "id":  1, "name": "Bill", "occupation": "Gardener" },
        { "id":  2, "name":  "Ben", "occupation": "Horticulturalist" },
        ...
        { "id": 25, "name":  "Sue", "occupation": "Botanist" }
    ]
}
 * </code></pre>
 * <p><u>Paging with Local Data</u></p>
 * <p>Paging can also be accomplished with local data using extensions:</p>
 * <div class="mdetail-params"><ul>
 * <li><a href="http://extjs.com/forum/showthread.php?t=71532">Ext.ux.data.PagingStore</a></li>
 * <li>Paging Memory Proxy (examples/ux/PagingMemoryProxy.js)</li>
 * </ul></div>
 * @constructor Create a new PagingToolbar
 * @param {Object} config The config object
 * @xtype paging
 */
(function() {

var T = Ext.Toolbar;

Ext.PagingToolbar = Ext.extend(Ext.Toolbar, {
    /**
     * @cfg {Ext.data.Store} store
     * The {@link Ext.data.Store} the paging toolbar should use as its data source (required).
     */
    /**
     * @cfg {Boolean} displayInfo
     * <tt>true</tt> to display the displayMsg (defaults to <tt>false</tt>)
     */
    /**
     * @cfg {Number} pageSize
     * The number of records to display per page (defaults to <tt>20</tt>)
     */
    pageSize : 20,
    /**
     * @cfg {Boolean} prependButtons
     * <tt>true</tt> to insert any configured <tt>items</tt> <i>before</i> the paging buttons.
     * Defaults to <tt>false</tt>.
     */
    /**
     * @cfg {String} displayMsg
     * The paging status message to display (defaults to <tt>'Displaying {0} - {1} of {2}'</tt>).
     * Note that this string is formatted using the braced numbers <tt>{0}-{2}</tt> as tokens
     * that are replaced by the values for start, end and total respectively. These tokens should
     * be preserved when overriding this string if showing those values is desired.
     */
    displayMsg : 'Displaying {0} - {1} of {2}',
    /**
     * @cfg {String} emptyMsg
     * The message to display when no records are found (defaults to 'No data to display')
     */
    emptyMsg : 'No data to display',
    /**
     * @cfg {String} beforePageText
     * The text displayed before the input item (defaults to <tt>'Page'</tt>).
     */
    beforePageText : 'Page',
    /**
     * @cfg {String} afterPageText
     * Customizable piece of the default paging text (defaults to <tt>'of {0}'</tt>). Note that
     * this string is formatted using <tt>{0}</tt> as a token that is replaced by the number of
     * total pages. This token should be preserved when overriding this string if showing the
     * total page count is desired.
     */
    afterPageText : 'of {0}',
    /**
     * @cfg {String} firstText
     * The quicktip text displayed for the first page button (defaults to <tt>'First Page'</tt>).
     * <b>Note</b>: quick tips must be initialized for the quicktip to show.
     */
    firstText : 'First Page',
    /**
     * @cfg {String} prevText
     * The quicktip text displayed for the previous page button (defaults to <tt>'Previous Page'</tt>).
     * <b>Note</b>: quick tips must be initialized for the quicktip to show.
     */
    prevText : 'Previous Page',
    /**
     * @cfg {String} nextText
     * The quicktip text displayed for the next page button (defaults to <tt>'Next Page'</tt>).
     * <b>Note</b>: quick tips must be initialized for the quicktip to show.
     */
    nextText : 'Next Page',
    /**
     * @cfg {String} lastText
     * The quicktip text displayed for the last page button (defaults to <tt>'Last Page'</tt>).
     * <b>Note</b>: quick tips must be initialized for the quicktip to show.
     */
    lastText : 'Last Page',
    /**
     * @cfg {String} refreshText
     * The quicktip text displayed for the Refresh button (defaults to <tt>'Refresh'</tt>).
     * <b>Note</b>: quick tips must be initialized for the quicktip to show.
     */
    refreshText : 'Refresh',

    /**
     * <p><b>Deprecated</b>. <code>paramNames</code> should be set in the <b>data store</b>
     * (see {@link Ext.data.Store#paramNames}).</p>
     * <br><p>Object mapping of parameter names used for load calls, initially set to:</p>
     * <pre>{start: 'start', limit: 'limit'}</pre>
     * @type Object
     * @property paramNames
     * @deprecated
     */

    /**
     * The number of records to display per page.  See also <tt>{@link #cursor}</tt>.
     * @type Number
     * @property pageSize
     */

    /**
     * Indicator for the record position.  This property might be used to get the active page
     * number for example:<pre><code>
     * // t is reference to the paging toolbar instance
     * var activePage = Math.ceil((t.cursor + t.pageSize) / t.pageSize);
     * </code></pre>
     * @type Number
     * @property cursor
     */

    initComponent : function(){
        var pagingItems = [this.first = new T.Button({
            tooltip: this.firstText,
            overflowText: this.firstText,
            iconCls: 'x-tbar-page-first',
            disabled: true,
            handler: this.moveFirst,
            scope: this
        }), this.prev = new T.Button({
            tooltip: this.prevText,
            overflowText: this.prevText,
            iconCls: 'x-tbar-page-prev',
            disabled: true,
            handler: this.movePrevious,
            scope: this
        }), '-', this.beforePageText,
        this.inputItem = new Ext.form.NumberField({
            cls: 'x-tbar-page-number',
            allowDecimals: false,
            allowNegative: false,
            enableKeyEvents: true,
            selectOnFocus: true,
            submitValue: false,
            listeners: {
                scope: this,
                keydown: this.onPagingKeyDown,
                blur: this.onPagingBlur
            }
        }), this.afterTextItem = new T.TextItem({
            text: String.format(this.afterPageText, 1)
        }), '-', this.next = new T.Button({
            tooltip: this.nextText,
            overflowText: this.nextText,
            iconCls: 'x-tbar-page-next',
            disabled: true,
            handler: this.moveNext,
            scope: this
        }), this.last = new T.Button({
            tooltip: this.lastText,
            overflowText: this.lastText,
            iconCls: 'x-tbar-page-last',
            disabled: true,
            handler: this.moveLast,
            scope: this
        }), '-', this.refresh = new T.Button({
            tooltip: this.refreshText,
            overflowText: this.refreshText,
            iconCls: 'x-tbar-loading',
            handler: this.doRefresh,
            scope: this
        })];


        var userItems = this.items || this.buttons || [];
        if (this.prependButtons) {
            this.items = userItems.concat(pagingItems);
        }else{
            this.items = pagingItems.concat(userItems);
        }
        delete this.buttons;
        if(this.displayInfo){
            this.items.push('->');
            this.items.push(this.displayItem = new T.TextItem({}));
        }
        Ext.PagingToolbar.superclass.initComponent.call(this);
        this.addEvents(
            /**
             * @event change
             * Fires after the active page has been changed.
             * @param {Ext.PagingToolbar} this
             * @param {Object} pageData An object that has these properties:<ul>
             * <li><code>total</code> : Number <div class="sub-desc">The total number of records in the dataset as
             * returned by the server</div></li>
             * <li><code>activePage</code> : Number <div class="sub-desc">The current page number</div></li>
             * <li><code>pages</code> : Number <div class="sub-desc">The total number of pages (calculated from
             * the total number of records in the dataset as returned by the server and the current {@link #pageSize})</div></li>
             * </ul>
             */
            'change',
            /**
             * @event beforechange
             * Fires just before the active page is changed.
             * Return false to prevent the active page from being changed.
             * @param {Ext.PagingToolbar} this
             * @param {Object} params An object hash of the parameters which the PagingToolbar will send when
             * loading the required page. This will contain:<ul>
             * <li><code>start</code> : Number <div class="sub-desc">The starting row number for the next page of records to
             * be retrieved from the server</div></li>
             * <li><code>limit</code> : Number <div class="sub-desc">The number of records to be retrieved from the server</div></li>
             * </ul>
             * <p>(note: the names of the <b>start</b> and <b>limit</b> properties are determined
             * by the store's {@link Ext.data.Store#paramNames paramNames} property.)</p>
             * <p>Parameters may be added as required in the event handler.</p>
             */
            'beforechange'
        );
        this.on('afterlayout', this.onFirstLayout, this, {single: true});
        this.cursor = 0;
        this.bindStore(this.store, true);
    },

    // private
    onFirstLayout : function(){
        if(this.dsLoaded){
            this.onLoad.apply(this, this.dsLoaded);
        }
    },

    // private
    updateInfo : function(){
        if(this.displayItem){
            var count = this.store.getCount();
            var msg = count == 0 ?
                this.emptyMsg :
                String.format(
                    this.displayMsg,
                    this.cursor+1, this.cursor+count, this.store.getTotalCount()
                );
            this.displayItem.setText(msg);
        }
    },

    // private
    onLoad : function(store, r, o){
        if(!this.rendered){
            this.dsLoaded = [store, r, o];
            return;
        }
        var p = this.getParams();
        this.cursor = (o.params && o.params[p.start]) ? o.params[p.start] : 0;
        var d = this.getPageData(), ap = d.activePage, ps = d.pages;

        this.afterTextItem.setText(String.format(this.afterPageText, d.pages));
        this.inputItem.setValue(ap);
        this.first.setDisabled(ap == 1);
        this.prev.setDisabled(ap == 1);
        this.next.setDisabled(ap == ps);
        this.last.setDisabled(ap == ps);
        this.refresh.enable();
        this.updateInfo();
        this.fireEvent('change', this, d);
    },

    // private
    getPageData : function(){
        var total = this.store.getTotalCount();
        return {
            total : total,
            activePage : Math.ceil((this.cursor+this.pageSize)/this.pageSize),
            pages :  total < this.pageSize ? 1 : Math.ceil(total/this.pageSize)
        };
    },

    /**
     * Change the active page
     * @param {Integer} page The page to display
     */
    changePage : function(page){
        this.doLoad(((page-1) * this.pageSize).constrain(0, this.store.getTotalCount()));
    },

    // private
    onLoadError : function(){
        if(!this.rendered){
            return;
        }
        this.refresh.enable();
    },

    // private
    readPage : function(d){
        var v = this.inputItem.getValue(), pageNum;
        if (!v || isNaN(pageNum = parseInt(v, 10))) {
            this.inputItem.setValue(d.activePage);
            return false;
        }
        return pageNum;
    },

    onPagingFocus : function(){
        this.inputItem.select();
    },

    //private
    onPagingBlur : function(e){
        this.inputItem.setValue(this.getPageData().activePage);
    },

    // private
    onPagingKeyDown : function(field, e){
        var k = e.getKey(), d = this.getPageData(), pageNum;
        if (k == e.RETURN) {
            e.stopEvent();
            pageNum = this.readPage(d);
            if(pageNum !== false){
                pageNum = Math.min(Math.max(1, pageNum), d.pages) - 1;
                this.doLoad(pageNum * this.pageSize);
            }
        }else if (k == e.HOME || k == e.END){
            e.stopEvent();
            pageNum = k == e.HOME ? 1 : d.pages;
            field.setValue(pageNum);
        }else if (k == e.UP || k == e.PAGEUP || k == e.DOWN || k == e.PAGEDOWN){
            e.stopEvent();
            if((pageNum = this.readPage(d))){
                var increment = e.shiftKey ? 10 : 1;
                if(k == e.DOWN || k == e.PAGEDOWN){
                    increment *= -1;
                }
                pageNum += increment;
                if(pageNum >= 1 & pageNum <= d.pages){
                    field.setValue(pageNum);
                }
            }
        }
    },

    // private
    getParams : function(){
        //retain backwards compat, allow params on the toolbar itself, if they exist.
        return this.paramNames || this.store.paramNames;
    },

    // private
    beforeLoad : function(){
        if(this.rendered && this.refresh){
            this.refresh.disable();
        }
    },

    // private
    doLoad : function(start){
        var o = {}, pn = this.getParams();
        o[pn.start] = start;
        o[pn.limit] = this.pageSize;
        if(this.fireEvent('beforechange', this, o) !== false){
            this.store.load({params:o});
        }
    },

    /**
     * Move to the first page, has the same effect as clicking the 'first' button.
     */
    moveFirst : function(){
        this.doLoad(0);
    },

    /**
     * Move to the previous page, has the same effect as clicking the 'previous' button.
     */
    movePrevious : function(){
        this.doLoad(Math.max(0, this.cursor-this.pageSize));
    },

    /**
     * Move to the next page, has the same effect as clicking the 'next' button.
     */
    moveNext : function(){
        this.doLoad(this.cursor+this.pageSize);
    },

    /**
     * Move to the last page, has the same effect as clicking the 'last' button.
     */
    moveLast : function(){
        var total = this.store.getTotalCount(),
            extra = total % this.pageSize;

        this.doLoad(extra ? (total - extra) : total - this.pageSize);
    },

    /**
     * Refresh the current page, has the same effect as clicking the 'refresh' button.
     */
    doRefresh : function(){
        this.doLoad(this.cursor);
    },

    /**
     * Binds the paging toolbar to the specified {@link Ext.data.Store}
     * @param {Store} store The store to bind to this toolbar
     * @param {Boolean} initial (Optional) true to not remove listeners
     */
    bindStore : function(store, initial){
        var doLoad;
        if(!initial && this.store){
            if(store !== this.store && this.store.autoDestroy){
                this.store.destroy();
            }else{
                this.store.un('beforeload', this.beforeLoad, this);
                this.store.un('load', this.onLoad, this);
                this.store.un('exception', this.onLoadError, this);
            }
            if(!store){
                this.store = null;
            }
        }
        if(store){
            store = Ext.StoreMgr.lookup(store);
            store.on({
                scope: this,
                beforeload: this.beforeLoad,
                load: this.onLoad,
                exception: this.onLoadError
            });
            doLoad = true;
        }
        this.store = store;
        if(doLoad){
            this.onLoad(store, null, {});
        }
    },

    /**
     * Unbinds the paging toolbar from the specified {@link Ext.data.Store} <b>(deprecated)</b>
     * @param {Ext.data.Store} store The data store to unbind
     */
    unbind : function(store){
        this.bindStore(null);
    },

    /**
     * Binds the paging toolbar to the specified {@link Ext.data.Store} <b>(deprecated)</b>
     * @param {Ext.data.Store} store The data store to bind
     */
    bind : function(store){
        this.bindStore(store);
    },

    // private
    onDestroy : function(){
        this.bindStore(null);
        Ext.PagingToolbar.superclass.onDestroy.call(this);
    }
});

})();
Ext.reg('paging', Ext.PagingToolbar);