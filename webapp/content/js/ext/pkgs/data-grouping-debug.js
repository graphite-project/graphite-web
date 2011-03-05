/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
/**
 * @class Ext.data.GroupingStore
 * @extends Ext.data.Store
 * A specialized store implementation that provides for grouping records by one of the available fields. This
 * is usually used in conjunction with an {@link Ext.grid.GroupingView} to provide the data model for
 * a grouped GridPanel.
 *
 * Internally, GroupingStore is simply a normal Store with multi sorting enabled from the start. The grouping field
 * and direction are always injected as the first sorter pair. GroupingView picks up on the configured groupField and
 * builds grid rows appropriately.
 *
 * @constructor
 * Creates a new GroupingStore.
 * @param {Object} config A config object containing the objects needed for the Store to access data,
 * and read the data into Records.
 * @xtype groupingstore
 */
Ext.data.GroupingStore = Ext.extend(Ext.data.Store, {

    //inherit docs
    constructor: function(config) {
        config = config || {};

        //We do some preprocessing here to massage the grouping + sorting options into a single
        //multi sort array. If grouping and sorting options are both presented to the constructor,
        //the sorters array consists of the grouping sorter object followed by the sorting sorter object
        //see Ext.data.Store's sorting functions for details about how multi sorting works
        this.hasMultiSort  = true;
        this.multiSortInfo = this.multiSortInfo || {sorters: []};

        var sorters    = this.multiSortInfo.sorters,
            groupField = config.groupField || this.groupField,
            sortInfo   = config.sortInfo || this.sortInfo,
            groupDir   = config.groupDir || this.groupDir;

        //add the grouping sorter object first
        if(groupField){
            sorters.push({
                field    : groupField,
                direction: groupDir
            });
        }

        //add the sorting sorter object if it is present
        if (sortInfo) {
            sorters.push(sortInfo);
        }

        Ext.data.GroupingStore.superclass.constructor.call(this, config);

        this.addEvents(
          /**
           * @event groupchange
           * Fired whenever a call to store.groupBy successfully changes the grouping on the store
           * @param {Ext.data.GroupingStore} store The grouping store
           * @param {String} groupField The field that the store is now grouped by
           */
          'groupchange'
        );

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

    /**
     * @cfg {String} groupDir
     * The direction to sort the groups. Defaults to <tt>'ASC'</tt>.
     */
    groupDir : 'ASC',

    /**
     * Clears any existing grouping and refreshes the data using the default sort.
     */
    clearGrouping : function(){
        this.groupField = false;

        if(this.remoteGroup){
            if(this.baseParams){
                delete this.baseParams.groupBy;
                delete this.baseParams.groupDir;
            }
            var lo = this.lastOptions;
            if(lo && lo.params){
                delete lo.params.groupBy;
                delete lo.params.groupDir;
            }

            this.reload();
        }else{
            this.sort();
            this.fireEvent('datachanged', this);
        }
    },

    /**
     * Groups the data by the specified field.
     * @param {String} field The field name by which to sort the store's data
     * @param {Boolean} forceRegroup (optional) True to force the group to be refreshed even if the field passed
     * in is the same as the current grouping field, false to skip grouping on the same field (defaults to false)
     */
    groupBy : function(field, forceRegroup, direction) {
        direction = direction ? (String(direction).toUpperCase() == 'DESC' ? 'DESC' : 'ASC') : this.groupDir;

        if (this.groupField == field && this.groupDir == direction && !forceRegroup) {
            return; // already grouped by this field
        }

        //check the contents of the first sorter. If the field matches the CURRENT groupField (before it is set to the new one),
        //remove the sorter as it is actually the grouper. The new grouper is added back in by this.sort
        var sorters = this.multiSortInfo.sorters;
        if (sorters.length > 0 && sorters[0].field == this.groupField) {
            sorters.shift();
        }

        this.groupField = field;
        this.groupDir = direction;
        this.applyGroupField();

        var fireGroupEvent = function() {
            this.fireEvent('groupchange', this, this.getGroupState());
        };

        if (this.groupOnSort) {
            this.sort(field, direction);
            fireGroupEvent.call(this);
            return;
        }

        if (this.remoteGroup) {
            this.on('load', fireGroupEvent, this, {single: true});
            this.reload();
        } else {
            this.sort(sorters);
            fireGroupEvent.call(this);
        }
    },

    //GroupingStore always uses multisorting so we intercept calls to sort here to make sure that our grouping sorter object
    //is always injected first.
    sort : function(fieldName, dir) {
        if (this.remoteSort) {
            return Ext.data.GroupingStore.superclass.sort.call(this, fieldName, dir);
        }

        var sorters = [];

        //cater for any existing valid arguments to this.sort, massage them into an array of sorter objects
        if (Ext.isArray(arguments[0])) {
            sorters = arguments[0];
        } else if (fieldName == undefined) {
            //we preserve the existing sortInfo here because this.sort is called after
            //clearGrouping and there may be existing sorting
            sorters = this.sortInfo ? [this.sortInfo] : [];
        } else {
            //TODO: this is lifted straight from Ext.data.Store's singleSort function. It should instead be
            //refactored into a common method if possible
            var field = this.fields.get(fieldName);
            if (!field) return false;

            var name       = field.name,
                sortInfo   = this.sortInfo || null,
                sortToggle = this.sortToggle ? this.sortToggle[name] : null;

            if (!dir) {
                if (sortInfo && sortInfo.field == name) { // toggle sort dir
                    dir = (this.sortToggle[name] || 'ASC').toggle('ASC', 'DESC');
                } else {
                    dir = field.sortDir;
                }
            }

            this.sortToggle[name] = dir;
            this.sortInfo = {field: name, direction: dir};

            sorters = [this.sortInfo];
        }

        //add the grouping sorter object as the first multisort sorter
        if (this.groupField) {
            sorters.unshift({direction: this.groupDir, field: this.groupField});
        }

        return this.multiSort.call(this, sorters, dir);
    },

    /**
     * @private
     * Saves the current grouping field and direction to this.baseParams and this.lastOptions.params
     * if we're using remote grouping. Does not actually perform any grouping - just stores values
     */
    applyGroupField: function(){
        if (this.remoteGroup) {
            if(!this.baseParams){
                this.baseParams = {};
            }

            Ext.apply(this.baseParams, {
                groupBy : this.groupField,
                groupDir: this.groupDir
            });

            var lo = this.lastOptions;
            if (lo && lo.params) {
                lo.params.groupDir = this.groupDir;

                //this is deleted because of a bug reported at http://www.extjs.com/forum/showthread.php?t=82907
                delete lo.params.groupBy;
            }
        }
    },

    /**
     * @private
     * TODO: This function is apparently never invoked anywhere in the framework. It has no documentation
     * and should be considered for deletion
     */
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

    /**
     * @private
     * Returns the grouping field that should be used. If groupOnSort is used this will be sortInfo's field,
     * otherwise it will be this.groupField
     * @return {String} The group field
     */
    getGroupState : function(){
        return this.groupOnSort && this.groupField !== false ?
               (this.sortInfo ? this.sortInfo.field : undefined) : this.groupField;
    }
});
Ext.reg('groupingstore', Ext.data.GroupingStore);
