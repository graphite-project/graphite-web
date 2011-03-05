/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
var Forum = {};

//////////////////////////////////////////////////////////////////////////////////////////////
// The data store for topics
Forum.TopicStore = function(){
    Forum.TopicStore.superclass.constructor.call(this, {
        remoteSort: true,

        proxy: new Ext.data.ScriptTagProxy({
            url: 'http://extjs.com/forum/topics-browse-remote.php'
        }),

        reader: new Ext.data.JsonReader({
            root: 'topics',
            totalProperty: 'totalCount',
            id: 'threadid'
        }, [
            'title', 'forumtitle', 'forumid', 'author',
            {name: 'replycount', type: 'int'},
            {name: 'lastpost', mapping: 'lastpost', type: 'date', dateFormat: 'timestamp'},
            'lastposter', 'excerpt'
        ])
    });

    this.setDefaultSort('lastpost', 'desc');
};
Ext.extend(Forum.TopicStore, Ext.data.Store, {
    loadForum : function(forumId){
        this.baseParams = {
            forumId: forumId
        };
        this.load({
            params: {
                start:0,
                limit:25
            }
        });
    }
});

//////////////////////////////////////////////////////////////////////////////////////////////

// some renderers
Forum.Renderers = {
    topic : function(value, p, record){
        return String.format(
                '<div class="topic"><b>{0}</b><span class="author">{1}</span></div>',
                value, record.data.author, record.id, record.data.forumid);
    },

    lastPost : function(value, p, r){
        return String.format('<span class="post-date">{0}</span><br/>by {1}', value.dateFormat('M j, Y, g:i a'), r.data['lastposter']);
    }
};

//////////////////////////////////////////////////////////////////////////////////////////////

Forum.SearchView = function(search){

    this.preview = new Ext.Panel({
        region:'south',
        height:250,
        title:'View Message',
        split:true
    });

    this.store = new Ext.data.Store({
        remoteSort: true,
        proxy: new Ext.data.ScriptTagProxy({
            url: 'http://extjs.com/forum/topics-browse-remote.php'
        }),
        reader: new Ext.data.JsonReader({
            root: 'topics',
            totalProperty: 'totalCount',
            id: 'post_id'
        }, [
            {name: 'postId', mapping: 'post_id'},
            {name: 'title', mapping: 'topic_title'},
            {name: 'topicId', mapping: 'topic_id'},
            {name: 'author', mapping: 'author'},
            {name: 'lastPost', mapping: 'post_time', type: 'date', dateFormat: 'timestamp'},
            {name: 'excerpt', mapping: 'post_text'}
        ])
    });
    this.store.setDefaultSort('lastpost', 'desc');


    this.grid = new Ext.grid.GridPanel({
        region:'center',

        store: this.store,

        cm: new Ext.grid.ColumnModel([{
           id: 'topic',
           header: "Post Title",
           dataIndex: 'title',
           width: 420,
           renderer: Forum.Renderers.topic
        },{
           id: 'last',
           header: "Date Posted",
           dataIndex: 'lastpost',
           width: 150,
           renderer: Ext.util.Format.dateRenderer('M j, Y, g:i a')
        }]),

        sm: new Ext.grid.RowSelectionModel({
            singleSelect:true
        }),

        trackMouseOver:false,

        loadMask: {msg:'Searching...'},

        viewConfig: {
            forceFit:true,
            enableRowBody:true,
            showPreview:true,
            getRowClass : function(record, rowIndex, p, ds){
                if(this.showPreview){
                    p.body = '<p>'+record.data.excerpt+'</p>';
                    return 'x-grid3-row-expanded';
                }
                return 'x-grid3-row-collapsed';
            }
        },

        bbar: new Ext.PagingToolbar({
            pageSize: 25,
            store: ds,
            displayInfo: true,
            displayMsg: 'Displaying results {0} - {1} of {2}',
            emptyMsg: "No results to display"
        })
    });

    Forum.SearchView.superclass.constructor.call(this, {
        layout:'border',
        title:'Search: '+Ext.util.Format.htmlEncode('"'+search+'"'),
        items:[ this.grid, this.preview ]
     });

    this.store.baseParams = {
        query: search
    };

    this.store.load({params:{start:0, limit: 25}});
};

Ext.extend(Forum.SearchView, Ext.Panel);



Ext.onReady(function(){

    Ext.QuickTips.init();

    var ds = new Forum.TopicStore();

    var cm = new Ext.grid.ColumnModel([{
           id: 'topic',
           header: "Topic",
           dataIndex: 'title',
           width: 420,
           renderer: Forum.Renderers.topic
        },{
           header: "Author",
           dataIndex: 'author',
           width: 100,
           hidden: true
        },{
           header: "Replies",
           dataIndex: 'replycount',
           width: 70,
           align: 'right'
        },{
           id: 'last',
           header: "Last Post",
           dataIndex: 'lastpost',
           width: 150,
           renderer: Forum.Renderers.lastPost
        }]);

    cm.defaultSortable = true;

    var viewport = new Ext.Viewport({
        layout:'border',
        items:[
            new Ext.BoxComponent({ // raw
                region:'north',
                el: 'header',
                height:32
            }),
            new Ext.tree.TreePanel({
                id:'forum-tree',
                region:'west',
                title:'Forums',
                split:true,
                width: 325,
                minSize: 175,
                maxSize: 400,
                collapsible: true,
                margins:'0 0 5 5',
                loader: new Forum.TreeLoader(),
                rootVisible:false,
                lines:false,
                autoScroll:true,
                root: new Ext.tree.AsyncTreeNode({
                          text: 'Forums',
                          expanded:true
                      })
            }),
            new Ext.TabPanel({
                id:'main-tabs',
                activeTab:0,
                region:'center',
                margins:'0 5 5 0',
                resizeTabs:true,
                tabWidth:150,
                items: {
                    id:'main-view',
                    layout:'border',
                    title:'Loading...',
                    items:[
                        new Ext.grid.GridPanel({
                            region:'center',
                            id:'topic-grid',
                            store: ds,
                            cm: cm,
                            sm:new Ext.grid.RowSelectionModel({
                                singleSelect:true,
                                listeners: {
                                    selectionchange: function(sel){
                                        var rec = sel.getSelected();
                                        if(rec){
                                            Ext.getCmp('preview').body.update('<b><u>' + rec.get('title') + '</u></b><br /><br />Post details here.');
                                        }
                                    }
                                }
                            }),
                            trackMouseOver:false,
                            loadMask: {msg:'Loading Topics...'},
                            viewConfig: {
                                forceFit:true,
                                enableRowBody:true,
                                showPreview:true,
                                getRowClass : function(record, rowIndex, p, ds){
                                    if(this.showPreview){
                                        p.body = '<p>'+record.data.excerpt+'</p>';
                                        return 'x-grid3-row-expanded';
                                    }
                                    return 'x-grid3-row-collapsed';
                                }
                            },
                            tbar:[
                                {
                                    text:'New Topic',
                                    iconCls: 'new-topic',
                                    handler:function(){alert('Not implemented.');}
                                },
                                '-',
                                {
                                    pressed: true,
                                    enableToggle:true,
                                    text:'Preview Pane',
                                    tooltip: {title:'Preview Pane',text:'Show or hide the Preview Pane'},
                                    iconCls: 'preview',
                                    toggleHandler: togglePreview
                                },
                                ' ',
                                {
                                    pressed: true,
                                    enableToggle:true,
                                    text:'Summary',
                                    tooltip: {title:'Post Summary',text:'View a short summary of each post in the list'},
                                    iconCls: 'summary',
                                    toggleHandler: toggleDetails
                                }
                            ],
                            bbar: new Ext.PagingToolbar({
                                pageSize: 25,
                                store: ds,
                                displayInfo: true,
                                displayMsg: 'Displaying topics {0} - {1} of {2}',
                                emptyMsg: "No topics to display"
                            })
                        }), {
                            id:'preview',
                            region:'south',
                            height:250,
                            title:'View Topic',
                            split:true,
                            bodyStyle: 'padding: 10px; font-family: Arial; font-size: 12px;'
                        }
                     ]
                 }
              })
         ]
    });

    var tree = Ext.getCmp('forum-tree');
    tree.on('append', function(tree, p, node){
       if(node.id == 40){
           node.select.defer(100, node);
       }
    });
    var sm = tree.getSelectionModel();
    sm.on('beforeselect', function(sm, node){
         return node.isLeaf();
    });
    sm.on('selectionchange', function(sm, node){
        ds.loadForum(node.id);
        Ext.getCmp('main-view').setTitle(node.text);
    });


     var searchStore = new Ext.data.Store({
        proxy: new Ext.data.ScriptTagProxy({
            url: 'http://extjs.com/forum/topics-browse-remote.php'
        }),
        reader: new Ext.data.JsonReader({
            root: 'topics',
            totalProperty: 'totalCount',
            id: 'threadid'
        }, [
            'title', 'author',
            {name: 'lastpost', type: 'date', dateFormat: 'timestamp'}
        ])
    });

    // Custom rendering Template
    var resultTpl = new Ext.XTemplate(
        '<tpl for=".">',
            '<div class="x-combo-list-item search-item">{title} by <b>{author}</b></div>',
        '</tpl>'
    );

    var search = new Ext.form.ComboBox({
        store: searchStore,
        applyTo: 'search',
        displayField:'title',
        typeAhead: false,
        loadingText: 'Searching...',
        width: 200,
        pageSize:10,
        listWidth:550,
        hideTrigger:true,
        tpl: resultTpl,
        minChars:3,
        emptyText:'Quick Search',
        onSelect: function(record){ // override default onSelect to do redirect
            window.location =
                String.format('http://extjs.com/forum/showthread.php?t={0}&p={1}', record.data.topicId, record.id);
        }
    });
    // apply it to the exsting input element
    //search.applyTo('search');



    function toggleDetails(btn, pressed){
        var view = Ext.getCmp('topic-grid').getView();
        view.showPreview = pressed;
        view.refresh();
    }

    function togglePreview(btn, pressed){
        var preview = Ext.getCmp('preview');
        preview[pressed ? 'show' : 'hide']();
        preview.ownerCt.doLayout();
    }
});

Forum.TreeLoader = function(){
    Forum.TreeLoader.superclass.constructor.call(this);
    this.proxy = new Ext.data.ScriptTagProxy({
        url : this.dataUrl
    });
};
Ext.extend(Forum.TreeLoader, Ext.tree.TreeLoader, {
    dataUrl: 'http://extjs.com/forum/forums-remote.php',
    requestData : function(node, cb){
        this.proxy.request('read', null, {}, {
            readRecords : function(o){
                return o;
            }
        }, this.addNodes, this, {node:node, cb:cb});
    },

    addNodes : function(o, arg){
        var node = arg.node;
        for(var i = 0, len = o.length; i < len; i++){
            var n = this.createNode(o[i]);
            if(n){
                node.appendChild(n);
            }
        }
        arg.cb(this, node);
    }
});
