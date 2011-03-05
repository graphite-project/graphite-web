/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
Ext.test.session.addTest('Ext.Container', {
    name: 'Test Ext.Container methods',
    
    test_add: function(){
        var ct = new Ext.Container({
            defaultType: 'box'
        });
        ct.add(new Ext.Component());
        
        Y.Assert.areEqual(1, ct.items.getCount(), 'Check adding a single item works');
        
        ct.add(new Ext.Component({itemId: 'a'}), new Ext.Component({itemId: 'b'}), new Ext.Component({itemId: 'c'}));
        Y.Assert.areEqual(4, ct.items.getCount(), 'Test add with param array');
        Y.Assert.areEqual('b', ct.items.itemAt(2).itemId, 'Test that they are correctly added in order');
        
        ct.add({
             xtype: 'component'   
        });
        Y.Assert.areEqual(5, ct.items.getCount(), 'Test for lazy instantiation');
        
        ct.add({});
        Y.Assert.isTrue(ct.items.last().isXType('box'), 'Test default type');
        ct.destroy();
        ct = null;
    },
    
    test_cascade: function(){
        var ct = new Ext.Container({itemId: 'ct', depth: 0}),
            i, 
            j, 
            k,
            ci,
            cj,
            order = [ct.itemId];
           
        /* our container will have:
         * 3 items at depth 1
         * 9 items at depth 2
         * 27 items at depth 3
         */ 
        for(i = 0; i < 3; ++i){
            id = 'item' + i;
            ci = ct.add({
                itemId: id,
                depth: 1
            });
            order.push(id);
            for(j = 0; j < 3; ++j){
                id = 'item' + i  + '_' + j;
                cj = ci.add({
                    itemId: id,
                    depth: 2
                });
                order.push(id);
                for(k = 0; k < 3; ++k){
                    id = 'item' + i  + '_' + j + '_' + k;
                    cj.add({
                        itemId: id,
                        depth: 3
                    });
                    order.push(id);
                }
            }
        }
        
        
        var cnt = 0,
            items = [];
        ct.cascade(function(c){
            items.push(c.itemId);
            ++cnt;    
        });  
        Y.Assert.areEqual(40, cnt, 'Test each item is iterated');
        Y.ArrayAssert.itemsAreEqual(order, items, 'Test that items are iterated depth first');
        
        items = [];
        ct.cascade(function(){
            items.push(this.itemId);
        });
        Y.ArrayAssert.itemsAreEqual(order, items, 'Test that the scope defaults to the current component');
        
        cnt = 0;
        ct.cascade(function(c){
            cnt += c.depth * this.val;
        }, {val: 3});
        
        Y.Assert.areEqual(306, cnt, 'Test that custom scope works');
        
        cnt = 0;
        ct.cascade(function(a, b){
            cnt += this.depth * (a + b);
        }, null, [1, 2]);
        
        Y.Assert.areEqual(306, cnt, 'Test that custom args work');
        
        cnt = 0;
        ct.cascade(function(){
            if(this.itemId == 'item0' || this.itemId == 'item2'){
                return false;
            }
            ++cnt;
        });
        Y.Assert.areEqual(14, cnt, 'Test that returning false stops iteration on a branch');
        
        ct.destroy();
        ct = null;
    },
    
    test_find: function(){
        var ct = new Ext.Container({
            prop: 'foo',
            special: 'main',
            items: [{
                xtype: 'container',
                prop: 'foo',
                id: 'a',
                items: [{}, {prop: 'foo', id: 'd'}, {}, {}, {}, {
                    xtype: 'container',
                    items: [{}, {}, {}, {}]
                }]
            },{
                xtype: 'container',
                prop: 'bar',
                id: 'b',
                items: [{prop: 'foo', id: 'e'}, {prop: 'food'}, {
                    xtype: 'container',
                    items: {
                        xtype: 'container',
                        items: {
                            xtype: 'container',
                            items: {
                                xtype: 'container',
                                items: {
                                    prop: 'foo',
                                    id: 'f'
                                }
                            }
                        }
                    }
                }]
            },{
                prop: 'foo',
                xtype: 'box',
                id: 'c'
            }]
        });
        
        var arr = ct.find('prop', 'foo');
        Y.Assert.areEqual(5, arr.length, 'Ensure correct items are found, at all depths');
        Y.ArrayAssert.itemsAreEqual(['a', 'd', 'e', 'f', 'c'], Ext.pluck(arr, 'id'), 'Test order the items are found, should be depth first');
        
        arr = ct.find('none', 'x');
        Y.ArrayAssert.isEmpty(arr, 'Test with non existent property');
        
        arr = ct.find('foo', 'not here');
        Y.ArrayAssert.isEmpty(arr, 'Test with property that exists, but no matches');
        
        arr = ct.items.first().find('prop', 'foo');
        Y.Assert.areEqual(1, arr.length, 'Ensure correct items are found, at one child level');
        Y.ArrayAssert.itemsAreEqual(['d'], Ext.pluck(arr, 'id'), 'Test order the items are found');
        
        arr = ct.find('special', 'main');
        Y.ArrayAssert.isEmpty(arr, 'Ensure the container itself isn\'t found');
        
        ct.destroy();
        ct = null;
    },
    
    test_findBy: function(){
        var ct = new Ext.Container({
            foo: 0,
            items: [{
                foo: 1,
                items: [{
                    foo: 5
                },{
                    foo: 6
                },{
                    foo: 7
                }]
            },{
                foo: 2,
                items: [{
                    foo: 8
                },{
                    foo: 9
                },{
                    foo: 10
                }]
            },{
                foo: 3,
                items: {
                    foo: 11
                }
            },{
                foo: 4,
                items: [{
                    foo: 12
                },{
                    foo: 13
                },{
                    foo: 14,
                    items: [{
                        foo: 15
                    },{
                        foo: 16
                    }]
                }]
            }]
        });
        
        var arr = ct.findBy(function(){
            return this.foo % 2 == 0; 
        });
        
        Y.Assert.areEqual(8, arr.length, 'Test correct items are returned, also tests that scope defaults to the component');
        Y.ArrayAssert.itemsAreEqual([6, 2, 8, 10, 4, 12, 14, 16], Ext.pluck(arr, 'foo'), 'Test items are returned in the correct order');
        
        arr = ct.findBy(function(c){
            return c.foo == 0;
        });
        
        Y.ArrayAssert.isEmpty(arr, 'Ensure that the container is not included in the findBy');
        
        arr = ct.findBy(function(c){
            return c.foo % this.val == 0;
        }, {val: 3});
        
        Y.Assert.areEqual(5, arr.length, 'Test correct items are returned, also test custom scope');
        
        ct.destroy();
        ct = null;
    },
    
    test_findByType: function(){
        var ct = new Ext.Container({
            items: [{
                xtype: 'box'
            },{
                xtype: 'component'
            },{
                xtype: 'container',
                items: [{
                    xtype: 'panel',
                    items: {
                        xtype: 'panel',
                        items: {
                            xtype: 'box'
                        }
                    }
                },{
                    xtype: 'container',
                    items: {
                        xtype: 'container',
                        items: {
                            xtype: 'container',
                            items: {
                                xtype: 'box'
                            }
                        }
                    }
                },{
                    xtype: 'box'
                }]
            },{
                xtype: 'form',
                items: {
                    xtype: 'fieldset',
                    items: [{
                        xtype: 'datefield'
                    },{
                        xtype: 'textfield'
                    }]
                }
            }]
        }); 
        
        var arr = ct.findByType('component');
        Y.Assert.areEqual(15, arr.length, 'Check correct number of items are returned');
        
        arr = ct.findByType('box', true);
        Y.Assert.areEqual(4, arr.length, 'Test shallow parameter is respected');
        
        arr = ct.findByType('grid');
        Y.Assert.areEqual(0, arr.length, 'Ensure that no items are returned if there\'s no matches');
        
        arr = ct.findByType('container');
        Y.Assert.areEqual(8, arr.length, 'Check all items are found at different depths');
        
        ct.destroy();
        ct = null;   
    },
    
    test_getComponent: function(){
        var component1 = new Ext.Component({itemId: 'd'}),
            component2 = new Ext.Component({itemId: 'e'}),
            component3 = new Ext.Component();
            
        var ct = new Ext.Container({
            items: [{
                id: 'a'
            },{
                itemId: 'b'
            },{
                itemId: 'c'
            },{
                //nothing
            }, component1, {
                //nothing
            }, component2]
        });
        
        Y.Assert.areEqual('b', ct.getComponent(1).itemId, 'Test accessing by index');
        Y.Assert.areEqual('a', ct.getComponent(0).id, 'Test accessing by index');
        
        Y.Assert.isUndefined(ct.getComponent(100), 'Test grabbing an index outside of bounds');
        Y.Assert.isUndefined(ct.getComponent(null), 'Test with passing null');
        Y.Assert.isUndefined(ct.getComponent('foo'), 'Test with passing id that doesn\'t exist');
        Y.Assert.isUndefined(ct.getComponent(component3), 'Test with passing a component that doesn\'t belong to the container');
        
        Y.Assert.areEqual(component1, ct.getComponent(component1), 'Test passing in a component instance');
        Y.Assert.areEqual(component2, ct.getComponent(component2), 'Test passing in a component instance');
        
        Y.Assert.areEqual('d', ct.getComponent('d').itemId, 'Test passing in itemId');
        Y.Assert.areEqual('c', ct.getComponent('c').itemId, 'Test the above with an itemId');
        
        component3.destroy();
        ct.destroy();
        ct = null;
    },
    
    test_insert: function(){
        var ct = new Ext.Container({
            items: [{
                itemId: 'first',
                xtype: 'component'
            },{
                xtype: 'component'
            },{
                xtype: 'component'
            }]
        });
        
        ct.insert(1, {itemId: 'a'});
        Y.Assert.areEqual('a', ct.items.itemAt(1).itemId, 'Test simple insert');
        
        ct.insert(0, {itemId: 'b'});
        Y.Assert.areEqual('b', ct.items.first().itemId, 'Test insert at 0');
        
        ct.insert(ct.items.getCount(), {itemId: 'c'});
        Y.Assert.areEqual('c', ct.items.last().itemId, 'Test inserting at the last index');
        
        ct.insert(100, {itemId: 'd'});
        Y.Assert.areEqual('d', ct.items.last().itemId, 'Test inserting well after the last index');
        
        ct.insert(2, {itemId: 'e'}, {itemId: 'f'}, {itemId: 'g'});
        Y.Assert.areEqual('e', ct.items.itemAt(2).itemId, 'Test inserting multiple items at once');
        Y.Assert.areEqual('f', ct.items.itemAt(3).itemId, 'Test inserting multiple items at once');
        Y.Assert.areEqual('g', ct.items.itemAt(4).itemId, 'Test inserting multiple items at once');
        
        ct.insert(3, new Ext.Component({itemId: 'h'}));
        Y.Assert.areEqual('h', ct.items.itemAt(3).itemId, 'Test simple insert');
        
        Y.Assert.areEqual('first', ct.items.itemAt(1).itemId, 'Test original component held position');
        
        ct.destroy();
        ct = null;
    },
    
    test_remove: function(){
        var items = [],
            ct,
            c,
            component1 = new Ext.Component(),
            component2 = new Ext.Component(),
            component3 = new Ext.Component();
            
        for(var i = 0; i < 10; ++i){
            items.push({itemId: 'item' + i});
        }
        items.push(component1, component2);
        ct = new Ext.Container({items: items});
        
        ct.remove(0);
        Y.Assert.areEqual(11, ct.items.getCount(), 'Test remove by index');
        
        c = ct.remove(100);
        Y.Assert.areEqual(11, ct.items.getCount(), 'Test remove by index, where the index doesn\'t exist')
        Y.Assert.isUndefined(c, 'Ensure undefined is returned if the item doesn\'t exist');
        
        c = ct.remove(component1);
        Y.Assert.areEqual(10, ct.items.getCount(), 'Test remove with a component instance');
        Y.Assert.areEqual(component1, c, 'Test component is returned correctly');
        
        c = ct.remove(component3);
        Y.Assert.areEqual(10, ct.items.getCount(), 'Test removing an instance that doesn\'t exist in the component');
        Y.Assert.isUndefined(c, 'Ensure that the empty is returned in this case');
        
        c = ct.remove('item5');
        Y.Assert.areEqual(9, ct.items.getCount(), 'Test removing with an itemId');
        Y.Assert.areEqual('item5', c.itemId, 'Ensure component is returned properly');
        
        //test autoDestroy behaviour
        c = ct.remove(0);
        Y.Assert.isTrue(c.isDestroyed, 'Test that container autoDestroy/true is respected');
        
        c = ct.remove(0, true);
        Y.Assert.isTrue(c.isDestroyed, 'Test that container autoDestroy/true and destroy/true works');
        
        c = ct.remove(0, false);
        Y.Assert.isUndefined(c.isDestroyed, 'Test that destroy/false overrides autoDestroy/true');
        
        ct.autoDestroy = false;
        c = ct.remove(0);
        Y.Assert.isUndefined(c.isDestroyed, 'Test that autoDestroy/false is respected');
        
        c = ct.remove(0, false);
        Y.Assert.isUndefined(c.isDestroyed, 'Test autoDestroy/false and destroy/false works');
        
        c = ct.remove(0, true);
        Y.Assert.isTrue(c.isDestroyed, 'Test destroy/true overrides autoDestroy/false');
        
        component3.destroy();
        ct.destroy();
        ct = null;
    },
    
    test_removeAll: function(){
        var ct = new Ext.Container(),
            arr,
            i;
            
        arr = ct.removeAll();
        Y.ArrayAssert.isEmpty(arr, 'Test removeAll with no items returns an empty array');
        
        for(i = 0; i < 3; ++i){
            ct.add({
                itemId: 'item' + i
            });
        }
        
        arr = ct.removeAll();
        Y.Assert.areEqual(0, ct.items.getCount(), 'Ensure all items are removed');
        Y.ArrayAssert.itemsAreEqual(['item0', 'item1', 'item2'], Ext.pluck(arr, 'itemId'), 'Ensure they are removed in a consistent order');
        
        for(i = 0; i < 2; ++i){
            ct.add({
                itemId: 'item' + i
            });
        }
        arr = ct.removeAll(true);
        Y.ArrayAssert.itemsAreEqual([true, true], Ext.pluck(arr, 'isDestroyed'), 'Check destroy is honoured');
        
        ct.autoDestroy = true;
        for(i = 0; i < 3; ++i){
            ct.add({
                itemId: 'item' + i
            });
        }
        arr = ct.removeAll();
        Y.ArrayAssert.itemsAreEqual([true, true, true], Ext.pluck(arr, 'isDestroyed'), 'Check autoDestroy is honoured');
        
        ct.destroy();
        ct = null;
    }
});
