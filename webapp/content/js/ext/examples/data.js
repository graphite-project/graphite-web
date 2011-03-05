/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
Ext.ns('Ext.samples');


Ext.samples.samplesCatalog = [{
    title: 'Combination Examples',
    samples: [
        {
            text: 'Feed Viewer',
            url:  'feed-viewer/view.html',
            icon: 'feeds.gif',
            desc: 'RSS feed reader example application that features a swappable reader panel layout.'
        },
        {
            text: 'Web Desktop',
            url:  'desktop/desktop.html',
            icon: 'desktop.gif',
            desc: 'Demonstrates how one could build a desktop in the browser using Ext components including a module plugin system.'
        },
        /*{
            text: 'Image Organizer',
            url:  'image-organizer/index.html',
            icon: 'image-organizer.gif',
            desc: 'Image management application example utilizing MySQL lite and Ext.Direct.',
            status: 'new'
        }*/
        {
            text: 'Ext JS Calendar',
            url:  'calendar/index.html',
            icon: 'calendar.gif',
            desc: 'Example Calendar application. Demonstrates the new Day, Week and Month views and how to combine them.',
            status: 'new'
        },
        {
            text: 'Ext JS API Documentation',
            url:  '../docs/index.html',
            icon: 'docs.gif',
            desc: 'API Documentation application.'
        },
        {
            text: 'Ext JS Forum Browser',
            url:  'forum/forum.html',
            icon: 'forum.gif',
            desc: 'Ext JS online forums browser application.',
            status: 'modified'
        },
        {
            text: 'Image Viewer',
            url:  'organizer/organizer.html',
            icon: 'organizer.gif',
            desc: 'DataView and TreePanel example that demonstrates dragging data items from a DataView into a TreePanel.'
        },
        {
            text: 'Themes Viewer',
            url:  'themes/index.html',
            icon: 'themes.gif',
            desc: 'View and test every Ext component against bundled Ext themes, or, your own custom themes.',
            status: 'new'
        }
        // {
        //     text: 'Pivot Grid',
        //     url:  'pivotgrid/reconfigurable.html',
        //     icon: 'pivotgrid.gif',
        //     desc: 'An example demonstrating how to reconfigure a PivotGrid at run time',
        //     status: 'new'
        // }
    ]
},{
    title: 'Offline Support',
    samples: [{
        text: 'Simple Tasks',
        url:  'tasks/tasks.html',
        icon: 'tasks.gif',
        desc: 'Personal task management application example that uses <a href="http://gears.google.com" target="_blank">Google Gears</a> for data storage.'
    },{
        text: 'Simple Tasks',
        url:  'http://extjs.com/blog/2008/02/24/tasks2/',
        icon: 'air.gif',
        desc: 'Complete personal task management application example that runs on <a href="http://labs.adobe.com/technologies/air/" target="_blank">Adobe AIR</a>.'
    }]
},{
    title: 'Accessibility',
    samples: [{
        text: 'Key Feed Viewer',
        url:  'key-feed-viewer/view.html',
        icon: 'keyboard.gif',
        desc: 'Keyboard navigation within a complex layout.',
        status: 'experimental'
    },{
        text: 'ARIA Tree',
        url:  'tree/aria-tree.html',
        icon: 'acc-tree.gif',
        desc: 'Demonstrating ARIA with a TreePanel',
        status: 'experimental'
    },{
        text: 'Custom Search Fields',
        url: 'form/custom-access.html',
        icon: 'form-custom-access.gif',
        desc: 'A TriggerField search extension combined with an XTemplate for custom results rendering. Uses the Accessibility theme.'
    },{
        text: 'Binding a Grid to a Form',
        url:  'form/form-grid-access.html',
        icon: 'form-grid-binding-access.gif',
        desc: 'A grid embedded within a FormPanel that uses the Accessibility theme.'

    }]
},
{
    title: 'Pivot Grid',
    samples: [
        {
            text: 'Pivot Grid',
            url:  'pivotgrid/simple.html',
            icon: 'pivotgrid.gif',
            desc: 'The powerful new PivotGrid component, demonstrating data reduction and analysis capabilities.',
            status: 'new'
        },
        {
            text: 'Customised Pivot Grid',
            url:  'pivotgrid/countries.html',
            icon: 'pivotgrid-cellcls.gif',
            desc: 'A PivotGrid with its appearance customised based on summarized data',
            status: 'new'
        },
        {
            text: 'Pivot Grid Examples',
            url:  'pivotgrid/people.html',
            icon: 'pivotgrid-people.gif',
            desc: 'Several Pivot Grids showing different views of the same data source',
            status: 'new'
        }
    ]
},
{
    title: 'Grids',
    samples: [{
        text: 'Basic Array Grid',
        url:  'grid/array-grid.html',
        icon: 'grid-array.gif',
        desc: 'A basic read-only grid loaded from local array data that demonstrates the use of custom column renderer functions.'
    },{
        text: 'Property Grid',
        url:  'grid/property-grid.html',
        icon: 'grid-property.gif',
        desc: 'An example of a traditional property grid as typically seen in development IDEs.'
    },{
        text: 'Editable Grid',
        url:  'grid/edit-grid.html',
        icon: 'grid-edit.gif',
        desc: 'An editable grid loaded from XML that shows multiple types of grid editors as well as defining custom data records.'
    },{
        text: 'Row Editor Grid',
        url:  'grid/row-editor.html',
        icon: 'grid-row-editor.gif',
        desc: 'An editable grid which allows the user to make modifications to an entire record at once. Also demonstrates the Ext.chart package. ',
        status: 'new'
    },{
        text: 'XML Grid',
        url:  'grid/xml-grid.html',
        icon: 'grid-xml.gif',
        desc: 'A simple read-only grid loaded from XML data.'
    },{
        text: 'Paging',
        url:  'grid/paging.html',
        icon: 'grid-paging.gif',
        desc: 'A grid with paging, cross-domain data loading and custom- rendered expandable row bodies.'
    },{
        text: 'Progress Bar Pager',
        url:  'grid/progress-bar-pager.html',
        icon: 'progress-bar-pager.gif',
        desc: 'An example of how to integrate the Progress Bar with the Paging Toolbar using a custom plugin.',
        status: 'new'
    },{
        text: 'Sliding Pager',
        url: 'grid/sliding-pager.html',
        icon: 'slider-pager.gif',
        desc: 'A demonstration on the integration of the Slider with the Paging Toolbar using a custom plugin.',
        status: 'new'
    },{
        text: 'Grouping',
        url: 'grid/grouping.html',
        icon: 'grid-grouping.gif',
        desc: 'A basic grouping grid showing collapsible data groups that can be customized via the "Group By" header menu option.'
    },{
        text: 'Grouping with Dynamic Summary',
        url: 'grid/totals.html',
        icon: 'grid-summary.gif',
        desc: 'Advanced grouping grid that allows cell editing and includes custom dynamic summary calculations.',
        status: 'new'
    },{
        text: 'Grouping with Remote Summary',
        url: 'grid/totals-hybrid.html',
        icon: 'grid-summary.gif',
        desc: 'Advanced grouping grid that allows cell editing and includes remotely loaded dynamic summary calculations.'
    },{
        text: 'Grid Plugins',
        url: 'grid/grid-plugins.html',
        icon: 'grid-plugins.gif',
        desc: 'Multiple grids customized via plugins: expander rows, checkbox selection and row numbering.'
    },{
        text: 'Grid Filtering',
        url: 'grid-filtering/grid-filter-local.html',
        icon: 'grid-filter.gif',
        desc: 'Grid plugins providing custom data filtering menus that support various data types.',
        status: 'updated'
    },{
        text: 'Grid From Markup',
        url: 'grid/from-markup.html',
        icon: 'grid-from-markup.gif',
        desc: 'Custom GridPanel extension that can convert a plain HTML table into a dynamic grid at runtime.'
    },{
        text: 'Grid Data Binding (basic)',
        url: 'grid/binding.html',
        icon: 'grid-data-binding.gif',
        desc: 'Data binding a grid to a detail preview panel via the grid\'s RowSelectionModel.'
    },{
        text: 'Grid Data Binding (advanced)',
        url: 'grid/binding-with-classes.html',
        icon: 'grid-data-binding.gif',
        desc: 'Refactoring the basic data binding example to use a class-based application design model.'
    },{
        text: 'Buffered GridView',
        url: 'grid/buffer.html',
        icon: 'grid-buffer.gif',
        desc: 'GridView optimized for performance by rendering only visible rows.',
        status: 'new'
    }, {
        text: 'Editable Grid with Writable Store',
        url: 'writer/writer.html',
        icon: 'writer-thumb.gif',
        desc: 'This Store uses JsonWriter to automatically generate CRUD requests to the server through a standard HttpProxy.',
        status: 'new'
    }, {
        text: 'RESTful Store with GridPanel and RowEditor',
        url: 'restful/restful.html',
        icon: 'grid-row-editor.gif',
        desc: 'A RESTful Store with JsonWriter which automatically generates CRUD requests to the server.',
        status: 'new'
    },{
        text: 'Locking GridView extension',
        url: 'grid/locking-grid.html',
        icon: 'grid-locking.gif',
        desc: 'An example extension that introduces the ability to add locking columns to the GridPanel',
        status: 'new'
    },{
        text: 'Grouping GridView extension',
        url: 'grid/ColumnHeaderGroup.html',
        icon: 'grid-columngrouping.gif',
        desc: 'An extension that adds the capability of grouping Column headers in the GridPanel',
        status: 'new'
    },
    {
        text: 'Multiple Sorting',
        url: 'grid/multiple-sorting.html',
        icon: 'grid-multiple-sorting.png',
        desc: 'An example that shows multi-level sorting in a Grid Panel.',
        status: 'new'
    }]
},{
    title: 'Tabs',
    samples: [{
        text: 'Basic Tabs',
        url: 'tabs/tabs.html',
        icon: 'tabs.gif',
        desc: 'Basic tab functionality including autoHeight, tabs from markup, Ajax loading and tab events.'
    },{
        text: 'TabPanel Scroller Menu',
        url: 'tabs/tab-scroller-menu.html',
        icon: 'tab-panel-scroller-menu.gif',
        desc: 'An example of an overflow menu that appears to the right of the TabPanel tab strip',
        status: 'new'
    },{
        text: 'Advanced Tabs',
        url: 'tabs/tabs-adv.html',
        icon: 'tabs-adv.gif',
        desc: 'Advanced tab features including tab scrolling, adding tabs programmatically and a context menu plugin.'
    },{
        text: 'Group Tabs',
        url: 'grouptabs/grouptabs.html',
        icon: 'group-tabs.gif',
        desc: 'A custom example on how to setup tab grouping using vertical tabs.',
        status: 'new'
    }]
},{
    title: 'Charts',
    samples: [{
        text: 'Charts',
        url: 'chart/charts.html',
        icon: 'charts.gif',
        desc: 'A sampling of several chart styles',
        status: 'new'
    },{
        text: 'Pie Chart',
        url: 'chart/pie-chart.html',
        icon: 'chart-pie.gif',
        desc: 'An example of a pie chart',
        status: 'new'
    },{
        text: 'Stacked Bar Chart',
        url: 'chart/stacked-bar-chart.html',
        icon: 'chart-stacked.gif',
        desc: 'An example of a stacked bar chart',
        status: 'new'
    },{
        text: 'Reloaded Chart',
        url: 'chart/reload-chart.html',
        icon: 'chart-reload.gif',
        desc: 'An example demonstrating chart data reloading',
        status: 'new'
    }]
},{
    title: 'Windows',
    samples: [{
        text: 'Hello World',
        url: 'window/hello.html',
        icon: 'window.gif',
        desc: 'Simple "Hello World" window that contains a basic TabPanel.'
    },{
        text: 'MessageBox',
        url: 'message-box/msg-box.html',
        icon: 'msg-box.gif',
        desc: 'Different styles include confirm, alert, prompt, progress and wait and also support custom icons.'
    },{
        text: 'Layout Window',
        url: 'window/layout.html',
        icon: 'window-layout.gif',
        desc: 'A window containing a basic BorderLayout with nested TabPanel.'
    }]
},{
    title: 'Trees',
    samples: [{
        text: 'Drag and Drop Reordering',
        url: 'tree/reorder.html',
        icon: 'tree-reorder.gif',
        desc: 'A TreePanel loaded asynchronously via a JSON TreeLoader that shows drag and drop with container scroll.'
    },{
        text: 'Multiple trees',
        url: 'tree/two-trees.html',
        icon: 'tree-two.gif',
        desc: 'Drag and drop between two different sorted TreePanels.'
    },{
        text: 'TreeGrid',
        url: 'treegrid/treegrid.html',
        icon: 'tree-columns.gif',
        desc: 'The TreeGrid component',
        status: 'new'
    },{
        text: 'Check Tree',
        url: 'tree/check-tree.html',
        icon: 'tree-check.gif',
        desc: 'An example showing simple checkbox selection in a tree.',
        status: 'new'
    },{
        text: 'XML Tree Loader',
        url: 'tree/xml-tree-loader.html',
        icon: 'tree-xml-loader.gif',
        desc: 'A custom TreeLoader implementation that demonstrates loading a tree from an XML document.'
    }]
},{
    title: 'Layout Managers',
    samples: [{
        text: 'Layout Browser',
        url:  'layout-browser/layout-browser.html',
        icon: 'layout-browser.gif',
        desc: 'Comprehensive showcase of the standard layout managers as well as several custom and combination layouts and combination examples.',
        status: 'updated'
    },{
        text: 'Border Layout',
        url:  'layout/complex.html',
        icon: 'border-layout.gif',
        desc: 'A complex BorderLayout implementation that shows nesting multiple components and sub-layouts.'
    },{
        text: 'Accordion Layout',
        url:  'layout/accordion.html',
        icon: 'layout-accordion.gif',
        desc: 'A basic accordion layout within a border layout.'
    },{
        text: 'Absolute Layout (Form)',
        url:  'form/absform.html',
        icon: 'layout-absolute.gif',
        desc: 'A simple example of form fields utilizing an absolute layout in a window for flexible form resizing.'
    },{
        text: 'Anchor Layout (Form)',
        url:  'form/anchoring.html',
        icon: 'layout-form.gif',
        desc: 'A simple example of form fields utilizing an anchor layout in a window for flexible form resizing.'
    },{
        text: 'Anchor Layout (Panel)',
        url:  'layout/anchor.html',
        icon: 'layout-anchor.gif',
        desc: 'An example of Panels anchored in the browser window.'
    },{
        text: 'Column Layout',
        url:  'layout/column.html',
        icon: 'layout-column.gif',
        desc: 'An example of Panels managed by a column layout.'
    },{
        text: 'Table Layout',
        url:  'layout/table.html',
        icon: 'layout-table.gif',
        desc: 'An example of Panels managed by a table layout.'
    },{
        text: 'HBox Layout',
        url:  'layout/hbox.html',
        icon: 'layout-column.gif',
        desc: 'Interactive layout illustrating the capabilities of the HBox Layout.',
        status: 'new'
    },{
        text: 'VBox Layout',
        url:  'layout/vbox.html',
        icon: 'layout-vbox.gif',
        desc: 'Interactive layout illustrating the capabilities of the VBox Layout.',
        status: 'new'
    },{
        text: 'Portal Demo',
        url:  'portal/portal.html',
        icon: 'portal.gif',
        desc: 'A page layout using several custom extensions to provide a web portal interface.'
    }]
},{
    title: 'ComboBox',
    samples: [{
        text: 'Basic ComboBox',
        url: 'form/combos.html',
        icon: 'combo.gif',
        desc: 'Basic combos, combos rendered from markup and customized list layout to provide item tooltips.'
    },{
        text: 'ComboBox Templates',
        url: 'form/forum-search.html',
        icon: 'combo-custom.gif',
        desc: 'Customized combo with template-based list rendering, remote loading and paging.'
    }]
},{
    title: 'Forms',
    samples: [{
        text: 'Dynamic Forms',
        url: 'form/dynamic.html',
        icon: 'form-dynamic.gif',
        desc: 'Various example forms showing collapsible fieldsets, column layout, nested TabPanels and more.'
    },{
        text: 'Ajax with XML Forms',
        url: 'form/xml-form.html',
        icon: 'form-xml.gif',
        desc: 'Ajax-loaded form fields from remote XML data and remote field validation on submit.'
    },{
        text: 'Custom Search Fields',
        url: 'form/custom.html',
        icon: 'form-custom.gif',
        desc: 'A TriggerField search extension combined with an XTemplate for custom results rendering.'
    },{
        text: 'Binding a Grid to a Form',
        url:  'form/form-grid.html',
        icon: 'form-grid-binding.gif',
        desc: 'A grid embedded within a FormPanel that automatically loads records into the form on row selection.'
    },{
        text: 'Advanced Validation',
        url:  'form/adv-vtypes.html',
        icon: 'form-adv-vtypes.gif',
        desc: 'Relational form field validation using custom vtypes.'
    },{
        text: 'Checkbox/Radio Groups',
        url:  'form/check-radio.html',
        icon: 'form-check-radio.gif',
        desc: 'Many examples showing different checkbox and radio group configurations.'
    },{
        text: 'File Upload Field',
        url:  'form/file-upload.html',
        icon: 'form-file-upload.gif',
        desc: 'A demo of how to give standard file upload fields a bit of Ext style using a custom class.'
    },{
        text: 'Spinner Field',
        url:  'spinner/spinner.html',
        icon: 'form-spinner.gif',
        desc: 'An example of a custom spinner widget.'
    },{
        text: 'MultiSelect and ItemSelector',
        url:  'multiselect/multiselect-demo.html',
        icon: 'form-multiselect.gif',
        desc: 'Example controls for selecting a list of items in forms.'
    },
    {
        text: 'Slider Field',
        url:  'slider/slider-field.html',
        icon: 'form-slider.png',
        desc: 'Example usage of an Ext.Slider to select a number value in a form.',
	    status : 'new'
    },
    {
        text: 'Forms with vBox layout',
        url:  'form/vbox-form.html',
        icon: 'form-vbox.gif',
        desc: 'Example usage of the vBox layout with forms. An added bonus is the FieldReplicator plugin.',
	    status : 'new'
    },
    {
        text  : 'Composite Fields',
        url   : 'form/composite-field.html',
        icon  : 'form-composite.png',
        desc  : 'Example usage of the Composite Fields to place several fields on a single form row.',
	    status: 'new'
    }]
},{
    title: 'Toolbars and Menus',
    samples: [{
        text: 'Basic Toolbar',
        url:  'menu/menus.html',
        icon: 'toolbar.gif',
        desc: 'Toolbar and menus that contain various components like date pickers, color pickers, sub-menus and more.',
        status: 'updated'
    },{
        text: 'Toolbar Overflow',
        url:  'toolbar/overflow.html',
        icon: 'toolbar-overflow.gif',
        desc: 'Dynamic overflow of toolbar buttons into an Ext.menu.',
        status: 'new'
    },{
        text: 'Toolbar Button Groups',
        url:  'toolbar/toolbars.html',
        icon: 'toolbar-button-groups.gif',
        desc: 'Group buttons together in the toolbar.',
        status: 'new'
    },{
        text: 'Ext Actions',
        url:  'menu/actions.html',
        icon: 'toolbar-actions.gif',
        desc: 'Bind the same behavior to multiple buttons, toolbar and menu items using the Ext.Action class.'
    },
    {
        text: 'Reorderable Toolbar',
        url:  'toolbar/reorderable.html',
        icon: 'toolbar-reorderable.png',
        desc: 'Items within a toolbar can be reordered using this plugin.',
        status: 'new'
    },
    {
        text: 'Droppable Toolbar',
        url:  'toolbar/droppable.html',
        icon: 'toolbar-droppable.png',
        desc: 'Items can be dropped onto a Toolbar and easily turned into items with this plugin.',
        status: 'new'
    },
    {
        text: 'Status Bar',
        url:  'statusbar/statusbar-demo.html',
        icon: 'statusbar-demo.gif',
        desc: 'A simple StatusBar that can be dropped into the bottom of any panel to display status text and icons.',
        status: 'updated'
    },{
        text: 'Status Bar (Advanced)',
        url:  'statusbar/statusbar-advanced.html',
        icon: 'statusbar-adv.gif',
        desc: 'Customizing the StatusBar via a plugin to provide automatic form validation monitoring and error linking.',
        status: 'updated'
    }]
},{
    title: 'Templates and DataView',
    samples: [{
        text  : 'Templates',
        url   : 'core/templates.html',
        icon  : 'templates.gif',
        desc  : 'A simple example of rendering views from templates bound to data objects.'
    },{
        text  : 'DataView',
        url   : 'view/data-view.html',
        icon  : 'data-view.gif',
        desc  : 'A basic DataView with custom plugins for editable labels and drag selection of items.'
    },{
        text  : 'DataView (advanced)',
        url   : 'view/chooser.html',
        icon  : 'chooser.gif',
        desc  : 'A more customized DataView supporting sorting and filtering with multiple templates.'
    },{
        text  : 'ListView',
        url   : 'view/list-view.html',
        icon  : 'list-view.gif',
        desc  : 'A high performance tabular DataView to be used as a lightweight grid.',
        status: 'new'
    },
    {
        text  : 'Animated DataView',
        url   : 'view/animated-dataview.html',
        icon  : 'animated-dataview.png',
        desc  : 'Transition animation plugin applied to a standard DataView',
        status: 'new'
    },
    {
        text  : 'Multi-sort DataView',
        url   : 'view/multisort-dataview.html',
        icon  : 'multisort-dataview.png',
        desc  : 'Example demonstrating the ability to sort a DataView by multiple sorters.',
        status: 'new'
    }]
},{
    title   : 'Drag and Drop',
    samples :  [{
        text : 'Grid to Grid Drag and Drop',
        url  : 'dd/dnd_grid_to_grid.html',
        icon : 'dd-gridtogrid.gif',
        desc : 'A simple drag and drop from grid to grid implementation.'
    },{
        text : 'Grid to FormPanel Drag and Drop',
        url  : 'dd/dnd_grid_to_formpanel.html',
        icon : 'dd-gridtoformpanel.gif',
        desc : 'A basic drag and drop from grid to formpanel.'
    },{
        text : 'Field to Grid Drag and Drop',
        url  : 'dd/field-to-grid-dd.html',
        icon : 'dd-fieldtogrid.gif',
        desc : 'Drag from a form field and drop on a grid.',
        status: 'new'
    },{
        text : 'Custom Drag and Drop',
        url  : 'dd/dragdropzones.html',
        icon : 'dd-zones.gif',
        desc : 'Enabling drag and drop between a DataView and a grid using DragZone and DropZone extensions.'
    }]
},{
    title: 'Direct',
    samples: [{
        text: 'Direct',
        url:  'direct/direct.php',
        icon: 'direct.gif',
        desc: 'An example demonstrating Remoting and Polling the server',
        status: 'new'
    },{
        text: 'Direct Form',
        url:  'direct/direct-form.php',
        icon: 'direct.gif',
        desc: 'Ext.Direct Remoting with a Form',
        status: 'new'
    },{
        text: 'Direct TreeLoader',
        url:  'direct/direct-tree.php',
        icon: 'direct.gif',
        desc: 'Ext.Direct Remoting with a Tree',
        status: 'new'
    }]
},{
    title: 'Miscellaneous',
    samples: [{
        text: 'History',
        url: 'history/history.html',
        icon: 'history.gif',
        desc: 'A History manager that allows the user to navigate an Ext UI via browser back/forward.'
    },{
        text: 'Google Maps',
        url: 'window/gmap.html',
        icon: 'gmap-panel.gif',
        desc: 'A Google Maps wrapper class that enables easy display of dynamic maps in Ext panels and windows.'
    },{
        text: 'Editor',
        url: 'simple-widgets/editor.html',
        icon: 'editor.gif',
        desc: 'An example demonstrating the ease of use of the Ext.editor class to modify DOM elements',
        status: 'new'
    },{
        text: 'Slider',
        url: 'slider/slider.html',
        icon: 'slider.gif',
        desc: 'A slider component that supports vertical mode, snapping, tooltips, customized styles and multiple thumbs.',
        status: 'updated'
    },{
        text: 'QuickTips',
        url: 'simple-widgets/qtips.html',
        icon: 'qtips.gif',
        desc: 'Various tooltip and quick tip configuration options including Ajax loading and mouse tracking.',
        status: 'updated'
    },{
        text: 'Progress Bar',
        url: 'simple-widgets/progress-bar.html',
        icon: 'progress.gif',
        desc: 'A basic progress bar component shown in various configurations and with custom styles.'
    },{
        text: 'Panels',
        url: 'panel/panels.html',
        icon: 'panel.gif',
        desc: 'A basic collapsible panel example.',
        status: 'updated'
    },{
        text: 'Bubble Panel',
        url: 'panel/bubble-panel.html',
        icon: 'panel-bubble.gif',
        desc: 'An example illustrating customization of a standard panel.',
        status: 'new'
    },{
        text: 'Resizable',
        url: 'resizable/basic.html',
        icon: 'resizable.gif',
        desc: 'Examples of making any element resizable with various configuration options.'
    },{
        text: 'Spotlight',
        url: 'core/spotlight.html',
        icon: 'spotlight.gif',
        desc: 'A utility for masking everything except a single element on the page to visually highlight it.',
        status: 'new'
    },{
        text: 'Buttons',
        url: 'button/buttons.html',
        icon: 'buttons.gif',
        desc: '',
        status: 'new'
    },{
        text: 'Debugging Console',
        url: 'debug/debug-console.html',
        icon: 'debug-console.gif',
        desc: '',
        status: 'new'
    },{
        text: 'Localization (static)',
        url: 'locale/dutch-form.html',
        icon: 'locale-dutch.gif',
        desc: 'Demonstrates fully localizing a form by including a custom locale script.'
    },{
        text: 'Localization (dynamic)',
        url: 'locale/multi-lang.html',
        icon: 'locale-switch.gif',
        desc: 'Dynamically render various Ext components in different locales by selecting from a locale list.'
    }]
}];
