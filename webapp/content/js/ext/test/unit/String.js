/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
Ext.test.session.addTest('String', {

    name: 'Global String Decorators',
    
    planned: 30,
    
    // 5
    test_escape: function(){
        Y.Assert.areEqual('', String.escape(''), 'Test with an empty string');
        Y.Assert.areEqual('foo', String.escape('foo'), 'Test with an non-empty string, no escape characters');
        Y.Assert.areEqual('\\\\', String.escape('\\'), 'Test with a string with a single \\');
        Y.Assert.areEqual('\\\'', String.escape('\''), 'Test with a string with a single \'');
        Y.Assert.areEqual('\\\'foo\\\\', String.escape('\'foo\\'), 'Test with a mix of escape and non escape characters');
    },
    
    
    // 6
    test_format: function(){
        Y.Assert.areEqual('foo', String.format('foo'), 'Test with no format parameters, no function parameters');
        Y.Assert.areEqual('foo', String.format('foo', 'x'), 'Test with no format parameters, 1 argument parameter');
        Y.Assert.areEqual('foo', String.format('{0}', 'foo'), 'Test with only a format parameter');
        Y.Assert.areEqual('xyz', String.format('{0}{1}{2}', 'x', 'y', 'z'), 'Test with several format parameters');
        Y.Assert.areEqual('xy', String.format('{0}{1}', 'x', 'y', 'z'), 'Test with several format parameters, extra format parameters');
        Y.Assert.areEqual('xfooy', String.format('{0}foo{1}', 'x', 'y'), 'Test with a mix of a string and format parameters');
    },
    
    // 7
    test_leftPad: function(){
        Y.Assert.areEqual('     ', String.leftPad('', 5), 'Test with empty string');
        Y.Assert.areEqual('  foo', String.leftPad('foo', 5), 'Test with string smaller than the padding size');
        Y.Assert.areEqual('foofoo', String.leftPad('foofoo', 5), 'Test with string bigger than the padding size');
        Y.Assert.areEqual('foo', String.leftPad('foo', 0), 'Test with a padding size of 0');
        Y.Assert.areEqual('foo', String.leftPad('foo', -5), 'Test with a padding size of less than 0');
        Y.Assert.areEqual('00000', String.leftPad('', 5, '0'), 'Test with empty string, different padding character');
        Y.Assert.areEqual('00foo', String.leftPad('foo', 5, '0'), 'Test with string smaller than the padding size, different padding character');
    },
    
    // 2
    test_toggle: function(){
        Y.Assert.areEqual('foo', 'baz'.toggle('foo', 'bar'), 'Test with a starting string that doesn\'t match either');
        Y.Assert.areEqual('bar', 'foo'.toggle('foo', 'bar'), 'Test with a starting string that doesn\'t match either');
    },
    
    // 10
    test_trim: function(){
        Y.Assert.areEqual('', ''.trim(), 'Test with empty string');
        Y.Assert.areEqual('foo', 'foo'.trim(), 'Test with string with no whitespace');
        Y.Assert.areEqual('', '    '.trim(), 'Test with string with only whitespace');
        Y.Assert.areEqual('bar', '  bar  '.trim(), 'Test with string with leading and trailing whitespace');
        Y.Assert.areEqual('foo', 'foo   '.trim(), 'Test with only trailing spaces');
        Y.Assert.areEqual('bar', '   bar'.trim(), 'Test with only leading spaces');
        Y.Assert.areEqual('foo bar', 'foo bar'.trim(), 'Test with spaces in between words');
        Y.Assert.areEqual('foo bar baz', '  foo bar baz   '.trim(), 'Test with mixtures of different spaces');
        Y.Assert.areEqual('foo', '\tfoo'.trim(), 'Test with tabs, as opposed to spaces');
        Y.Assert.areEqual('text', '\ttext    '.trim(), 'Test with mixture of spaces and tabs');
    }
    
});
