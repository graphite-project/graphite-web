/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */

Ext.test.session.addTest( 'Ext', new Y.Test.Case({

    name: 'XTemplate',

    planned: 3,

    // 3
    test_apply: function() {
        var data = {
            hello: 'Hello',
            world: 'World',
            items1: [
                'test1',
                'test2',
                'test3'
            ],
            items2: [
                { name: 'test1' },
                { name: 'test2' },
                { name: 'test3' }
            ],
            kids: [{
                name: 'Sara Grace',
                gender: 'f',
                age:3
            },{
                name: 'Zachary',
                gender: 'm',
                age:2
            },{
                name: 'John James',
                gender: 'm',
                age:.5
            }]
        };
        var tpl1 = new Ext.XTemplate( '{hello} {world}. <tpl for="items1">{.}{[ xindex === xcount ? "" : ":" ]}</tpl>', { compiled: true });
        Y.Assert.areEqual( 'Hello World. test1:test2:test3', tpl1.apply( data ), 'Test apply with an object with an array' );

        var tpl2 = new Ext.XTemplate( '<tpl for="items2">{name}{[ xindex === xcount ? "" : ":" ]}</tpl>', { compiled: true });
        Y.Assert.areEqual( 'test1:test2:test3', tpl2.apply( data ), 'Test apply with an object with an array of hashes' );
        
        var tpl3 = new Ext.XTemplate(
            '<ul><tpl for="kids">',
                '<tpl if="this.isGirl(gender)">',
                    '<li>Girl: {name} - {age}</li>',
                '</tpl>',
                '<tpl if="!this.isGirl(gender)">',
                    '<tpl if="age &lt; 1">',
                        '<li>Baby Boy: {name} - {age*12} months</li>',
                    '</tpl>',
                    '<tpl if="age &gt;= 1">',
                        '<li>Boy: {name} - {age}</li>',
                    '</tpl>',
                '</tpl>',
            '</tpl></ul>',
            {
                compiled: true,
                disableFormats: true,
                isGirl: function(gender){
                    return gender == 'f';
                }
            }
        );
        Y.Assert.areEqual( '<ul><li>Girl: Sara Grace - 3</li><li>Boy: Zachary - 2</li><li>Baby Boy: John James - 6 months</li></ul>',
            tpl3.apply( data ), 'Test apply with template member functions, basic comparison operators, and math' );
    }

    // apply is an alias for applyTemplate

}));
