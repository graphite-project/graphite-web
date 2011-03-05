/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
Ext.onReady(function() {

    var patients = [{
        insuranceCode: '11111',
        name: 'Fred Bloggs',
        address: 'Main Street',
        telephone: '555 1234 123'
    }, {
        insuranceCode: '22222',
        name: 'Fred West',
        address: 'Cromwell Street',
        telephone: '666 666 666'
    }, {
        insuranceCode: '33333',
        name: 'Fred Mercury',
        address: 'Over The Rainbow',
        telephone: '555 321 0987'
    }, {
        insuranceCode: '44444',
        name: 'Fred Forsyth',
        address: 'Blimp Street',
        telephone: '555 111 2222'
    }, {
        insuranceCode: '55555',
        name: 'Fred Douglass',
        address: 'Talbot County, Maryland',
        telephone: 'N/A'
    }];

    var PatientRecord = Ext.data.Record.create([{
        name: 'name'
    }, {
        name: 'address'
    }, {
        name: 'telephone'
    }]);

    var patientStore = new Ext.data.Store({
        data: patients,
        reader: new Ext.data.JsonReader({
            id: 'insuranceCode'
        }, PatientRecord)
    });

    var hospitals = [{
        code: 'AAAAA',
        name: 'Saint Thomas',
        address: 'Westminster Bridge Road, SE1 7EH',
        telephone: '020 7188 7188'
    }, {
        code: 'BBBBB',
        name: 'Queen\'s Medical Centre',
        address: 'Derby Road, NG7 2UH',
        telephone: '0115 924 9924'
    }, {
        code: 'CCCCC',
        name: 'Saint Bartholomew',
        address: 'West Smithfield, EC1A 7BE',
        telephone: '020 7377 7000'
    }, {
        code: 'DDDDD',
        name: 'Royal London',
        address: 'Whitechapel, E1 1BB',
        telephone: '020 7377 7000'
    }];
    
    var HospitalRecord = Ext.data.Record.create([{
        name: 'name'
    }, {
        name: 'address'
    }, {
        name: 'telephone'
    }]);

    var hospitalStore = new Ext.data.Store({
        data: hospitals,
        reader: new Ext.data.JsonReader({
            id: 'code'
        }, HospitalRecord)
    });
    
    var patientView = new Ext.DataView({
        cls: 'patient-view',
        tpl: '<tpl for=".">' +
                '<div class="patient-source"><table><tbody>' +
                    '<tr><td class="patient-label">Name</td><td class="patient-name">{name}</td></tr>' +
                    '<tr><td class="patient-label">Address</td><td class="patient-name">{address}</td></tr>' +
                    '<tr><td class="patient-label">Telephone</td><td class="patient-name">{telephone}</td></tr>' +
                '</tbody></table></div>' +
             '</tpl>',
        itemSelector: 'div.patient-source',
        overClass: 'patient-over',
        selectedClass: 'patient-selected',
        singleSelect: true,
        store: patientStore,
        listeners: {
            render: initializePatientDragZone
        }
    });

    var helpWindow = new Ext.Window({
        title: 'Source code',
        width: 920,
        height: 500,
        closeAction: 'hide',
        bodyCfg: {tag: 'textarea', readonly: true},
        bodyStyle: {
            backgroundColor: 'white',
            margin: '0px',
            border: '0px none'
        },
        listeners: {
            render: function(w) {
                Ext.Ajax.request({
                    url: 'dragdropzones.js',
                    success: function(r) {
                        w.body.dom.value = r.responseText;
                    }
                });
            }
        }
    });

    var hospitalGrid = new Ext.grid.GridPanel({
        title: 'Hospitals',
        region: 'center',
        margins: '0 5 5 0',
        bbar: [{
            text: 'View Source',
            handler: function() {
                helpWindow.show();
            }
        }],
        columns: [{
            dataIndex: 'name',
            header: 'Name',
            width: 200
        }, {
            dataIndex: 'address',
            header: 'Address',
            width: 300
        }, {
            dataIndex: 'telephone',
            header: 'Telephone',
            width: 100
        }],
        viewConfig: {
            tpl: new Ext.XTemplate('<div class="hospital-target">Drop Patient Here</div>'),
            enableRowBody: true,
            getRowClass: function(rec, idx, p, store) {
                p.body = this.tpl.apply(rec.data);
            }
        },
        store: hospitalStore,
        listeners: {
            render: initializeHospitalDropZone
        }
    });

    new Ext.Viewport({
        layout: 'border',
        items: [{
            cls: 'app-header',
            region: 'north',
            height: 30,
            html: '<h1>Patient Hospital Assignment</h1>',
            margins: '5 5 5 5'
        }, {
            title: 'Patients',
            region: 'west',
            width: 300,
            margins: '0 5 5 5',
            items: patientView
        }, hospitalGrid ]
    });
});

/*
 * Here is where we "activate" the DataView.
 * We have decided that each node with the class "patient-source" encapsulates a single draggable
 * object.
 *
 * So we inject code into the DragZone which, when passed a mousedown event, interrogates
 * the event to see if it was within an element with the class "patient-source". If so, we
 * return non-null drag data.
 *
 * Returning non-null drag data indicates that the mousedown event has begun a dragging process.
 * The data must contain a property called "ddel" which is a DOM element which provides an image
 * of the data being dragged. The actual node clicked on is not dragged, a proxy element is dragged.
 * We can insert any other data into the data object, and this will be used by a cooperating DropZone
 * to perform the drop operation.
 */
function initializePatientDragZone(v) {
    v.dragZone = new Ext.dd.DragZone(v.getEl(), {

//      On receipt of a mousedown event, see if it is within a draggable element.
//      Return a drag data object if so. The data object can contain arbitrary application
//      data, but it should also contain a DOM element in the ddel property to provide
//      a proxy to drag.
        getDragData: function(e) {
            var sourceEl = e.getTarget(v.itemSelector, 10);
            if (sourceEl) {
                d = sourceEl.cloneNode(true);
                d.id = Ext.id();
                return v.dragData = {
                    sourceEl: sourceEl,
                    repairXY: Ext.fly(sourceEl).getXY(),
                    ddel: d,
                    patientData: v.getRecord(sourceEl).data
                }
            }
        },

//      Provide coordinates for the proxy to slide back to on failed drag.
//      This is the original XY coordinates of the draggable element.
        getRepairXY: function() {
            return this.dragData.repairXY;
        }
    });
}

/*
 * Here is where we "activate" the GridPanel.
 * We have decided that the element with class "hospital-target" is the element which can receieve
 * drop gestures. So we inject a method "getTargetFromEvent" into the DropZone. This is constantly called
 * while the mouse is moving over the DropZone, and it returns the target DOM element if it detects that
 * the mouse if over an element which can receieve drop gestures.
 *
 * Once the DropZone has been informed by getTargetFromEvent that it is over a target, it will then
 * call several "onNodeXXXX" methods at various points. These include:
 *
 * onNodeEnter
 * onNodeOut
 * onNodeOver
 * onNodeDrop
 *
 * We provide implementations of each of these to provide behaviour for these events.
 */
function initializeHospitalDropZone(g) {
    g.dropZone = new Ext.dd.DropZone(g.getView().scroller, {

//      If the mouse is over a target node, return that node. This is
//      provided as the "target" parameter in all "onNodeXXXX" node event handling functions
        getTargetFromEvent: function(e) {
            return e.getTarget('.hospital-target');
        },

//      On entry into a target node, highlight that node.
        onNodeEnter : function(target, dd, e, data){ 
            Ext.fly(target).addClass('hospital-target-hover');
        },

//      On exit from a target node, unhighlight that node.
        onNodeOut : function(target, dd, e, data){ 
            Ext.fly(target).removeClass('hospital-target-hover');
        },

//      While over a target node, return the default drop allowed class which
//      places a "tick" icon into the drag proxy.
        onNodeOver : function(target, dd, e, data){ 
            return Ext.dd.DropZone.prototype.dropAllowed;
        },

//      On node drop, we can interrogate the target node to find the underlying
//      application object that is the real target of the dragged data.
//      In this case, it is a Record in the GridPanel's Store.
//      We can use the data set up by the DragZone's getDragData method to read
//      any data we decided to attach.
        onNodeDrop : function(target, dd, e, data){
            var rowIndex = g.getView().findRowIndex(target);
            var h = g.getStore().getAt(rowIndex);
            var targetEl = Ext.get(target);
            targetEl.update(data.patientData.name+', '+targetEl.dom.innerHTML);
            Ext.Msg.alert('Drop gesture', 'Dropped patient ' + data.patientData.name +
                ' on hospital ' + h.data.name);
            return true;
        }
    });
}