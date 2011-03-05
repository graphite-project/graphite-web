/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
Ext.test.session.addTest('DataTypes', {
    name: 'Test data type conversion',
    setUp: function(){
        this.c = function(type, scope, value){
            return type.convert.call(scope || {}, value);    
        };
    },
    
    tearDown: function(){
        delete this.c;
    },
    
    test_auto: function(){
        var type = Ext.data.Types.AUTO,
            d = new Date();
        
        Y.Assert.areEqual('auto', type.type, 'Check the string representation is correct');
        Y.Assert.areEqual(Ext.data.SortTypes.none, type.sortType, 'Check the default sort type');
        
        Y.Assert.isUndefined(this.c(type, null, undefined), 'Test convert with undefined');
        Y.Assert.isNull(this.c(type, null, null), 'Test convert with undefined');
        Y.Assert.areEqual(1, this.c(type, null, 1), 'Test with a number');
        Y.Assert.areEqual(-37.4, this.c(type, null, -37.4), 'Test with a float');
        Y.Assert.areEqual('foo', this.c(type, null, 'foo'), 'Test with a string');
        Y.Assert.areEqual(d, this.c(type, null, d), 'Test with a date');
        Y.Assert.isTrue(this.c(type, null, true), 'Test with a boolean value');
    },
    
    test_string: function(){
        var type = Ext.data.Types.STRING,
            d = new Date();
            
        Y.Assert.areEqual('string', type.type, 'Check the string representation is correct');
        Y.Assert.areEqual(Ext.data.SortTypes.asUCString, type.sortType, 'Check the default sort type');
        
        Y.Assert.areEqual('', this.c(type, null, undefined), 'Test with undefined');
        Y.Assert.areEqual('', this.c(type, null, null), 'Test with null');
        Y.Assert.areEqual('', this.c(type, null, ''), 'Test with empty string');
        Y.Assert.areEqual('username', this.c(type, null, 'username'), 'Test with simple string');
        Y.Assert.areEqual('72', this.c(type, null, 72), 'Test with integer');
        Y.Assert.areEqual('3.4', this.c(type, null, 3.4), 'Test with float number');
        Y.Assert.areEqual('false', this.c(type, null, 'false'), 'Test with boolean false');
        Y.Assert.areEqual(d.toString(), this.c(type, null, d), 'Test with date');
    },
    
    test_int: function(){
        var type = Ext.data.Types.INT;
        
        Y.Assert.areEqual('int', type.type, 'Check the string representation is correct');
        Y.Assert.areEqual(type, Ext.data.Types.INTEGER, 'Test INTEGER alias works correctly');
        Y.Assert.areEqual(Ext.data.SortTypes.none, type.sortType, 'Check the default sort type');
        
        // test invalid
        Y.Assert.areEqual(0, this.c(type, null, undefined), 'Test with undefined');
        Y.Assert.areEqual(0, this.c(type, null, null), 'Test with null');
        Y.Assert.areEqual(0, this.c(type, null, ''), 'Test with empty string');
        
        // test expected
        Y.Assert.areEqual(14, this.c(type, null, '14'), 'Test with numeric string value');
        Y.Assert.areEqual(100, this.c(type, null, 100), 'Test with integer');
        Y.Assert.areEqual(-12, this.c(type, null, -12), 'Test with negative integer');
        
        // test with floats
        Y.Assert.areEqual(71, this.c(type, null, 71.41), 'Test with float');
        Y.Assert.areEqual(-14, this.c(type, null, -14.99), 'Test with negative float');
        Y.Assert.areEqual(16, this.c(type, null, '16.03'), 'Test with float (string)');
        
        // test stripRe
        Y.Assert.areEqual(12, this.c(type, null, '$12'), 'Test with $ in the string');
        Y.Assert.areEqual(-112, this.c(type, null, '-112%'), 'Test with %');
        Y.Assert.areEqual(123456, this.c(type, null, '123,456.00'), 'Test with , seperating numbers');
        
        //custom stripRe
        var orig = Ext.data.Types.stripRe;
        Ext.data.Types.stripRe = /[!]/g;
        
        Y.Assert.areEqual(987654, this.c(type, null, '987!654.34'), 'Test with custom stripRe');
        
        Ext.data.Types.stripRe = orig;
    },
    
    test_float: function(){
        var type = Ext.data.Types.FLOAT;
        
        Y.Assert.areEqual('float', type.type, 'Check the string representation is correct');
        Y.Assert.areEqual(type, Ext.data.Types.NUMBER, 'Test NUMBER alias works correctly');
        Y.Assert.areEqual(Ext.data.SortTypes.none, type.sortType, 'Check the default sort type');
        
        // test invalid
        Y.Assert.areEqual(0, this.c(type, null, undefined), 'Test with undefined');
        Y.Assert.areEqual(0, this.c(type, null, null), 'Test with null');
        Y.Assert.areEqual(0, this.c(type, null, ''), 'Test with empty string');
        
        // test ints
        Y.Assert.areEqual(14, this.c(type, null, '14'), 'Test with numeric string value');
        Y.Assert.areEqual(100, this.c(type, null, 100), 'Test with integer');
        Y.Assert.areEqual(-12, this.c(type, null, -12), 'Test with negative integer');
        
        // test with floats
        Y.Assert.areEqual(71.41, this.c(type, null, 71.41), 'Test with float');
        Y.Assert.areEqual(-14.99, this.c(type, null, -14.99), 'Test with negative float');
        Y.Assert.areEqual(16.03, this.c(type, null, '16.03'), 'Test with float (string)');
        
        // test stripRe
        Y.Assert.areEqual(198.54, this.c(type, null, '$198.54'), 'Test with $ in the string');
        
        //custom stripRe
        var orig = Ext.data.Types.stripRe;
        Ext.data.Types.stripRe = /[\$,]/g;
        
        Y.Assert.areEqual(121343.17, this.c(type, null, '$121,343.17'), 'Test with custom stripRe');
        
        Ext.data.Types.stripRe = orig;
    },
    
    test_bool: function(){
        var type = Ext.data.Types.BOOL;
        
        Y.Assert.areEqual('bool', type.type, 'Check the string representation is correct');
        Y.Assert.areEqual(type, Ext.data.Types.BOOLEAN, 'Test BOOLEAN alias works correctly');
        Y.Assert.areEqual(Ext.data.SortTypes.none, type.sortType, 'Check the default sort type');
        
        Y.Assert.isTrue(this.c(type, null, true), 'Test with true (boolean)');
        Y.Assert.isTrue(this.c(type, null, 'true'), 'Test with true (string)');
        Y.Assert.isTrue(this.c(type, null, 1), 'Test with 1 (number)' );
        Y.Assert.isTrue(this.c(type, null, '1'), 'Test with 1 (string)');
        
        Y.Assert.isFalse(this.c(type, null, false), 'Test with bool');
        Y.Assert.isFalse(this.c(type, null, 7), 'Test with number');
        Y.Assert.isFalse(this.c(type, null, 'foo'), 'Test with string');
        Y.Assert.isFalse(this.c(type, null, {}), 'Test with object');
        Y.Assert.isFalse(this.c(type, null, []), 'Test with array');
        Y.Assert.isFalse(this.c(type, null, new Date()), 'Test with date');
    },
    
    test_date: function(){
        var type = Ext.data.Types.DATE,
            d = new Date();
        
        Y.Assert.areEqual('date', type.type, 'Check the string representation is correct');
        Y.Assert.areEqual(Ext.data.SortTypes.asDate, type.sortType, 'Check the default sort type');
        
        Y.Assert.isNull(this.c(type, null, undefined), 'Test with undefined');
        Y.Assert.isNull(this.c(type, null, null), 'Test with null');
        Y.Assert.isNull(this.c(type, null, false), 'Test with false');
        Y.Assert.areEqual(d, this.c(type, null, d), 'Test with date');
        
        // these aren't really great, but they aren't to test the validity of the dates, just that they get parsed
        // in the right format and returned.
        
        // timestamp
        var n = 1234567890;
        d = new Date(n * 1000);
        Y.Assert.areEqual(d.getTime(), this.c(type, {dateFormat: 'timestamp'}, n).getTime(), 'Test with timestamp format');
        
        // time
        var n = 11111111110000;
        d = new Date(n);
        Y.Assert.areEqual(d.getTime(), this.c(type, {dateFormat: 'time'}, n).getTime(), 'Test with time format');
        
        //custom format
        var format = 'Y-m-d',
            val = '1986-03-03';
            
        d = Date.parseDate(val, format);
        Y.Assert.areEqual(d.getTime(), this.c(type, {dateFormat: format}, val).getTime(), 'Test with custom format (Y-m-d)');
        
        //no format, default parse
        val = 'Wed, 18 Oct 2002 13:00:00';
        d = Date.parse(val);
        Y.Assert.areEqual(d, this.c(type, null, val).getTime(), 'Test with no format, valid date');
        
        val = 'will fail';
        Y.Assert.isNull(this.c(type, null, val), 'Test with no format, invalid date');
    }
});
