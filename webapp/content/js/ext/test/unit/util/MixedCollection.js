/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
(function() {
    var suite  = Ext.test.session.getSuite('Ext.util.MixedCollection'),
        assert = Y.Assert;

    suite.add(new Y.Test.Case({
        name: 'constructor',

        setUp: function() {
            this.mc = new Ext.util.MixedCollection();
        },

        tearDown: function() {
            this.mc.clear();
        },

        //test that a default getKey implementation is set
        testHasDefaultGetKey: function() {
            var item1      = {id: 1, data: 'first item' },
                item2      = {id: 2, data: 'second item'};
            
            this.mc.add(item1);
            this.mc.add(item2);
            
            assert.areSame(item1, this.mc.get(1));
            assert.areSame(item2, this.mc.get(2));
        },

        //test that we can provide a getKey implementation
        testCanSetGetKey: function() {
            var collection = new Ext.util.MixedCollection(false, function(item) {
                return item.myKey;
            });
            
            var item1 = {myKey: 'a', data: 'first item' },
                item2 = {myKey: 'b', data: 'second item'};
            
            collection.add(item1);
            collection.add(item2);
            
            assert.areSame(item2, collection.get('b'));
            assert.areSame(item1, collection.get('a'));
        }
    }));
    
    suite.add(new Y.Test.Case({
        name: 'iterators',
        
        setUp: function() {
            this.mc = new Ext.util.MixedCollection();
            
            this.mc.addAll([
                {id: 1, name: 'first'},
                {id: 2, name: 'second'},
                {id: 3, name: 'third'}
            ]);
        },

        testEach: function() {
            var callCount = 0, callScope, total;
            
            this.mc.each(function(item, index, length) {
                //make sure that the function is called in the correct scope
                callScope = this;
                callCount ++;
                total = length;
            }, this);
            
            assert.areEqual(this, callScope);
            assert.areEqual(3, callCount);
            assert.areEqual(3, total);
        },
        
        testEachKey: function() {
            var callCount = 0, callScope;
            
            this.mc.eachKey(function(key, index, length) {
                //make sure that the function is called in the correct scope
                callScope = this;
                callCount ++;
            }, this);
            
            assert.areEqual(this, callScope);
            assert.areEqual(3, callCount);
        }
    }));
    
    suite.add(new Y.Test.Case({
        name: 'add and remove',
       
        setUp: function() {
            this.mc = new Ext.util.MixedCollection();
        },
       
        testAddAll: function() {
            var mc = this.mc;
            
            assert.areEqual(0, mc.length);
            
            mc.addAll([{id: 1}, {id: 2}, {id: 3}]);
            
            assert.areEqual(3, mc.length);
        },
        
        testAddAndClear: function() {
            var mc = this.mc;
            
            mc.add({id: 1});
            mc.add({id: 2});
            mc.add({id: 3});
            
            assert.areEqual(3, mc.length);
            
            mc.clear();
            assert.areEqual(0, mc.length);
        },
        
        testAddEventFired: function() {
            var mc    = this.mc,
                fired = false;
            
            mc.on('add', function() {fired = true;});
            
            mc.add({id: 1});
            assert.isTrue(fired);
        },
        
        testClearEventFired: function() {
            var mc    = this.mc,
                fired = false;
            
            mc.on('clear', function() {fired = true;}, this);
            mc.clear();
            
            assert.isTrue(fired);
        },
        
        testGetCount: function() {
            this.mc.add({id: 1});
            this.mc.add({id: 2});
            this.mc.add({id: 3});
            
            assert.areEqual(3, this.mc.getCount());
        },
        
        testRemove: function() {
            
        },
        
        testRemoveFiresEvent: function() {
            
        }
    }));
    
    suite.add(new Y.Test.Case({
        name: 'insert',
        
        setUp: function() {
            this.mc = new Ext.util.MixedCollection();
            
            this.mc.addAll([
                {id: 1, name: 'first'},
                {id: 2, name: 'second'},
                {id: 3, name: 'third'}
            ]);
        },
        
        doInsert: function() {
            this.mc.insert(1, {id: 4, name: 'fourth'});
        },
        
        testInsertsToCorrectLocation: function() {
            this.doInsert();
            
            assert.areEqual(4, this.mc.itemAt(1).id);
        },
        
        testOtherItemsPreserved: function() {
            var prevCount = this.mc.getCount();
            
            this.doInsert();
            assert.areEqual(prevCount + 1, this.mc.getCount());
        },
        
        testFiresAddEvent: function() {
            var fired = false;
            
            this.mc.on('add', function() { fired = true; });
            this.doInsert();
            
            assert.isTrue(fired);
        }
    }));
    
    suite.add(new Y.Test.Case({
        name: 'replace',
        
        setUp: function() {
            this.mc = new Ext.util.MixedCollection();
            
            this.mc.addAll([
                {id: 1, name: 'first'},
                {id: 2, name: 'second'},
                {id: 3, name: 'third'}
            ]);
        },
        
        doReplace: function() {
            this.mc.replace(2, {id: 4, name: 'fourth'});
        },
        
        testReplacesCorrectItem: function() {
            this.doReplace();
            assert.areEqual("fourth", this.mc.itemAt(1).name);
        },
        
        testPreviousItemRemoved: function() {
            var prevCount = this.mc.getCount();
            
            this.doReplace();
            assert.areEqual(prevCount, this.mc.getCount());
        },
        
        testReplaceEventFired: function() {
            var fired = false;
            
            this.mc.on('replace', function() { fired = true; });
            this.doReplace();
            
            assert.isTrue(fired);
        }
    }));
    
    suite.add(new Y.Test.Case({
        name: 'clone',
        
        setUp: function() {
            this.mc = new Ext.util.MixedCollection();
            
            this.mc.addAll([
                {id: 1, name: 'first'},
                {id: 2, name: 'second'},
                {id: 3, name: 'third'}
            ]);
        },
        
        //test that a shallow clone is completed correctly
        testClone: function() {
            var newMC = this.mc.clone();
            
            assert.areEqual(3, newMC.getCount());
            
            Ext.each([1, 2, 3], function(id) {
              assert.areEqual(this.mc.get(id).id, newMC.get(id).id);
            }, this);
        }
    }));
    
    suite.add(new Y.Test.Case({
        name: 'getting items',
        
        setUp: function() {
            this.mc = new Ext.util.MixedCollection();
            this.item1 = {id: 1, name: 'first'};
            
            this.mc.addAll([
                this.item1,
                {id: 2, name: 'second'},
                {id: 3, name: 'third'}
            ]);
        },
        
        testFirst: function() {
            assert.areEqual(1, this.mc.first().id);
        },
        
        testLast: function() {
            assert.areEqual(3, this.mc.last().id);
        },
        
        testGet: function() {
            assert.areEqual(2, this.mc.get(2).id);
        },
        
        testGetKey: function() {
            assert.areEqual(1, this.mc.getKey(this.item1));
        },
        
        //should return items in the given range
        testGetRange: function() {
            var items = this.mc.getRange(1, 2);
            
            assert.areEqual(2, items.length);
            assert.areEqual(2, items[0].id);
            assert.areEqual(3, items[1].id);
        },
        
        //should get all items
        testGetRangeWithNoArguments: function() {
            var items = this.mc.getRange();
            
            assert.areEqual(3, items.length);
        },
        
        //should get all items after the provided start index
        testGetRangeWithNoEnd: function() {
            var items = this.mc.getRange(1);
            
            assert.areEqual(2, items.length);
        },
        
        testIndexOf: function() {
            assert.areEqual(0, this.mc.indexOf(this.item1));
        },
        
        testIndexOfKey: function() {
            assert.areEqual(2, this.mc.indexOfKey(3));
        },
        
        testKey: function() {
            assert.areEqual(3, this.mc.key(3).id);
        },
        
        testItemByIndex: function() {
            this.mc.add({id: 'a', name: 'another item'});
            this.mc.add({id: 'b', name: 'yet another item'});
            
            assert.areEqual('b', this.mc.item(4).id);
        },
        
        //key should take priority over index
        testItemByKey: function() {
            this.mc.add({id: 'a', name: 'another item'});
            
            assert.areEqual('a', this.mc.item('a').id);
        },
        
        testItemAt: function() {
            assert.areEqual(3, this.mc.itemAt(2).id);
        }
    }));
    
    suite.add(new Y.Test.Case({
        name: 'find functions',
        
        setUp: function() {
            this.mc = new Ext.util.MixedCollection();
            
            this.mc.addAll([
                {id: 1, name: 'first'},
                {id: 2, name: 'second'},
                {id: 3, name: 'third'}
            ]);
        },
        
        testFind: function() {
            var matched = this.mc.find(function(item) {
                return item.name == 'third';
            });
            
            assert.areEqual('third', matched.name);
        },
        
        testFindIndex: function() {
            var matched = this.mc.findIndex('name', 'third');
            
            assert.areEqual(2, matched);
        },
        
        testFindIndexBy: function() {
            var matched = this.mc.findIndexBy(function(item) {
                return item.name == 'second';
            });
            
            assert.areEqual(1, matched);
        }
    }));
    
    suite.add(new Y.Test.Case({
        name: 'contains',
        
        setUp: function() {
            this.mc = new Ext.util.MixedCollection();
            this.item = {id: 1, name: 'first'};
            
            this.mc.addAll([
                this.item,
                {id: 2, name: 'second'},
                {id: 3, name: 'third'}
            ]);
        },
        
        tearDown: function() {
            delete this.item;
        },
        
        testContains: function() {
            assert.isTrue(this.mc.contains(this.item));
        },
        
        testDoesNotContain: function() {
            assert.isFalse(this.mc.contains({some: 'object'}));
        },
        
        testContainsKey: function() {
            assert.isTrue(this.mc.containsKey(1));
        },
        
        testDoesNotContainKey: function() {
            assert.isFalse(this.mc.containsKey('abc'));
        }
    }));
    
    suite.add(new Y.Test.Case({
        name: 'single sorting',
        
        setUp: function() {
            this.mc = new Ext.util.MixedCollection(false, function(item) {
                return item['code'];
            });
            
            this.mc.addAll([
                {id: 1, name: 'first',  code: 'C', modifier: 10},
                {id: 2, name: 'second', code: 'A', modifier: 100},
                {id: 3, name: 'third',  code: 'B', modifier: 5}
            ]);
        },
        
        testKeySort: function() {
            var mc = this.mc;
            mc.keySort();
            
            assert.areEqual('A', mc.itemAt(0).code);
            assert.areEqual('B', mc.itemAt(1).code);
            assert.areEqual('C', mc.itemAt(2).code);
        },
        
        testDirectionalKeySort: function() {
            var mc = this.mc;
            mc.keySort('DESC');
            
            assert.areEqual('C', mc.itemAt(0).code);
            assert.areEqual('B', mc.itemAt(1).code);
            assert.areEqual('A', mc.itemAt(2).code);
        },
        
        testSort: function() {
            var mc = new Ext.util.MixedCollection();
            mc.addAll(3, 1, 4, 2);
            mc.sort();
            
            assert.areEqual(1, mc.itemAt(0));
            assert.areEqual(2, mc.itemAt(1));
            assert.areEqual(3, mc.itemAt(2));
            assert.areEqual(4, mc.itemAt(3));
        },
        
        testDirectionalSort: function() {
            
        },
        
        testSortWithComparator: function() {
            var mc = this.mc;
            mc.sort('ASC', function(a, b) {
                return (a.id * a.modifier) - (b.id * b.modifier);
            });
            
            assert.areEqual('C', mc.itemAt(0).code);
            assert.areEqual('B', mc.itemAt(1).code);
            assert.areEqual('A', mc.itemAt(2).code);
        },
        
        testDirectionalSortWithComparator: function() {
            var mc = this.mc;
            mc.sort('DESC', function(a, b) {
                return (a.id * a.modifier) - (b.id * b.modifier);
            });
            
            assert.areEqual('A', mc.itemAt(0).code);
            assert.areEqual('B', mc.itemAt(1).code);
            assert.areEqual('C', mc.itemAt(2).code);
        },
        
        testSortEventFired: function() {
            var fired = false;
            
            this.mc.on('sort', function() { fired = true; });
            this.mc.sort('name');
            
            assert.isTrue(fired);
        }
    }));
    
    suite.add(new Y.Test.Case({
        name: 'reordering',
        
        setUp: function() {
            this.mc = new Ext.util.MixedCollection(false, function(item) {
                return item['code'];
            });
            
            this.mc.addAll([
                {id: 1, name: 'first',  code: 'C', modifier: 10},
                {id: 2, name: 'second', code: 'A', modifier: 100},
                {id: 3, name: 'third',  code: 'B', modifier: 5}
            ]);
        },
        
        testReordering: function() {
            var mc = this.mc;
            
            mc.reorder({
                1: 2,
                2: 0
            });
            
            assert.areEqual('B', mc.itemAt(0).code);
            assert.areEqual('C', mc.itemAt(1).code);
            assert.areEqual('A', mc.itemAt(2).code);
        },
        
        testSortEventFired: function() {
            var wasFired = false,
                mc       = this.mc;
            
            mc.on('sort', function() {
                wasFired = true;
            }, this);
            
            mc.reorder({
                1: 2,
                2: 0
            });
            
            assert.isTrue(wasFired);
        }
    }));
})();