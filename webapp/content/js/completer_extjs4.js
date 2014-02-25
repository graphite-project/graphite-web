var MetricCompleter;

Ext.define("MetricCompleter",{extend:"Ext.form.ComboBox",
  displayField: "path",
  listEmptyText: "No matching metrics",
  queryMode: 'remote',
  hideTrigger: true,
  queryDelay: 100,
  queryParam: 'query',
  typeAhead: false,
  minChars: 1,
  shrinkWrap: true,
  //validator: function(value){console.log(value)},
  initComponent: function () {
    var _this = this;
    var store = new Ext.data.JsonStore({
      proxy:{
        url: "/metrics/find/",
        type:"ajax",
        pageParam: false, //to remove param "page"
        startParam: false, //to remove param "start"
        limitParam: false, //to remove param "limit"
        noCache: false, //to remove param "_dc"
        extraParams:{ "format" : "completer"},
        actionMethods: {
          read: 'POST'
        },
        reader : {
                  type:"json",
                  root: "metrics",
                }
      },
      
      root: 'metrics',
      fields: ['path', 'name'],
    
    });

    var config = {store: store};

    Ext.apply(this, config);
    Ext.apply(this.initialConfig, config);

    MetricCompleter.superclass.initComponent.call(this);

    this.addListener('beforequery', Ext.bind(this.prepareQuery, this));
    this.addListener('specialkey', Ext.bind(this.onSpecialKey, this));
    this.addListener('afterrender',
      function () {
        _this.getEl().addListener('specialkey',
          function (el, e) {
            _this.onSpecialKey(_this.getEl(), e);
          }
        );
      }
    );
  },

  prepareQuery: function (queryEvent) {
    queryEvent.query += '*';
  },

  onSpecialKey: function (field, e) {
    
    if (e.getKey() == e.TAB) { // This was a pain in the ass to actually get it working right
      field.getEl().blur();
      field.getEl().focus(50);
      field.doQuery( field.getValue() );
      e.stopEvent();
      return false;
    }
  }
});

Ext.define('metriccompleter', {extend:"MetricCompleter"});
