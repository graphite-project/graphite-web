/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
var suite = Ext.test.session.getSuite('JsonReader');

suite.add(new Y.Test.Case({
    name: 'buildExtractors',
    setUp: function() {
        this.reader = new Ext.data.JsonReader({
            root: 'data',
            idProperty: 'id',
            totalProperty: 'totalProp',
            messageProperty: 'messageProp',
            successProperty: 'successProp',
            fields: [
               {mapping: 'mappy', name: 'inter', type: 'integer'}
            ]
        });
        this.reader.buildExtractors();
    },
    tearDown: function() {
        delete this.reader;
    },
    test_getTotal: function() {
        Y.Assert.areSame(this.reader.getTotal({ totalProp: 500}), 500);
    },
    test_getSuccess: function() {
        Y.Assert.areSame(this.reader.getSuccess({ successProp: false }), false);
    },
    test_getMessage: function() {
        Y.Assert.areSame(this.reader.getMessage({ messageProp: 'Hello' }), 'Hello');
    },
    test_getRoot: function() {
        Y.Assert.areSame(this.reader.getRoot({ data: 'data' }), 'data');
    },
    test_getId: function() {
        Y.Assert.areSame(this.reader.getId({ id: 100 }), 100);
    },
    test_mapping: function() {
        Y.Assert.areSame(this.reader.ef[0]({ mappy: 200 }), 200);
    }
}));

suite.add(new Y.Test.Case({
    name: 'readRecords',
    setUp: function() {
        this.reader = new Ext.data.JsonReader({
            root: 'data',
            idProperty: 'id',
            totalProperty: 'totalProp',
            messageProperty: 'Hello World',
            successProperty: 'successProp',
            fields: [
               {name: 'id'},
               {name: 'floater', type: 'float'},
               {name: 'bool', type: 'boolean'},
               {name: 'inter', type: 'integer'}
            ]
        });
        this.data1 = {
            id: 1,
            floater: 1.23,
            bool: true,
            inter: 8675
        };
        this.rec1 = this.reader.readRecords({
            data: [this.data1],
            successProp: true,
            totalProp: 2
        });
        this.rec2 = this.reader.readRecords({
            data: [{
                id: 2,
                floater: 4.56,
                bool: false,
                inter: 309
            }],
            successProp: false,
            totalProp: 6
        });
    },
    test_tearDown: function() {
        delete this.reader;
        delete this.data1;
        delete this.rec1;
        delete this.rec2;
    },
    test_SuccessProperty: function() {
        Y.Assert.areSame(this.rec1.success, true);
        Y.Assert.areSame(this.rec2.success, false);
    },
    test_TotalRecords: function() {
        Y.Assert.areSame(this.rec1.totalRecords, 2);
        Y.Assert.areSame(this.rec2.totalRecords, 6);
    },
    test_Records: function() {
        Y.Assert.areSame(this.rec1.records[0].data.id, this.data1.id);
        Y.Assert.areSame(this.rec1.records[0].data.floater, this.data1.floater);
        Y.Assert.areSame(this.rec1.records[0].data.bool, this.data1.bool);
        Y.Assert.areSame(this.rec1.records[0].data.inter, this.data1.inter);
    }
}));

suite.add(new Y.Test.Case({
    name: 'readResponse',
    setUp: function() {
        this.reader = new Ext.data.JsonReader({
            root: 'data',
            idProperty: 'id',
            totalProperty: 'totalProp',
            messageProperty: 'messageProp',
            successProperty: 'successProp',
            fields: [
               {name: 'id'},
               {name: 'floater', type: 'float'},
               {name: 'bool', type: 'boolean'},
               {name: 'inter', type: 'integer'}
            ]
        });
        this.data1 = {
            id: 1,
            floater: 1.23,
            bool: true,
            inter: 8675
        };
        this.rec1 = this.reader.readResponse('read', {
            data: [this.data1],
            successProp: true,
            totalProp: 2,
            messageProp: 'Hello'
        });
        this.rec2 = this.reader.readResponse('read', {
            data: [{
                id: 2,
                floater: 4.56,
                bool: false,
                inter: 309
            }],
            successProp: false,
            totalProp: 6
        });
    },
    tearDown: function() {
        delete this.reader;
        delete this.data1;
        delete this.rec1;
        delete this.rec2;
    },
    test_SuccessProperty: function() {
        Y.Assert.areSame(this.rec1.success, true);
        Y.Assert.areSame(this.rec2.success, false);
    },
    test_Records: function() {
        Y.Assert.areSame(this.rec1.data[0].id, this.data1.id);
        Y.Assert.areSame(this.rec1.data[0].floater, this.data1.floater);
        Y.Assert.areSame(this.rec1.data[0].bool, this.data1.bool);
        Y.Assert.areSame(this.rec1.data[0].inter, this.data1.inter);
    },
    test_ActionProperty: function() {
        Y.Assert.areSame(this.rec1.action, 'read');
    },
    test_MessageProperty: function() {
        Y.Assert.areSame(this.rec1.message, 'Hello');
    },
    test_RawProperty: function() {
        Y.Assert.areSame(this.rec1.raw.data[0].id, this.data1.id);
    }
}));
