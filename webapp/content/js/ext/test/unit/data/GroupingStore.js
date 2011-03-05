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
    var suite  = Ext.test.session.getSuite('Ext.data.GroupingStore'),
        assert = Y.Assert;
    
    //a shared setup function used by several of the suites
    var defaultSetup = function(config) {
        config = config || {};
              
        Ext.applyIf(config, {
            proxy : new Ext.data.MemoryProxy({}),
            reader: new Ext.data.ArrayReader({}, [
                {name: 'name',      type: 'string'},
                {name: 'email',     type: 'string'},
                {name: 'greatness', type: 'int'},
                {name: 'group',     type: 'string'},
                {name: 'old',       type: 'boolean'}
            ]),
            storeId: 'myStore',
            remoteSort : false,
            remoteGroup: false,
            groupField : 'group',
            
            sortInfo: {field: 'name', direction: 'ASC'}
        });
        
        var store = new Ext.data.GroupingStore(config);
        
        store.loadData([
            ['Ed Spencer',   'ed@extjs.com',    100, 'code',  false],
            ['Abe Elias',    'abe@extjs.com',   70,  'admin', false],
            ['Aaron Conran', 'aaron@extjs.com', 5,   'admin', true],
            ['Tommy Maintz', 'tommy@extjs.com', -15, 'code',  true]
        ]);
        
        return store;
    };
    
    suite.add(new Y.Test.Case({
        name: 'constructor',
        
        testAppliesGroupField: function() {
            var GroupingStore = Ext.data.GroupingStore,
                proto         = GroupingStore.prototype,
                oldFunc       = proto.applyGroupField,
                wasCalled     = false;
            
            proto.applyGroupField = function() {
                wasCalled = true;
            };
            
            var store = new GroupingStore();
            assert.isTrue(wasCalled);
            
            proto.applyGroupField = oldFunc;
        }
    }));
    
    suite.add(new Y.Test.Case({
        name: 'clear grouping',
        
        testUnsetsGroupField: function() {
            var store = defaultSetup();
            store.groupField = 'abc';
            
            store.clearGrouping();
            assert.isFalse(store.groupField);
        },
        
        testLocalGroupingAppliesSort: function() {
            var GroupingStore = Ext.data.GroupingStore,
                proto         = GroupingStore.prototype,
                oldFunc       = proto.sort,
                wasCalled     = false;
            
            proto.sort = function() {
                wasCalled = true;
            };
            
            var store = defaultSetup({remoteGroup: false});
            store.clearGrouping();
            
            assert.isTrue(wasCalled);
            
            proto.sort = oldFunc;
        },
        
        testLocalGroupingFiresEvent: function() {
            var store = defaultSetup({remoteGroup: false}),
                fired = false;
            
            store.on('datachanged', function() {
                fired = true;
            }, this);
            
            store.clearGrouping();
            assert.isTrue(fired);
        },
        
        testRemoteGroupingReloads: function() {
            var GroupingStore = Ext.data.GroupingStore,
                proto         = GroupingStore.prototype,
                oldFunc       = proto.reload,
                wasCalled     = false;
            
            proto.reload = function() {
                wasCalled = true;
            };
            
            var store = defaultSetup({remoteGroup: true});
            store.clearGrouping();
            
            assert.isTrue(wasCalled);
            
            proto.reload = oldFunc;
        },
        
        testRemoteGroupingDeletesBaseParams: function() {
            var store = defaultSetup({remoteGroup: true});
            
            //these params should be deleted
            Ext.apply(store.baseParams, {
                groupBy : 'abc',
                groupDir: 'ASC'
            });
            
            store.clearGrouping();
            
            assert.isUndefined(store.baseParams.groupBy);
            assert.isUndefined(store.baseParams.groupDir);
        },
        
        testRemoteGroupingDeletesLastOptions: function() {
            var store = defaultSetup({remoteGroup: true});
            
            //these params should be deleted
            store.lastOptions        = store.lastOptions        || {};
            store.lastOptions.params = store.lastOptions.params || {};
            
            Ext.apply(store.lastOptions.params, {
                groupBy : 'abc',
                groupDir: 'ASC'
            });
            
            store.clearGrouping();
            
            assert.isUndefined(store.lastOptions.params.groupBy);
            assert.isUndefined(store.lastOptions.params.groupDir);
        }
    }));
    
    suite.add(new Y.Test.Case({
        name: 'group by',
        
        testForceRegroup: function() {
            var GroupingStore = Ext.data.GroupingStore,
                proto         = GroupingStore.prototype,
                oldFunc       = proto.applyGroupField,
                callCount     = 0;
            
            proto.applyGroupField = function() {
                callCount++;
            };
            
            var store = defaultSetup({sortInfo: {field: 'name', direction: 'ASC'}});
            store.groupBy('name', 'DESC');
            
            var currentCallCount = callCount;
            
            //this should activate another group operation
            store.groupBy('name', 'DESC', true);
            
            //cleanup
            proto.applyGroupField = oldFunc;
            
            assert.areEqual(currentCallCount + 1, callCount);
        },
        
        //if we already group by this field and direction, it should not group again
        testNoForceRegroup: function() {
            var GroupingStore = Ext.data.GroupingStore,
                proto         = GroupingStore.prototype,
                oldFunc       = proto.applyGroupField,
                callCount     = 0;
            
            proto.applyGroupField = function() {
                callCount++;
            };
            
            var store = defaultSetup({sortInfo: {field: 'name', direction: 'ASC'}});
            store.groupBy('name');
            
            var currentCallCount = callCount;
            
            //this should not activate another group operation
            store.groupBy('name');
            
            //cleanup
            proto.applyGroupField = oldFunc;
            
            assert.areEqual(currentCallCount, callCount);
        },
        
        testSetsGroupDir: function() {
            var store = defaultSetup({sortInfo: {field: 'name', direction: 'ASC'}});
            store.groupBy('name');
            
            assert.areEqual('name', store.groupField);
        },
        
        testSetsGroupField: function() {
            var store = defaultSetup({sortInfo: {field: 'name', direction: 'ASC'}});
            store.groupBy('name', false, 'DESC');
            
            assert.areEqual('DESC', store.groupDir);
        },
        
        testAppliesGroupField: function() {
            var GroupingStore = Ext.data.GroupingStore,
                proto         = GroupingStore.prototype,
                oldFunc       = proto.applyGroupField,
                wasCalled     = false;
            
            proto.applyGroupField = function() {
                wasCalled = true;
            };
            
            var store = defaultSetup({sortInfo: {field: 'name', direction: 'ASC'}});
            store.groupBy('name');
            
            //cleanup
            proto.applyGroupField = oldFunc;
            
            assert.isTrue(wasCalled);
        },
        
        testReloadsIfRemote: function() {
            var fired = false;
            var store = defaultSetup({
                remoteGroup: true, 
                sortInfo   : {field: 'name', direction: 'ASC'}
            });
            
            //fake a remote load
            store.load = function() {
                fired = true;
            };
            
            store.groupBy('name');
            
            assert.isTrue(fired);
        },
        
        testFiresDatachangedIfLocal: function() {
            var fired = false,
                store = defaultSetup({remoteGroup: false, sortInfo: {field: 'name', direction: 'ASC'}});
            
            store.on('datachanged', function() {
                fired = true;
            }, this);
            
            store.groupBy('name');
            
            assert.isTrue(fired);
        },
        
        testFiresGroupchangeIfLocal: function() {
            var fired = false,
                store = defaultSetup({remoteGroup: false, sortInfo: {field: 'name', direction: 'ASC'}});
            
            store.on('groupchange', function() {
                fired = true;
            }, this);
            
            store.groupBy('name');
            
            assert.isTrue(fired);
        },
        
        testFiresGroupchangeIfRemote: function() {
            var fired = false;
            var store = defaultSetup({
                remoteGroup: true, 
                sortInfo   : {field: 'name', direction: 'ASC'}
            });
            
            //fake a remote load
            store.load = function() {
                store.fireEvent('load', store);
            };
            
            store.on('groupchange', function() {
                fired = true;
            }, this);
            
            store.groupBy('name');
            
            assert.isTrue(fired);
        },
        
        testGroupOnSort: function() {
            
        }
    }));
    
    suite.add(new Y.Test.Case({
        name: 'apply group field',
        
        setUp: function() {
            this.store = defaultSetup({
                remoteGroup: true
            });
            
            this.store.groupField  = 'abc';
            this.store.groupDir    = 'DESC';            
            this.store.lastOptions = {params: {}};
        },
        
        testSetsBaseParams: function() {
            this.store.applyGroupField();
            
            assert.areEqual('abc',  this.store.baseParams.groupBy);
            assert.areEqual('DESC', this.store.baseParams.groupDir);
        },
        
        testSetsLastOptionsGroupDir: function() {
            this.store.applyGroupField();
            
            assert.areEqual('DESC', this.store.lastOptions.params.groupDir);
        },
        
        testDeletesLastOptionsGroupBy: function() {
            this.store.applyGroupField();
            
            assert.isUndefined(this.store.lastOptions.params.groupBy);
        }
    }));
    
    suite.add(new Y.Test.Case({
        name: 'apply sort'
    }));
    
    suite.add(new Y.Test.Case({
        name: 'apply grouping'
    }));
    
    //not really sure what this function does or why it does it. These tests just ensure
    //that any refactoring does not break it
    suite.add(new Y.Test.Case({
        name: 'get group state',

        testReturnsGroupField: function() {
            var store = defaultSetup();
            store.groupField = 'abc';
            
            assert.areEqual('abc', store.getGroupState());
        },
        
        //if only sorting is on sortinfo
        testReturnsSortInfoField: function() {
            var store = defaultSetup({groupOnSort: true});
            store.groupField = 'abc';
            store.sortInfo   = {field: 'def'};
            
            assert.areEqual('def', store.getGroupState());
        },
        
        //if no sorting is applied anywhere
        testReturnsUndefined: function() {
            var store = defaultSetup({groupOnSort: true});
            store.groupField = 'abc';
            store.sortInfo   = {};
            
            assert.isUndefined(store.getGroupState());
        }
    }));
})();
