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
    var suite  = Ext.test.session.getSuite('Ext.Direct'),
        assert = Y.Assert;

    //a shared setup function used by several of the suites
    var defaultSetup = function() {
        this.API = {
            "url": "php\/router.php",
            "type": "remoting",
            "actions": {
                "TestAction": [{
                    "name": "doEcho",
                    "len": 1
                }, {
                    "name": "multiply",
                    "len": 1
                }, {
                    "name": "getTree",
                    "len": 1
                }],
                "Profile": [{
                    "name": "getBasicInfo",
                    "len": 2
                }, {
                    "name": "getPhoneInfo",
                    "len": 1
                }, {
                    "name": "getLocationInfo",
                    "len": 1
                }, {
                    "name": "updateBasicInfo",
                    "len": 2,
                    "formHandler": true
                }]
            }
        };
    };

    suite.add(new Y.Test.Case({
        name: 'adding providers',

        setUp: defaultSetup,

        testAddProvider: function() {
            var p = Ext.Direct.addProvider(
                this.API
            );
            Y.ObjectAssert.hasKeys(p.actions, [
                "Profile",
                "TestAction"
            ], 'Test actions provided');
            Y.ObjectAssert.hasKeys(p.actions, p, Ext.Direct.providers, "Test providers cache");
        },
        testGetProvider: function() {
            var p = Ext.Direct.addProvider(
                this.API
            );
            Y.ObjectAssert.hasKeys(p, Ext.Direct.getProvider(p.id));
        },
        testRemoveProvider: function() {
            // Remove via id
            var p = Ext.Direct.addProvider(
                this.API
            );
            var id = p.id;
            Ext.Direct.removeProvider(id);
            Y.Assert.isUndefined(Ext.Direct.getProvider(id));

            // Remove via object
            var p = Ext.Direct.addProvider(
                this.API
            );
            var id = p.id;
            Ext.Direct.removeProvider(p);
            Y.Assert.isUndefined(Ext.Direct.getProvider(id));
        }
    }));
})();
