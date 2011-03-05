/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
Ext.onReady(function(){

    var store = new Ext.data.Store({
        remoteSort: true,
        baseParams: {lightWeight:true,ext: 'js'},
        sortInfo: {field:'lastpost', direction:'DESC'},
        autoLoad: {params:{start:0, limit:500}},

        proxy: new Ext.data.ScriptTagProxy({
            url: 'http://extjs.com/forum/topics-browse-remote.php'
        }),

        reader: new Ext.data.JsonReader({
            root: 'topics',
            totalProperty: 'totalCount',
            idProperty: 'threadid',
            fields: [
                'title', 'forumtitle', 'forumid', 'author',
                {name: 'replycount', type: 'int'},
                {name: 'lastpost', mapping: 'lastpost', type: 'date', dateFormat: 'timestamp'},
                'lastposter', 'excerpt'
            ]
        })
    });

    var grid = new Ext.grid.GridPanel({
        renderTo: 'topic-grid',
        width:700,
        height:500,
        frame:true,
        title:'ExtJS.com - Browse Forums',
        trackMouseOver:false,
		autoExpandColumn: 'topic',
        store: store,

        columns: [new Ext.grid.RowNumberer({width: 30}),{
            id: 'topic',
            header: "Topic",
            dataIndex: 'title',
            width: 420,
            renderer: renderTopic,
            sortable:true
        },{
            header: "Replies",
            dataIndex: 'replycount',
            width: 70,
            align: 'right',
            sortable:true
        },{
            id: 'last',
            header: "Last Post",
            dataIndex: 'lastpost',
            width: 150,
            renderer: renderLast,
            sortable:true
        }],

	    bbar: new Ext.PagingToolbar({
		    store: store,
		    pageSize:500,
		    displayInfo:true
	    }),

	    view: new Ext.ux.grid.BufferView({
		    // custom row height
		    rowHeight: 34,
		    // render rows as they come into viewable area.
		    scrollDelay: false
	    })
    });


    // render functions
    function renderTopic(value, p, record){
        return String.format(
                '<b><a href="http://extjs.com/forum/showthread.php?t={2}" target="_blank">{0}</a></b><a href="http://extjs.com/forum/forumdisplay.php?f={3}" target="_blank">{1} Forum</a>',
                value, record.data.forumtitle, record.id, record.data.forumid);
    }
    function renderLast(value, p, r){
        return String.format('{0}<br/>by {1}', value.dateFormat('M j, Y, g:i a'), r.data['lastposter']);
    }

});
