var MetricCompleter;

MetricCompleter = Ext.extend(Ext.form.ComboBox, {
  displayField: "path",
  listEmptyText: "No matching metrics",
  mode: 'remote',
  hideTrigger: true,
  queryDelay: 100,
  queryParam: 'query',
  typeAhead: false,
  minChars: 1,

  initComponent: function () {
    var _this = this;

    var store = new Ext.data.JsonStore({
      url: "../metrics/find/",
      root: 'metrics',
      fields: ['path', 'name'],
      baseParams: {format: 'completer'}
    });

    var config = {store: store};

    Ext.apply(this, config);
    Ext.apply(this.initialConfig, config);

    MetricCompleter.superclass.initComponent.call(this);

    this.addListener('beforequery', this.prepareQuery.createDelegate(this));
    this.addListener('specialkey', this.onSpecialKey.createDelegate(this));
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

Ext.reg('metriccompleter', MetricCompleter);
