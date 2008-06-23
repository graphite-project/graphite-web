// TODO: Implement landing-pages
// http://graphite.prod.o.com/?target=foo.bar.baz&width=420&fgColor=red&...
//   1) set the appropriate image in the composer
//   2) set the appropriate composer options / fields in the UI
//   3) expand the tree using something like the old showTarget logic

var RENDER_BASE_URL = window.location.protocol + "://" + window.location.host + "/render/?";

var GraphiteComposer = Class.create();
/* GraphiteComposer encapsulates a set of Ext UI Panels,
 * as well as a ParameterizedURL for the displayed graph. */
GraphiteComposer.prototype = {
  initialize: function () {
    this.url = new ParameterizedURL(RENDER_BASE_URL);
    this.panel = new Ext.Panel({region: 'center'});
    this.win = createComposerWindow();
    this.panel.add(this.win);
    this.panel.doLayout();
  },

  toggleTarget: function (target) {
    /* Add the given target to the graph if it does not exist,
     * otherwise remove it. */
    var targets = this.url.getParamList("target");
    if (targets.include(target)) {
      this.url.removeParam("target", target);
    } else {
      this.url.addParam("target", target);
    }
    this.updateGraphImage();
  },

  loadURL: function (url) {
    /* Apply the query string from the given url to our graph image */
    this.url.copyQueryStringFromURL(url);
    this.updateGraphImage();
  },

  updateGraphImage: function () {
    /* Set the image's url to reflect this.url's current params */
    this.url.getURL();
    //XXX
  }
};


var ParameterizedURL = Class.create();
/* ParameterizedURL encapsulates a URL and
 * provides methods to access and modify the
 * query string parameters in a structured fashion.
 * This code should not be specific to Graphite or
 * the Composer in any way. */
ParameterizedURL.prototype = {
  initialize: function (baseURL) {
    this.baseURL = baseURL ? baseURL : "";
    this.params = $H();
    this.queryString = "";
  },

  /*   Parameter access methods   */
  getParam: function (key) {
    /* Return the first value of this parameter */
    var values = this.params.get(key);
    return values ? values[0] : null;
  },

  getParamList: function (key) {
    /* Return an array of all values for this parameter */
    var values = this.params.get(key);
    return values ? values : new Array();
  },

  getURL: function () {
    /* Return the current URL */
    return this.baseURL + this.queryString;
  },

  /*   Parameter modification methods   */
  addParam: function (key, value) {
    var values = this.getParamList(key);
    values.push(value);
    this.params.set(key, values);
    this.syncQueryString();
  },

  removeParam: function (key, value) {
    if (value == null) { //Remove all values
      this.params.unset(key);
    } else { //Remove a specific value
      var newValues = this.getParamList(key).without(value);
      if (newValues.length) {
        this.params.set(key, newValues);
      } else {
        this.params.unset(key);
      }
    }
    this.syncQueryString();
  },

  setParams: function (params) {
    /* Use the given params Hash (and update this.queryString to match) */
    this.params = params;
    this.syncQueryString();
  },

  syncParams: function () {
    /* Set the value of this.params to reflect the parameters in this.queryString
     * Call this whenever you modify this.queryString */
    this.params = this.queryString.toQueryParams();
  },

  setQueryString: function (qs) {
    /* Use the given query string (and update this.params to match) */
    this.queryString = qs;
    this.syncParams();
  },

  syncQueryString: function () {
    /* Set the value of this.queryString to reflect the parameters in this.params
     * Call this whenever you modify this.params */
    this.queryString = this.params.toQueryString();
  },

  copyQueryStringFromURL: function (url) {
    /* Make this object reflect the parameters of the given url */
    var i = url.indexOf("/");
    if (i == -1) { // No slash means no params
      this.setParams( $H() );
      return;
    }
    var queryString = url.substr(i+1);
    this.setQueryString(queryString);
  }
};
