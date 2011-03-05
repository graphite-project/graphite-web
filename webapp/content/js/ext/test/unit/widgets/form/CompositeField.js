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
    var suite  = Ext.test.session.getSuite('Ext.form.CompositeField'),
        assert = Y.Assert;
    
    //builds a simple composite field
    function buildField(config) {
        config = config || {};
              
        Ext.applyIf(config, {
            items: [
                {xtype: 'textfield', name: 'title',     width: 40, fieldLabel: 'Title'},
                {xtype: 'textfield', name: 'firstName', flex:  1,  fieldLabel: 'First'},
                {xtype: 'textfield', name: 'lastName',  flex:  1,  fieldLabel: 'Last'}
            ]
        });
        
        return new Ext.form.CompositeField(config);
    };
    
    //builds and renders a FormPanel containing a composite field
    function createForm() {
        this.field1 = new Ext.form.TextField({name: 'firstName', flex: 1, fieldLabel: 'First'});
        this.field2 = new Ext.form.TextField({name: 'lastName',  flex: 1, fieldLabel: 'Last'});
        
        this.composite = new Ext.form.CompositeField({
            items: [
                {xtype: 'textfield', name: 'title', width: 40, fieldLabel: 'Title'},
                this.field1,
                this.field2
            ]
        });
        
        this.form = new Ext.form.FormPanel({
            renderTo: Ext.getBody(),
            items   : [
                this.composite
            ]
        });
    };
    
    //use this to tearDown createForm
    function destroyForm() {
        this.form.destroy();
    };
    
    suite.add(new Y.Test.Case({
        name: 'building the label',
        
        testDefaultLabel: function() {
            var field = buildField();
            
            assert.areSame('Title, First, Last', field.fieldLabel);
        },
        
        testCustomFieldLabel: function() {
            var field = buildField({fieldLabel: 'Custom label'});
            
            assert.areSame('Custom label', field.fieldLabel);
        }
    }));
    
    suite.add(new Y.Test.Case({
        name: 'isDirty',
        
        setUp   : createForm,
        tearDown: destroyForm,
        
        testFalseIfDisabled: function() {
            this.composite.disable();

            assert.isFalse(this.composite.isDirty());
        },
        
        testIsClean: function() {
            assert.isFalse(this.composite.isDirty());
        },
        
        testOneFieldDirty: function() {
            this.field1.isDirty = function() {
                return true;
            };

            assert.isTrue(this.composite.isDirty());
        }
    }));
    
    suite.add(new Y.Test.Case({
        name: 'reset',
        
        setUp   : createForm,
        tearDown: destroyForm,
        
        testPropagatesToChildren: function() {
            var callCount = 0;
            
            var resetFunc =function() {
                callCount ++;
            };
            
            this.field1.reset = resetFunc;
            this.field2.reset = resetFunc;
            
            //we need to set this to avoid an unrelated error when resetting
            //clearInvalid would otherwise try to clear a non-existent DOM node
            this.composite.clearInvalid = Ext.emptyFn;
            
            this.composite.reset();
            
            assert.areEqual(2, callCount);
        }
    }));
    
    suite.add(new Y.Test.Case({
        name: 'enabling and disabling',
        
        setUp   : createForm,
        tearDown: destroyForm,
        
        testEnablePropagatesToChildren: function() {
            var callCount = 0;
            
            var enableFunc =function() {
                callCount ++;
            };
            
            this.field1.enable = enableFunc;
            this.field2.enable = enableFunc;
            
            this.composite.onEnable();
            
            assert.areEqual(2, callCount);
        },
        
        testDisablePropagatesToChildren: function() {
            var callCount = 0;
            
            var disableFunc = function() {
                callCount ++;
            };
            
            this.field1.disable = disableFunc;
            this.field2.disable = disableFunc;
            
            this.composite.onDisable();
            
            assert.areEqual(2, callCount);
        }
    }));
    
    suite.add(new Y.Test.Case({
        name: 'setting read only',
        
        setUp   : createForm,
        tearDown: destroyForm,
        
        testSetsSubFields: function() {
            var callCount = 0;
            
            var func = function() {
                callCount ++;
            };
            
            this.field1.setReadOnly = func;
            this.field2.setReadOnly = func;
            
            this.composite.setReadOnly();
            
            assert.areEqual(2, callCount);
        },
        
        testSetsReadOnly: function() {
            var comp = this.composite;
            
            assert.isFalse(comp.readOnly);
            
            comp.setReadOnly();
            
            assert.isTrue(comp.readOnly);
        }
    }));
    
    // suite.add(new Y.Test.Case({
    //     name: 'resizing',
    //     
    //     setUp   : createForm,
    //     tearDown: destroyForm,
    //     
    //     testResizing
    //     
    // }));
})();