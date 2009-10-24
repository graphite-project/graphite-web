/*!
 * Ext JS Library 3.0.0
 * Copyright(c) 2006-2009 Ext JS, LLC
 * licensing@extjs.com
 * http://www.extjs.com/license
 */
/**
 * @class Ext.data.GroupingStore
 * @extends Ext.data.Store
 * A specialized store implementation that provides for grouping records by one of the available fields. This
 * is usually used in conjunction with an {@link Ext.grid.GroupingView} to proved the data model for
 * a grouped GridPanel.
 * @constructor
 * Creates a new GroupingStore.
 * @param {Object} config A config object containing the objects needed for the Store to access data,
 * and read the data into Records.
 * @xtype groupingstore
 */
Ext.data.GroupingStore = Ext.extend(Ext.data.Store, {
    
    //inherit docs
    constructor: function(config){
        Ext.data.GroupingStore.superclass.constructor.call(this, config);
        this.applyGroupField();
    },
    
    /**
     * @cfg {String} groupField
     * The field name by which to sort the store's data (defaults to '').
     */
    /**
     * @cfg {Boolean} remoteGroup
     * True if the grouping should apply on the server side, false if it is local only (defaults to false).  If the
     * grouping is local, it can be applied immediately to the data.  If it is remote, then it will simply act as a
     * helper, automatically sending the grouping field name as the 'groupBy' param with each XHR call.
     */
    remoteGroup : false,
    /**
     * @cfg {Boolean} groupOnSort
     * True to sort the data on the grouping field when a grouping operation occurs, false to sort based on the
     * existing sort info (defaults to false).
     */
    groupOnSort:false,

	groupDir : 'ASC',
	
    /**
     * Clears any existing grouping and refreshes the data using the default sort.
     */
    clearGrouping : function(){
        this.groupField = false;
        if(this.remoteGroup){
            if(this.baseParams){
                delete this.baseParams.groupBy;
            }
            var lo = this.lastOptions;
            if(lo && lo.params){
                delete lo.params.groupBy;
            }
            this.reload();
        }else{
            this.applySort();
            this.fireEvent('datachanged', this);
        }
    },

    /**
     * Groups the data by the specified field.
     * @param {String} field The field name by which to sort the store's data
     * @param {Boolean} forceRegroup (optional) True to force the group to be refreshed even if the field passed
     * in is the same as the current grouping field, false to skip grouping on the same field (defaults to false)
     */
    groupBy : function(field, forceRegroup, direction){
		direction = direction ? (String(direction).toUpperCase() == 'DESC' ? 'DESC' : 'ASC') : this.groupDir;
        if(this.groupField == field && this.groupDir == direction && !forceRegroup){
            return; // already grouped by this field
        }
        this.groupField = field;
		this.groupDir = direction;
        this.applyGroupField();
        if(this.groupOnSort){
            this.sort(field, direction);
            return;
        }
        if(this.remoteGroup){
            this.reload();
        }else{
            var si = this.sortInfo || {};
            if(si.field != field || si.direction != direction){
                this.applySort();
            }else{
                this.sortData(field, direction);
            }
            this.fireEvent('datachanged', this);
        }
    },
    
    // private
    applyGroupField: function(){
        if(this.remoteGroup){
            if(!this.baseParams){
                this.baseParams = {};
            }
            this.baseParams.groupBy = this.groupField;
            this.baseParams.groupDir = this.groupDir;
        }
    },

    // private
    applySort : function(){
        Ext.data.GroupingStore.superclass.applySort.call(this);
        if(!this.groupOnSort && !this.remoteGroup){
            var gs = this.getGroupState();
            if(gs && (gs != this.sortInfo.field || this.groupDir != this.sortInfo.direction)){
                this.sortData(this.groupField, this.groupDir);
            }
        }
    },

    // private
    applyGrouping : function(alwaysFireChange){
        if(this.groupField !== false){
            this.groupBy(this.groupField, true, this.groupDir);
            return true;
        }else{
            if(alwaysFireChange === true){
                this.fireEvent('datachanged', this);
            }
            return false;
        }
    },

    // private
    getGroupState : function(){
        return this.groupOnSort && this.groupField !== false ?
               (this.sortInfo ? this.sortInfo.field : undefined) : this.groupField;
    }
});
Ext.reg('groupingstore', Ext.data.GroupingStore);