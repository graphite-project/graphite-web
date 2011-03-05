/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
/**
 * Tests Ext.data.Store functionality
 * @author Ed Spencer
 */
(function() {
    var suite  = Ext.test.session.getSuite('Ext.grid.GridPanel'),
        assert = Y.Assert;
    
    //builds and returns a grid with some default config
    var buildGrid = function(config) {
        config = config || {};
              
        Ext.applyIf(config, {
            store: new Ext.data.ArrayStore({
                autoDestroy: true,
                
                storeId: 'myStore',
                idIndex: 0,  
                fields : [
                   'company',
                   {name: 'price',      type: 'float'},
                   {name: 'change',     type: 'float'},
                   {name: 'pctChange',  type: 'float'},
                   {name: 'lastChange', type: 'date', dateFormat: 'n/j h:ia'}
                ],
                
                data: [
                    ['3m Co',71.72,0.02,0.03,'9/1 12:00am'],
                    ['Alcoa Inc',29.01,0.42,1.47,'9/1 12:00am'],
                    ['Boeing Co.',75.43,0.53,0.71,'9/1 12:00am'],
                    ['Hewlett-Packard Co.',36.53,-0.03,-0.08,'9/1 12:00am'],
                    ['Wal-Mart Stores, Inc.',45.45,0.73,1.63,'9/1 12:00am']
                ]
            }),
            
            colModel: new Ext.grid.ColumnModel({
                columns: [
                    {header: 'Name', dataIndex: 'company'}
                ]
            }),
            
            selModel: new Ext.grid.RowSelectionModel()
        });
        
        return new Ext.grid.GridPanel(config);
    };
        
    suite.add(new Y.Test.Case({
        name: 'constructor and initComponent',
        
        testDisallowsAutoScroll: function() {
            var grid = buildGrid({autoScroll: true});
            
            assert.isFalse(grid.autoScroll);
        },
        
        testDisallowsAutoWidth: function() {
            var grid = buildGrid({autoWidth: true});
            
            assert.isFalse(grid.autoWidth);
        },
        
        testDsTranslatedToStore: function() {
            var store = new Ext.data.ArrayStore({fields: ['name']}),
                grid  = buildGrid({ds: store, store: null});
            
            assert.areEqual(store, grid.store);
            assert.isUndefined(grid.ds);
        },
        
        testCmTranslatedToColModel: function() {
            var colModel = new Ext.grid.ColumnModel({columns: [{header: 'my header'}]}),
                grid     = buildGrid({cm: colModel, colModel: null});
            
            assert.areEqual(colModel, grid.colModel);
            assert.isUndefined(grid.cm);
        },
        
        testColumnsTurnedIntoColModel: function() {
            var columns = [
                {header: 'first', dataIndex: 'company'}, {header: 'second', dataIndex: 'price'}
            ];
            var grid = buildGrid({columns: columns, colModel: null});
            
            var colModel = grid.colModel;
            assert.areEqual(2, colModel.getColumnCount());
        }
    }));
    
    suite.add(new Y.Test.Case({
        name: 'reconfigure'
    }));
    
    suite.add(new Y.Test.Case({
        name: 'walk cells'
    }));
})();