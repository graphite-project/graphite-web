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
    var suite  = Ext.test.session.getSuite('Ext.data.Store'),
        assert = Y.Assert;

    //a shared setup function used by several of the suites
    var defaultSetup = function() {
        this.store = new Ext.data.Store({
            proxy : new Ext.data.MemoryProxy({}),
            reader: new Ext.data.ArrayReader({}, [
                {name: 'name',      type: 'string'},
                {name: 'email',     type: 'string'},
                {name: 'greatness', type: 'int'},
                {name: 'group',     type: 'string'},
                {name: 'old',       type: 'boolean'}
            ]),
            storeId: 'myStore',
            remoteSort: false
        });

        this.store.loadData([
            ['Ed Spencer',   'ed@extjs.com',    100, 'code',  false],
            ['Abe Elias',    'abe@extjs.com',   70,  'admin', false],
            ['Aaron Conran', 'aaron@extjs.com', 5,   'admin', true],
            ['Tommy Maintz', 'tommy@extjs.com', -15, 'code',  true]
        ]);
    };

    suite.add(new Y.Test.Case({
        name: 'local single sorting',

        setUp: defaultSetup,

        testSetDefaultSort: function() {
            this.store.setDefaultSort('name', 'DESC');

            var store    = this.store,
                sortInfo = store.sortInfo;

            assert.areEqual('name', sortInfo.field);
            assert.areEqual('DESC', sortInfo.direction);
            assert.areEqual('DESC', store.sortToggle['name']);
        },

        testSetDefaultSortDefaultToASC: function() {
            this.store.setDefaultSort('email');

            var store    = this.store,
                sortInfo = store.sortInfo;

            assert.areEqual('email', sortInfo.field);
            assert.areEqual('ASC', sortInfo['direction']);
            assert.areEqual('ASC', store.sortToggle['email']);
        },

        testSortByField: function() {
            var store = this.store;

            store.sort('name', 'ASC');
            assert.areEqual('Aaron Conran', store.getAt(0).get('name'));
            assert.areEqual('Abe Elias',    store.getAt(1).get('name'));
            assert.areEqual('Ed Spencer',   store.getAt(2).get('name'));
            assert.areEqual('Tommy Maintz', store.getAt(3).get('name'));
        },

        testToggling: function() {
            var store = this.store;

            store.sort('name', 'ASC');

            //second call to sort toggles the direction
            store.sort('name');

            assert.areEqual('Aaron Conran', store.getAt(3).get('name'));
            assert.areEqual('Abe Elias',    store.getAt(2).get('name'));
            assert.areEqual('Ed Spencer',   store.getAt(1).get('name'));
            assert.areEqual('Tommy Maintz', store.getAt(0).get('name'));
        },

        testSetsHasMultiSort: function() {
            this.store.sort('name', 'ASC');

            assert.isFalse(this.store.hasMultiSort);
        },

        testEventFired: function() {
            var executed = false,
                store    = this.store;

            store.on('datachanged', function() {
                executed = true;
            }, this);

            store.sort('name');
            assert.isTrue(executed);
        },

        testSavesSortInfo: function() {
            var store = this.store;

            store.sort('name', 'DESC');

            assert.areEqual('name', store.sortInfo.field);
            assert.areEqual('DESC', store.sortInfo.direction);
        },

        //if we tell store to sort on a non-existent field it should return false and do nothing
        testInvalidFieldIgnored: function() {
            var store = this.store;

            //first we'll sort by name to give some reference sorting
            store.sort('name', 'ASC');

            assert.isFalse(store.sort('someUnknownField'));

            //make sure the original sorting was preserved
            assert.areEqual('Aaron Conran', store.getAt(0).get('name'));
            assert.areEqual('Abe Elias',    store.getAt(1).get('name'));
            assert.areEqual('Ed Spencer',   store.getAt(2).get('name'));
            assert.areEqual('Tommy Maintz', store.getAt(3).get('name'));
        }
    }));

    suite.add(new Y.Test.Case({
        name: 'local multiple sorting',

        setUp: function() {
            defaultSetup.call(this);

            this.sorters = [
                {
                    field    : 'group',
                    direction: 'ASC'
                },
                {
                    field    : 'old',
                    direction: 'DESC'
                }
            ];
        },

        testSetsHasMultiSort: function() {
            this.store.sort(this.sorters);

            assert.isTrue(this.store.hasMultiSort);
        },

        testMultipleSorters: function() {
            var store   = this.store,
                sorters = this.sorters;

            store.sort(sorters);

            assert.areEqual('Aaron Conran', store.getAt(0).get('name'));
            assert.areEqual('Abe Elias',    store.getAt(1).get('name'));
            assert.areEqual('Tommy Maintz', store.getAt(2).get('name'));
            assert.areEqual('Ed Spencer',   store.getAt(3).get('name'));
        }

        // testMultipleSorterToggling: function() {
        //     var store   = this.store,
        //         sorters = this.sorters;
        //
        //     //first we'll sort to give some reference sorting
        //     store.sort(sorters, "ASC");
        //
        //     //second call to sort toggles direction
        //     store.sort(sorters);
        //
        //     assert.areEqual('Aaron Conran', store.getAt(3).get('name'));
        //     assert.areEqual('Abe Elias',    store.getAt(2).get('name'));
        //     assert.areEqual('Tommy Maintz', store.getAt(1).get('name'));
        //     assert.areEqual('Ed Spencer',   store.getAt(0).get('name'));
        // }
    }));

    suite.add(new Y.Test.Case({
        name: 'single filtering',

        setUp: defaultSetup,

        testFilterByField: function() {
            var store = this.store;

            store.filter('group', 'code');
            assert.areEqual(2, store.getCount());
        },

        testFilterByFieldAnyMatch: function() {
            var store = this.store;

            store.filter('email', 'extjs', true);
            assert.areEqual(4, store.getCount());
        },

        testFilterByFieldCaseSensitive: function() {
            var store = this.store;

            store.filter('group', 'Code', false, true);
            assert.areEqual(0, store.getCount());
        },

        testFilterByFieldExactMatch: function() {
            var store = this.store;

            store.filter('email', 'aaron', false, false, true);
            assert.areEqual(0, store.getCount());
        },

        testClearFilter: function() {
            var store    = this.store,
                executed = false;

            store.on('datachanged', function() {
                executed = true;
            }, this);

            store.filter('group', 'code');
            assert.areEqual(2, store.getCount());

            store.clearFilter();
            assert.areEqual(4, store.getCount());

            assert.isTrue(executed);
        },

        testSuppressClearFilterEvent: function() {
            var store    = this.store,
                executed = false;

            store.filter('group', 'email');
            store.clearFilter(true);

            store.on('datachanged', function() {
                executed = true;
            }, this);
            assert.isFalse(executed);
        },

        testIsFiltered: function() {
            var store = this.store;

            assert.isFalse(store.isFiltered());
            store.filter('group', 'code');
            assert.isTrue(store.isFiltered());
        },

        testFilterByFunction: function() {
            var store = this.store,
                execScope,
                executed;

            store.on('datachanged', function() {
                executed = true;
            }, this);

            var filterFn = function(item) {
                execScope = this;

                return item.get('greatness') > 50;
            };

            store.filterBy(filterFn, this);
            assert.areEqual(this, execScope);
            assert.areEqual(2, store.getCount());
            assert.isTrue(executed);
        }
    }));

    suite.add(new Y.Test.Case({
        name : 'filtering more than once',
        setUp: defaultSetup,

        testFirstFilterIsCleared: function() {
            var store = this.store;

            store.filter('group', 'code');
            assert.areEqual(2, store.getCount());

            store.filter('old', false);

            //if filter had not been reset first, count would be 1
            assert.areEqual(2, store.getCount());
        }
    }));

    suite.add(new Y.Test.Case({
        name : 'multiple filters',
        setUp: function() {
            defaultSetup.call(this);

            this.filters = [
                {
                    property: 'group',
                    value   : 'code'
                },
                {
                    property: 'old',
                    value   : true
                }
            ];
        },

        testMultipleBasicFilters: function() {
            this.store.filter(this.filters);

            //applying the filter set above shoule yield one result
            assert.areEqual(1, this.store.getCount());
            assert.areEqual('Tommy Maintz', this.store.data.first().get('name'));
        },

        testMultiFiltersFiresDataChanged: function() {
            var executed = false;

            this.store.on('datachanged', function() {
                executed = true;
            }, this);

            this.store.filter(this.filters);

            assert.isTrue(executed);
        },

        //tests that the anyMatch and caseSensitive defaults are correctly applied
        testMultiFilterDefaults: function() {
            //PENDING
        },

        //tests a single custom filter
        testCustomFilter: function() {
            var execScope;

            //tests that the passed filter function is called
            //tests that the filter is called in the right scope
            this.store.filter({
                fn: function(record) {
                    execScope = this;
                    return record.get('group') == 'admin' && record.get('old') === true;
                },
                scope: this
            });

            assert.areEqual(this, execScope);
            assert.areEqual(1, this.store.getCount());
            assert.areEqual('Aaron Conran', this.store.data.first().get('name'));
        },

        //tests multiple filters where we pass in custom matcher functions
        testMultiCustomFilters: function() {
            this.store.filter([
                {
                    fn: function(record) {
                        return record.get('group') == 'admin';
                    }
                },
                {
                    fn: function(record) {
                        return record.get('old') === false;
                    }
                }
            ]);

            assert.areEqual(1, this.store.getCount());
            assert.areEqual('Abe Elias', this.store.data.first().get('name'));
        },

        testBasicAndCustomFilters: function() {
            //should return a single result - Ed Spencer
            this.store.filter([
                {
                    fn: function(record) {
                        return record.get('old') === false;
                    }
                },
                {
                    property: 'group',
                    value   : 'code'
                }
            ]);

            assert.areEqual(1, this.store.getCount());
            assert.areEqual('Ed Spencer', this.store.data.first().get('name'));
        },

        testClearMultipleFilters: function() {
            this.store.filter(this.filters);
            assert.areEqual(1, this.store.getCount());

            //make sure that clearing multiple filters is still correct
            this.store.clearFilter();
            assert.areEqual(4, this.store.getCount());
        }
    }));

    suite.add(new Y.Test.Case({
        name: 'inserting and removing',

        testInsert: function() {
            //PENDING
        },

        testInsertFiresAddEvent: function() {
            //PENDING
        },

        testRemove: function() {
            //PENDING
        },

        testRemoveAll: function() {
            //PENDING
        },

        testRemoveAt: function() {
            //PENDING
        }
    }));

    suite.add(new Y.Test.Case({
        name: 'destroying',

        setUp: defaultSetup,

        //we hijack Ext.StoreMgr.unregister temporarily and then set it back in this test case
        testUnregistersFromStore: function() {
            var executed   = false,
                arg        = undefined,
                unregister = Ext.StoreMgr.unregister;

            Ext.StoreMgr.unregister = function(store) {
                executed = true;
                arg = store;
            };

            this.store.destroy();

            assert.isTrue(executed);
            assert.areEqual(this.store, arg);

            Ext.StoreMgr.unregister = unregister;
        },

        testClearsData: function() {
            var executed = false;
            this.store.clearData = function() {
                executed = true;
            };

            this.store.destroy();
            assert.isTrue(executed);
        },

        testDestroysProxy: function() {
            var executed = false,
                arg      = undefined,
                proxy    = this.store.proxy,
                destroy  = Ext.destroy;

            Ext.destroy = function(store) {
                executed = true;
                arg = store;
            };

            this.store.destroy();

            assert.isTrue(executed);
            assert.areEqual(proxy, arg);

            Ext.destroy = destroy;
        },

        testUnsetsReferences: function() {
            this.store.destroy();

            assert.isNull(this.store.reader);
            assert.isNull(this.store.writer);
            assert.isNull(this.store.data);
        },

        testIsDestroyed: function() {
            assert.isFalse(this.store.isDestroyed);

            this.store.destroy();

            assert.isTrue(this.store.isDestroyed);
        }
    }));

    suite.add(new Y.Test.Case({
        name: 'counting and iterators',

        setUp: defaultSetup,

        testGetCount: function() {
            assert.areEqual(4, this.store.getCount());
        },

        testGetTotalCount: function() {
            //PENDING - need a fake remote data set test with paging
        },

        testEach: function() {
            var count = 0,
                callScope;

            this.store.each(function() {
                callScope = this;
                count ++;
            }, this);

            assert.areEqual(4, count);
            assert.areEqual(this, callScope);
        },

        testSum: function() {
            var sum = this.store.sum('greatness');

            assert.areEqual(160, sum);
        },

        testSumWithStartAndEnd: function() {
            var sum = this.store.sum('greatness', 1, 3);

            assert.areEqual(60, sum);
        },

        //a normal collect test - check that we're pulling the right values out of the store
        testCollect: function() {
            var values = this.store.collect('name');

            assert.areEqual(4, values.length);
            assert.areNotEqual(-1, values.indexOf("Ed Spencer"));
            assert.areNotEqual(-1, values.indexOf("Abe Elias"));
            assert.areNotEqual(-1, values.indexOf("Aaron Conran"));
            assert.areNotEqual(-1, values.indexOf("Tommy Maintz"));
        },

        //checks that all collected values are unique
        testCollectIsUnique: function() {
            var values = this.store.collect('group');

            assert.areEqual(2, values.length);
            assert.areNotEqual(-1, values.indexOf("code"));
            assert.areNotEqual(-1, values.indexOf("admin"));
        }
    }));

    suite.add(new Y.Test.Case({
        name: 'committing',

        testCommitChanges: function() {
            //PENDING
        },

        testRejectChanges: function() {
            //PENDING
        },

        testAfterCommit: function() {
            //PENDING
        },

        testAfterReject: function() {
            //PENDING
        }
    }));

    suite.add(new Y.Test.Case({
        name: 'modified',

        testGetModifiedRecords: function() {
            //PENDING
        }
    }));

    suite.add(new Y.Test.Case({
        name: 'loading'
    }));
})();
