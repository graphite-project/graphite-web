/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
/**
 * @class Ext.grid.GroupingView
 * @extends Ext.grid.GridView
 * Adds the ability for single level grouping to the grid. A {@link Ext.data.GroupingStore GroupingStore}
 * must be used to enable grouping.  Some grouping characteristics may also be configured at the
 * {@link Ext.grid.Column Column level}<div class="mdetail-params"><ul>
 * <li><code>{@link Ext.grid.Column#emptyGroupText emptyGroupText}</code></li>
 * <li><code>{@link Ext.grid.Column#groupable groupable}</code></li>
 * <li><code>{@link Ext.grid.Column#groupName groupName}</code></li>
 * <li><code>{@link Ext.grid.Column#groupRender groupRender}</code></li>
 * </ul></div>
 * <p>Sample usage:</p>
 * <pre><code>
var grid = new Ext.grid.GridPanel({
    // A groupingStore is required for a GroupingView
    store: new {@link Ext.data.GroupingStore}({
        autoDestroy: true,
        reader: reader,
        data: xg.dummyData,
        sortInfo: {field: 'company', direction: 'ASC'},
        {@link Ext.data.GroupingStore#groupOnSort groupOnSort}: true,
        {@link Ext.data.GroupingStore#remoteGroup remoteGroup}: true,
        {@link Ext.data.GroupingStore#groupField groupField}: 'industry'
    }),
    colModel: new {@link Ext.grid.ColumnModel}({
        columns:[
            {id:'company',header: 'Company', width: 60, dataIndex: 'company'},
            // {@link Ext.grid.Column#groupable groupable}, {@link Ext.grid.Column#groupName groupName}, {@link Ext.grid.Column#groupRender groupRender} are also configurable at column level
            {header: 'Price', renderer: Ext.util.Format.usMoney, dataIndex: 'price', {@link Ext.grid.Column#groupable groupable}: false},
            {header: 'Change', dataIndex: 'change', renderer: Ext.util.Format.usMoney},
            {header: 'Industry', dataIndex: 'industry'},
            {header: 'Last Updated', renderer: Ext.util.Format.dateRenderer('m/d/Y'), dataIndex: 'lastChange'}
        ],
        defaults: {
            sortable: true,
            menuDisabled: false,
            width: 20
        }
    }),

    view: new Ext.grid.GroupingView({
        {@link Ext.grid.GridView#forceFit forceFit}: true,
        // custom grouping text template to display the number of items per group
        {@link #groupTextTpl}: '{text} ({[values.rs.length]} {[values.rs.length > 1 ? "Items" : "Item"]})'
    }),

    frame:true,
    width: 700,
    height: 450,
    collapsible: true,
    animCollapse: false,
    title: 'Grouping Example',
    iconCls: 'icon-grid',
    renderTo: document.body
});
 * </code></pre>
 * @constructor
 * @param {Object} config
 */
Ext.grid.GroupingView = Ext.extend(Ext.grid.GridView, {

    /**
     * @cfg {String} groupByText Text displayed in the grid header menu for grouping by a column
     * (defaults to 'Group By This Field').
     */
    groupByText : 'Group By This Field',
    /**
     * @cfg {String} showGroupsText Text displayed in the grid header for enabling/disabling grouping
     * (defaults to 'Show in Groups').
     */
    showGroupsText : 'Show in Groups',
    /**
     * @cfg {Boolean} hideGroupedColumn <tt>true</tt> to hide the column that is currently grouped (defaults to <tt>false</tt>)
     */
    hideGroupedColumn : false,
    /**
     * @cfg {Boolean} showGroupName If <tt>true</tt> will display a prefix plus a ': ' before the group field value
     * in the group header line.  The prefix will consist of the <tt><b>{@link Ext.grid.Column#groupName groupName}</b></tt>
     * (or the configured <tt><b>{@link Ext.grid.Column#header header}</b></tt> if not provided) configured in the
     * {@link Ext.grid.Column} for each set of grouped rows (defaults to <tt>true</tt>).
     */
    showGroupName : true,
    /**
     * @cfg {Boolean} startCollapsed <tt>true</tt> to start all groups collapsed (defaults to <tt>false</tt>)
     */
    startCollapsed : false,
    /**
     * @cfg {Boolean} enableGrouping <tt>false</tt> to disable grouping functionality (defaults to <tt>true</tt>)
     */
    enableGrouping : true,
    /**
     * @cfg {Boolean} enableGroupingMenu <tt>true</tt> to enable the grouping control in the column menu (defaults to <tt>true</tt>)
     */
    enableGroupingMenu : true,
    /**
     * @cfg {Boolean} enableNoGroups <tt>true</tt> to allow the user to turn off grouping (defaults to <tt>true</tt>)
     */
    enableNoGroups : true,
    /**
     * @cfg {String} emptyGroupText The text to display when there is an empty group value (defaults to <tt>'(None)'</tt>).
     * May also be specified per column, see {@link Ext.grid.Column}.{@link Ext.grid.Column#emptyGroupText emptyGroupText}.
     */
    emptyGroupText : '(None)',
    /**
     * @cfg {Boolean} ignoreAdd <tt>true</tt> to skip refreshing the view when new rows are added (defaults to <tt>false</tt>)
     */
    ignoreAdd : false,
    /**
     * @cfg {String} groupTextTpl The template used to render the group header (defaults to <tt>'{text}'</tt>).
     * This is used to format an object which contains the following properties:
     * <div class="mdetail-params"><ul>
     * <li><b>group</b> : String<p class="sub-desc">The <i>rendered</i> value of the group field.
     * By default this is the unchanged value of the group field. If a <tt><b>{@link Ext.grid.Column#groupRenderer groupRenderer}</b></tt>
     * is specified, it is the result of a call to that function.</p></li>
     * <li><b>gvalue</b> : Object<p class="sub-desc">The <i>raw</i> value of the group field.</p></li>
     * <li><b>text</b> : String<p class="sub-desc">The configured header (as described in <tt>{@link #showGroupName})</tt>
     * if <tt>{@link #showGroupName}</tt> is <tt>true</tt>) plus the <i>rendered</i> group field value.</p></li>
     * <li><b>groupId</b> : String<p class="sub-desc">A unique, generated ID which is applied to the
     * View Element which contains the group.</p></li>
     * <li><b>startRow</b> : Number<p class="sub-desc">The row index of the Record which caused group change.</p></li>
     * <li><b>rs</b> : Array<p class="sub-desc">Contains a single element: The Record providing the data
     * for the row which caused group change.</p></li>
     * <li><b>cls</b> : String<p class="sub-desc">The generated class name string to apply to the group header Element.</p></li>
     * <li><b>style</b> : String<p class="sub-desc">The inline style rules to apply to the group header Element.</p></li>
     * </ul></div></p>
     * See {@link Ext.XTemplate} for information on how to format data using a template. Possible usage:<pre><code>
var grid = new Ext.grid.GridPanel({
    ...
    view: new Ext.grid.GroupingView({
        groupTextTpl: '{text} ({[values.rs.length]} {[values.rs.length > 1 ? "Items" : "Item"]})'
    }),
});
     * </code></pre>
     */
    groupTextTpl : '{text}',

    /**
     * @cfg {String} groupMode Indicates how to construct the group identifier. <tt>'value'</tt> constructs the id using
     * raw value, <tt>'display'</tt> constructs the id using the rendered value. Defaults to <tt>'value'</tt>.
     */
    groupMode: 'value',

    /**
     * @cfg {Function} groupRenderer This property must be configured in the {@link Ext.grid.Column} for
     * each column.
     */
    
    /**
     * @cfg {Boolean} cancelEditOnToggle True to cancel any editing when the group header is toggled. Defaults to <tt>true</tt>.
     */
    cancelEditOnToggle: true,

    // private
    initTemplates : function(){
        Ext.grid.GroupingView.superclass.initTemplates.call(this);
        this.state = {};

        var sm = this.grid.getSelectionModel();
        sm.on(sm.selectRow ? 'beforerowselect' : 'beforecellselect',
                this.onBeforeRowSelect, this);

        if(!this.startGroup){
            this.startGroup = new Ext.XTemplate(
                '<div id="{groupId}" class="x-grid-group {cls}">',
                    '<div id="{groupId}-hd" class="x-grid-group-hd" style="{style}"><div class="x-grid-group-title">', this.groupTextTpl ,'</div></div>',
                    '<div id="{groupId}-bd" class="x-grid-group-body">'
            );
        }
        this.startGroup.compile();

        if (!this.endGroup) {
            this.endGroup = '</div></div>';
        }
    },

    // private
    findGroup : function(el){
        return Ext.fly(el).up('.x-grid-group', this.mainBody.dom);
    },

    // private
    getGroups : function(){
        return this.hasRows() ? this.mainBody.dom.childNodes : [];
    },

    // private
    onAdd : function(ds, records, index) {
        if (this.canGroup() && !this.ignoreAdd) {
            var ss = this.getScrollState();
            this.fireEvent('beforerowsinserted', ds, index, index + (records.length-1));
            this.refresh();
            this.restoreScroll(ss);
            this.fireEvent('rowsinserted', ds, index, index + (records.length-1));
        } else if (!this.canGroup()) {
            Ext.grid.GroupingView.superclass.onAdd.apply(this, arguments);
        }
    },

    // private
    onRemove : function(ds, record, index, isUpdate){
        Ext.grid.GroupingView.superclass.onRemove.apply(this, arguments);
        var g = document.getElementById(record._groupId);
        if(g && g.childNodes[1].childNodes.length < 1){
            Ext.removeNode(g);
        }
        this.applyEmptyText();
    },

    // private
    refreshRow : function(record){
        if(this.ds.getCount()==1){
            this.refresh();
        }else{
            this.isUpdating = true;
            Ext.grid.GroupingView.superclass.refreshRow.apply(this, arguments);
            this.isUpdating = false;
        }
    },

    // private
    beforeMenuShow : function(){
        var item, items = this.hmenu.items, disabled = this.cm.config[this.hdCtxIndex].groupable === false;
        if((item = items.get('groupBy'))){
            item.setDisabled(disabled);
        }
        if((item = items.get('showGroups'))){
            item.setDisabled(disabled);
            item.setChecked(this.canGroup(), true);
        }
    },

    // private
    renderUI : function(){
        var markup = Ext.grid.GroupingView.superclass.renderUI.call(this);

        if(this.enableGroupingMenu && this.hmenu){
            this.hmenu.add('-',{
                itemId:'groupBy',
                text: this.groupByText,
                handler: this.onGroupByClick,
                scope: this,
                iconCls:'x-group-by-icon'
            });
            if(this.enableNoGroups){
                this.hmenu.add({
                    itemId:'showGroups',
                    text: this.showGroupsText,
                    checked: true,
                    checkHandler: this.onShowGroupsClick,
                    scope: this
                });
            }
            this.hmenu.on('beforeshow', this.beforeMenuShow, this);
        }
        return markup;
    },

    processEvent: function(name, e){
        Ext.grid.GroupingView.superclass.processEvent.call(this, name, e);
        var hd = e.getTarget('.x-grid-group-hd', this.mainBody);
        if(hd){
            // group value is at the end of the string
            var field = this.getGroupField(),
                prefix = this.getPrefix(field),
                groupValue = hd.id.substring(prefix.length),
                emptyRe = new RegExp('gp-' + Ext.escapeRe(field) + '--hd');

            // remove trailing '-hd'
            groupValue = groupValue.substr(0, groupValue.length - 3);
            
            // also need to check for empty groups
            if(groupValue || emptyRe.test(hd.id)){
                this.grid.fireEvent('group' + name, this.grid, field, groupValue, e);
            }
            if(name == 'mousedown' && e.button == 0){
                this.toggleGroup(hd.parentNode);
            }
        }

    },

    // private
    onGroupByClick : function(){
        var grid = this.grid;
        this.enableGrouping = true;
        grid.store.groupBy(this.cm.getDataIndex(this.hdCtxIndex));
        grid.fireEvent('groupchange', grid, grid.store.getGroupState());
        this.beforeMenuShow(); // Make sure the checkboxes get properly set when changing groups
        this.refresh();
    },

    // private
    onShowGroupsClick : function(mi, checked){
        this.enableGrouping = checked;
        if(checked){
            this.onGroupByClick();
        }else{
            this.grid.store.clearGrouping();
            this.grid.fireEvent('groupchange', this, null);
        }
    },

    /**
     * Toggle the group that contains the specific row.
     * @param {Number} rowIndex The row inside the group
     * @param {Boolean} expanded (optional)
     */
    toggleRowIndex : function(rowIndex, expanded){
        if(!this.canGroup()){
            return;
        }
        var row = this.getRow(rowIndex);
        if(row){
            this.toggleGroup(this.findGroup(row), expanded);
        }
    },

    /**
     * Toggles the specified group if no value is passed, otherwise sets the expanded state of the group to the value passed.
     * @param {String} groupId The groupId assigned to the group (see getGroupId)
     * @param {Boolean} expanded (optional)
     */
    toggleGroup : function(group, expanded){
        var gel = Ext.get(group);
        expanded = Ext.isDefined(expanded) ? expanded : gel.hasClass('x-grid-group-collapsed');
        if(this.state[gel.id] !== expanded){
            if (this.cancelEditOnToggle !== false) {
                this.grid.stopEditing(true);
            }
            this.state[gel.id] = expanded;
            gel[expanded ? 'removeClass' : 'addClass']('x-grid-group-collapsed');
        }
    },

    /**
     * Toggles all groups if no value is passed, otherwise sets the expanded state of all groups to the value passed.
     * @param {Boolean} expanded (optional)
     */
    toggleAllGroups : function(expanded){
        var groups = this.getGroups();
        for(var i = 0, len = groups.length; i < len; i++){
            this.toggleGroup(groups[i], expanded);
        }
    },

    /**
     * Expands all grouped rows.
     */
    expandAllGroups : function(){
        this.toggleAllGroups(true);
    },

    /**
     * Collapses all grouped rows.
     */
    collapseAllGroups : function(){
        this.toggleAllGroups(false);
    },

    // private
    getGroup : function(v, r, groupRenderer, rowIndex, colIndex, ds){
        var column = this.cm.config[colIndex],
            g = groupRenderer ? groupRenderer.call(column.scope, v, {}, r, rowIndex, colIndex, ds) : String(v);
        if(g === '' || g === '&#160;'){
            g = column.emptyGroupText || this.emptyGroupText;
        }
        return g;
    },

    // private
    getGroupField : function(){
        return this.grid.store.getGroupState();
    },

    // private
    afterRender : function(){
        if(!this.ds || !this.cm){
            return;
        }
        Ext.grid.GroupingView.superclass.afterRender.call(this);
        if(this.grid.deferRowRender){
            this.updateGroupWidths();
        }
    },
    
    afterRenderUI: function () {
        Ext.grid.GroupingView.superclass.afterRenderUI.call(this);

        if (this.enableGroupingMenu && this.hmenu) {
            this.hmenu.add('-',{
                itemId:'groupBy',
                text: this.groupByText,
                handler: this.onGroupByClick,
                scope: this,
                iconCls:'x-group-by-icon'
            });
            
            if (this.enableNoGroups) {
                this.hmenu.add({
                    itemId:'showGroups',
                    text: this.showGroupsText,
                    checked: true,
                    checkHandler: this.onShowGroupsClick,
                    scope: this
                });
            }
            
            this.hmenu.on('beforeshow', this.beforeMenuShow, this);
        }
    },

    // private
    renderRows : function(){
        var groupField = this.getGroupField();
        var eg = !!groupField;
        // if they turned off grouping and the last grouped field is hidden
        if(this.hideGroupedColumn) {
            var colIndex = this.cm.findColumnIndex(groupField),
                hasLastGroupField = Ext.isDefined(this.lastGroupField);
            if(!eg && hasLastGroupField){
                this.mainBody.update('');
                this.cm.setHidden(this.cm.findColumnIndex(this.lastGroupField), false);
                delete this.lastGroupField;
            }else if (eg && !hasLastGroupField){
                this.lastGroupField = groupField;
                this.cm.setHidden(colIndex, true);
            }else if (eg && hasLastGroupField && groupField !== this.lastGroupField) {
                this.mainBody.update('');
                var oldIndex = this.cm.findColumnIndex(this.lastGroupField);
                this.cm.setHidden(oldIndex, false);
                this.lastGroupField = groupField;
                this.cm.setHidden(colIndex, true);
            }
        }
        return Ext.grid.GroupingView.superclass.renderRows.apply(
                    this, arguments);
    },

    // private
    doRender : function(cs, rs, ds, startRow, colCount, stripe){
        if(rs.length < 1){
            return '';
        }

        if(!this.canGroup() || this.isUpdating){
            return Ext.grid.GroupingView.superclass.doRender.apply(this, arguments);
        }

        var groupField = this.getGroupField(),
            colIndex = this.cm.findColumnIndex(groupField),
            g,
            gstyle = 'width:' + this.getTotalWidth() + ';',
            cfg = this.cm.config[colIndex],
            groupRenderer = cfg.groupRenderer || cfg.renderer,
            prefix = this.showGroupName ? (cfg.groupName || cfg.header)+': ' : '',
            groups = [],
            curGroup, i, len, gid;

        for(i = 0, len = rs.length; i < len; i++){
            var rowIndex = startRow + i,
                r = rs[i],
                gvalue = r.data[groupField];

                g = this.getGroup(gvalue, r, groupRenderer, rowIndex, colIndex, ds);
            if(!curGroup || curGroup.group != g){
                gid = this.constructId(gvalue, groupField, colIndex);
                // if state is defined use it, however state is in terms of expanded
                // so negate it, otherwise use the default.
                this.state[gid] = !(Ext.isDefined(this.state[gid]) ? !this.state[gid] : this.startCollapsed);
                curGroup = {
                    group: g,
                    gvalue: gvalue,
                    text: prefix + g,
                    groupId: gid,
                    startRow: rowIndex,
                    rs: [r],
                    cls: this.state[gid] ? '' : 'x-grid-group-collapsed',
                    style: gstyle
                };
                groups.push(curGroup);
            }else{
                curGroup.rs.push(r);
            }
            r._groupId = gid;
        }

        var buf = [];
        for(i = 0, len = groups.length; i < len; i++){
            g = groups[i];
            this.doGroupStart(buf, g, cs, ds, colCount);
            buf[buf.length] = Ext.grid.GroupingView.superclass.doRender.call(
                    this, cs, g.rs, ds, g.startRow, colCount, stripe);

            this.doGroupEnd(buf, g, cs, ds, colCount);
        }
        return buf.join('');
    },

    /**
     * Dynamically tries to determine the groupId of a specific value
     * @param {String} value
     * @return {String} The group id
     */
    getGroupId : function(value){
        var field = this.getGroupField();
        return this.constructId(value, field, this.cm.findColumnIndex(field));
    },

    // private
    constructId : function(value, field, idx){
        var cfg = this.cm.config[idx],
            groupRenderer = cfg.groupRenderer || cfg.renderer,
            val = (this.groupMode == 'value') ? value : this.getGroup(value, {data:{}}, groupRenderer, 0, idx, this.ds);

        return this.getPrefix(field) + Ext.util.Format.htmlEncode(val);
    },

    // private
    canGroup  : function(){
        return this.enableGrouping && !!this.getGroupField();
    },

    // private
    getPrefix: function(field){
        return this.grid.getGridEl().id + '-gp-' + field + '-';
    },

    // private
    doGroupStart : function(buf, g, cs, ds, colCount){
        buf[buf.length] = this.startGroup.apply(g);
    },

    // private
    doGroupEnd : function(buf, g, cs, ds, colCount){
        buf[buf.length] = this.endGroup;
    },

    // private
    getRows : function(){
        if(!this.canGroup()){
            return Ext.grid.GroupingView.superclass.getRows.call(this);
        }
        var r = [],
            gs = this.getGroups(),
            g,
            i = 0,
            len = gs.length,
            j,
            jlen;
        for(; i < len; ++i){
            g = gs[i].childNodes[1];
            if(g){
                g = g.childNodes;
                for(j = 0, jlen = g.length; j < jlen; ++j){
                    r[r.length] = g[j];
                }
            }
        }
        return r;
    },

    // private
    updateGroupWidths : function(){
        if(!this.canGroup() || !this.hasRows()){
            return;
        }
        var tw = Math.max(this.cm.getTotalWidth(), this.el.dom.offsetWidth-this.getScrollOffset()) +'px';
        var gs = this.getGroups();
        for(var i = 0, len = gs.length; i < len; i++){
            gs[i].firstChild.style.width = tw;
        }
    },

    // private
    onColumnWidthUpdated : function(col, w, tw){
        Ext.grid.GroupingView.superclass.onColumnWidthUpdated.call(this, col, w, tw);
        this.updateGroupWidths();
    },

    // private
    onAllColumnWidthsUpdated : function(ws, tw){
        Ext.grid.GroupingView.superclass.onAllColumnWidthsUpdated.call(this, ws, tw);
        this.updateGroupWidths();
    },

    // private
    onColumnHiddenUpdated : function(col, hidden, tw){
        Ext.grid.GroupingView.superclass.onColumnHiddenUpdated.call(this, col, hidden, tw);
        this.updateGroupWidths();
    },

    // private
    onLayout : function(){
        this.updateGroupWidths();
    },

    // private
    onBeforeRowSelect : function(sm, rowIndex){
        this.toggleRowIndex(rowIndex, true);
    }
});
// private
Ext.grid.GroupingView.GROUP_ID = 1000;