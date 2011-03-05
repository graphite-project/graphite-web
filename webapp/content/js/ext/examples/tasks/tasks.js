/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
Ext.onReady(function(){
    Ext.QuickTips.init();

    var xg = Ext.grid;
    // turn off default shadows which look funky in air
    xg.GridEditor.prototype.shadow = false;
    
    var conn = Ext.data.SqlDB.getInstance();
	conn.open('tasks.db');
    
    // the main grid store
    var taskStore = new TaskStore(conn);
    
    // Category store shared by category combos
    var catStore = new CategoryStore();
    
	taskStore.load({
		callback: function(){
			// first time?
			if(taskStore.getCount() < 1){
				Ext.Msg.confirm('Create Tasks?', 'Your database is currently empty. Would you like to insert some demo data?', 
					function(btn){
						if(btn == 'yes'){
							loadDemoTasks(taskStore);	
						}
						catStore.init(taskStore);
					});
			}else{
				catStore.init(taskStore);
			}
		}
	});

    // custom event to notify when a new category is available
    taskStore.on('newcategory', catStore.addCategory, catStore);

    // set of event handlers shared by combos to allow them to share
    // the same local store
    var comboEvents = {
        focus: function(){
            this.bindStore(catStore);
        },
        blur: function(c){
            catStore.purgeListeners();
        }
    }

    var completeColumn = new CompleteColumn();

    // custom template for the grid header
    var headerTpl = new Ext.Template(
        '<table border="0" cellspacing="0" cellpadding="0" style="{tstyle}">',
        '<thead><tr class="x-grid3-hd-row">{cells}</tr></thead>',
        '<tbody><tr class="new-task-row">',
            '<td><div id="new-task-icon"></div></td>',
            '<td><div class="x-small-editor" id="new-task-title"></div></td>',
            '<td><div class="x-small-editor" id="new-task-cat"></div></td>',
            '<td><div class="x-small-editor" id="new-task-due"></div></td>',
        '</tr></tbody>',
        "</table>"
    );

    var selections = new Ext.grid.RowSelectionModel();

    // The main grid in all its configuration option glory
    var grid = new xg.EditorGridPanel({
        id:'tasks-grid',
        store: taskStore,
        sm: selections,
        clicksToEdit: 'auto',
        enableColumnHide:false,
        enableColumnMove:false,
		border:false,
		title:'All Tasks',
		iconCls:'icon-show-all',
		region:'center',
		
        plugins: completeColumn,

        columns: [
            completeColumn,
            {
                header: "Task",
                width:400,
                sortable: true,
                dataIndex: 'title',
                id:'task-title',
                editor: new Ext.form.TextField({
                    allowBlank: false
                })
            },
            {
                header: "Category",
                width:150,
                sortable: true,
                dataIndex: 'category',
                editor: new Ext.form.ComboBox({
                    displayField: 'text',
                    triggerAction: 'all',
                    mode:'local',
                    selectOnFocus:true,
                    listClass:'x-combo-list-small',
                    listeners: comboEvents
                })
            },
            {
                header: "Due Date",
                width: 150,
                sortable: true,
                renderer: Ext.util.Format.dateRenderer('D m/d/Y'),
                dataIndex: 'dueDate',
                groupRenderer: textDate(),
                groupName: 'Due',
                editor: new Ext.form.DateField({
                    format : "m/d/Y"
                })
            }
        ],

        view: new Ext.grid.GroupingView({
            forceFit:true,
            ignoreAdd: true,
            emptyText: 'No Tasks to display',

            templates: {
                header: headerTpl
            },

            getRowClass : function(r){
                var d = r.data;
                if(d.completed){
                    return 'task-completed';
                }
                if(d.dueDate && d.dueDate.getTime() < new Date().clearTime().getTime()){
                    return 'task-overdue';
                }
                return '';
            }
        })
    });

    var viewPanel = new Ext.Panel({
    	frame:true,
    	title: 'Views',
    	collapsible:true,
    	contentEl:'task-views',
    	titleCollapse: true
    });
    
    var taskActions = new Ext.Panel({
    	frame:true,
    	title: 'Task Actions',
    	collapsible:true,
    	contentEl:'task-actions',
    	titleCollapse: true
    });
    
    var groupActions = new Ext.Panel({
    	frame:true,
    	title: 'Task Grouping',
    	collapsible:true,
    	contentEl:'task-grouping',
    	titleCollapse: true
    });
    
    var actionPanel = new Ext.Panel({
    	id:'action-panel',
    	region:'west',
    	split:true,
    	collapsible: true,
    	collapseMode: 'mini',
        header: false,
    	width:200,
    	minWidth: 150,
    	border: false,
    	baseCls:'x-plain',
    	items: [taskActions, viewPanel, groupActions]
    });

    if(Ext.isAir){ // create AIR window
        var win = new Ext.air.MainWindow({
            layout:'border',
            items: [actionPanel, grid],
            title: 'Simple Tasks',
            iconCls: 'icon-show-all'
        }).render();
	}else{
        var viewport = new Ext.Viewport({
            layout:'border',
            items: [actionPanel, grid]
        });
    }

    var ab = actionPanel.body;
    ab.on('mousedown', doAction, null, {delegate:'a'});
	ab.on('click', Ext.emptyFn, null, {delegate:'a', preventDefault:true});

    grid.on('resize', syncFields);
	grid.on('columnresize', syncFields);

    grid.on('afteredit', function(e){
        if(e.field == 'category'){
            catStore.addCategory(e.value);
        }
        if(e.field == taskStore.getGroupState()){
            taskStore.applyGrouping();
        }

    });

    grid.on('keydown', function(e){
         if(e.getKey() == e.DELETE && !grid.editing){
             actions['action-delete']();
         }
    });

    selections.on('selectionchange', function(sm){
    	var bd = taskActions.body, c = sm.getCount();
    	bd.select('li:not(#new-task)').setDisplayed(c > 0);
    	bd.select('span.s').setDisplayed(c > 1);
    });

    // The fields in the grid's header
    var ntTitle = new Ext.form.TextField({
        renderTo: 'new-task-title',
        emptyText: 'Add a task...'
    });

    var ntCat = new Ext.form.ComboBox({
        renderTo: 'new-task-cat',
        disabled:true,
        displayField: 'text',
        triggerAction: 'all',
        mode:'local',
        selectOnFocus:true,
        listClass:'x-combo-list-small',
        listeners: comboEvents
    });

    var ntDue = new Ext.form.DateField({
        renderTo: 'new-task-due',
        value: new Date(),
        disabled:true,
        format : "m/d/Y"
    });

    // syncs the header fields' widths with the grid column widths
    function syncFields(){
        var cm = grid.getColumnModel();
        ntTitle.setSize(cm.getColumnWidth(1)-2);
        ntCat.setSize(cm.getColumnWidth(2)-4);
        ntDue.setSize(cm.getColumnWidth(3)-4);
    }
    syncFields();

    var editing = false, focused = false, userTriggered = false;
    var handlers = {
        focus: function(){
            focused = true;
        },
        blur: function(){
            focused = false;
            doBlur.defer(250);
        },
        specialkey: function(f, e){
            if(e.getKey()==e.ENTER){
                userTriggered = true;
                e.stopEvent();
                f.el.blur();
                if(f.triggerBlur){
                    f.triggerBlur();
                }
            }
        }
    }
    ntTitle.on(handlers);
    ntCat.on(handlers);
    ntDue.on(handlers);

    ntTitle.on('focus', function(){
        focused = true;
        if(!editing){
            ntCat.enable();
            ntDue.enable();
            syncFields();
            editing = true;
        }
    });

    // when a field in the add bar is blurred, this determines
    // whether a new task should be created
    function doBlur(){
        if(editing && !focused){
            var title = ntTitle.getValue();
            if(!Ext.isEmpty(title)){
                taskStore.addTask({
                    taskId: Task.nextId(),
                    title: title,
                    dueDate: ntDue.getValue()||'',
                    description: '', // ???
                    category: ntCat.getValue(),
                    completed: false
                });
                ntTitle.setValue('');
                if(userTriggered){ // if the entered to add the task, then go to a new add automatically
                    userTriggered = false;
                    ntTitle.focus.defer(100, ntTitle);
                }
            }
            ntCat.disable();
            ntDue.disable();
            editing = false;
        }
    }
	
    var actions = {
    	'view-all' : function(){
    		taskStore.applyFilter('all');
    		grid.setTitle('All Tasks', 'icon-show-all');
    	},
    	
    	'view-active' : function(){
    		taskStore.applyFilter(false);
    		grid.setTitle('Active Tasks', 'icon-show-active');
    	},
    	
    	'view-complete' : function(){
    		taskStore.applyFilter(true);
    		grid.setTitle('Completed Tasks', 'icon-show-complete');
    	},
    	
    	'action-new' : function(){
    		ntTitle.focus();
    	},
    	
    	'action-complete' : function(){
    		selections.each(function(s){
    			s.set('completed', true);
    		});
            taskStore.applyFilter();
    	},
    	
    	'action-active' : function(){
    		selections.each(function(s){
    			s.set('completed', false);
    		});
            taskStore.applyFilter();
    	},
    	
    	'action-delete' : function(){
    		Ext.Msg.confirm('Confirm', 'Are you sure you want to delete the selected task(s)?', 
    		function(btn){
                if(btn == 'yes'){
                	selections.each(function(s){
		    			taskStore.remove(s);
		    		});
                }
            });
    	},
    	
    	'group-date' : function(){
    		taskStore.groupBy('dueDate');
    	},
    	
    	'group-cat' : function(){
    		taskStore.groupBy('category');
    	},
    	
    	'no-group' : function(){
    		taskStore.clearGrouping();
    	}
    };
    
    function doAction(e, t){
    	e.stopEvent();
    	actions[t.id]();
    }
    
    
    // generates a renderer function to be used for textual date groups
    function textDate(){
        // create the cache of ranges to be reused
        var today = new Date().clearTime(true);
        var year = today.getFullYear();
        var todayTime = today.getTime();
        var yesterday = today.add('d', -1).getTime();
        var tomorrow = today.add('d', 1).getTime();
        var weekDays = today.add('d', 6).getTime();
        var lastWeekDays = today.add('d', -6).getTime();

        return function(date){
            if(!date) {
                return '(No Date)';
            }
            var notime = date.clearTime(true).getTime();

            if (notime == todayTime) {
                return 'Today';
            }
            if(notime > todayTime){
                if (notime == tomorrow) {
                    return 'Tomorrow';
                }
                if (notime <= weekDays) {
                    return date.format('l');
                }
            }else {
            	if(notime == yesterday) {
                	return 'Yesterday';
	            }
	            if(notime >= lastWeekDays) {
	                return 'Last ' + date.format('l');
	            }
            }            
            return date.getFullYear() == year ? date.format('D m/d') : date.format('D m/d/Y');
       }
    }
});

/* This is used to laod some demo tasks if the task database is empty */
function loadDemoTasks(store){
	var s = new Date();
	// hardcoded demo tasks
	store.addTask({taskId: Task.nextId(), title:'Start documentation of Ext 2.0', category:'Ext', description:'', dueDate: s.add('d', 21), completed: false});
	store.addTask({taskId: Task.nextId(), title:'Release Ext 1.l Beta 2', category:'Ext', description:'', dueDate:s.add('d', 2), completed: false});
	store.addTask({taskId: Task.nextId(), title:'Take wife to see movie', category:'Family', description:'', dueDate:s.add('d', 2), completed: false});
	store.addTask({taskId: Task.nextId(), title:'Finish task list demo app', category:'Ext', description:'', dueDate:s.add('d', 2), completed: false});
	store.addTask({taskId: Task.nextId(), title:'Do something other than work', category:'Family', description:'', dueDate:s.add('d', -1), completed: false});
	store.addTask({taskId: Task.nextId(), title:'Go to the grocery store', category:'Family', description:'', dueDate:s.add('d', -1), completed: true});
	store.addTask({taskId: Task.nextId(), title:'Reboot my computer', category:'Misc', description:'', dueDate:s, completed: false});
	store.addTask({taskId: Task.nextId(), title:'Respond to emails', category:'Ext', description:'', dueDate:s, completed: true});
}

    

