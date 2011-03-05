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
    var suite  = Ext.test.session.getSuite('Ext.form.BasicForm'),
        assert = Y.Assert;
    
    function buildForm(config) {
        config = config || {};
              
        Ext.applyIf(config, {
            
        });
        
        return new Ext.form.BasicForm(null, config);
    };
    
    var itemIdCount = 0;
    //creates a duck object simulating a form field
    function buildFormItem(options) {
        itemIdCount ++;
        
        options = options || {};
              
        Ext.applyIf(options, {
            valid: true,
            dirty: false,
            id   : itemIdCount
        });
        
        return (function(itemId, config) {
            return Ext.apply(config || {}, {
                isFormField: true,
                itemId     : itemId,

                getName: function() {
                    return config.name || config.id;
                },

                getItemId: function() {
                    return itemId;
                },

                validate: function() {
                    return config.valid;
                },

                isDirty: function() {
                    return config.dirty;
                },
                
                setValue: function() {
                    return true;
                }
            });
        })(itemIdCount, options);
    };
    
    suite.add(new Y.Test.Case({
        name: 'initialization with an element',
        
        setUp: function() {
            //create a fake form element to test that initEl is called
            this.el = Ext.getBody().createChild({tag: 'form'});
        },
        
        tearDown: function() {
            Ext.destroy(this.el);
        },
        
        testItemsCreated: function() {
            var form = buildForm();
            
            assert.isTrue(form.items instanceof Ext.util.MixedCollection);
        },
        
        testInitsEl: function() {
            var BasicForm = Ext.form.BasicForm,
                proto     = BasicForm.prototype;
            
            var wasCalled = false,
                oldInitEl = proto.initEl;
            
            proto.initEl = function() {
                wasCalled = true;
            };
            
            var form = new BasicForm(this.el, {});
            
            assert.isTrue(wasCalled);
            
            //cleanup
            proto.initEl = oldInitEl;
        },
        
        testGetEL: function() {
            var form = new Ext.form.BasicForm(this.el, {});
            
            assert.areEqual(this.el, form.getEl());
        },
        
        testGetsFormClass: function() {
            var form = new Ext.form.BasicForm(this.el, {});
            
            assert.isTrue(this.el.hasClass('x-form'));
        }
    }));
    
    suite.add(new Y.Test.Case({
        name: 'validations',
        
        setUp: function() {
            this.form = buildForm();
            
            this.validItem   = buildFormItem({valid: true});
            this.invalidItem = buildFormItem({valid: false});
        },
        
        testAllValid: function() {
            this.form.add(this.validItem);
            
            assert.isTrue(this.form.isValid());
        },
        
        testSomeInvalid: function() {
            this.form.add(this.validItem, this.invalidItem);
            
            assert.isFalse(this.form.isValid());
        }
    }));
    
    suite.add(new Y.Test.Case({
        name: 'dirtiness',
        
        setUp: function() {
            this.form = buildForm();
            
            this.cleanItem = buildFormItem({dirty: false});
            this.dirtyItem = buildFormItem({dirty: true});
        },
        
        testAllClean: function() {
            this.form.add(this.cleanItem);
            
            assert.isFalse(this.form.isDirty());
        },
        
        testSomeDirty: function() {
            this.form.add(this.cleanItem, this.dirtyItem);
            
            assert.isTrue(this.form.isDirty());
        }
    }));
    
    suite.add(new Y.Test.Case({
        name: 'performing actions'
    }));
    
    suite.add(new Y.Test.Case({
        name: 'submission'
    }));
    
    suite.add(new Y.Test.Case({
        name: 'loading, resetting and updating records',
        
        setUp: function() {
            this.form = buildForm();
            
            this.item1 = buildFormItem({id: 'name'});
            this.item2 = buildFormItem({id: 'email'});
            this.item3 = buildFormItem({id: 'phone'});
            
            this.form.add(this.item1, this.item2, this.item3);
        },
        
        testReset: function() {
            var resetCount = 0;
            var reset = function() {
                resetCount ++;
            };
            
            this.item1.reset = reset;
            this.item2.reset = reset;
            this.item3.reset = reset;
            
            this.form.reset();
            assert.areEqual(3, resetCount);
        }
    }));
    
    suite.add(new Y.Test.Case({
        name: 'finding fields',
        
        setUp: function() {
            this.form = buildForm();
            
            this.item1 = buildFormItem({id: 'name', dataIndex: 'someDataIndex'});
            this.item2 = buildFormItem({id: 'email'});
            this.item3 = buildFormItem({id: 'phone', name: 'phone number'});
            
            this.form.add(this.item1, this.item2, this.item3);
        },
        
        testfindByItemId: function() {
            assert.areEqual(this.item3, this.form.findField(this.item3.itemId));
        },
        
        testFindById: function() {
            assert.areEqual(this.item2, this.form.findField('email'));
        },
        
        testFindByDataIndex: function() {
            assert.areEqual(this.item1, this.form.findField('someDataIndex'));
        },
        
        testFindByName: function() {
            assert.areEqual(this.item3, this.form.findField('phone number'));
        }
    }));
    
    suite.add(new Y.Test.Case({
        name: 'marking invalid',
        
        setUp: function() {
            this.form = buildForm();
            
            this.item1 = buildFormItem({id: 'name'});
            this.item2 = buildFormItem({id: 'email'});
            this.item3 = buildFormItem({id: 'phone'});
            
            this.form.add(this.item1, this.item2, this.item3);
        },
        
        testMarkInvalidWithObject: function() {
            var wasCalled = false, message;
            
            this.item1.markInvalid = function(msg) {
                wasCalled = true;
                message = msg;
            };
            
            this.form.markInvalid({
                name: 'is a bad name'
            });
            
            assert.isTrue(wasCalled);
            assert.areEqual('is a bad name', message);
        },
        
        testMarkInvalidWithArray: function() {
            var wasCalled = false, message;
            
            this.item2.markInvalid = function(msg) {
                wasCalled = true;
                message = msg;
            };
            
            this.form.markInvalid([{id: 'email', msg: 'is the wrong format'}]);
            
            assert.isTrue(wasCalled);
            assert.areEqual('is the wrong format', message);
        },
        
        testClearInvalid: function() {
            var clearCount = 0;
            var clearInvalid = function() {
                clearCount ++;
            };
            
            this.item1.clearInvalid = clearInvalid;
            this.item2.clearInvalid = clearInvalid;
            this.item3.clearInvalid = clearInvalid;
            
            this.form.clearInvalid();
            assert.areEqual(3, clearCount);
        }
    }));
    
    suite.add(new Y.Test.Case({
        name: 'setting values',
        
        setUp: function() {
            this.form = buildForm({
                trackResetOnLoad: true
            });
            
            this.item1 = buildFormItem({name: 'name',  getValue: function() {return 'ed'; }});
            this.item2 = buildFormItem({name: 'email'});
            this.item3 = buildFormItem({name: 'phone', getValue: function() {return '333';}});
            
            this.form.add(this.item1, this.item2, this.item3);
        },
        
        testSetByObject: function() {
            var called = false, value;
            
            this.item1.setValue = function(val) {
                wasCalled = true;
                value = val;
            };
            
            this.form.setValues({name: 'my name'});
            
            assert.isTrue(wasCalled);
            assert.areEqual('my name', value);
        },
        
        testSetByArray: function() {
            var called = false, value;
            
            this.item1.setValue = function(val) {
                wasCalled = true;
                value = val;
            };
            
            this.form.setValues([{id: 'name', value: 'my name'}]);
            
            assert.isTrue(wasCalled);
            assert.areEqual('my name', value); 
        },
        
        testSavesOriginalValue: function() {
            this.form.setValues({'phone': '444'});
            
            assert.areEqual('333', this.item3.originalValue);
        }
    }));
    
    suite.add(new Y.Test.Case({
        name: 'getting values',
        
        setUp: function() {
            this.form = buildForm();
            
            this.item1 = buildFormItem({name: 'name',  getValue: function() {return 'Edward';}});
            this.item2 = buildFormItem({name: 'email', getValue: function() {return 'ed@extjs.com';}});
            this.item3 = buildFormItem({name: 'phone', getValue: function() {return '333';}});
            
            this.form.add(this.item1, this.item2, this.item3);
        },
        
        testGetFieldValues: function() {
            var values = this.form.getFieldValues();
            
            assert.areEqual('Edward', values.name);
            assert.areEqual('ed@extjs.com', values.email);
            assert.areEqual('333', values.phone);
        },
        
        testGetFieldValuesWithArray: function() {
            //adding a second item with the same name should result in an array being returned
            this.item4 = buildFormItem({
                name    : 'name',
                getValue: function() {return 200;}
            });
            
            this.form.add(this.item4);
            
            var values = this.form.getFieldValues();
            
            assert.areEqual(2,        values.name.length);
            assert.areEqual('Edward', values.name[0]);
            assert.areEqual(200,      values.name[1]);
        },
        
        testGetDirtyFieldValues: function() {
            this.item1.isDirty = function() {return true;};
            
            var values = this.form.getFieldValues(true);
            
            assert.areEqual('Edward', values.name);
            assert.isUndefined(values.email);
            assert.isUndefined(values.phone);
        },
        
        testGetValuesForSubmission: function() {
            //pending
        }
    }));
    
    suite.add(new Y.Test.Case({
        name: 'adding and removing',
        
        setUp: function() {
            this.form = buildForm();
            
            this.item1 = buildFormItem({id: 'name'});
            this.item2 = buildFormItem({id: 'email'});
            this.item3 = buildFormItem({id: 'phone'});
            
            this.form.add(this.item1);
        },
        
        testAddField: function() {
            var count = this.form.items.getCount();
            
            this.form.add(this.item2);
            
            assert.areEqual(count + 1, this.form.items.getCount());
        },
        
        testAddMultipleFields: function() {
            var count = this.form.items.getCount();
            
            this.form.add(this.item2, this.item3);
            
            assert.areEqual(count + 2, this.form.items.getCount());
        },
        
        testAddReturnsForm: function() {
            assert.areEqual(this.form, this.form.add(this.item2));
        },
        
        testRemoveField: function() {
            var count = this.form.items.getCount();
            
            this.form.remove(this.item1);
            
            assert.areEqual(count - 1, this.form.items.getCount());
        },
        
        testRemoveReturnsForm: function() {
            assert.areEqual(this.form, this.form.remove(this.item1));
        }
    }));
})();