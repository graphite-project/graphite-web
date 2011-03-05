/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
/**
 * @class Ext.data.JsonWriter
 * @extends Ext.data.DataWriter
 * DataWriter extension for writing an array or single {@link Ext.data.Record} object(s) in preparation for executing a remote CRUD action.
 */
Ext.data.JsonWriter = Ext.extend(Ext.data.DataWriter, {
    /**
     * @cfg {Boolean} encode <p><tt>true</tt> to {@link Ext.util.JSON#encode JSON encode} the
     * {@link Ext.data.DataWriter#toHash hashed data} into a standard HTTP parameter named after this
     * Reader's <code>meta.root</code> property which, by default is imported from the associated Reader. Defaults to <tt>true</tt>.</p>
     * <p>If set to <code>false</code>, the hashed data is {@link Ext.util.JSON#encode JSON encoded}, along with
     * the associated {@link Ext.data.Store}'s {@link Ext.data.Store#baseParams baseParams}, into the POST body.</p>
     * <p>When using {@link Ext.data.DirectProxy}, set this to <tt>false</tt> since Ext.Direct.JsonProvider will perform
     * its own json-encoding.  In addition, if you're using {@link Ext.data.HttpProxy}, setting to <tt>false</tt>
     * will cause HttpProxy to transmit data using the <b>jsonData</b> configuration-params of {@link Ext.Ajax#request}
     * instead of <b>params</b>.</p>
     * <p>When using a {@link Ext.data.Store#restful} Store, some serverside frameworks are
     * tuned to expect data through the jsonData mechanism.  In those cases, one will want to set <b>encode: <tt>false</tt></b>, as in
     * let the lower-level connection object (eg: Ext.Ajax) do the encoding.</p>
     */
    encode : true,
    /**
     * @cfg {Boolean} encodeDelete False to send only the id to the server on delete, true to encode it in an object
     * literal, eg: <pre><code>
{id: 1}
 * </code></pre> Defaults to <tt>false</tt>
     */
    encodeDelete: false,
    
    constructor : function(config){
        Ext.data.JsonWriter.superclass.constructor.call(this, config);    
    },

    /**
     * <p>This method should not need to be called by application code, however it may be useful on occasion to
     * override it, or augment it with an {@link Function#createInterceptor interceptor} or {@link Function#createSequence sequence}.</p>
     * <p>The provided implementation encodes the serialized data representing the Store's modified Records into the Ajax request's
     * <code>params</code> according to the <code>{@link #encode}</code> setting.</p>
     * @param {Object} Ajax request params object to write into.
     * @param {Object} baseParams as defined by {@link Ext.data.Store#baseParams}.  The baseParms must be encoded by the extending class, eg: {@link Ext.data.JsonWriter}, {@link Ext.data.XmlWriter}.
     * @param {Object/Object[]} data Data object representing the serialized modified records from the Store. May be either a single object,
     * or an Array of objects - user implementations must handle both cases.
     */
    render : function(params, baseParams, data) {
        if (this.encode === true) {
            // Encode here now.
            Ext.apply(params, baseParams);
            params[this.meta.root] = Ext.encode(data);
        } else {
            // defer encoding for some other layer, probably in {@link Ext.Ajax#request}.  Place everything into "jsonData" key.
            var jdata = Ext.apply({}, baseParams);
            jdata[this.meta.root] = data;
            params.jsonData = jdata;
        }
    },
    /**
     * Implements abstract Ext.data.DataWriter#createRecord
     * @protected
     * @param {Ext.data.Record} rec
     * @return {Object}
     */
    createRecord : function(rec) {
       return this.toHash(rec);
    },
    /**
     * Implements abstract Ext.data.DataWriter#updateRecord
     * @protected
     * @param {Ext.data.Record} rec
     * @return {Object}
     */
    updateRecord : function(rec) {
        return this.toHash(rec);

    },
    /**
     * Implements abstract Ext.data.DataWriter#destroyRecord
     * @protected
     * @param {Ext.data.Record} rec
     * @return {Object}
     */
    destroyRecord : function(rec){
        if(this.encodeDelete){
            var data = {};
            data[this.meta.idProperty] = rec.id;
            return data;
        }else{
            return rec.id;
        }
    }
});/**
 * @class Ext.data.JsonReader
 * @extends Ext.data.DataReader
 * <p>Data reader class to create an Array of {@link Ext.data.Record} objects
 * from a JSON packet based on mappings in a provided {@link Ext.data.Record}
 * constructor.</p>
 * <p>Example code:</p>
 * <pre><code>
var myReader = new Ext.data.JsonReader({
    // metadata configuration options:
    {@link #idProperty}: 'id'
    {@link #root}: 'rows',
    {@link #totalProperty}: 'results',
    {@link Ext.data.DataReader#messageProperty}: "msg"  // The element within the response that provides a user-feedback message (optional)

    // the fields config option will internally create an {@link Ext.data.Record}
    // constructor that provides mapping for reading the record data objects
    {@link Ext.data.DataReader#fields fields}: [
        // map Record&#39;s 'firstname' field to data object&#39;s key of same name
        {name: 'name', mapping: 'firstname'},
        // map Record&#39;s 'job' field to data object&#39;s 'occupation' key
        {name: 'job', mapping: 'occupation'}
    ]
});
</code></pre>
 * <p>This would consume a JSON data object of the form:</p><pre><code>
{
    results: 2000, // Reader&#39;s configured {@link #totalProperty}
    rows: [        // Reader&#39;s configured {@link #root}
        // record data objects:
        { {@link #idProperty id}: 1, firstname: 'Bill', occupation: 'Gardener' },
        { {@link #idProperty id}: 2, firstname: 'Ben' , occupation: 'Horticulturalist' },
        ...
    ]
}
</code></pre>
 * <p><b><u>Automatic configuration using metaData</u></b></p>
 * <p>It is possible to change a JsonReader's metadata at any time by including
 * a <b><tt>metaData</tt></b> property in the JSON data object. If the JSON data
 * object has a <b><tt>metaData</tt></b> property, a {@link Ext.data.Store Store}
 * object using this Reader will reconfigure itself to use the newly provided
 * field definition and fire its {@link Ext.data.Store#metachange metachange}
 * event. The metachange event handler may interrogate the <b><tt>metaData</tt></b>
 * property to perform any configuration required.</p>
 * <p>Note that reconfiguring a Store potentially invalidates objects which may
 * refer to Fields or Records which no longer exist.</p>
 * <p>To use this facility you would create the JsonReader like this:</p><pre><code>
var myReader = new Ext.data.JsonReader();
</code></pre>
 * <p>The first data packet from the server would configure the reader by
 * containing a <b><tt>metaData</tt></b> property <b>and</b> the data. For
 * example, the JSON data object might take the form:</p><pre><code>
{
    metaData: {
        "{@link #idProperty}": "id",
        "{@link #root}": "rows",
        "{@link #totalProperty}": "results"
        "{@link #successProperty}": "success",
        "{@link Ext.data.DataReader#fields fields}": [
            {"name": "name"},
            {"name": "job", "mapping": "occupation"}
        ],
        // used by store to set its sortInfo
        "sortInfo":{
           "field": "name",
           "direction": "ASC"
        },
        // {@link Ext.PagingToolbar paging data} (if applicable)
        "start": 0,
        "limit": 2,
        // custom property
        "foo": "bar"
    },
    // Reader&#39;s configured {@link #successProperty}
    "success": true,
    // Reader&#39;s configured {@link #totalProperty}
    "results": 2000,
    // Reader&#39;s configured {@link #root}
    // (this data simulates 2 results {@link Ext.PagingToolbar per page})
    "rows": [ // <b>*Note:</b> this must be an Array
        { "id": 1, "name": "Bill", "occupation": "Gardener" },
        { "id": 2, "name":  "Ben", "occupation": "Horticulturalist" }
    ]
}
 * </code></pre>
 * <p>The <b><tt>metaData</tt></b> property in the JSON data object should contain:</p>
 * <div class="mdetail-params"><ul>
 * <li>any of the configuration options for this class</li>
 * <li>a <b><tt>{@link Ext.data.Record#fields fields}</tt></b> property which
 * the JsonReader will use as an argument to the
 * {@link Ext.data.Record#create data Record create method} in order to
 * configure the layout of the Records it will produce.</li>
 * <li>a <b><tt>{@link Ext.data.Store#sortInfo sortInfo}</tt></b> property
 * which the JsonReader will use to set the {@link Ext.data.Store}'s
 * {@link Ext.data.Store#sortInfo sortInfo} property</li>
 * <li>any custom properties needed</li>
 * </ul></div>
 *
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
    /**
     * @cfg {String} idProperty [id] Name of the property within a row object
     * that contains a record identifier value.  Defaults to <tt>id</tt>
     */
    /**
     * @cfg {String} successProperty [success] Name of the property from which to
     * retrieve the success attribute. Defaults to <tt>success</tt>.  See
     * {@link Ext.data.DataProxy}.{@link Ext.data.DataProxy#exception exception}
     * for additional information.
     */
    /**
     * @cfg {String} totalProperty [total] Name of the property from which to
     * retrieve the total number of records in the dataset. This is only needed
     * if the whole dataset is not passed in one go, but is being paged from
     * the remote server.  Defaults to <tt>total</tt>.
     */
    /**
     * @cfg {String} root [undefined] <b>Required</b>.  The name of the property
     * which contains the Array of row objects.  Defaults to <tt>undefined</tt>.
     * An exception will be thrown if the root property is undefined. The data
     * packet value for this property should be an empty array to clear the data
     * or show no data.
     */
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
            throw {message: 'JsonReader.read: Json object not found'};
        }
        return this.readRecords(o);
    },

    /*
     * TODO: refactor code between JsonReader#readRecords, #readResponse into 1 method.
     * there's ugly duplication going on due to maintaining backwards compat. with 2.0.  It's time to do this.
     */
    /**
     * Decode a JSON response from server.
     * @param {String} action [Ext.data.Api.actions.create|read|update|destroy]
     * @param {Object} response The XHR object returned through an Ajax server request.
     * @return {Response} A {@link Ext.data.Response Response} object containing the data response, and also status information.
     */
    readResponse : function(action, response) {
        var o = (response.responseText !== undefined) ? Ext.decode(response.responseText) : response;
        if(!o) {
            throw new Ext.data.JsonReader.Error('response');
        }

        var root = this.getRoot(o);
        if (action === Ext.data.Api.actions.create) {
            var def = Ext.isDefined(root);
            if (def && Ext.isEmpty(root)) {
                throw new Ext.data.JsonReader.Error('root-empty', this.meta.root);
            }
            else if (!def) {
                throw new Ext.data.JsonReader.Error('root-undefined-response', this.meta.root);
            }
        }

        // instantiate response object
        var res = new Ext.data.Response({
            action: action,
            success: this.getSuccess(o),
            data: (root) ? this.extractData(root, false) : [],
            message: this.getMessage(o),
            raw: o
        });

        // blow up if no successProperty
        if (Ext.isEmpty(res.success)) {
            throw new Ext.data.JsonReader.Error('successProperty-response', this.meta.successProperty);
        }
        return res;
    },

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
            this.onMetaChange(o.metaData);
        }
        var s = this.meta, Record = this.recordType,
            f = Record.prototype.fields, fi = f.items, fl = f.length, v;

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

        // TODO return Ext.data.Response instance instead.  @see #readResponse
        return {
            success : success,
            records : this.extractData(root, true), // <-- true to return [Ext.data.Record]
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
            this.getTotal = this.createAccessor(s.totalProperty);
        }
        if(s.successProperty) {
            this.getSuccess = this.createAccessor(s.successProperty);
        }
        if (s.messageProperty) {
            this.getMessage = this.createAccessor(s.messageProperty);
        }
        this.getRoot = s.root ? this.createAccessor(s.root) : function(p){return p;};
        if (s.id || s.idProperty) {
            var g = this.createAccessor(s.id || s.idProperty);
            this.getId = function(rec) {
                var r = g(rec);
                return (r === undefined || r === '') ? null : r;
            };
        } else {
            this.getId = function(){return null;};
        }
        var ef = [];
        for(var i = 0; i < fl; i++){
            f = fi[i];
            var map = (f.mapping !== undefined && f.mapping !== null) ? f.mapping : f.name;
            ef.push(this.createAccessor(map));
        }
        this.ef = ef;
    },

    /**
     * @ignore
     * TODO This isn't used anywhere??  Don't we want to use this where possible instead of complex #createAccessor?
     */
    simpleAccess : function(obj, subsc) {
        return obj[subsc];
    },

    /**
     * @ignore
     */
    createAccessor : function(){
        var re = /[\[\.]/;
        return function(expr) {
            if(Ext.isEmpty(expr)){
                return Ext.emptyFn;
            }
            if(Ext.isFunction(expr)){
                return expr;
            }
            var i = String(expr).search(re);
            if(i >= 0){
                return new Function('obj', 'return obj' + (i > 0 ? '.' : '') + expr);
            }
            return function(obj){
                return obj[expr];
            };

        };
    }(),

    /**
     * type-casts a single row of raw-data from server
     * @param {Object} data
     * @param {Array} items
     * @param {Integer} len
     * @private
     */
    extractValues : function(data, items, len) {
        var f, values = {};
        for(var j = 0; j < len; j++){
            f = items[j];
            var v = this.ef[j](data);
            values[f.name] = f.convert((v !== undefined) ? v : f.defaultValue, data);
        }
        return values;
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
        'response': 'An error occurred while json-decoding your server response',
        'successProperty-response': 'Could not locate your "successProperty" in your server response.  Please review your JsonReader config to ensure the config-property "successProperty" matches the property in your server-response.  See the JsonReader docs.',
        'root-undefined-config': 'Your JsonReader was configured without a "root" property.  Please review your JsonReader config and make sure to define the root property.  See the JsonReader docs.',
        'idProperty-undefined' : 'Your JsonReader was configured without an "idProperty"  Please review your JsonReader configuration and ensure the "idProperty" is set (e.g.: "id").  See the JsonReader docs.',
        'root-empty': 'Data was expected to be returned by the server in the "root" property of the response.  Please review your JsonReader configuration to ensure the "root" property matches that returned in the server-response.  See JsonReader docs.'
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
            success = true,
            v;

        var root = this.getRoot(o);

        for(var i = 0, len = root.length; i < len; i++) {
            var n = root[i],
                values = {},
                id = ((sid || sid === 0) && n[sid] !== undefined && n[sid] !== "" ? n[sid] : null);
            for(var j = 0, jlen = fields.length; j < jlen; j++) {
                var f = fields.items[j],
                    k = f.mapping !== undefined && f.mapping !== null ? f.mapping : j;
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
        if(s.successProperty){
            v = this.getSuccess(o);
            if(v === false || v === 'false'){
                success = false;
            }
        }

        return {
            success : success,
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