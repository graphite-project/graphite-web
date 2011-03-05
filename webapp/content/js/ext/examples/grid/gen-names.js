/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
(function(){
    var lasts = ['Jones', 'Smith', 'Lee', 'Wilson', 'Black', 'Williams', 'Lewis', 'Johnson', 'Foot', 'Little', 'Vee', 'Train', 'Hot', 'Mutt'];
    var firsts = ['Fred', 'Julie', 'Bill', 'Ted', 'Jack', 'John', 'Mark', 'Mike', 'Chris', 'Bob', 'Travis', 'Kelly', 'Sara'];
    var lastLen = lasts.length, firstLen = firsts.length;

    Ext.ux.getRandomInt = function(min, max){
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    Ext.ux.generateName = function(){
        var name = firsts[Ext.ux.getRandomInt(0, firstLen-1)] + ' ' + lasts[Ext.ux.getRandomInt(0, lastLen-1)];
        if(Ext.ux.generateName.usedNames[name]){
            return Ext.ux.generateName();
        }
        Ext.ux.generateName.usedNames[name] = true;
        return name;
    }
    Ext.ux.generateName.usedNames = {};

})();
