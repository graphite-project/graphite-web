/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
Ext.test.session.addTest( 'Ext.util', {

    name: 'JSON',

    planned: 4,

    // same as Ext.encode
    // 1
    test_encode: function() {
        Y.Assert.areEqual( '{"foo":"bar"}', Ext.util.JSON.encode( { foo: 'bar' } ), 'Test encode with simple object' );
    },

    // same as Ext.decode
    // 2
    test_decode: function() {
        Y.ObjectAssert.hasKeys({
            foo: 'bar'
        }, Ext.util.JSON.decode( '{"foo":"bar"}' ), 'Test decode with a simple object');
        Y.ObjectAssert.hasKeys({
            foo: ['bar','baz']
        }, Ext.util.JSON.decode( '{"foo":["bar","baz"]}' ), 'Test decode with a hash + array');
    }

    // encodeDate

});
