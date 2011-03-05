/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
Ext.onReady(function(){

    Ext.QuickTips.init();

    var xg = Ext.grid;

    var reader = new Ext.data.JsonReader({
        idProperty: 'taskId',
        fields: [
            {name: 'projectId', type: 'int'},
            {name: 'project', type: 'string'},
            {name: 'taskId', type: 'int'},
            {name: 'description', type: 'string'},
            {name: 'estimate', type: 'float'},
            {name: 'rate', type: 'float'},
            {name: 'cost', type: 'float'},
            {name: 'due', type: 'date', dateFormat:'m/d/Y'}
        ]

    });

    // define a custom summary function
    Ext.ux.grid.GroupSummary.Calculations['totalCost'] = function(v, record, field){
        return v + (record.data.estimate * record.data.rate);
    };

	// utilize custom extension for Group Summary
    var summary = new Ext.ux.grid.GroupSummary();

    var grid = new xg.EditorGridPanel({
        ds: new Ext.data.GroupingStore({
            reader: reader,
			// use local data
            data: app.grid.dummyData,
            sortInfo: {field: 'due', direction: 'ASC'},
            groupField: 'project'
        }),
        columns: [
            {
                id: 'description',
                header: 'Task',
                width: 80,
                sortable: true,
                dataIndex: 'description',
                summaryType: 'count',
                hideable: false,
                summaryRenderer: function(v, params, data){
                    return ((v === 0 || v > 1) ? '(' + v +' Tasks)' : '(1 Task)');
                },
                editor: new Ext.form.TextField({
                   allowBlank: false
                })
            },{
                header: 'Project',
                width: 20,
                sortable: true,
                dataIndex: 'project'
            },{
                header: 'Due Date',
                width: 25,
                sortable: true,
                dataIndex: 'due',
                summaryType: 'max',
                renderer: Ext.util.Format.dateRenderer('m/d/Y'),
                editor: new Ext.form.DateField({
                    format: 'm/d/Y'
                })
            },{
                header: 'Estimate',
                width: 20,
                sortable: true,
                dataIndex: 'estimate',
                summaryType: 'sum',
                renderer : function(v){
                    return v +' hours';
                },
                editor: new Ext.form.NumberField({
                   allowBlank: false,
                   allowNegative: false,
                   style: 'text-align:left'
                })
            },{
                header: 'Rate',
                width: 20,
                sortable: true,
                renderer: Ext.util.Format.usMoney,
                dataIndex: 'rate',
                summaryType: 'average',
                editor: new Ext.form.NumberField({
                    allowBlank: false,
                    allowNegative: false,
                    style: 'text-align:left'
                })
            },{
                id: 'cost',
                header: 'Cost',
                width: 20,
                sortable: false,
                groupable: false,
                renderer: function(v, params, record){
                    return Ext.util.Format.usMoney(record.data.estimate * record.data.rate);
                },
                dataIndex: 'cost',
                summaryType: 'totalCost',
                summaryRenderer: Ext.util.Format.usMoney
            }
        ],

        view: new Ext.grid.GroupingView({
            forceFit: true,
            showGroupName: false,
            enableNoGroups: false,
			enableGroupingMenu: false,
            hideGroupedColumn: true
        }),

        plugins: summary,

        tbar : [{
            text: 'Toggle',
            tooltip: 'Toggle the visibility of summary row',
            handler: function(){summary.toggleSummaries();}
        }],

        frame: true,
        width: 800,
        height: 450,
        clicksToEdit: 1,
        collapsible: true,
        animCollapse: false,
        trackMouseOver: false,
        //enableColumnMove: false,
        title: 'Sponsored Projects',
        iconCls: 'icon-grid',
        renderTo: document.body
    });

});

// set up namespace for application
Ext.ns('app.grid');
// store dummy data in the app namespace
app.grid.dummyData = [
    {projectId: 100, project: 'Ext Forms: Field Anchoring', taskId: 112, description: 'Integrate 2.0 Forms with 2.0 Layouts', estimate: 6, rate: 150, due:'06/24/2007'},
    {projectId: 100, project: 'Ext Forms: Field Anchoring', taskId: 113, description: 'Implement AnchorLayout', estimate: 4, rate: 150, due:'06/25/2007'},
    {projectId: 100, project: 'Ext Forms: Field Anchoring', taskId: 114, description: 'Add support for multiple types of anchors', estimate: 4, rate: 150, due:'06/27/2007'},
    {projectId: 100, project: 'Ext Forms: Field Anchoring', taskId: 115, description: 'Testing and debugging', estimate: 8, rate: 0, due:'06/29/2007'},
    {projectId: 101, project: 'Ext Grid: Single-level Grouping', taskId: 101, description: 'Add required rendering "hooks" to GridView', estimate: 6, rate: 100, due:'07/01/2007'},
    {projectId: 101, project: 'Ext Grid: Single-level Grouping', taskId: 102, description: 'Extend GridView and override rendering functions', estimate: 6, rate: 100, due:'07/03/2007'},
    {projectId: 101, project: 'Ext Grid: Single-level Grouping', taskId: 103, description: 'Extend Store with grouping functionality', estimate: 4, rate: 100, due:'07/04/2007'},
    {projectId: 101, project: 'Ext Grid: Single-level Grouping', taskId: 121, description: 'Default CSS Styling', estimate: 2, rate: 100, due:'07/05/2007'},
    {projectId: 101, project: 'Ext Grid: Single-level Grouping', taskId: 104, description: 'Testing and debugging', estimate: 6, rate: 100, due:'07/06/2007'},
    {projectId: 102, project: 'Ext Grid: Summary Rows', taskId: 105, description: 'Ext Grid plugin integration', estimate: 4, rate: 125, due:'07/01/2007'},
    {projectId: 102, project: 'Ext Grid: Summary Rows', taskId: 106, description: 'Summary creation during rendering phase', estimate: 4, rate: 125, due:'07/02/2007'},
    {projectId: 102, project: 'Ext Grid: Summary Rows', taskId: 107, description: 'Dynamic summary updates in editor grids', estimate: 6, rate: 125, due:'07/05/2007'},
    {projectId: 102, project: 'Ext Grid: Summary Rows', taskId: 108, description: 'Remote summary integration', estimate: 4, rate: 125, due:'07/05/2007'},
    {projectId: 102, project: 'Ext Grid: Summary Rows', taskId: 109, description: 'Summary renderers and calculators', estimate: 4, rate: 125, due:'07/06/2007'},
    {projectId: 102, project: 'Ext Grid: Summary Rows', taskId: 110, description: 'Integrate summaries with GroupingView', estimate: 10, rate: 125, due:'07/11/2007'},
    {projectId: 102, project: 'Ext Grid: Summary Rows', taskId: 111, description: 'Testing and debugging', estimate: 8, rate: 125, due:'07/15/2007'}
];