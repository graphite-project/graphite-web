/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
// Application instance for showing user-feedback messages.
var App = new Ext.App({});

// Create HttpProxy instance.  Notice new configuration parameter "api" here instead of load.  However, you can still use
// the "url" paramater -- All CRUD requests will be directed to your single url instead.
var proxy = new Ext.data.HttpProxy({
    api: {
        read : 'app.php/users/view',
        create : 'app.php/users/create',
        update: 'app.php/users/update',
        destroy: 'app.php/users/destroy'
    }
});

// Typical JsonReader.  Notice additional meta-data params for defining the core attributes of your json-response
var reader = new Ext.data.JsonReader({
    totalProperty: 'total',
    successProperty: 'success',
    idProperty: 'id',
    root: 'data',
    messageProperty: 'message'  // <-- New "messageProperty" meta-data
}, [
    {name: 'id'},
    {name: 'email', allowBlank: false},
    {name: 'first', allowBlank: false},
    {name: 'last', allowBlank: false}
]);

// The new DataWriter component.
var writer = new Ext.data.JsonWriter({
    encode: true,
    writeAllFields: false
});

// Typical Store collecting the Proxy, Reader and Writer together.
var store = new Ext.data.Store({
    id: 'user',
    proxy: proxy,
    reader: reader,
    writer: writer,  // <-- plug a DataWriter into the store just as you would a Reader
    autoSave: true // <-- false would delay executing create, update, destroy requests until specifically told to do so with some [save] buton.
});

// load the store immeditately
store.load();

////
// ***New*** centralized listening of DataProxy events "beforewrite", "write" and "writeexception"
// upon Ext.data.DataProxy class.  This is handy for centralizing user-feedback messaging into one place rather than
// attaching listenrs to EACH Store.
//
// Listen to all DataProxy beforewrite events
//
Ext.data.DataProxy.addListener('beforewrite', function(proxy, action) {
    App.setAlert(App.STATUS_NOTICE, "Before " + action);
});

////
// all write events
//
Ext.data.DataProxy.addListener('write', function(proxy, action, result, res, rs) {
    App.setAlert(true, action + ':' + res.message);
});

////
// all exception events
//
Ext.data.DataProxy.addListener('exception', function(proxy, type, action, options, res) {
    if (type === 'remote') {
        Ext.Msg.show({
            title: 'REMOTE EXCEPTION',
            msg: res.message,
            icon: Ext.MessageBox.ERROR,
            buttons: Ext.Msg.OK
        });
    }
});

// A new generic text field
var textField =  new Ext.form.TextField();

// Let's pretend we rendered our grid-columns with meta-data from our ORM framework.
var userColumns =  [
    {header: "ID", width: 40, sortable: true, dataIndex: 'id'},
    {header: "Email", width: 100, sortable: true, dataIndex: 'email', editor: textField},
    {header: "First", width: 50, sortable: true, dataIndex: 'first', editor: textField},
    {header: "Last", width: 50, sortable: true, dataIndex: 'last', editor: textField}
];

Ext.onReady(function() {
    Ext.QuickTips.init();

    // create user.Form instance (@see UserForm.js)
    var userForm = new App.user.Form({
        renderTo: 'user-form',
        listeners: {
            create : function(fpanel, data) {   // <-- custom "create" event defined in App.user.Form class
                var rec = new userGrid.store.recordType(data);
                userGrid.store.insert(0, rec);
            }
        }
    });

    // create user.Grid instance (@see UserGrid.js)
    var userGrid = new App.user.Grid({
        renderTo: 'user-grid',
        store: store,
        columns : userColumns,
        listeners: {
            rowclick: function(g, index, ev) {
                var rec = g.store.getAt(index);
                userForm.loadRecord(rec);
            },
            destroy : function() {
                userForm.getForm().reset();
            }
        }
    });
});
