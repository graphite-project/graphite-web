/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
Ext.test.session.addTest( 'ArrayReader', {
    name: 'readRecords',
    setUp: function() {
        this.reader = new Ext.data.ArrayReader({
            idIndex: 1,
            fields: [
               {name: 'floater', type: 'float'},
               {name: 'id'},
               {name: 'totalProp', type: 'integer'},
               {name: 'bool', type: 'boolean'},
               {name: 'msg'}
            ]
        });
        this.data1 = [
            [ 1.23, 1, 6, true, 'hello' ]
        ];
        this.rec1 = this.reader.readRecords(this.data1);
    },
    test_tearDown: function() {
        delete this.reader;
        delete this.data1;
        delete this.rec1;
    },
    test_TotalRecords: function() {
        Y.Assert.areSame(this.rec1.totalRecords, 1);
    },
    test_Records: function() {
        Y.Assert.areSame(this.rec1.records[0].data.floater, this.data1[0][0]);
        Y.Assert.areSame(this.rec1.records[0].data.id, this.data1[0][1]);
        Y.Assert.areSame(this.rec1.records[0].data.totalProp, this.data1[0][2]);
        Y.Assert.areSame(this.rec1.records[0].data.bool, this.data1[0][3]);
        Y.Assert.areSame(this.rec1.records[0].data.msg, this.data1[0][4]);
    }
});
