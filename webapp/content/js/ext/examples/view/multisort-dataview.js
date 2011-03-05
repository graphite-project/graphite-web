/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
Ext.onReady(function() {
    var store = new Ext.data.ArrayStore({
        proxy   : new Ext.data.MemoryProxy(),
        fields  : ['hasEmail', 'hasCamera', 'id', 'name', 'price', 'screen', 'camera', 'color', 'type', 'reviews', 'screen-size'],
        sortInfo: {
            field    : 'name',
            direction: 'ASC'
        }
    });
    
    store.loadData([
        [true,  false, 1,  "LG KS360",                              70,  "240 x 320 pixels", 2,   "Pink",             "Slider",             359, 2.400000],
        [true,  true,  2,  "Sony Ericsson C510a Cyber-shot",        180, "320 x 240 pixels", 3.2, "Future black",     "Candy bar",          11,  0.000000],
        [true,  true,  3,  "LG PRADA KE850",                        155, "240 x 400 pixels", 2,   "Black",            "Candy bar",          113, 0.000000],
        [true,  true,  4,  "Nokia N900 Smartphone 32 GB",           499, "800 x 480 pixels", 5,   "Black",            "Slider",             320, 3.500000],
        [true,  false, 5,  "Motorola RAZR V3",                      65,  "96 x 80 pixels",   0.3, "Silver",           "Folder type phone",  5,   2.200000],
        [true,  true,  6,  "LG KC910 Renoir",                       180, "240 x 400 pixels", 8,   "Black",            "Candy bar",          79,  0.000000],
        [true,  true,  7,  "BlackBerry Curve 8520 BlackBerry",      135, "320 x 240 pixels", 2,   "Frost",            "Candy bar",          320, 2.640000],
        [true,  true,  8,  "Sony Ericsson W580i Walkman",           70,  "240 x 320 pixels", 2,   "Urban gray",       "Slider",             1,   0.000000],
        [true,  true,  9,  "Nokia E63 Smartphone 110 MB",           170, "320 x 240 pixels", 2,   "Ultramarine blue", "Candy bar",          319, 2.360000],
        [true,  true,  10, "Sony Ericsson W705a Walkman",           274, "320 x 240 pixels", 3.2, "Luxury silver",    "Slider",             5,   0.000000],
        [false, false, 11, "Nokia 5310 XpressMusic",                170, "320 x 240 pixels", 2,   "Blue",             "Candy bar",          344, 2.000000],
        [false, true,  12, "Motorola SLVR L6i",                     50,  "128 x 160 pixels", 2,   "Black",            "Candy bar",          38,  0.000000],
        [false, true,  13, "T-Mobile Sidekick 3 Smartphone 64 MB",  170, "240 x 160 pixels", 1.3, "Green",            "Sidekick",           115, 0.000000],
        [false, true,  14, "Audiovox CDM8600",                      50,  "240 x 160 pixels", 2,   "Blue",             "Folder type phone",  1,   0.000000],
        [false, true,  15, "Nokia N85",                             70,  "320 x 240 pixels", 5,   "Copper",           "Dual slider",        143, 2.600000],
        [false, true,  16, "Sony Ericsson XPERIA X1",               180, "800 x 480 pixels", 3.2, "Solid black",      "Slider",             14,  0.000000],
        [false, true,  17, "Motorola W377",                         135, "128 x 160 pixels", 0.3, "Black",            "Folder type phone",  35,  0.000000],
        [true,  true,  18, "LG Xenon GR500",                        50,  "240 x 400 pixels", 2,   "Red",              "Slider",             658, 2.800000],
        [true,  false, 19, "BlackBerry Curve 8900 BlackBerry",      135, "480 x 360 pixels", 3.2, "Silver",           "Candy bar",          21,  2.440000],
        [true,  false, 20, "Samsung SGH U600 Ultra Edition 10.9",   135, "240 x 320 pixels", 3.2, "Rainbow",          "Slider",             169, 2.200000]
    ]);
    
    var dataview = new Ext.DataView({
        store: store,
        tpl  : new Ext.XTemplate(
            '<ul>',
                '<tpl for=".">',
                    '<li class="phone">',
                        '<img width="64" height="64" src="images/phones/{[values.name.replace(/ /g, "-")]}.png" />',
                        '<strong>{name}</strong>',
                        '<span>{price:usMoney} ({camera} MP)</span>',
                    '</li>',
                '</tpl>',
            '</ul>'
        ),
        
        plugins : [
            new Ext.ux.DataViewTransition({
                duration  : 550,
                idProperty: 'id'
            })
        ],
        id: 'phones',
        
        itemSelector: 'li.phone',
        overClass   : 'phone-hover',
        singleSelect: true,
        multiSelect : true,
        autoScroll  : true
    });
    
    var tbar = new Ext.Toolbar({
        items  : ['Sort on these fields:', ''],
        plugins: [new Ext.ux.ToolbarReorderer()],
        
        listeners: {
            scope    : this,
            reordered: function(button) {
                changeSortDirection(button, false);
            }
        }
    });
    
    new Ext.Panel({
        title: 'Animated DataView',
        layout: 'fit',
        items : dataview,
        height: 615,
        width : 800,
        tbar  : tbar,
        renderTo: 'docbody'
    });
    
    tbar.add(createSorterButton({
        text: 'Megapixels',
        sortData: {
            field: 'camera',
            direction: 'DESC'
        }
    }));
    
    tbar.add(createSorterButton({
        text: 'Price',
        sortData: {
            field: 'price',
            direction: 'DESC'
        }
    }));
    
    //perform an initial sort
    doSort();
    
    //The following functions are used to get the sorting data from the toolbar and apply it to the store
    
    /**
     * Tells the store to sort itself according to our sort data
     */
    function doSort() {
        store.sort(getSorters(), "ASC");
    };
    
    /**
     * Callback handler used when a sorter button is clicked or reordered
     * @param {Ext.Button} button The button that was clicked
     * @param {Boolean} changeDirection True to change direction (default). Set to false for reorder
     * operations as we wish to preserve ordering there
     */
    function changeSortDirection(button, changeDirection) {
        var sortData = button.sortData,
            iconCls  = button.iconCls;
        
        if (sortData != undefined) {
            if (changeDirection !== false) {
                button.sortData.direction = button.sortData.direction.toggle("ASC", "DESC");
                button.setIconClass(iconCls.toggle("sort-asc", "sort-desc"));
            }
            
            store.clearFilter();
            doSort();
        }
    };
    
    /**
     * Returns an array of sortData from the sorter buttons
     * @return {Array} Ordered sort data from each of the sorter buttons
     */
    function getSorters() {
        var sorters = [];
        
        Ext.each(tbar.findByType('button'), function(button) {
            sorters.push(button.sortData);
        }, this);
        
        return sorters;
    }
    
    /**
     * Convenience function for creating Toolbar Buttons that are tied to sorters
     * @param {Object} config Optional config object
     * @return {Ext.Button} The new Button object
     */
    function createSorterButton(config) {
        config = config || {};
              
        Ext.applyIf(config, {
            listeners: {
                click: function(button, e) {
                    changeSortDirection(button, true);                    
                }
            },
            iconCls: 'sort-' + config.sortData.direction.toLowerCase(),
            reorderable: true
        });
        
        return new Ext.Button(config);
    };
});