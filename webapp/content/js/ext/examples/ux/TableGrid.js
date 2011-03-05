/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
Ext.ns('Ext.ux.grid');

/**
 * @class Ext.ux.grid.TableGrid
 * @extends Ext.grid.GridPanel
 * A Grid which creates itself from an existing HTML table element.
 * @history
 * 2007-03-01 Original version by Nige "Animal" White
 * 2007-03-10 jvs Slightly refactored to reuse existing classes * @constructor
 * @param {String/HTMLElement/Ext.Element} table The table element from which this grid will be created -
 * The table MUST have some type of size defined for the grid to fill. The container will be
 * automatically set to position relative if it isn't already.
 * @param {Object} config A config object that sets properties on this grid and has two additional (optional)
 * properties: fields and columns which allow for customizing data fields and columns for this grid.
 */
Ext.ux.grid.TableGrid = function(table, config){
    config = config ||
    {};
    Ext.apply(this, config);
    var cf = config.fields || [], ch = config.columns || [];
    table = Ext.get(table);
    
    var ct = table.insertSibling();
    
    var fields = [], cols = [];
    var headers = table.query("thead th");
    for (var i = 0, h; h = headers[i]; i++) {
        var text = h.innerHTML;
        var name = 'tcol-' + i;
        
        fields.push(Ext.applyIf(cf[i] ||
        {}, {
            name: name,
            mapping: 'td:nth(' + (i + 1) + ')/@innerHTML'
        }));
        
        cols.push(Ext.applyIf(ch[i] ||
        {}, {
            'header': text,
            'dataIndex': name,
            'width': h.offsetWidth,
            'tooltip': h.title,
            'sortable': true
        }));
    }
    
    var ds = new Ext.data.Store({
        reader: new Ext.data.XmlReader({
            record: 'tbody tr'
        }, fields)
    });
    
    ds.loadData(table.dom);
    
    var cm = new Ext.grid.ColumnModel(cols);
    
    if (config.width || config.height) {
        ct.setSize(config.width || 'auto', config.height || 'auto');
    }
    else {
        ct.setWidth(table.getWidth());
    }
    
    if (config.remove !== false) {
        table.remove();
    }
    
    Ext.applyIf(this, {
        'ds': ds,
        'cm': cm,
        'sm': new Ext.grid.RowSelectionModel(),
        autoHeight: true,
        autoWidth: false
    });
    Ext.ux.grid.TableGrid.superclass.constructor.call(this, ct, {});
};

Ext.extend(Ext.ux.grid.TableGrid, Ext.grid.GridPanel);

//backwards compat
Ext.grid.TableGrid = Ext.ux.grid.TableGrid;
