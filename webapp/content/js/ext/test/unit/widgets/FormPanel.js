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
    var suite  = Ext.test.session.getSuite('Ext.form.FormPanel'),
        assert = Y.Assert;
    
    function buildForm(config) {
        return new Ext.form.FormPanel(config);
    };
    
    suite.add(new Y.Test.Case({
        name: 'initialization',
        
        testCreatesForm: function() {
            var form = buildForm();
            
            assert.isTrue(form.form instanceof Ext.form.BasicForm);
        },
        
        testInitsItems: function() {
            var FormPanel = Ext.form.FormPanel,
                proto     = FormPanel.prototype,
                oldInit   = proto.initItems,
                wasCalled = false;
            
            proto.initItems = function() {
                wasCalled = true;
            };
            
            var form = buildForm();
            assert.isTrue(wasCalled);
            
            proto.initItems = oldInit;
        },
        
        testStartsMonitoring: function() {
            var FormPanel = Ext.form.FormPanel,
                proto     = FormPanel.prototype,
                oldFunc   = proto.startMonitoring,
                wasCalled = false;
            
            proto.startMonitoring = function() {
                wasCalled = true;
            };
            
            var form = buildForm({
                monitorValid: true, 
                renderTo    : Ext.getBody()
            });
            
            form.render();
            assert.isTrue(wasCalled);
            
            proto.startMonitoring = oldFunc;
            form.destroy();
        }
    }));
    
    suite.add(new Y.Test.Case({
        name: 'destruction',
        
        testStopMonitoring: function() {
            var FormPanel = Ext.form.FormPanel,
                proto     = FormPanel.prototype,
                oldFunc   = proto.stopMonitoring,
                wasCalled = false;
            
            proto.stopMonitoring = function() {
                wasCalled = true;
            };
            
            var form = buildForm({
                monitorValid: true, 
                renderTo    : Ext.getBody()
            });
            
            form.render();
            form.destroy();
            assert.isTrue(wasCalled);
            
            proto.stopMonitoring = oldFunc;
        }
    }));
    
    suite.add(new Y.Test.Case({
        name: 'initFields',
        
        testIsField: function() {
            var mockField = {
                setValue    : Ext.emptyFn,
                getValue    : Ext.emptyFn,
                markInvalid : Ext.emptyFn,
                clearInvalid: Ext.emptyFn
            };
            
            var form = buildForm();
            
            assert.isTrue(form.isField(mockField));
        }
    }));
})();