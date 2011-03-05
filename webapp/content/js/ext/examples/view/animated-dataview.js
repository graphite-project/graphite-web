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
        [true,  false, 1,  "LG KS360", 54, "240 x 320 pixels", "2 Megapixel", "Pink", "Slider", 359, 2.400000],
        [true,  true,  2,  "Sony Ericsson C510a Cyber-shot", 180, "320 x 240 pixels", "3.2 Megapixel", "Future black", "Candy bar", 11, 0.000000],
        [true,  true,  3,  "LG PRADA KE850", 155, "240 x 400 pixels", "2 Megapixel", "Black", "Candy bar", 113, 0.000000],
        [true,  true,  4,  "Nokia N900 Smartphone 32 GB", 499, "800 x 480 pixels", "5 Megapixel", "( the image of the product displayed may be of a different color )", "Slider", 320, 3.500000],
        [true,  false, 5,  "Motorola RAZR V3", 65, "96 x 80 pixels", "0.3 Megapixel", "Silver", "Folder type phone", 5, 2.200000],
        [true,  true,  6,  "LG KC910 Renoir", 242, "240 x 400 pixels", "8 Megapixel", "Black", "Candy bar", 79, 0.000000],
        [true,  true,  7,  "BlackBerry Curve 8520 BlackBerry", 299, "320 x 240 pixels", "2 Megapixel", "Frost", "Candy bar", 320, 2.640000],
        [true,  true,  8,  "Sony Ericsson W580i Walkman", 120, "240 x 320 pixels", "2 Megapixel", "Urban gray", "Slider", 1, 0.000000],
        [true,  true,  9,  "Nokia E63 Smartphone 110 MB", 170, "320 x 240 pixels", "2 Megapixel", "Ultramarine blue", "Candy bar", 319, 2.360000],
        [true,  true,  10, "Sony Ericsson W705a Walkman", 274, "320 x 240 pixels", "3.2 Megapixel", "Luxury silver", "Slider", 5, 0.000000],
        [false, false, 11, "Nokia 5310 XpressMusic", 140, "320 x 240 pixels", "2 Megapixel", "Blue", "Candy bar", 344, 2.000000],
        [false, true,  12, "Motorola SLVR L6i", 50, "128 x 160 pixels", "", "Black", "Candy bar", 38, 0.000000],
        [false, true,  13, "T-Mobile Sidekick 3 Smartphone 64 MB", 75, "240 x 160 pixels", "1.3 Megapixel", "", "Sidekick", 115, 0.000000],
        [false, true,  14, "Audiovox CDM8600", 5, "", "", "", "Folder type phone", 1, 0.000000],
        [false, true,  15, "Nokia N85", 315, "320 x 240 pixels", "5 Megapixel", "Copper", "Dual slider", 143, 2.600000],
        [false, true,  16, "Sony Ericsson XPERIA X1", 399, "800 x 480 pixels", "3.2 Megapixel", "Solid black", "Slider", 14, 0.000000],
        [false, true,  17, "Motorola W377", 77, "128 x 160 pixels", "0.3 Megapixel", "", "Folder type phone", 35, 0.000000],
        [true,  true,  18, "LG Xenon GR500", 1, "240 x 400 pixels", "2 Megapixel", "Red", "Slider", 658, 2.800000],
        [true,  false, 19, "BlackBerry Curve 8900 BlackBerry", 349, "480 x 360 pixels", "3.2 Megapixel", "", "Candy bar", 21, 2.440000],
        [true,  false, 20, "Samsung SGH U600 Ultra Edition 10.9", 135, "240 x 320 pixels", "3.2 Megapixel", "", "Slider", 169, 2.200000]
    ]);
    
    var dataview = new Ext.DataView({
        store: store,
        tpl  : new Ext.XTemplate(
            '<ul>',
                '<tpl for=".">',
                    '<li class="phone">',
                        '<img width="64" height="64" src="images/phones/{[values.name.replace(/ /g, "-")]}.png" />',
                        '<strong>{name}</strong>',
                        '<span>{price:usMoney} ({reviews} Review{[values.reviews == 1 ? "" : "s"]})</span>',
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
    
    var phoneSlider = new Ext.Slider({
        width   : 300,
        minValue: 0,
        maxValue: 500,
        values  : [80, 320],
        plugins : [
            new Ext.slider.Tip({
                getText: function(thumb) {
                    var largest = Ext.max(store.collect('price', false, true));
                    
                    return String.format('<b>${0}</b>', thumb.value);
                }
            })
        ],
        
        listeners: {
            change: {
                buffer: 70,
                fn    : filterData
            }
        }
    });
    
    new Ext.Panel({
        title: 'Animated DataView',
        layout: 'fit',
        items : dataview,
        height: 615,
        width : 800,
        tbar  : [
            'Filter phone price:', ' ',
            phoneSlider
        ],
        renderTo: 'docbody'
    });
    
    //filters the store based on the current slider values
    function filterData(slider) {
        var values  = slider.getValues();
        
        store.filter([{
            fn: function(record) {
                return record.get('price') >= values[0] && record.get('price') <= values[1];
            }
        }]);
        
        store.sort('name', 'ASC');
    };
    
    //perform initial filter
    filterData(phoneSlider);
});