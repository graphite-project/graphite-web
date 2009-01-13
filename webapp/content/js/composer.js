/* Copyright 2008 Orbitz WorldWide
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 *    Unless required by applicable law or agreed to in writing, software
 *    distributed under the License is distributed on an "AS IS" BASIS,
 *    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *    See the License for the specific language governing permissions and
 *    limitations under the License. */

var RENDER_BASE_URL = window.location.protocol + "//" + window.location.host + "/render/?";

var GraphiteComposer = Class.create();
/* GraphiteComposer encapsulates a set of Ext UI Panels,
 * as well as a ParameterizedURL for the displayed graph. */
GraphiteComposer.prototype = {
  initialize: function () {
    this.url = new ParameterizedURL(RENDER_BASE_URL);
    this.state = {}; // For storing non-querystring state information
    this.window = createComposerWindow(this);
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
    this.updateImage();
  },

  loadMyGraph: function (name, url) {
    this.state.myGraphName = name;
    this.loadURL(url);
  },

  loadURL: function (url) {
    /* Apply the query string from the given url to our graph image */
    this.url.copyQueryStringFromURL(url);
    // Fit the image into the window
    this.url.setParam('width', this.window.getInnerWidth());
    this.url.setParam('height', this.window.getInnerHeight());
    // And don't forget to update the time display widget
    var from = this.url.getParam('from');
    var until = this.url.getParam('until');
    var timeInfo = {};
    if (!from) { // No time interval specified, use the default
      timeInfo.mode = 'recent';
      timeInfo.quantity = '24';
      timeInfo.units = 'hours';
    } else {
      var match = from.match(/^-(\d+)(\w+)/);
      if (match) { // Relative time
        timeInfo.mode = 'recent';
        timeInfo.quantity = match[1];
        timeInfo.units = match[2];
      } else { // Absolute time
        timeInfo.mode = 'date-range';
        timeInfo.startDate = this.parseDate(from);
        timeInfo.endDate = this.parseDate(until);
      }
    }
    this.window.updateTimeDisplay(timeInfo);
    this.window.updateUI();
    this.updateImage();
  },

  updateImage: function () {
    /* Set the image's url to reflect this.url's current params */
    var now = new Date();
    var unixTime = now.valueOf() / 1000;
    this.url.setParam('_salt', unixTime.toString() );
    this.window.getImage().src = this.url.getURL();
  },

  parseDate: function(dateString) { // Format is HH:MM_YYYYMMDD
    var hour = dateString.substr(0,2);
    var minute = dateString.substr(3,2);
    var year = dateString.substr(6,4);
    var month = dateString.substr(10,2);
    var day = dateString.substr(12,14);
    month = parseInt(month) - 1; // Date assumes months are zero-indexed
    return new Date(year, month, day, hour, minute, 0, 0);
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
    /* Add a parameter value */
    var values = this.getParamList(key);
    values.push(value);
    this.params.set(key, values);
    this.syncQueryString();
  },

  removeParam: function (key, value) {
    /* Remove one or all values for a given parameter */
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

  setParam: function (key, value) {
    /* Give the param only the given value */
    this.params.set(key, [value]);
    this.syncQueryString();
  },

  setParamList: function (key, values) {
    /* Give the param a given list of values */
    this.params.set(key, values);
    this.syncQueryString();
  },

  setParamHash: function (params) {
    /* Use the given params Hash (and update this.queryString to match) */
    this.params = params;
    this.syncQueryString();
  },

  syncParams: function () {
    /* Set the value of this.params to reflect the parameters in this.queryString
     * Call this whenever you modify this.queryString */
    var params = $H( this.queryString.toQueryParams() );
    params.each( function(item) { //We want all of our param values to be arrays
      if (typeof(item.value) == 'string') {
        params.set(item.key, [item.value]);
      }
      if (item.value == "undefined" || item.value == undefined) {
        params.unset(item.key);
      }
    });
    this.params = params;
  },

  setQueryString: function (qs) {
    /* Use the given query string (and update this.params to match) */
    this.queryString = qs.gsub(/#/,"%23"); //for prototype's quirky toQueryString() method
    this.syncParams();
    this.syncQueryString();
  },

  syncQueryString: function () {
    /* Set the value of this.queryString to reflect the parameters in this.params
     * Call this whenever you modify this.params */
    this.queryString = this.params.toQueryString().gsub(/#/,"%23");
  },

  copyQueryStringFromURL: function (url) {
    /* Make this object reflect the parameters of the given url */
    var i = url.indexOf("?");
    if (i == -1) { // No query string
      this.setParamHash( $H() );
      return;
    }
    var queryString = url.substr(i+1);
    this.setQueryString(queryString);
  }
};
