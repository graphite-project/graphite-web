/*!
 * Ext JS Library 3.0.0
 * Copyright(c) 2006-2009 Ext JS, LLC
 * licensing@extjs.com
 * http://www.extjs.com/license
 */
/**
 * @class Ext.data.JsonWriter
 * @extends Ext.data.DataWriter
 * DataWriter extension for writing an array or single {@link Ext.data.Record} object(s) in preparation for executing a remote CRUD action.
 */
Ext.data.JsonWriter = function(config) {
    Ext.data.JsonWriter.superclass.constructor.call(this, config);
    // careful to respect "returnJson", renamed to "encode"
    if (this.returnJson != undefined) {
        this.encode = this.returnJson;
    }
}
Ext.extend(Ext.data.JsonWriter, Ext.data.DataWriter, {
    /**
     * @cfg {Boolean} returnJson <b>Deprecated.  Use {@link Ext.data.JsonWriter#encode} instead.
     */
    returnJson : undefined,
    /**
     * @cfg {Boolean} encode <tt>true</tt> to {@link Ext.util.JSON#encode encode} the
     * {@link Ext.data.DataWriter#toHash hashed data}. Defaults to <tt>true</tt>.  When using
     * {@link Ext.data.DirectProxy}, set this to <tt>false</tt> since Ext.Direct.JsonProvider will perform
     * its own json-encoding.  In addition, if you're using {@link Ext.data.HttpProxy}, setting to <tt>false</tt>
     * will cause HttpProxy to transmit data using the <b>jsonData</b> configuration-params of {@link Ext.Ajax#request}
     * instead of <b>params</b>.  When using a {@link Ext.data.Store#restful} Store, some serverside frameworks are
     * tuned to expect data through the jsonData mechanism.  In those cases, one will want to set <b>encode: <tt>false</tt></b>
     */
    encode : true,

    /**
     * Final action of a write event.  Apply the written data-object to params.
     * @param {String} action [Ext.data.Api.actions.create|read|update|destroy]
     * @param {Record[]} rs
     * @param {Object} http params
     * @param {Object} data object populated according to DataReader meta-data "root" and "idProperty"
     */
    render : function(action, rs, params, data) {
        Ext.apply(params, data);

        if (this.encode === true) { // <-- @deprecated returnJson
            if (Ext.isArray(rs) && data[this.meta.idProperty]) {
                params[this.meta.idProperty] = Ext.encode(params[this.meta.idProperty]);
            }
            params[this.meta.root] = Ext.encode(params[this.meta.root]);
        }
    },
    /**
     * createRecord
     * @protected
     * @param {Ext.data.Record} rec
     */
    createRecord : function(rec) {
        return this.toHash(rec);
    },
    /**
     * updateRecord
     * @protected
     * @param {Ext.data.Record} rec
     */
    updateRecord : function(rec) {
        return this.toHash(rec);

    },
    /**
     * destroyRecord
     * @protected
     * @param {Ext.data.Record} rec
     */
    destroyRecord : function(rec) {
        return rec.id;
    }
});/**
 * @class Ext.data.JsonReader
 * @extends Ext.data.DataReader
 * <p>Data reader class to create an Array of {@link Ext.data.Record} objects from a JSON response
 * based on mappings in a provided {@link Ext.data.Record} constructor.</p>
 * <p>Example code:</p>
 * <pre><code>
var Employee = Ext.data.Record.create([
    {name: 'firstname'},                  // map the Record's "firstname" field to the row object's key of the same name
    {name: 'job', mapping: 'occupation'}  // map the Record's "job" field to the row object's "occupation" key
]);
var myReader = new Ext.data.JsonReader(
    {                             // The metadata property, with configuration options:
        totalProperty: "results", //   the property which contains the total dataset size (optional)
        root: "rows",             //   the property which contains an Array of record data objects
        idProperty: "id"          //   the property within each row object that provides an ID for the record (optional)
    },
    Employee  // {@link Ext.data.Record} constructor that provides mapping for JSON object
);
</code></pre>
 * <p>This would consume a JSON data object of the form:</p><pre><code>
{
    results: 2,  // Reader's configured totalProperty
    rows: [      // Reader's configured root
        { id: 1, firstname: 'Bill', occupation: 'Gardener' },         // a row object
        { id: 2, firstname: 'Ben' , occupation: 'Horticulturalist' }  // another row object
    ]
}
</code></pre>
 * <p><b><u>Automatic configuration using metaData</u></b></p>
 * <p>It is possible to change a JsonReader's metadata at any time by including a <b><tt>metaData</tt></b>
 * property in the JSON data object. If the JSON data object has a <b><tt>metaData</tt></b> property, a
 * {@link Ext.data.Store Store} object using this Reader will reconfigure itself to use the newly provided
 * field definition and fire its {@link Ext.data.Store#metachange metachange} event. The metachange event
 * handler may interrogate the <b><tt>metaData</tt></b> property to perform any configuration required.
 * Note that reconfiguring a Store potentially invalidates objects which may refer to Fields or Records
 * which no longer exist.</p>
 * <p>The <b><tt>metaData</tt></b> property in the JSON data object may contain:</p>
 * <div class="mdetail-params"><ul>
 * <li>any of the configuration options for this class</li>
 * <li>a <b><tt>{@link Ext.data.Record#fields fields}</tt></b> property which the JsonReader will
 * use as an argument to the {@link Ext.data.Record#create data Record create method} in order to
 * configure the layout of the Records it will produce.</li>
 * <li>a <b><tt>{@link Ext.data.Store#sortInfo sortInfo}</tt></b> property which the JsonReader will
 * use to set the {@link Ext.data.Store}'s {@link Ext.data.Store#sortInfo sortInfo} property</li>
 * <li>any user-defined properties needed</li>
 * </ul></div>
 * <p>To use this facility to send the same data as the example above (without having to code the creation
 * of the Record constructor), you would create the JsonReader like this:</p><pre><code>
var myReader = new Ext.data.JsonReader();
</code></pre>
 * <p>The first data packet from the server would configure the reader by containing a
 * <b><tt>metaData</tt></b> property <b>and</b> the data. For example, the JSON data object might take
 * the form:</p>
<pre><code>
{
    metaData: {
        idProperty: 'id',
        root: 'rows',
        totalProperty: 'results',
        fields: [
            {name: 'name'},
            {name: 'job', mapping: 'occupation'}
        ],
        sortInfo: {field: 'name', direction:'ASC'}, // used by store to set its sortInfo
        foo: 'bar' // custom property
    },
    results: 2,
    rows: [ // an Array
        { 'id': 1, 'name': 'Bill', occupation: 'Gardener' },
        { 'id': 2, 'name': 'Ben', occupation: 'Horticulturalist' }
    ]
}
</code></pre>
 * @cfg {String} totalProperty [total] Name of the property from which to retrieve the total number of records
 * in the dataset. This is only needed if the whole dataset is not passed in one go, but is being
 * paged from the remote server.  Defaults to <tt>total</tt>.
 * @cfg {String} successProperty [success] Name of the property from which to
 * retrieve the success attribute. Defaults to <tt>success</tt>.  See
 * {@link Ext.data.DataProxy}.{@link Ext.data.DataProxy#exception exception}
 * for additional information.
 * @cfg {String} root [undefined] <b>Required</b>.  The name of the property
 * which contains the Array of row objects.  Defaults to <tt>undefined</tt>.
 * An exception will be thrown if the root property is undefined. The data packet
 * value for this property should be an empty array to clear the data or show
 * no data.
 * @cfg {String} idProperty [id] Name of the property within a row object that contains a record identifier value.  Defaults to <tt>id</tt>
 * @constructor
 * Create a new JsonReader
 * @param {Object} meta Metadata configuration options.
 * @param {Array/Object} recordType
 * <p>Either an Array of {@link Ext.data.Field Field} definition objects (which
 * will be passed to {@link Ext.data.Record#create}, or a {@link Ext.data.Record Record}
 * constructor created from {@link Ext.data.Record#create}.</p>
 */
Ext.data.JsonReader = function(meta, recordType){
    meta = meta || {};

    // default idProperty, successProperty & totalProperty -> "id", "success", "total"
    Ext.applyIf(meta, {
        idProperty: 'id',
        successProperty: 'success',
        totalProperty: 'total'
    });

    Ext.data.JsonReader.superclass.constructor.call(this, meta, recordType || meta.fields);
};
Ext.extend(Ext.data.JsonReader, Ext.data.DataReader, {
    /**
     * This JsonReader's metadata as passed to the constructor, or as passed in
     * the last data packet's <b><tt>metaData</tt></b> property.
     * @type Mixed
     * @property meta
     */
    /**
     * This method is only used by a DataProxy which has retrieved data from a remote server.
     * @param {Object} response The XHR object which contains the JSON data in its responseText.
     * @return {Object} data A data block which is used by an Ext.data.Store object as
     * a cache of Ext.data.Records.
     */
    read : function(response){
        var json = response.responseText;
        var o = Ext.decode(json);
        if(!o) {
            throw {message: "JsonReader.read: Json object not found"};
        }
        return this.readRecords(o);
    },

    // private function a store will implement
    onMetaChange : function(meta, recordType, o){

    },

    /**
     * @ignore
     */
    simpleAccess: function(obj, subsc) {
        return obj[subsc];
    },

    /**
     * @ignore
     */
    getJsonAccessor: function(){
        var re = /[\[\.]/;
        return function(expr) {
            try {
                return(re.test(expr)) ?
                new Function("obj", "return obj." + expr) :
                function(obj){
                    return obj[expr];
                };
            } catch(e){}
            return Ext.emptyFn;
        };
    }(),

    /**
     * Create a data block containing Ext.data.Records from a JSON object.
     * @param {Object} o An object which contains an Array of row objects in the property specified
     * in the config as 'root, and optionally a property, specified in the config as 'totalProperty'
     * which contains the total size of the dataset.
     * @return {Object} data A data block which is used by an Ext.data.Store object as
     * a cache of Ext.data.Records.
     */
    readRecords : function(o){
        /**
         * After any data loads, the raw JSON data is available for further custom processing.  If no data is
         * loaded or there is a load exception this property will be undefined.
         * @type Object
         */
        this.jsonData = o;
        if(o.metaData){
            delete this.ef;
            this.meta = o.metaData;
            this.recordType = Ext.data.Record.create(o.metaData.fields);
            this.onMetaChange(this.meta, this.recordType, o);
        }
        var s = this.meta, Record = this.recordType,
            f = Record.prototype.fields, fi = f.items, fl = f.length, v;

        // Generate extraction functions for the totalProperty, the root, the id, and for each field
        this.buildExtractors();
        var root = this.getRoot(o), c = root.length, totalRecords = c, success = true;
        if(s.totalProperty){
            v = parseInt(this.getTotal(o), 10);
            if(!isNaN(v)){
                totalRecords = v;
            }
        }
        if(s.successProperty){
            v = this.getSuccess(o);
            if(v === false || v === 'false'){
                success = false;
            }
        }

        var records = [];
        for(var i = 0; i < c; i++){
            var n = root[i];
            var record = new Record(this.extractValues(n, fi, fl), this.getId(n));
            record.json = n;
            records[i] = record;
        }
        return {
            success : success,
            records : records,
            totalRecords : totalRecords
        };
    },

    // private
    buildExtractors : function() {
        if(this.ef){
            return;
        }
        var s = this.meta, Record = this.recordType,
            f = Record.prototype.fields, fi = f.items, fl = f.length;

        if(s.totalProperty) {
            this.getTotal = this.getJsonAccessor(s.totalProperty);
        }
        if(s.successProperty) {
            this.getSuccess = this.getJsonAccessor(s.successProperty);
        }
        this.getRoot = s.root ? this.getJsonAccessor(s.root) : function(p){return p;};
        if (s.id || s.idProperty) {
            var g = this.getJsonAccessor(s.id || s.idProperty);
            this.getId = function(rec) {
                var r = g(rec);
                return (r === undefined || r === "") ? null : r;
            };
        } else {
            this.getId = function(){return null;};
        }
        var ef = [];
        for(var i = 0; i < fl; i++){
            f = fi[i];
            var map = (f.mapping !== undefined && f.mapping !== null) ? f.mapping : f.name;
            ef.push(this.getJsonAccessor(map));
        }
        this.ef = ef;
    },

    // private extractValues
    extractValues: function(data, items, len) {
        var f, values = {};
        for(var j = 0; j < len; j++){
            f = items[j];
            var v = this.ef[j](data);
            values[f.name] = f.convert((v !== undefined) ? v : f.defaultValue, data);
        }
        return values;
    },

    /**
     * Decode a json response from server.
     * @param {String} action [Ext.data.Api.actions.create|read|update|destroy]
     * @param {Object} response
     */
    readResponse : function(action, response) {
        var o = (response.responseText !== undefined) ? Ext.decode(response.responseText) : response;
        if(!o) {
            throw new Ext.data.JsonReader.Error('response');
        }
        if (Ext.isEmpty(o[this.meta.successProperty])) {
            throw new Ext.data.JsonReader.Error('successProperty-response', this.meta.successProperty);
        }
        // TODO, separate empty and undefined exceptions.
        if ((action === Ext.data.Api.actions.create || action === Ext.data.Api.actions.update)) {
            if (Ext.isEmpty(o[this.meta.root])) {
                throw new Ext.data.JsonReader.Error('root-emtpy', this.meta.root);
            }
            else if (o[this.meta.root] === undefined) {
                throw new Ext.data.JsonReader.Error('root-undefined-response', this.meta.root);
            }
        }
        // make sure extraction functions are defined.
        this.ef = this.buildExtractors();
        return o;
    }
});

/**
 * @class Ext.data.JsonReader.Error
 * Error class for JsonReader
 */
Ext.data.JsonReader.Error = Ext.extend(Ext.Error, {
    constructor : function(message, arg) {
        this.arg = arg;
        Ext.Error.call(this, message);
    },
    name : 'Ext.data.JsonReader'
});
Ext.apply(Ext.data.JsonReader.Error.prototype, {
    lang: {
        'response': "An error occurred while json-decoding your server response",
        'successProperty-response': 'Could not locate your "successProperty" in your server response.  Please review your JsonReader config to ensure the config-property "successProperty" matches the property in your server-response.  See the JsonReader docs.',
        'root-undefined-response': 'Could not locate your "root" property in your server response.  Please review your JsonReader config to ensure the config-property "root" matches the property your server-response.  See the JsonReader docs.',
        'root-undefined-config': 'Your JsonReader was configured without a "root" property.  Please review your JsonReader config and make sure to define the root property.  See the JsonReader docs.',
        'idProperty-undefined' : 'Your JsonReader was configured without an "idProperty"  Please review your JsonReader configuration and ensure the "idProperty" is set (e.g.: "id").  See the JsonReader docs.',
        'root-emtpy': 'Data was expected to be returned by the server in the "root" property of the response.  Please review your JsonReader configuration to ensure the "root" property matches that returned in the server-response.  See JsonReader docs.'
    }
});
/**
 * @class Ext.data.ArrayReader
 * @extends Ext.data.JsonReader
 * <p>Data reader class to create an Array of {@link Ext.data.Record} objects from an Array.
 * Each element of that Array represents a row of data fields. The
 * fields are pulled into a Record object using as a subscript, the <code>mapping</code> property
 * of the field definition if it exists, or the field's ordinal position in the definition.</p>
 * <p>Example code:</p>
 * <pre><code>
var Employee = Ext.data.Record.create([
    {name: 'name', mapping: 1},         // "mapping" only needed if an "id" field is present which
    {name: 'occupation', mapping: 2}    // precludes using the ordinal position as the index.
]);
var myReader = new Ext.data.ArrayReader({
    {@link #idIndex}: 0
}, Employee);
</code></pre>
 * <p>This would consume an Array like this:</p>
 * <pre><code>
[ [1, 'Bill', 'Gardener'], [2, 'Ben', 'Horticulturalist'] ]
 * </code></pre>
 * @constructor
 * Create a new ArrayReader
 * @param {Object} meta Metadata configuration options.
 * @param {Array/Object} recordType
 * <p>Either an Array of {@link Ext.data.Field Field} definition objects (which
 * will be passed to {@link Ext.data.Record#create}, or a {@link Ext.data.Record Record}
 * constructor created from {@link Ext.data.Record#create}.</p>
 */
Ext.data.ArrayReader = Ext.extend(Ext.data.JsonReader, {
    /**
     * @cfg {String} successProperty
     * @hide
     */
    /**
     * @cfg {Number} id (optional) The subscript within row Array that provides an ID for the Record.
     * Deprecated. Use {@link #idIndex} instead.
     */
    /**
     * @cfg {Number} idIndex (optional) The subscript within row Array that provides an ID for the Record.
     */
    /**
     * Create a data block containing Ext.data.Records from an Array.
     * @param {Object} o An Array of row objects which represents the dataset.
     * @return {Object} data A data block which is used by an Ext.data.Store object as
     * a cache of Ext.data.Records.
     */
    readRecords : function(o){
        this.arrayData = o;
        var s = this.meta,
            sid = s ? Ext.num(s.idIndex, s.id) : null,
            recordType = this.recordType, 
            fields = recordType.prototype.fields,
            records = [],
            v;

        if(!this.getRoot) {
            this.getRoot = s.root ? this.getJsonAccessor(s.root) : function(p) {return p;};
            if(s.totalProperty) {
                this.getTotal = this.getJsonAccessor(s.totalProperty);
            }
        }

        var root = this.getRoot(o);

        for(var i = 0; i < root.length; i++) {
            var n = root[i];
            var values = {};
            var id = ((sid || sid === 0) && n[sid] !== undefined && n[sid] !== "" ? n[sid] : null);
            for(var j = 0, jlen = fields.length; j < jlen; j++) {
                var f = fields.items[j];
                var k = f.mapping !== undefined && f.mapping !== null ? f.mapping : j;
                v = n[k] !== undefined ? n[k] : f.defaultValue;
                v = f.convert(v, n);
                values[f.name] = v;
            }
            var record = new recordType(values, id);
            record.json = n;
            records[records.length] = record;
        }

        var totalRecords = records.length;

        if(s.totalProperty) {
            v = parseInt(this.getTotal(o), 10);
            if(!isNaN(v)) {
                totalRecords = v;
            }
        }

        return {
            records : records,
            totalRecords : totalRecords
        };
    }
});/**
 * @class Ext.data.ArrayStore
 * @extends Ext.data.Store
 * <p>Formerly known as "SimpleStore".</p>
 * <p>Small helper class to make creating {@link Ext.data.Store}s from Array data easier.
 * An ArrayStore will be automatically configured with a {@link Ext.data.ArrayReader}.</p>
 * <p>A store configuration would be something like:<pre><code>
var store = new Ext.data.ArrayStore({
    // store configs
    autoDestroy: true,
    storeId: 'myStore',
    // reader configs
    idIndex: 0,  
    fields: [
       'company',
       {name: 'price', type: 'float'},
       {name: 'change', type: 'float'},
       {name: 'pctChange', type: 'float'},
       {name: 'lastChange', type: 'date', dateFormat: 'n/j h:ia'}
    ]
});
 * </code></pre></p>
 * <p>This store is configured to consume a returned object of the form:<pre><code>
var myData = [
    ['3m Co',71.72,0.02,0.03,'9/1 12:00am'],
    ['Alcoa Inc',29.01,0.42,1.47,'9/1 12:00am'],
    ['Boeing Co.',75.43,0.53,0.71,'9/1 12:00am'],
    ['Hewlett-Packard Co.',36.53,-0.03,-0.08,'9/1 12:00am'],
    ['Wal-Mart Stores, Inc.',45.45,0.73,1.63,'9/1 12:00am']
];
 * </code></pre>
 * An object literal of this form could also be used as the {@link #data} config option.</p>
 * <p><b>*Note:</b> Although not listed here, this class accepts all of the configuration options of 
 * <b>{@link Ext.data.ArrayReader ArrayReader}</b>.</p>
 * @constructor
 * @param {Object} config
 * @xtype arraystore
 */
Ext.data.ArrayStore = Ext.extend(Ext.data.Store, {
    /**
     * @cfg {Ext.data.DataReader} reader @hide
     */
    constructor: function(config){
        Ext.data.ArrayStore.superclass.constructor.call(this, Ext.apply(config, {
            reader: new Ext.data.ArrayReader(config)
        }));
    },

    loadData : function(data, append){
        if(this.expandData === true){
            var r = [];
            for(var i = 0, len = data.length; i < len; i++){
                r[r.length] = [data[i]];
            }
            data = r;
        }
        Ext.data.ArrayStore.superclass.loadData.call(this, data, append);
    }
});
Ext.reg('arraystore', Ext.data.ArrayStore);

// backwards compat
Ext.data.SimpleStore = Ext.data.ArrayStore;
Ext.reg('simplestore', Ext.data.SimpleStore);/**
 * @class Ext.data.JsonStore
 * @extends Ext.data.Store
 * <p>Small helper class to make creating {@link Ext.data.Store}s from JSON data easier.
 * A JsonStore will be automatically configured with a {@link Ext.data.JsonReader}.</p>
 * <p>A store configuration would be something like:<pre><code>
var store = new Ext.data.JsonStore({
    // store configs
    autoDestroy: true,
    url: 'get-images.php',
    storeId: 'myStore',
    // reader configs
    root: 'images',
    idProperty: 'name',  
    fields: ['name', 'url', {name:'size', type: 'float'}, {name:'lastmod', type:'date'}]
});
 * </code></pre></p>
 * <p>This store is configured to consume a returned object of the form:<pre><code>
{
    images: [
        {name: 'Image one', url:'/GetImage.php?id=1', size:46.5, lastmod: new Date(2007, 10, 29)},
        {name: 'Image Two', url:'/GetImage.php?id=2', size:43.2, lastmod: new Date(2007, 10, 30)}
    ]
}
 * </code></pre>
 * An object literal of this form could also be used as the {@link #data} config option.</p>
 * <p><b>*Note:</b> Although not listed here, this class accepts all of the configuration options of 
 * <b>{@link Ext.data.JsonReader JsonReader}</b>.</p>
 * @constructor
 * @param {Object} config
 * @xtype jsonstore
 */
Ext.data.JsonStore = Ext.extend(Ext.data.Store, {
    /**
     * @cfg {Ext.data.DataReader} reader @hide
     */
    constructor: function(config){
        Ext.data.JsonStore.superclass.constructor.call(this, Ext.apply(config, {
            reader: new Ext.data.JsonReader(config)
        }));
    }
});
Ext.reg('jsonstore', Ext.data.JsonStore);