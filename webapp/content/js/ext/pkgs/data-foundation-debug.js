/*!
 * Ext JS Library 3.0.0
 * Copyright(c) 2006-2009 Ext JS, LLC
 * licensing@extjs.com
 * http://www.extjs.com/license
 */
/**
 * @class Ext.data.Api
 * @extends Object
 * Ext.data.Api is a singleton designed to manage the data API including methods
 * for validating a developer's DataProxy API.  Defines variables for CRUD actions
 * create, read, update and destroy in addition to a mapping of RESTful HTTP methods
 * GET, POST, PUT and DELETE to CRUD actions.
 * @singleton
 */
Ext.data.Api = (function() {

    // private validActions.  validActions is essentially an inverted hash of Ext.data.Api.actions, where value becomes the key.
    // Some methods in this singleton (e.g.: getActions, getVerb) will loop through actions with the code <code>for (var verb in this.actions)</code>
    // For efficiency, some methods will first check this hash for a match.  Those methods which do acces validActions will cache their result here.
    // We cannot pre-define this hash since the developer may over-ride the actions at runtime.
    var validActions = {};

    return {
        /**
         * Defined actions corresponding to remote actions:
         * <pre><code>
actions: {
    create  : 'create',  // Text representing the remote-action to create records on server.
    read    : 'read',    // Text representing the remote-action to read/load data from server.
    update  : 'update',  // Text representing the remote-action to update records on server.
    destroy : 'destroy'  // Text representing the remote-action to destroy records on server.
}
         * </code></pre>
         * @property actions
         * @type Object
         */
        actions : {
            create  : 'create',
            read    : 'read',
            update  : 'update',
            destroy : 'destroy'
        },

        /**
         * Defined {CRUD action}:{HTTP method} pairs to associate HTTP methods with the
         * corresponding actions for {@link Ext.data.DataProxy#restful RESTful proxies}.
         * Defaults to:
         * <pre><code>
restActions : {
    create  : 'POST',
    read    : 'GET',
    update  : 'PUT',
    destroy : 'DELETE'
},
         * </code></pre>
         */
        restActions : {
            create  : 'POST',
            read    : 'GET',
            update  : 'PUT',
            destroy : 'DELETE'
        },

        /**
         * Returns true if supplied action-name is a valid API action defined in <code>{@link #actions}</code> constants
         * @param {String} action
         * @param {String[]}(Optional) List of available CRUD actions.  Pass in list when executing multiple times for efficiency.
         * @return {Boolean}
         */
        isAction : function(action) {
            return (Ext.data.Api.actions[action]) ? true : false;
        },

        /**
         * Returns the actual CRUD action KEY "create", "read", "update" or "destroy" from the supplied action-name.  This method is used internally and shouldn't generally
         * need to be used directly.  The key/value pair of Ext.data.Api.actions will often be identical but this is not necessarily true.  A developer can override this naming
         * convention if desired.  However, the framework internally calls methods based upon the KEY so a way of retreiving the the words "create", "read", "update" and "destroy" is
         * required.  This method will cache discovered KEYS into the private validActions hash.
         * @param {String} name The runtime name of the action.
         * @return {String||null} returns the action-key, or verb of the user-action or null if invalid.
         * @nodoc
         */
        getVerb : function(name) {
            if (validActions[name]) {
                return validActions[name];  // <-- found in cache.  return immediately.
            }
            for (var verb in this.actions) {
                if (this.actions[verb] === name) {
                    validActions[name] = verb;
                    break;
                }
            }
            return (validActions[name] !== undefined) ? validActions[name] : null;
        },

        /**
         * Returns true if the supplied API is valid; that is, check that all keys match defined actions
         * otherwise returns an array of mistakes.
         * @return {String[]||true}
         */
        isValid : function(api){
            var invalid = [];
            var crud = this.actions; // <-- cache a copy of the actions.
            for (var action in api) {
                if (!(action in crud)) {
                    invalid.push(action);
                }
            }
            return (!invalid.length) ? true : invalid;
        },

        /**
         * Returns true if the supplied verb upon the supplied proxy points to a unique url in that none of the other api-actions
         * point to the same url.  The question is important for deciding whether to insert the "xaction" HTTP parameter within an
         * Ajax request.  This method is used internally and shouldn't generally need to be called directly.
         * @param {Ext.data.DataProxy} proxy
         * @param {String} verb
         * @return {Boolean}
         */
        hasUniqueUrl : function(proxy, verb) {
            var url = (proxy.api[verb]) ? proxy.api[verb].url : null;
            var unique = true;
            for (var action in proxy.api) {
                if ((unique = (action === verb) ? true : (proxy.api[action].url != url) ? true : false) === false) {
                    break;
                }
            }
            return unique;
        },

        /**
         * This method is used internally by <tt>{@link Ext.data.DataProxy DataProxy}</tt> and should not generally need to be used directly.
         * Each action of a DataProxy api can be initially defined as either a String or an Object.  When specified as an object,
         * one can explicitly define the HTTP method (GET|POST) to use for each CRUD action.  This method will prepare the supplied API, setting
         * each action to the Object form.  If your API-actions do not explicitly define the HTTP method, the "method" configuration-parameter will
         * be used.  If the method configuration parameter is not specified, POST will be used.
         <pre><code>
new Ext.data.HttpProxy({
    method: "POST",     // <-- default HTTP method when not specified.
    api: {
        create: 'create.php',
        load: 'read.php',
        save: 'save.php',
        destroy: 'destroy.php'
    }
});

// Alternatively, one can use the object-form to specify the API
new Ext.data.HttpProxy({
    api: {
        load: {url: 'read.php', method: 'GET'},
        create: 'create.php',
        destroy: 'destroy.php',
        save: 'update.php'
    }
});
        </code></pre>
         *
         * @param {Ext.data.DataProxy} proxy
         */
        prepare : function(proxy) {
            if (!proxy.api) {
                proxy.api = {}; // <-- No api?  create a blank one.
            }
            for (var verb in this.actions) {
                var action = this.actions[verb];
                proxy.api[action] = proxy.api[action] || proxy.url || proxy.directFn;
                if (typeof(proxy.api[action]) == 'string') {
                    proxy.api[action] = {
                        url: proxy.api[action]
                    };
                }
            }
        },

        /**
         * Prepares a supplied Proxy to be RESTful.  Sets the HTTP method for each api-action to be one of
         * GET, POST, PUT, DELETE according to the defined {@link #restActions}.
         * @param {Ext.data.DataProxy} proxy
         */
        restify : function(proxy) {
            proxy.restful = true;
            for (var verb in this.restActions) {
                proxy.api[this.actions[verb]].method = this.restActions[verb];
            }
        }
    };
})();

/**
 * @class Ext.data.Api.Error
 * @extends Ext.Error
 * Error class for Ext.data.Api errors
 */
Ext.data.Api.Error = Ext.extend(Ext.Error, {
    constructor : function(message, arg) {
        this.arg = arg;
        Ext.Error.call(this, message);
    },
    name: 'Ext.data.Api'
});
Ext.apply(Ext.data.Api.Error.prototype, {
    lang: {
        'action-url-undefined': 'No fallback url defined for this action.  When defining a DataProxy api, please be sure to define an url for each CRUD action in Ext.data.Api.actions or define a default url in addition to your api-configuration.',
        'invalid': 'received an invalid API-configuration.  Please ensure your proxy API-configuration contains only the actions defined in Ext.data.Api.actions',
        'invalid-url': 'Invalid url.  Please review your proxy configuration.',
        'execute': 'Attempted to execute an unknown action.  Valid API actions are defined in Ext.data.Api.actions"'
    }
});

/**
 * @class Ext.data.SortTypes
 * @singleton
 * Defines the default sorting (casting?) comparison functions used when sorting data.
 */
Ext.data.SortTypes = {
    /**
     * Default sort that does nothing
     * @param {Mixed} s The value being converted
     * @return {Mixed} The comparison value
     */
    none : function(s){
        return s;
    },
    
    /**
     * The regular expression used to strip tags
     * @type {RegExp}
     * @property
     */
    stripTagsRE : /<\/?[^>]+>/gi,
    
    /**
     * Strips all HTML tags to sort on text only
     * @param {Mixed} s The value being converted
     * @return {String} The comparison value
     */
    asText : function(s){
        return String(s).replace(this.stripTagsRE, "");
    },
    
    /**
     * Strips all HTML tags to sort on text only - Case insensitive
     * @param {Mixed} s The value being converted
     * @return {String} The comparison value
     */
    asUCText : function(s){
        return String(s).toUpperCase().replace(this.stripTagsRE, "");
    },
    
    /**
     * Case insensitive string
     * @param {Mixed} s The value being converted
     * @return {String} The comparison value
     */
    asUCString : function(s) {
    	return String(s).toUpperCase();
    },
    
    /**
     * Date sorting
     * @param {Mixed} s The value being converted
     * @return {Number} The comparison value
     */
    asDate : function(s) {
        if(!s){
            return 0;
        }
        if(Ext.isDate(s)){
            return s.getTime();
        }
    	return Date.parse(String(s));
    },
    
    /**
     * Float sorting
     * @param {Mixed} s The value being converted
     * @return {Float} The comparison value
     */
    asFloat : function(s) {
    	var val = parseFloat(String(s).replace(/,/g, ""));
    	return isNaN(val) ? 0 : val;
    },
    
    /**
     * Integer sorting
     * @param {Mixed} s The value being converted
     * @return {Number} The comparison value
     */
    asInt : function(s) {
        var val = parseInt(String(s).replace(/,/g, ""), 10);
        return isNaN(val) ? 0 : val;
    }
};/**
 * @class Ext.data.Record
 * <p>Instances of this class encapsulate both Record <em>definition</em> information, and Record
 * <em>value</em> information for use in {@link Ext.data.Store} objects, or any code which needs
 * to access Records cached in an {@link Ext.data.Store} object.</p>
 * <p>Constructors for this class are generated by passing an Array of field definition objects to {@link #create}.
 * Instances are usually only created by {@link Ext.data.Reader} implementations when processing unformatted data
 * objects.</p>
 * <p>Note that an instance of a Record class may only belong to one {@link Ext.data.Store Store} at a time.
 * In order to copy data from one Store to another, use the {@link #copy} method to create an exact
 * copy of the Record, and insert the new instance into the other Store.</p>
 * <p>When serializing a Record for submission to the server, be aware that it contains many private
 * properties, and also a reference to its owning Store which in turn holds references to its Records.
 * This means that a whole Record may not be encoded using {@link Ext.util.JSON.encode}. Instead, use the
 * <code>{@link #data}</code> and <code>{@link #id}</code> properties.</p>
 * <p>Record objects generated by this constructor inherit all the methods of Ext.data.Record listed below.</p>
 * @constructor
 * This constructor should not be used to create Record objects. Instead, use {@link #create} to
 * generate a subclass of Ext.data.Record configured with information about its constituent fields.
 * @param {Object} data (Optional) An object, the properties of which provide values for the new Record's
 * fields. If not specified the <code>{@link Ext.data.Field#defaultValue defaultValue}</code>
 * for each field will be assigned.
 * @param {Object} id (Optional) The id of the Record. This id should be unique, and is used by the
 * {@link Ext.data.Store} object which owns the Record to index its collection of Records. If
 * an <code>id</code> is not specified a <b><code>{@link #phantom}</code></b> Record will be created
 * with an {@link #Record.id automatically generated id}.
 */
Ext.data.Record = function(data, id){
    // if no id, call the auto id method
    this.id = (id || id === 0) ? id : Ext.data.Record.id(this);
    this.data = data || {};
};

/**
 * Generate a constructor for a specific Record layout.
 * @param {Array} o An Array of <b>{@link Ext.data.Field Field}</b> definition objects.
 * The constructor generated by this method may be used to create new Record instances. The data
 * object must contain properties named after the {@link Ext.data.Field field}
 * <b><tt>{@link Ext.data.Field#name}s</tt></b>.  Example usage:<pre><code>
// create a Record constructor from a description of the fields
var TopicRecord = Ext.data.Record.create([ // creates a subclass of Ext.data.Record
    {{@link Ext.data.Field#name name}: 'title', {@link Ext.data.Field#mapping mapping}: 'topic_title'},
    {name: 'author', mapping: 'username', allowBlank: false},
    {name: 'totalPosts', mapping: 'topic_replies', type: 'int'},
    {name: 'lastPost', mapping: 'post_time', type: 'date'},
    {name: 'lastPoster', mapping: 'user2'},
    {name: 'excerpt', mapping: 'post_text', allowBlank: false},
    // In the simplest case, if no properties other than <tt>name</tt> are required,
    // a field definition may consist of just a String for the field name.
    'signature'
]);

// create Record instance
var myNewRecord = new TopicRecord(
    {
        title: 'Do my job please',
        author: 'noobie',
        totalPosts: 1,
        lastPost: new Date(),
        lastPoster: 'Animal',
        excerpt: 'No way dude!',
        signature: ''
    },
    id // optionally specify the id of the record otherwise {@link #Record.id one is auto-assigned}
);
myStore.{@link Ext.data.Store#add add}(myNewRecord);
</code></pre>
 * @method create
 * @return {function} A constructor which is used to create new Records according
 * to the definition. The constructor has the same signature as {@link #Ext.data.Record}.
 * @static
 */
Ext.data.Record.create = function(o){
    var f = Ext.extend(Ext.data.Record, {});
    var p = f.prototype;
    p.fields = new Ext.util.MixedCollection(false, function(field){
        return field.name;
    });
    for(var i = 0, len = o.length; i < len; i++){
        p.fields.add(new Ext.data.Field(o[i]));
    }
    f.getField = function(name){
        return p.fields.get(name);
    };
    return f;
};

Ext.data.Record.PREFIX = 'ext-record';
Ext.data.Record.AUTO_ID = 1;
Ext.data.Record.EDIT = 'edit';
Ext.data.Record.REJECT = 'reject';
Ext.data.Record.COMMIT = 'commit';


/**
 * Generates a sequential id. This method is typically called when a record is {@link #create}d
 * and {@link #Record no id has been specified}. The returned id takes the form:
 * <tt>&#123;PREFIX}-&#123;AUTO_ID}</tt>.<div class="mdetail-params"><ul>
 * <li><b><tt>PREFIX</tt></b> : String<p class="sub-desc"><tt>Ext.data.Record.PREFIX</tt>
 * (defaults to <tt>'ext-record'</tt>)</p></li>
 * <li><b><tt>AUTO_ID</tt></b> : String<p class="sub-desc"><tt>Ext.data.Record.AUTO_ID</tt>
 * (defaults to <tt>1</tt> initially)</p></li>
 * </ul></div>
 * @param {Record} rec The record being created.  The record does not exist, it's a {@link #phantom}.
 * @return {String} auto-generated string id, <tt>"ext-record-i++'</tt>;
 */
Ext.data.Record.id = function(rec) {
    rec.phantom = true;
    return [Ext.data.Record.PREFIX, '-', Ext.data.Record.AUTO_ID++].join('');
};

Ext.data.Record.prototype = {
    /**
     * <p><b>This property is stored in the Record definition's <u>prototype</u></b></p>
     * A MixedCollection containing the defined {@link Ext.data.Field Field}s for this Record.  Read-only.
     * @property fields
     * @type Ext.util.MixedCollection
     */
    /**
     * An object hash representing the data for this Record. Every field name in the Record definition
     * is represented by a property of that name in this object. Note that unless you specified a field
     * with {@link Ext.data.Field#name name} "id" in the Record definition, this will <b>not</b> contain
     * an <tt>id</tt> property.
     * @property data
     * @type {Object}
     */
    /**
     * The unique ID of the Record {@link #Record as specified at construction time}.
     * @property id
     * @type {Object}
     */
    /**
     * Readonly flag - true if this Record has been modified.
     * @type Boolean
     */
    dirty : false,
    editing : false,
    error: null,
    /**
     * This object contains a key and value storing the original values of all modified
     * fields or is null if no fields have been modified.
     * @property modified
     * @type {Object}
     */
    modified: null,
    /**
     * <tt>false</tt> when the record does not yet exist in a server-side database (see
     * {@link #markDirty}).  Any record which has a real database pk set as its id property
     * is NOT a phantom -- it's real.
     * @property phantom
     * @type {Boolean}
     */
    phantom : false,

    // private
    join : function(store){
        /**
         * The {@link Ext.data.Store} to which this Record belongs.
         * @property store
         * @type {Ext.data.Store}
         */
        this.store = store;
    },

    /**
     * Set the {@link Ext.data.Field#name named field} to the specified value.  For example:
     * <pre><code>
// record has a field named 'firstname'
var Employee = Ext.data.Record.{@link #create}([
    {name: 'firstname'},
    ...
]);

// update the 2nd record in the store:
var rec = myStore.{@link Ext.data.Store#getAt getAt}(1);

// set the value (shows dirty flag):
rec.set('firstname', 'Betty');

// commit the change (removes dirty flag):
rec.{@link #commit}();

// update the record in the store, bypass setting dirty flag,
// and do not store the change in the {@link Ext.data.Store#getModifiedRecords modified records}
rec.{@link #data}['firstname'] = 'Wilma'); // updates record, but not the view
rec.{@link #commit}(); // updates the view
     * </code></pre>
     * <b>Notes</b>:<div class="mdetail-params"><ul>
     * <li>If the store has a writer and <code>autoSave=true</code>, each set()
     * will execute an XHR to the server.</li>
     * <li>Use <code>{@link #beginEdit}</code> to prevent the store's <code>update</code>
     * event firing while using set().</li>
     * <li>Use <code>{@link #endEdit}</code> to have the store's <code>update</code>
     * event fire.</li>
     * </ul></div>
     * @param {String} name The {@link Ext.data.Field#name name of the field} to set.
     * @param {Object} value The value to set the field to.
     */
    set : function(name, value){
        var isObj = (typeof value === 'object');
        if(!isObj && String(this.data[name]) === String(value)){
            return;
        } else if (isObj && Ext.encode(this.data[name]) === Ext.encode(value)) {
            return;
        }
        this.dirty = true;
        if(!this.modified){
            this.modified = {};
        }
        if(typeof this.modified[name] == 'undefined'){
            this.modified[name] = this.data[name];
        }
        this.data[name] = value;
        if(!this.editing){
            this.afterEdit();
        }
    },

    // private
    afterEdit: function(){
        if(this.store){
            this.store.afterEdit(this);
        }
    },

    // private
    afterReject: function(){
        if(this.store){
            this.store.afterReject(this);
        }
    },

    // private
    afterCommit: function(){
        if(this.store){
            this.store.afterCommit(this);
        }
    },

    /**
     * Get the value of the {@link Ext.data.Field#name named field}.
     * @param {String} name The {@link Ext.data.Field#name name of the field} to get the value of.
     * @return {Object} The value of the field.
     */
    get : function(name){
        return this.data[name];
    },

    /**
     * Begin an edit. While in edit mode, no events (e.g.. the <code>update</code> event)
     * are relayed to the containing store.
     * See also: <code>{@link #endEdit}</code> and <code>{@link #cancelEdit}</code>.
     */
    beginEdit : function(){
        this.editing = true;
        this.modified = this.modified || {};
    },

    /**
     * Cancels all changes made in the current edit operation.
     */
    cancelEdit : function(){
        this.editing = false;
        delete this.modified;
    },

    /**
     * End an edit. If any data was modified, the containing store is notified
     * (ie, the store's <code>update</code> event will fire).
     */
    endEdit : function(){
        this.editing = false;
        if(this.dirty){
            this.afterEdit();
        }
    },

    /**
     * Usually called by the {@link Ext.data.Store} which owns the Record.
     * Rejects all changes made to the Record since either creation, or the last commit operation.
     * Modified fields are reverted to their original values.
     * <p>Developers should subscribe to the {@link Ext.data.Store#update} event
     * to have their code notified of reject operations.</p>
     * @param {Boolean} silent (optional) True to skip notification of the owning
     * store of the change (defaults to false)
     */
    reject : function(silent){
        var m = this.modified;
        for(var n in m){
            if(typeof m[n] != "function"){
                this.data[n] = m[n];
            }
        }
        this.dirty = false;
        delete this.modified;
        this.editing = false;
        if(silent !== true){
            this.afterReject();
        }
    },

    /**
     * Usually called by the {@link Ext.data.Store} which owns the Record.
     * Commits all changes made to the Record since either creation, or the last commit operation.
     * <p>Developers should subscribe to the {@link Ext.data.Store#update} event
     * to have their code notified of commit operations.</p>
     * @param {Boolean} silent (optional) True to skip notification of the owning
     * store of the change (defaults to false)
     */
    commit : function(silent){
        this.dirty = false;
        delete this.modified;
        this.editing = false;
        if(silent !== true){
            this.afterCommit();
        }
    },

    /**
     * Gets a hash of only the fields that have been modified since this Record was created or commited.
     * @return Object
     */
    getChanges : function(){
        var m = this.modified, cs = {};
        for(var n in m){
            if(m.hasOwnProperty(n)){
                cs[n] = this.data[n];
            }
        }
        return cs;
    },

    // private
    hasError : function(){
        return this.error !== null;
    },

    // private
    clearError : function(){
        this.error = null;
    },

    /**
     * Creates a copy of this Record.
     * @param {String} id (optional) A new Record id, defaults to {@link #Record.id autogenerating an id}.
     * Note: if an <code>id</code> is not specified the copy created will be a
     * <code>{@link #phantom}</code> Record.
     * @return {Record}
     */
    copy : function(newId) {
        return new this.constructor(Ext.apply({}, this.data), newId || this.id);
    },

    /**
     * Returns <tt>true</tt> if the passed field name has been <code>{@link #modified}</code>
     * since the load or last commit.
     * @param {String} fieldName {@link Ext.data.Field.{@link Ext.data.Field#name}
     * @return {Boolean}
     */
    isModified : function(fieldName){
        return !!(this.modified && this.modified.hasOwnProperty(fieldName));
    },

    /**
     * By default returns <tt>false</tt> if any {@link Ext.data.Field field} within the
     * record configured with <tt>{@link Ext.data.Field#allowBlank} = false</tt> returns
     * <tt>true</tt> from an {@link Ext}.{@link Ext#isEmpty isempty} test.
     * @return {Boolean}
     */
    isValid : function() {
        return this.fields.find(function(f) {
            return (f.allowBlank === false && Ext.isEmpty(this.data[f.name])) ? true : false;
        },this) ? false : true;
    },

    /**
     * <p>Marks this <b>Record</b> as <code>{@link #dirty}</code>.  This method
     * is used interally when adding <code>{@link #phantom}</code> records to a
     * {@link Ext.data.Store#writer writer enabled store}.</p>
     * <br><p>Marking a record <code>{@link #dirty}</code> causes the phantom to
     * be returned by {@link Ext.data.Store#getModifiedRecords} where it will
     * have a create action composed for it during {@link Ext.data.Store#save store save}
     * operations.</p>
     */
    markDirty : function(){
        this.dirty = true;
        if(!this.modified){
            this.modified = {};
        }
        this.fields.each(function(f) {
            this.modified[f.name] = this.data[f.name];
        },this);
    }
};/**
 * @class Ext.StoreMgr
 * @extends Ext.util.MixedCollection
 * The default global group of stores.
 * @singleton
 */
Ext.StoreMgr = Ext.apply(new Ext.util.MixedCollection(), {
    /**
     * @cfg {Object} listeners @hide
     */

    /**
     * Registers one or more Stores with the StoreMgr. You do not normally need to register stores
     * manually.  Any store initialized with a {@link Ext.data.Store#storeId} will be auto-registered. 
     * @param {Ext.data.Store} store1 A Store instance
     * @param {Ext.data.Store} store2 (optional)
     * @param {Ext.data.Store} etc... (optional)
     */
    register : function(){
        for(var i = 0, s; (s = arguments[i]); i++){
            this.add(s);
        }
    },

    /**
     * Unregisters one or more Stores with the StoreMgr
     * @param {String/Object} id1 The id of the Store, or a Store instance
     * @param {String/Object} id2 (optional)
     * @param {String/Object} etc... (optional)
     */
    unregister : function(){
        for(var i = 0, s; (s = arguments[i]); i++){
            this.remove(this.lookup(s));
        }
    },

    /**
     * Gets a registered Store by id
     * @param {String/Object} id The id of the Store, or a Store instance
     * @return {Ext.data.Store}
     */
    lookup : function(id){
        if(Ext.isArray(id)){
            var fields = ['field1'], expand = !Ext.isArray(id[0]);
            if(!expand){
                for(var i = 2, len = id[0].length; i <= len; ++i){
                    fields.push('field' + i);
                }
            }
            return new Ext.data.ArrayStore({
                fields: fields,
                data: id,
                expandData: expand,
                autoDestroy: true,
                autoCreated: true

            });
        }
        return Ext.isObject(id) ? (id.events ? id : Ext.create(id, 'store')) : this.get(id);
    },

    // getKey implementation for MixedCollection
    getKey : function(o){
         return o.storeId;
    }
});/**
 * @class Ext.data.Store
 * @extends Ext.util.Observable
 * <p>The Store class encapsulates a client side cache of {@link Ext.data.Record Record}
 * objects which provide input data for Components such as the {@link Ext.grid.GridPanel GridPanel},
 * the {@link Ext.form.ComboBox ComboBox}, or the {@link Ext.DataView DataView}.</p>
 * <p><u>Retrieving Data</u></p>
 * <p>A Store object may access a data object using:<div class="mdetail-params"><ul>
 * <li>{@link #proxy configured implementation} of {@link Ext.data.DataProxy DataProxy}</li>
 * <li>{@link #data} to automatically pass in data</li>
 * <li>{@link #loadData} to manually pass in data</li>
 * </ul></div></p>
 * <p><u>Reading Data</u></p>
 * <p>A Store object has no inherent knowledge of the format of the data object (it could be
 * an Array, XML, or JSON). A Store object uses an appropriate {@link #reader configured implementation}
 * of a {@link Ext.data.DataReader DataReader} to create {@link Ext.data.Record Record} instances from the data
 * object.</p>
 * <p><u>Store Types</u></p>
 * <p>There are several implementations of Store available which are customized for use with
 * a specific DataReader implementation.  Here is an example using an ArrayStore which implicitly
 * creates a reader commensurate to an Array data object.</p>
 * <pre><code>
var myStore = new Ext.data.ArrayStore({
    fields: ['fullname', 'first'],
    idIndex: 0 // id for each record will be the first element
});
 * </code></pre>
 * <p>For custom implementations create a basic {@link Ext.data.Store} configured as needed:</p>
 * <pre><code>
// create a {@link Ext.data.Record Record} constructor:
var rt = Ext.data.Record.create([
    {name: 'fullname'},
    {name: 'first'}
]);
var myStore = new Ext.data.Store({
    // explicitly create reader
    reader: new Ext.data.ArrayReader(
        {
            idIndex: 0  // id for each record will be the first element
        },
        rt // recordType
    )
});
 * </code></pre>
 * <p>Load some data into store (note the data object is an array which corresponds to the reader):</p>
 * <pre><code>
var myData = [
    [1, 'Fred Flintstone', 'Fred'],  // note that id for the record is the first element
    [2, 'Barney Rubble', 'Barney']
];
myStore.loadData(myData);
 * </code></pre>
 * <p>Records are cached and made available through accessor functions.  An example of adding
 * a record to the store:</p>
 * <pre><code>
var defaultData = {
    fullname: 'Full Name',
    first: 'First Name'
};
var recId = 100; // provide unique id for the record
var r = new myStore.recordType(defaultData, ++recId); // create new record
myStore.{@link #insert}(0, r); // insert a new record into the store (also see {@link #add})
 * </code></pre>
 * @constructor
 * Creates a new Store.
 * @param {Object} config A config object containing the objects needed for the Store to access data,
 * and read the data into Records.
 * @xtype store
 */
Ext.data.Store = function(config){
    this.data = new Ext.util.MixedCollection(false);
    this.data.getKey = function(o){
        return o.id;
    };
    /**
     * See the <code>{@link #baseParams corresponding configuration option}</code>
     * for a description of this property.
     * To modify this property see <code>{@link #setBaseParam}</code>.
     * @property
     */
    this.baseParams = {};

    // temporary removed-records cache
    this.removed = [];

    if(config && config.data){
        this.inlineData = config.data;
        delete config.data;
    }

    Ext.apply(this, config);
    
    this.paramNames = Ext.applyIf(this.paramNames || {}, this.defaultParamNames);

    if(this.url && !this.proxy){
        this.proxy = new Ext.data.HttpProxy({url: this.url});
    }
    // If Store is RESTful, so too is the DataProxy
    if (this.restful === true && this.proxy) {
        // When operating RESTfully, a unique transaction is generated for each record.
        this.batch = false;
        Ext.data.Api.restify(this.proxy);
    }

    if(this.reader){ // reader passed
        if(!this.recordType){
            this.recordType = this.reader.recordType;
        }
        if(this.reader.onMetaChange){
            this.reader.onMetaChange = this.onMetaChange.createDelegate(this);
        }
        if (this.writer) { // writer passed
            this.writer.meta = this.reader.meta;
            this.pruneModifiedRecords = true;
        }
    }

    /**
     * The {@link Ext.data.Record Record} constructor as supplied to (or created by) the
     * {@link Ext.data.DataReader Reader}. Read-only.
     * <p>If the Reader was constructed by passing in an Array of {@link Ext.data.Field} definition objects,
     * instead of a Record constructor, it will implicitly create a Record constructor from that Array (see
     * {@link Ext.data.Record}.{@link Ext.data.Record#create create} for additional details).</p>
     * <p>This property may be used to create new Records of the type held in this Store, for example:</p><pre><code>
// create the data store
var store = new Ext.data.ArrayStore({
    autoDestroy: true,
    fields: [
       {name: 'company'},
       {name: 'price', type: 'float'},
       {name: 'change', type: 'float'},
       {name: 'pctChange', type: 'float'},
       {name: 'lastChange', type: 'date', dateFormat: 'n/j h:ia'}
    ]
});
store.loadData(myData);

// create the Grid
var grid = new Ext.grid.EditorGridPanel({
    store: store,
    colModel: new Ext.grid.ColumnModel({
        columns: [
            {id:'company', header: 'Company', width: 160, dataIndex: 'company'},
            {header: 'Price', renderer: 'usMoney', dataIndex: 'price'},
            {header: 'Change', renderer: change, dataIndex: 'change'},
            {header: '% Change', renderer: pctChange, dataIndex: 'pctChange'},
            {header: 'Last Updated', width: 85,
                renderer: Ext.util.Format.dateRenderer('m/d/Y'),
                dataIndex: 'lastChange'}
        ],
        defaults: {
            sortable: true,
            width: 75
        }
    }),
    autoExpandColumn: 'company', // match the id specified in the column model
    height:350,
    width:600,
    title:'Array Grid',
    tbar: [{
        text: 'Add Record',
        handler : function(){
            var defaultData = {
                change: 0,
                company: 'New Company',
                lastChange: (new Date()).clearTime(),
                pctChange: 0,
                price: 10
            };
            var recId = 3; // provide unique id
            var p = new store.recordType(defaultData, recId); // create new record
            grid.stopEditing();
            store.{@link #insert}(0, p); // insert a new record into the store (also see {@link #add})
            grid.startEditing(0, 0);
        }
    }]
});
     * </code></pre>
     * @property recordType
     * @type Function
     */

    if(this.recordType){
        /**
         * A {@link Ext.util.MixedCollection MixedCollection} containing the defined {@link Ext.data.Field Field}s
         * for the {@link Ext.data.Record Records} stored in this Store. Read-only.
         * @property fields
         * @type Ext.util.MixedCollection
         */
        this.fields = this.recordType.prototype.fields;
    }
    this.modified = [];

    this.addEvents(
        /**
         * @event datachanged
         * Fires when the data cache has changed in a bulk manner (e.g., it has been sorted, filtered, etc.) and a
         * widget that is using this Store as a Record cache should refresh its view.
         * @param {Store} this
         */
        'datachanged',
        /**
         * @event metachange
         * Fires when this store's reader provides new metadata (fields). This is currently only supported for JsonReaders.
         * @param {Store} this
         * @param {Object} meta The JSON metadata
         */
        'metachange',
        /**
         * @event add
         * Fires when Records have been {@link #add}ed to the Store
         * @param {Store} this
         * @param {Ext.data.Record[]} records The array of Records added
         * @param {Number} index The index at which the record(s) were added
         */
        'add',
        /**
         * @event remove
         * Fires when a Record has been {@link #remove}d from the Store
         * @param {Store} this
         * @param {Ext.data.Record} record The Record that was removed
         * @param {Number} index The index at which the record was removed
         */
        'remove',
        /**
         * @event update
         * Fires when a Record has been updated
         * @param {Store} this
         * @param {Ext.data.Record} record The Record that was updated
         * @param {String} operation The update operation being performed.  Value may be one of:
         * <pre><code>
 Ext.data.Record.EDIT
 Ext.data.Record.REJECT
 Ext.data.Record.COMMIT
         * </code></pre>
         */
        'update',
        /**
         * @event clear
         * Fires when the data cache has been cleared.
         * @param {Store} this
         */
        'clear',
        /**
         * @event exception
         * <p>Fires if an exception occurs in the Proxy during a remote request.
         * This event is relayed through the corresponding {@link Ext.data.DataProxy}.
         * See {@link Ext.data.DataProxy}.{@link Ext.data.DataProxy#exception exception}
         * for additional details.
         * @param {misc} misc See {@link Ext.data.DataProxy}.{@link Ext.data.DataProxy#exception exception}
         * for description.
         */
        'exception',
        /**
         * @event beforeload
         * Fires before a request is made for a new data object.  If the beforeload handler returns
         * <tt>false</tt> the {@link #load} action will be canceled.
         * @param {Store} this
         * @param {Object} options The loading options that were specified (see {@link #load} for details)
         */
        'beforeload',
        /**
         * @event load
         * Fires after a new set of Records has been loaded.
         * @param {Store} this
         * @param {Ext.data.Record[]} records The Records that were loaded
         * @param {Object} options The loading options that were specified (see {@link #load} for details)
         */
        'load',
        /**
         * @event loadexception
         * <p>This event is <b>deprecated</b> in favor of the catch-all <b><code>{@link #exception}</code></b>
         * event instead.</p>
         * <p>This event is relayed through the corresponding {@link Ext.data.DataProxy}.
         * See {@link Ext.data.DataProxy}.{@link Ext.data.DataProxy#loadexception loadexception}
         * for additional details.
         * @param {misc} misc See {@link Ext.data.DataProxy}.{@link Ext.data.DataProxy#loadexception loadexception}
         * for description.
         */
        'loadexception',
        /**
         * @event beforewrite
         * @param {DataProxy} this
         * @param {String} action [Ext.data.Api.actions.create|update|destroy]
         * @param {Record/Array[Record]} rs
         * @param {Object} options The loading options that were specified. Edit <code>options.params</code> to add Http parameters to the request.  (see {@link #save} for details)
         * @param {Object} arg The callback's arg object passed to the {@link #request} function
         */
        'beforewrite',
        /**
         * @event write
         * Fires if the server returns 200 after an Ext.data.Api.actions CRUD action.
         * Success or failure of the action is available in the <code>result['successProperty']</code> property.
         * The server-code might set the <code>successProperty</code> to <tt>false</tt> if a database validation
         * failed, for example.
         * @param {Ext.data.Store} store
         * @param {String} action [Ext.data.Api.actions.create|update|destroy]
         * @param {Object} result The 'data' picked-out out of the response for convenience.
         * @param {Ext.Direct.Transaction} res
         * @param {Record/Record[]} rs Store's records, the subject(s) of the write-action
         */
        'write'
    );

    if(this.proxy){
        this.relayEvents(this.proxy,  ['loadexception', 'exception']);
    }
    // With a writer set for the Store, we want to listen to add/remove events to remotely create/destroy records.
    if (this.writer) {
        this.on({
            scope: this,
            add: this.createRecords,
            remove: this.destroyRecord,
            update: this.updateRecord
        });
    }

    this.sortToggle = {};
    if(this.sortField){
        this.setDefaultSort(this.sortField, this.sortDir);
    }else if(this.sortInfo){
        this.setDefaultSort(this.sortInfo.field, this.sortInfo.direction);
    }

    Ext.data.Store.superclass.constructor.call(this);

    if(this.id){
        this.storeId = this.id;
        delete this.id;
    }
    if(this.storeId){
        Ext.StoreMgr.register(this);
    }
    if(this.inlineData){
        this.loadData(this.inlineData);
        delete this.inlineData;
    }else if(this.autoLoad){
        this.load.defer(10, this, [
            typeof this.autoLoad == 'object' ?
                this.autoLoad : undefined]);
    }
};
Ext.extend(Ext.data.Store, Ext.util.Observable, {
    /**
     * @cfg {String} storeId If passed, the id to use to register with the <b>{@link Ext.StoreMgr StoreMgr}</b>.
     * <p><b>Note</b>: if a (deprecated) <tt>{@link #id}</tt> is specified it will supersede the <tt>storeId</tt>
     * assignment.</p>
     */
    /**
     * @cfg {String} url If a <tt>{@link #proxy}</tt> is not specified the <tt>url</tt> will be used to
     * implicitly configure a {@link Ext.data.HttpProxy HttpProxy} if an <tt>url</tt> is specified.
     * Typically this option, or the <code>{@link #data}</code> option will be specified.
     */
    /**
     * @cfg {Boolean/Object} autoLoad If <tt>{@link #data}</tt> is not specified, and if <tt>autoLoad</tt>
     * is <tt>true</tt> or an <tt>Object</tt>, this store's {@link #load} method is automatically called
     * after creation. If the value of <tt>autoLoad</tt> is an <tt>Object</tt>, this <tt>Object</tt> will
     * be passed to the store's {@link #load} method.
     */
    /**
     * @cfg {Ext.data.DataProxy} proxy The {@link Ext.data.DataProxy DataProxy} object which provides
     * access to a data object.  See <code>{@link #url}</code>.
     */
    /**
     * @cfg {Array} data An inline data object readable by the <code>{@link #reader}</code>.
     * Typically this option, or the <code>{@link #url}</code> option will be specified.
     */
    /**
     * @cfg {Ext.data.DataReader} reader The {@link Ext.data.DataReader Reader} object which processes the
     * data object and returns an Array of {@link Ext.data.Record} objects which are cached keyed by their
     * <b><tt>{@link Ext.data.Record#id id}</tt></b> property.
     */
    /**
     * @cfg {Ext.data.DataWriter} writer
     * <p>The {@link Ext.data.DataWriter Writer} object which processes a record object for being written
     * to the server-side database.</p>
     * <br><p>When a writer is installed into a Store the {@link #add}, {@link #remove}, and {@link #update}
     * events on the store are monitored in order to remotely {@link #createRecords create records},
     * {@link #destroyRecord destroy records}, or {@link #updateRecord update records}.</p>
     * <br><p>The proxy for this store will relay any {@link #writexception} events to this store.</p>
     * <br><p>Sample implementation:
     * <pre><code>
var writer = new {@link Ext.data.JsonWriter}({
    encode: true,
    writeAllFields: true // write all fields, not just those that changed
});

// Typical Store collecting the Proxy, Reader and Writer together.
var store = new Ext.data.Store({
    storeId: 'user',
    root: 'records',
    proxy: proxy,
    reader: reader,
    writer: writer,     // <-- plug a DataWriter into the store just as you would a Reader
    paramsAsHash: true,
    autoSave: false    // <-- false to delay executing create, update, destroy requests
                        //     until specifically told to do so.
});
     * </code></pre></p>
     */
    writer : undefined,
    /**
     * @cfg {Object} baseParams
     * <p>An object containing properties which are to be sent as parameters
     * for <i>every</i> HTTP request.</p>
     * <p>Parameters are encoded as standard HTTP parameters using {@link Ext#urlEncode}.</p>
     * <p><b>Note</b>: <code>baseParams</code> may be superseded by any <code>params</code>
     * specified in a <code>{@link #load}</code> request, see <code>{@link #load}</code>
     * for more details.</p>
     * This property may be modified after creation using the <code>{@link #setBaseParam}</code>
     * method.
     * @property
     */
    /**
     * @cfg {Object} sortInfo A config object to specify the sort order in the request of a Store's
     * {@link #load} operation.  Note that for local sorting, the <tt>direction</tt> property is
     * case-sensitive. See also {@link #remoteSort} and {@link #paramNames}.
     * For example:<pre><code>
sortInfo: {
    field: 'fieldName',
    direction: 'ASC' // or 'DESC' (case sensitive for local sorting)
}
</code></pre>
     */
    /**
     * @cfg {boolean} remoteSort <tt>true</tt> if sorting is to be handled by requesting the <tt>{@link #proxy Proxy}</tt>
     * to provide a refreshed version of the data object in sorted order, as opposed to sorting the Record cache
     * in place (defaults to <tt>false</tt>).
     * <p>If <tt>remoteSort</tt> is <tt>true</tt>, then clicking on a {@link Ext.grid.Column Grid Column}'s
     * {@link Ext.grid.Column#header header} causes the current page to be requested from the server appending
     * the following two parameters to the <b><tt>{@link #load params}</tt></b>:<div class="mdetail-params"><ul>
     * <li><b><tt>sort</tt></b> : String<p class="sub-desc">The <tt>name</tt> (as specified in the Record's
     * {@link Ext.data.Field Field definition}) of the field to sort on.</p></li>
     * <li><b><tt>dir</tt></b> : String<p class="sub-desc">The direction of the sort, 'ASC' or 'DESC' (case-sensitive).</p></li>
     * </ul></div></p>
     */
    remoteSort : false,

    /**
     * @cfg {Boolean} autoDestroy <tt>true</tt> to destroy the store when the component the store is bound
     * to is destroyed (defaults to <tt>false</tt>).
     * <p><b>Note</b>: this should be set to true when using stores that are bound to only 1 component.</p>
     */
    autoDestroy : false,

    /**
     * @cfg {Boolean} pruneModifiedRecords <tt>true</tt> to clear all modified record information each time
     * the store is loaded or when a record is removed (defaults to <tt>false</tt>). See {@link #getModifiedRecords}
     * for the accessor method to retrieve the modified records.
     */
    pruneModifiedRecords : false,

    /**
     * Contains the last options object used as the parameter to the {@link #load} method. See {@link #load}
     * for the details of what this may contain. This may be useful for accessing any params which were used
     * to load the current Record cache.
     * @property
     */
    lastOptions : null,

    /**
     * @cfg {Boolean} autoSave
     * <p>Defaults to <tt>true</tt> causing the store to automatically {@link #save} records to
     * the server when a record is modified (ie: becomes 'dirty'). Specify <tt>false</tt> to manually call {@link #save}
     * to send all modifiedRecords to the server.</p>
     * <br><p><b>Note</b>: each CRUD action will be sent as a separate request.</p>
     */
    autoSave : true,

    /**
     * @cfg {Boolean} batch
     * <p>Defaults to <tt>true</tt> (unless <code>{@link #restful}:true</code>). Multiple
     * requests for each CRUD action (CREATE, READ, UPDATE and DESTROY) will be combined
     * and sent as one transaction. Only applies when <code>{@link #autoSave}</code> is set
     * to <tt>false</tt>.</p>
     * <br><p>If Store is RESTful, the DataProxy is also RESTful, and a unique transaction is
     * generated for each record.</p>
     */
    batch : true,

    /**
     * @cfg {Boolean} restful
     * Defaults to <tt>false</tt>.  Set to <tt>true</tt> to have the Store and the set
     * Proxy operate in a RESTful manner. The store will automatically generate GET, POST,
     * PUT and DELETE requests to the server. The HTTP method used for any given CRUD
     * action is described in {@link Ext.data.Api#restActions}.  For additional information
     * see {@link Ext.data.DataProxy#restful}.
     * <p><b>Note</b>: if <code>{@link #restful}:true</code> <code>batch</code> will
     * internally be set to <tt>false</tt>.</p>
     */
    restful: false,
    
    /**
     * @cfg {Object} paramNames
     * <p>An object containing properties which specify the names of the paging and
     * sorting parameters passed to remote servers when loading blocks of data. By default, this
     * object takes the following form:</p><pre><code>
{
    start : 'start',  // The parameter name which specifies the start row
    limit : 'limit',  // The parameter name which specifies number of rows to return
    sort : 'sort',    // The parameter name which specifies the column to sort on
    dir : 'dir'       // The parameter name which specifies the sort direction
}
</code></pre>
     * <p>The server must produce the requested data block upon receipt of these parameter names.
     * If different parameter names are required, this property can be overriden using a configuration
     * property.</p>
     * <p>A {@link Ext.PagingToolbar PagingToolbar} bound to this Store uses this property to determine
     * the parameter names to use in its {@link #load requests}.
     */
    paramNames : undefined,
    
    /**
     * @cfg {Object} defaultParamNames
     * Provides the default values for the {@link #paramNames} property. To globally modify the parameters
     * for all stores, this object should be changed on the store prototype.
     */
    defaultParamNames : {
        start : 'start',
        limit : 'limit',
        sort : 'sort',
        dir : 'dir'
    },

    /**
     * Destroys the store.
     */
    destroy : function(){
        if(this.storeId){
            Ext.StoreMgr.unregister(this);
        }
        this.data = null;
        Ext.destroy(this.proxy);
        this.reader = this.writer = null;
        this.purgeListeners();
    },

    /**
     * Add Records to the Store and fires the {@link #add} event.  To add Records
     * to the store from a remote source use <code>{@link #load}({add:true})</code>.
     * See also <code>{@link #recordType}</code> and <code>{@link #insert}</code>.
     * @param {Ext.data.Record[]} records An Array of Ext.data.Record objects
     * to add to the cache. See {@link #recordType}.
     */
    add : function(records){
        records = [].concat(records);
        if(records.length < 1){
            return;
        }
        for(var i = 0, len = records.length; i < len; i++){
            records[i].join(this);
        }
        var index = this.data.length;
        this.data.addAll(records);
        if(this.snapshot){
            this.snapshot.addAll(records);
        }
        this.fireEvent('add', this, records, index);
    },

    /**
     * (Local sort only) Inserts the passed Record into the Store at the index where it
     * should go based on the current sort information.
     * @param {Ext.data.Record} record
     */
    addSorted : function(record){
        var index = this.findInsertIndex(record);
        this.insert(index, record);
    },

    /**
     * Remove a Record from the Store and fires the {@link #remove} event.
     * @param {Ext.data.Record} record The Ext.data.Record object to remove from the cache.
     */
    remove : function(record){
        var index = this.data.indexOf(record);
        if(index > -1){
            this.data.removeAt(index);
            if(this.pruneModifiedRecords){
                this.modified.remove(record);
            }
            if(this.snapshot){
                this.snapshot.remove(record);
            }
            this.fireEvent('remove', this, record, index);
        }
    },

    /**
     * Remove a Record from the Store at the specified index. Fires the {@link #remove} event.
     * @param {Number} index The index of the record to remove.
     */
    removeAt : function(index){
        this.remove(this.getAt(index));
    },

    /**
     * Remove all Records from the Store and fires the {@link #clear} event.
     */
    removeAll : function(){
        this.data.clear();
        if(this.snapshot){
            this.snapshot.clear();
        }
        if(this.pruneModifiedRecords){
            this.modified = [];
        }
        this.fireEvent('clear', this);
    },

    /**
     * Inserts Records into the Store at the given index and fires the {@link #add} event.
     * See also <code>{@link #add}</code> and <code>{@link #addSorted}</code>.
     * @param {Number} index The start index at which to insert the passed Records.
     * @param {Ext.data.Record[]} records An Array of Ext.data.Record objects to add to the cache.
     */
    insert : function(index, records){
        records = [].concat(records);
        for(var i = 0, len = records.length; i < len; i++){
            this.data.insert(index, records[i]);
            records[i].join(this);
        }
        this.fireEvent('add', this, records, index);
    },

    /**
     * Get the index within the cache of the passed Record.
     * @param {Ext.data.Record} record The Ext.data.Record object to find.
     * @return {Number} The index of the passed Record. Returns -1 if not found.
     */
    indexOf : function(record){
        return this.data.indexOf(record);
    },

    /**
     * Get the index within the cache of the Record with the passed id.
     * @param {String} id The id of the Record to find.
     * @return {Number} The index of the Record. Returns -1 if not found.
     */
    indexOfId : function(id){
        return this.data.indexOfKey(id);
    },

    /**
     * Get the Record with the specified id.
     * @param {String} id The id of the Record to find.
     * @return {Ext.data.Record} The Record with the passed id. Returns undefined if not found.
     */
    getById : function(id){
        return this.data.key(id);
    },

    /**
     * Get the Record at the specified index.
     * @param {Number} index The index of the Record to find.
     * @return {Ext.data.Record} The Record at the passed index. Returns undefined if not found.
     */
    getAt : function(index){
        return this.data.itemAt(index);
    },

    /**
     * Returns a range of Records between specified indices.
     * @param {Number} startIndex (optional) The starting index (defaults to 0)
     * @param {Number} endIndex (optional) The ending index (defaults to the last Record in the Store)
     * @return {Ext.data.Record[]} An array of Records
     */
    getRange : function(start, end){
        return this.data.getRange(start, end);
    },

    // private
    storeOptions : function(o){
        o = Ext.apply({}, o);
        delete o.callback;
        delete o.scope;
        this.lastOptions = o;
    },

    /**
     * <p>Loads the Record cache from the configured <tt>{@link #proxy}</tt> using the configured <tt>{@link #reader}</tt>.</p>
     * <br><p>Notes:</p><div class="mdetail-params"><ul>
     * <li><b><u>Important</u></b>: loading is asynchronous! This call will return before the new data has been
     * loaded. To perform any post-processing where information from the load call is required, specify
     * the <tt>callback</tt> function to be called, or use a {@link Ext.util.Observable#listeners a 'load' event handler}.</li>
     * <li>If using {@link Ext.PagingToolbar remote paging}, the first load call must specify the <tt>start</tt> and <tt>limit</tt>
     * properties in the <code>options.params</code> property to establish the initial position within the
     * dataset, and the number of Records to cache on each read from the Proxy.</li>
     * <li>If using {@link #remoteSort remote sorting}, the configured <code>{@link #sortInfo}</code>
     * will be automatically included with the posted parameters according to the specified
     * <code>{@link #paramNames}</code>.</li>
     * </ul></div>
     * @param {Object} options An object containing properties which control loading options:<ul>
     * <li><b><tt>params</tt></b> :Object<div class="sub-desc"><p>An object containing properties to pass as HTTP
     * parameters to a remote data source. <b>Note</b>: <code>params</code> will override any
     * <code>{@link #baseParams}</code> of the same name.</p>
     * <p>Parameters are encoded as standard HTTP parameters using {@link Ext#urlEncode}.</p></div></li>
     * <li><b><tt>callback</tt></b> : Function<div class="sub-desc"><p>A function to be called after the Records
     * have been loaded. The <tt>callback</tt> is called after the load event and is passed the following arguments:<ul>
     * <li><tt>r</tt> : Ext.data.Record[]</li>
     * <li><tt>options</tt>: Options object from the load call</li>
     * <li><tt>success</tt>: Boolean success indicator</li></ul></p></div></li>
     * <li><b><tt>scope</tt></b> : Object<div class="sub-desc"><p>Scope with which to call the callback (defaults
     * to the Store object)</p></div></li>
     * <li><b><tt>add</tt></b> : Boolean<div class="sub-desc"><p>Indicator to append loaded records rather than
     * replace the current cache.  <b>Note</b>: see note for <tt>{@link #loadData}</tt></p></div></li>
     * </ul>
     * @return {Boolean} If the <i>developer</i> provided <tt>{@link #beforeload}</tt> event handler returns
     * <tt>false</tt>, the load call will abort and will return <tt>false</tt>; otherwise will return <tt>true</tt>.
     */
    load : function(options) {
        options = options || {};
        this.storeOptions(options);
        if(this.sortInfo && this.remoteSort){
            var pn = this.paramNames;
            options.params = options.params || {};
            options.params[pn.sort] = this.sortInfo.field;
            options.params[pn.dir] = this.sortInfo.direction;
        }
        try {
            return this.execute('read', null, options); // <-- null represents rs.  No rs for load actions.
        } catch(e) {
            this.handleException(e);
            return false;
        }
    },

    /**
     * updateRecord  Should not be used directly.  This method will be called automatically if a Writer is set.
     * Listens to 'update' event.
     * @param {Object} store
     * @param {Object} record
     * @param {Object} action
     * @private
     */
    updateRecord : function(store, record, action) {
        if (action == Ext.data.Record.EDIT && this.autoSave === true && (!record.phantom || (record.phantom && record.isValid))) {
            this.save();
        }
    },

    /**
     * Should not be used directly.  Store#add will call this automatically if a Writer is set
     * @param {Object} store
     * @param {Object} rs
     * @param {Object} index
     * @private
     */
    createRecords : function(store, rs, index) {
        for (var i = 0, len = rs.length; i < len; i++) {
            if (rs[i].phantom && rs[i].isValid()) {
                rs[i].markDirty();  // <-- Mark new records dirty
                this.modified.push(rs[i]);  // <-- add to modified
            }
        }
        if (this.autoSave === true) {
            this.save();
        }
    },

    /**
     * Destroys a record or records.  Should not be used directly.  It's called by Store#remove if a Writer is set.
     * @param {Store} this
     * @param {Ext.data.Record/Ext.data.Record[]}
     * @param {Number} index
     * @private
     */
    destroyRecord : function(store, record, index) {
        if (this.modified.indexOf(record) != -1) {  // <-- handled already if @cfg pruneModifiedRecords == true
            this.modified.remove(record);
        }
        if (!record.phantom) {
            this.removed.push(record);

            // since the record has already been removed from the store but the server request has not yet been executed,
            // must keep track of the last known index this record existed.  If a server error occurs, the record can be
            // put back into the store.  @see Store#createCallback where the record is returned when response status === false
            record.lastIndex = index;

            if (this.autoSave === true) {
                this.save();
            }
        }
    },

    /**
     * This method should generally not be used directly.  This method is called internally
     * by {@link #load}, or if a Writer is set will be called automatically when {@link #add},
     * {@link #remove}, or {@link #update} events fire.
     * @param {String} action Action name ('read', 'create', 'update', or 'destroy')
     * @param {Record/Record[]} rs
     * @param {Object} options
     * @throws Error
     * @private
     */
    execute : function(action, rs, options) {
        // blow up if action not Ext.data.CREATE, READ, UPDATE, DESTROY
        if (!Ext.data.Api.isAction(action)) {
            throw new Ext.data.Api.Error('execute', action);
        }
        // make sure options has a params key
        options = Ext.applyIf(options||{}, {
            params: {}
        });

        // have to separate before-events since load has a different signature than create,destroy and save events since load does not
        // include the rs (record resultset) parameter.  Capture return values from the beforeaction into doRequest flag.
        var doRequest = true;

        if (action === 'read') {
            doRequest = this.fireEvent('beforeload', this, options);
        }
        else {
            // if Writer is configured as listful, force single-recoord rs to be [{}} instead of {}
            if (this.writer.listful === true && this.restful !== true) {
                rs = (Ext.isArray(rs)) ? rs : [rs];
            }
            // if rs has just a single record, shift it off so that Writer writes data as '{}' rather than '[{}]'
            else if (Ext.isArray(rs) && rs.length == 1) {
                rs = rs.shift();
            }
            // Write the action to options.params
            if ((doRequest = this.fireEvent('beforewrite', this, action, rs, options)) !== false) {
                this.writer.write(action, options.params, rs);
            }
        }
        if (doRequest !== false) {
            // Send request to proxy.
            var params = Ext.apply({}, options.params, this.baseParams);
            if (this.writer && this.proxy.url && !this.proxy.restful && !Ext.data.Api.hasUniqueUrl(this.proxy, action)) {
                params.xaction = action;
            }
            // Note:  Up until this point we've been dealing with 'action' as a key from Ext.data.Api.actions.  We'll flip it now
            // and send the value into DataProxy#request, since it's the value which maps to the DataProxy#api
            this.proxy.request(Ext.data.Api.actions[action], rs, params, this.reader, this.createCallback(action, rs), this, options);
        }
        return doRequest;
    },

    /**
     * Saves all pending changes to the store.  If the commensurate Ext.data.Api.actions action is not configured, then
     * the configured <code>{@link #url}</code> will be used.
     * <pre>
     * change            url
     * ---------------   --------------------
     * removed records   Ext.data.Api.actions.destroy
     * phantom records   Ext.data.Api.actions.create
     * {@link #getModifiedRecords modified records}  Ext.data.Api.actions.update
     * </pre>
     * @TODO:  Create extensions of Error class and send associated Record with thrown exceptions.
     * e.g.:  Ext.data.DataReader.Error or Ext.data.Error or Ext.data.DataProxy.Error, etc.
     */
    save : function() {
        if (!this.writer) {
            throw new Ext.data.Store.Error('writer-undefined');
        }

        // DESTROY:  First check for removed records.  Records in this.removed are guaranteed non-phantoms.  @see Store#remove
        if (this.removed.length) {
            this.doTransaction('destroy', this.removed);
        }

        // Check for modified records. Use a copy so Store#rejectChanges will work if server returns error.
        var rs = [].concat(this.getModifiedRecords());
        if (!rs.length) { // Bail-out if empty...
            return true;
        }

        // CREATE:  Next check for phantoms within rs.  splice-off and execute create.
        var phantoms = [];
        for (var i = rs.length-1; i >= 0; i--) {
            if (rs[i].phantom === true) {
                var rec = rs.splice(i, 1).shift();
                if (rec.isValid()) {
                    phantoms.push(rec);
                }
            } else if (!rs[i].isValid()) { // <-- while we're here, splice-off any !isValid real records
                rs.splice(i,1);
            }
        }
        // If we have valid phantoms, create them...
        if (phantoms.length) {
            this.doTransaction('create', phantoms);
        }

        // UPDATE:  And finally, if we're still here after splicing-off phantoms and !isValid real records, update the rest...
        if (rs.length) {
            this.doTransaction('update', rs);
        }
        return true;
    },

    // private.  Simply wraps call to Store#execute in try/catch.  Defers to Store#handleException on error.  Loops if batch: false
    doTransaction : function(action, rs) {
        function transaction(records) {
            try {
                this.execute(action, records);
            } catch (e) {
                this.handleException(e);
            }
        }
        if (this.batch === false) {
            for (var i = 0, len = rs.length; i < len; i++) {
                transaction.call(this, rs[i]);
            }
        } else {
            transaction.call(this, rs);
        }
    },

    // @private callback-handler for remote CRUD actions
    // Do not override -- override loadRecords, onCreateRecords, onDestroyRecords and onUpdateRecords instead.
    createCallback : function(action, rs) {
        var actions = Ext.data.Api.actions;
        return (action == 'read') ? this.loadRecords : function(data, response, success) {
            // calls: onCreateRecords | onUpdateRecords | onDestroyRecords
            this['on' + Ext.util.Format.capitalize(action) + 'Records'](success, rs, data);
            // If success === false here, exception will have been called in DataProxy
            if (success === true) {
                this.fireEvent('write', this, action, data, response, rs);
            }
        };
    },

    // Clears records from modified array after an exception event.
    // NOTE:  records are left marked dirty.  Do we want to commit them even though they were not updated/realized?
    clearModified : function(rs) {
        if (Ext.isArray(rs)) {
            for (var n=rs.length-1;n>=0;n--) {
                this.modified.splice(this.modified.indexOf(rs[n]), 1);
            }
        } else {
            this.modified.splice(this.modified.indexOf(rs), 1);
        }
    },

    // remap record ids in MixedCollection after records have been realized.  @see Store#onCreateRecords, @see DataReader#realize
    reMap : function(record) {
        if (Ext.isArray(record)) {
            for (var i = 0, len = record.length; i < len; i++) {
                this.reMap(record[i]);
            }
        } else {
            delete this.data.map[record._phid];
            this.data.map[record.id] = record;
            var index = this.data.keys.indexOf(record._phid);
            this.data.keys.splice(index, 1, record.id);
            delete record._phid;
        }
    },

    // @protected onCreateRecord proxy callback for create action
    onCreateRecords : function(success, rs, data) {
        if (success === true) {
            try {
                this.reader.realize(rs, data);
                this.reMap(rs);
            }
            catch (e) {
                this.handleException(e);
                if (Ext.isArray(rs)) {
                    // Recurse to run back into the try {}.  DataReader#realize splices-off the rs until empty.
                    this.onCreateRecords(success, rs, data);
                }
            }
        }
    },

    // @protected, onUpdateRecords proxy callback for update action
    onUpdateRecords : function(success, rs, data) {
        if (success === true) {
            try {
                this.reader.update(rs, data);
            } catch (e) {
                this.handleException(e);
                if (Ext.isArray(rs)) {
                    // Recurse to run back into the try {}.  DataReader#update splices-off the rs until empty.
                    this.onUpdateRecords(success, rs, data);
                }
            }
        }
    },

    // @protected onDestroyRecords proxy callback for destroy action
    onDestroyRecords : function(success, rs, data) {
        // splice each rec out of this.removed
        rs = (rs instanceof Ext.data.Record) ? [rs] : rs;
        for (var i=0,len=rs.length;i<len;i++) {
            this.removed.splice(this.removed.indexOf(rs[i]), 1);
        }
        if (success === false) {
            // put records back into store if remote destroy fails.
            // @TODO: Might want to let developer decide.
            for (i=rs.length-1;i>=0;i--) {
                this.insert(rs[i].lastIndex, rs[i]);    // <-- lastIndex set in Store#destroyRecord
            }
        }
    },

    // protected handleException.  Possibly temporary until Ext framework has an exception-handler.
    handleException : function(e) {
        // @see core/Error.js
        Ext.handleError(e);
    },

    /**
     * <p>Reloads the Record cache from the configured Proxy using the configured {@link Ext.data.Reader Reader} and
     * the options from the last load operation performed.</p>
     * <p><b>Note</b>: see the Important note in {@link #load}.</p>
     * @param {Object} options (optional) An <tt>Object</tt> containing {@link #load loading options} which may
     * override the options used in the last {@link #load} operation. See {@link #load} for details (defaults to
     * <tt>null</tt>, in which case the {@link #lastOptions} are used).
     */
    reload : function(options){
        this.load(Ext.applyIf(options||{}, this.lastOptions));
    },

    // private
    // Called as a callback by the Reader during a load operation.
    loadRecords : function(o, options, success){
        if(!o || success === false){
            if(success !== false){
                this.fireEvent('load', this, [], options);
            }
            if(options.callback){
                options.callback.call(options.scope || this, [], options, false, o);
            }
            return;
        }
        var r = o.records, t = o.totalRecords || r.length;
        if(!options || options.add !== true){
            if(this.pruneModifiedRecords){
                this.modified = [];
            }
            for(var i = 0, len = r.length; i < len; i++){
                r[i].join(this);
            }
            if(this.snapshot){
                this.data = this.snapshot;
                delete this.snapshot;
            }
            this.data.clear();
            this.data.addAll(r);
            this.totalLength = t;
            this.applySort();
            this.fireEvent('datachanged', this);
        }else{
            this.totalLength = Math.max(t, this.data.length+r.length);
            this.add(r);
        }
        this.fireEvent('load', this, r, options);
        if(options.callback){
            options.callback.call(options.scope || this, r, options, true);
        }
    },

    /**
     * Loads data from a passed data block and fires the {@link #load} event. A {@link Ext.data.Reader Reader}
     * which understands the format of the data must have been configured in the constructor.
     * @param {Object} data The data block from which to read the Records.  The format of the data expected
     * is dependent on the type of {@link Ext.data.Reader Reader} that is configured and should correspond to
     * that {@link Ext.data.Reader Reader}'s <tt>{@link Ext.data.Reader#readRecords}</tt> parameter.
     * @param {Boolean} append (Optional) <tt>true</tt> to append the new Records rather the default to replace
     * the existing cache.
     * <b>Note</b>: that Records in a Store are keyed by their {@link Ext.data.Record#id id}, so added Records
     * with ids which are already present in the Store will <i>replace</i> existing Records. Only Records with
     * new, unique ids will be added.
     */
    loadData : function(o, append){
        var r = this.reader.readRecords(o);
        this.loadRecords(r, {add: append}, true);
    },

    /**
     * Gets the number of cached records.
     * <p>If using paging, this may not be the total size of the dataset. If the data object
     * used by the Reader contains the dataset size, then the {@link #getTotalCount} function returns
     * the dataset size.  <b>Note</b>: see the Important note in {@link #load}.</p>
     * @return {Number} The number of Records in the Store's cache.
     */
    getCount : function(){
        return this.data.length || 0;
    },

    /**
     * Gets the total number of records in the dataset as returned by the server.
     * <p>If using paging, for this to be accurate, the data object used by the {@link #reader Reader}
     * must contain the dataset size. For remote data sources, the value for this property
     * (<tt>totalProperty</tt> for {@link Ext.data.JsonReader JsonReader},
     * <tt>totalRecords</tt> for {@link Ext.data.XmlReader XmlReader}) shall be returned by a query on the server.
     * <b>Note</b>: see the Important note in {@link #load}.</p>
     * @return {Number} The number of Records as specified in the data object passed to the Reader
     * by the Proxy.
     * <p><b>Note</b>: this value is not updated when changing the contents of the Store locally.</p>
     */
    getTotalCount : function(){
        return this.totalLength || 0;
    },

    /**
     * Returns an object describing the current sort state of this Store.
     * @return {Object} The sort state of the Store. An object with two properties:<ul>
     * <li><b>field : String<p class="sub-desc">The name of the field by which the Records are sorted.</p></li>
     * <li><b>direction : String<p class="sub-desc">The sort order, 'ASC' or 'DESC' (case-sensitive).</p></li>
     * </ul>
     * See <tt>{@link #sortInfo}</tt> for additional details.
     */
    getSortState : function(){
        return this.sortInfo;
    },

    // private
    applySort : function(){
        if(this.sortInfo && !this.remoteSort){
            var s = this.sortInfo, f = s.field;
            this.sortData(f, s.direction);
        }
    },

    // private
    sortData : function(f, direction){
        direction = direction || 'ASC';
        var st = this.fields.get(f).sortType;
        var fn = function(r1, r2){
            var v1 = st(r1.data[f]), v2 = st(r2.data[f]);
            return v1 > v2 ? 1 : (v1 < v2 ? -1 : 0);
        };
        this.data.sort(direction, fn);
        if(this.snapshot && this.snapshot != this.data){
            this.snapshot.sort(direction, fn);
        }
    },

    /**
     * Sets the default sort column and order to be used by the next {@link #load} operation.
     * @param {String} fieldName The name of the field to sort by.
     * @param {String} dir (optional) The sort order, 'ASC' or 'DESC' (case-sensitive, defaults to <tt>'ASC'</tt>)
     */
    setDefaultSort : function(field, dir){
        dir = dir ? dir.toUpperCase() : 'ASC';
        this.sortInfo = {field: field, direction: dir};
        this.sortToggle[field] = dir;
    },

    /**
     * Sort the Records.
     * If remote sorting is used, the sort is performed on the server, and the cache is reloaded. If local
     * sorting is used, the cache is sorted internally. See also {@link #remoteSort} and {@link #paramNames}.
     * @param {String} fieldName The name of the field to sort by.
     * @param {String} dir (optional) The sort order, 'ASC' or 'DESC' (case-sensitive, defaults to <tt>'ASC'</tt>)
     */
    sort : function(fieldName, dir){
        var f = this.fields.get(fieldName);
        if(!f){
            return false;
        }
        if(!dir){
            if(this.sortInfo && this.sortInfo.field == f.name){ // toggle sort dir
                dir = (this.sortToggle[f.name] || 'ASC').toggle('ASC', 'DESC');
            }else{
                dir = f.sortDir;
            }
        }
        var st = (this.sortToggle) ? this.sortToggle[f.name] : null;
        var si = (this.sortInfo) ? this.sortInfo : null;

        this.sortToggle[f.name] = dir;
        this.sortInfo = {field: f.name, direction: dir};
        if(!this.remoteSort){
            this.applySort();
            this.fireEvent('datachanged', this);
        }else{
            if (!this.load(this.lastOptions)) {
                if (st) {
                    this.sortToggle[f.name] = st;
                }
                if (si) {
                    this.sortInfo = si;
                }
            }
        }
    },

    /**
     * Calls the specified function for each of the {@link Ext.data.Record Records} in the cache.
     * @param {Function} fn The function to call. The {@link Ext.data.Record Record} is passed as the first parameter.
     * Returning <tt>false</tt> aborts and exits the iteration.
     * @param {Object} scope (optional) The scope in which to call the function (defaults to the {@link Ext.data.Record Record}).
     */
    each : function(fn, scope){
        this.data.each(fn, scope);
    },

    /**
     * Gets all {@link Ext.data.Record records} modified since the last commit.  Modified records are
     * persisted across load operations (e.g., during paging). <b>Note</b>: deleted records are not
     * included.  See also <tt>{@link #pruneModifiedRecords}</tt> and
     * {@link Ext.data.Record}<tt>{@link Ext.data.Record#markDirty markDirty}.</tt>.
     * @return {Ext.data.Record[]} An array of {@link Ext.data.Record Records} containing outstanding
     * modifications.  To obtain modified fields within a modified record see
     *{@link Ext.data.Record}<tt>{@link Ext.data.Record#modified modified}.</tt>.
     */
    getModifiedRecords : function(){
        return this.modified;
    },

    // private
    createFilterFn : function(property, value, anyMatch, caseSensitive){
        if(Ext.isEmpty(value, false)){
            return false;
        }
        value = this.data.createValueMatcher(value, anyMatch, caseSensitive);
        return function(r){
            return value.test(r.data[property]);
        };
    },

    /**
     * Sums the value of <tt>property</tt> for each {@link Ext.data.Record record} between <tt>start</tt>
     * and <tt>end</tt> and returns the result.
     * @param {String} property A field in each record
     * @param {Number} start (optional) The record index to start at (defaults to <tt>0</tt>)
     * @param {Number} end (optional) The last record index to include (defaults to length - 1)
     * @return {Number} The sum
     */
    sum : function(property, start, end){
        var rs = this.data.items, v = 0;
        start = start || 0;
        end = (end || end === 0) ? end : rs.length-1;

        for(var i = start; i <= end; i++){
            v += (rs[i].data[property] || 0);
        }
        return v;
    },

    /**
     * Filter the {@link Ext.data.Record records} by a specified property.
     * @param {String} field A field on your records
     * @param {String/RegExp} value Either a string that the field should begin with, or a RegExp to test
     * against the field.
     * @param {Boolean} anyMatch (optional) <tt>true</tt> to match any part not just the beginning
     * @param {Boolean} caseSensitive (optional) <tt>true</tt> for case sensitive comparison
     */
    filter : function(property, value, anyMatch, caseSensitive){
        var fn = this.createFilterFn(property, value, anyMatch, caseSensitive);
        return fn ? this.filterBy(fn) : this.clearFilter();
    },

    /**
     * Filter by a function. The specified function will be called for each
     * Record in this Store. If the function returns <tt>true</tt> the Record is included,
     * otherwise it is filtered out.
     * @param {Function} fn The function to be called. It will be passed the following parameters:<ul>
     * <li><b>record</b> : Ext.data.Record<p class="sub-desc">The {@link Ext.data.Record record}
     * to test for filtering. Access field values using {@link Ext.data.Record#get}.</p></li>
     * <li><b>id</b> : Object<p class="sub-desc">The ID of the Record passed.</p></li>
     * </ul>
     * @param {Object} scope (optional) The scope of the function (defaults to this)
     */
    filterBy : function(fn, scope){
        this.snapshot = this.snapshot || this.data;
        this.data = this.queryBy(fn, scope||this);
        this.fireEvent('datachanged', this);
    },

    /**
     * Query the records by a specified property.
     * @param {String} field A field on your records
     * @param {String/RegExp} value Either a string that the field
     * should begin with, or a RegExp to test against the field.
     * @param {Boolean} anyMatch (optional) True to match any part not just the beginning
     * @param {Boolean} caseSensitive (optional) True for case sensitive comparison
     * @return {MixedCollection} Returns an Ext.util.MixedCollection of the matched records
     */
    query : function(property, value, anyMatch, caseSensitive){
        var fn = this.createFilterFn(property, value, anyMatch, caseSensitive);
        return fn ? this.queryBy(fn) : this.data.clone();
    },

    /**
     * Query the cached records in this Store using a filtering function. The specified function
     * will be called with each record in this Store. If the function returns <tt>true</tt> the record is
     * included in the results.
     * @param {Function} fn The function to be called. It will be passed the following parameters:<ul>
     * <li><b>record</b> : Ext.data.Record<p class="sub-desc">The {@link Ext.data.Record record}
     * to test for filtering. Access field values using {@link Ext.data.Record#get}.</p></li>
     * <li><b>id</b> : Object<p class="sub-desc">The ID of the Record passed.</p></li>
     * </ul>
     * @param {Object} scope (optional) The scope of the function (defaults to this)
     * @return {MixedCollection} Returns an Ext.util.MixedCollection of the matched records
     **/
    queryBy : function(fn, scope){
        var data = this.snapshot || this.data;
        return data.filterBy(fn, scope||this);
    },

    /**
     * Finds the index of the first matching record in this store by a specific property/value.
     * @param {String} property A property on your objects
     * @param {String/RegExp} value Either a string that the property value
     * should begin with, or a RegExp to test against the property.
     * @param {Number} startIndex (optional) The index to start searching at
     * @param {Boolean} anyMatch (optional) True to match any part of the string, not just the beginning
     * @param {Boolean} caseSensitive (optional) True for case sensitive comparison
     * @return {Number} The matched index or -1
     */
    find : function(property, value, start, anyMatch, caseSensitive){
        var fn = this.createFilterFn(property, value, anyMatch, caseSensitive);
        return fn ? this.data.findIndexBy(fn, null, start) : -1;
    },

    /**
     * Finds the index of the first matching record in this store by a specific property/value.
     * @param {String} property A property on your objects
     * @param {String/RegExp} value The value to match against
     * @param {Number} startIndex (optional) The index to start searching at
     * @return {Number} The matched index or -1
     */
    findExact: function(property, value, start){
        return this.data.findIndexBy(function(rec){
            return rec.get(property) === value;
        }, this, start);
    },

    /**
     * Find the index of the first matching Record in this Store by a function.
     * If the function returns <tt>true</tt> it is considered a match.
     * @param {Function} fn The function to be called. It will be passed the following parameters:<ul>
     * <li><b>record</b> : Ext.data.Record<p class="sub-desc">The {@link Ext.data.Record record}
     * to test for filtering. Access field values using {@link Ext.data.Record#get}.</p></li>
     * <li><b>id</b> : Object<p class="sub-desc">The ID of the Record passed.</p></li>
     * </ul>
     * @param {Object} scope (optional) The scope of the function (defaults to this)
     * @param {Number} startIndex (optional) The index to start searching at
     * @return {Number} The matched index or -1
     */
    findBy : function(fn, scope, start){
        return this.data.findIndexBy(fn, scope, start);
    },

    /**
     * Collects unique values for a particular dataIndex from this store.
     * @param {String} dataIndex The property to collect
     * @param {Boolean} allowNull (optional) Pass true to allow null, undefined or empty string values
     * @param {Boolean} bypassFilter (optional) Pass true to collect from all records, even ones which are filtered
     * @return {Array} An array of the unique values
     **/
    collect : function(dataIndex, allowNull, bypassFilter){
        var d = (bypassFilter === true && this.snapshot) ?
                this.snapshot.items : this.data.items;
        var v, sv, r = [], l = {};
        for(var i = 0, len = d.length; i < len; i++){
            v = d[i].data[dataIndex];
            sv = String(v);
            if((allowNull || !Ext.isEmpty(v)) && !l[sv]){
                l[sv] = true;
                r[r.length] = v;
            }
        }
        return r;
    },

    /**
     * Revert to a view of the Record cache with no filtering applied.
     * @param {Boolean} suppressEvent If <tt>true</tt> the filter is cleared silently without firing the
     * {@link #datachanged} event.
     */
    clearFilter : function(suppressEvent){
        if(this.isFiltered()){
            this.data = this.snapshot;
            delete this.snapshot;
            if(suppressEvent !== true){
                this.fireEvent('datachanged', this);
            }
        }
    },

    /**
     * Returns true if this store is currently filtered
     * @return {Boolean}
     */
    isFiltered : function(){
        return this.snapshot && this.snapshot != this.data;
    },

    // private
    afterEdit : function(record){
        if(this.modified.indexOf(record) == -1){
            this.modified.push(record);
        }
        this.fireEvent('update', this, record, Ext.data.Record.EDIT);
    },

    // private
    afterReject : function(record){
        this.modified.remove(record);
        this.fireEvent('update', this, record, Ext.data.Record.REJECT);
    },

    // private
    afterCommit : function(record){
        this.modified.remove(record);
        this.fireEvent('update', this, record, Ext.data.Record.COMMIT);
    },

    /**
     * Commit all Records with {@link #getModifiedRecords outstanding changes}. To handle updates for changes,
     * subscribe to the Store's {@link #update update event}, and perform updating when the third parameter is
     * Ext.data.Record.COMMIT.
     */
    commitChanges : function(){
        var m = this.modified.slice(0);
        this.modified = [];
        for(var i = 0, len = m.length; i < len; i++){
            m[i].commit();
        }
    },

    /**
     * {@link Ext.data.Record#reject Reject} outstanding changes on all {@link #getModifiedRecords modified records}.
     */
    rejectChanges : function(){
        var m = this.modified.slice(0);
        this.modified = [];
        for(var i = 0, len = m.length; i < len; i++){
            m[i].reject();
        }
    },

    // private
    onMetaChange : function(meta, rtype, o){
        this.recordType = rtype;
        this.fields = rtype.prototype.fields;
        delete this.snapshot;
        if(meta.sortInfo){
            this.sortInfo = meta.sortInfo;
        }else if(this.sortInfo  && !this.fields.get(this.sortInfo.field)){
            delete this.sortInfo;
        }
        this.modified = [];
        this.fireEvent('metachange', this, this.reader.meta);
    },

    // private
    findInsertIndex : function(record){
        this.suspendEvents();
        var data = this.data.clone();
        this.data.add(record);
        this.applySort();
        var index = this.data.indexOf(record);
        this.data = data;
        this.resumeEvents();
        return index;
    },

    /**
     * Set the value for a property name in this store's {@link #baseParams}.  Usage:</p><pre><code>
myStore.setBaseParam('foo', {bar:3});
</code></pre>
     * @param {String} name Name of the property to assign
     * @param {Mixed} value Value to assign the <tt>name</tt>d property
     **/
    setBaseParam : function (name, value){
        this.baseParams = this.baseParams || {};
        this.baseParams[name] = value;
    }
});

Ext.reg('store', Ext.data.Store);

/**
 * @class Ext.data.Store.Error
 * @extends Ext.Error
 * Store Error extension.
 * @param {String} name
 */
Ext.data.Store.Error = Ext.extend(Ext.Error, {
    name: 'Ext.data.Store'
});
Ext.apply(Ext.data.Store.Error.prototype, {
    lang: {
        'writer-undefined' : 'Attempted to execute a write-action without a DataWriter installed.'
    }
});

/**
 * @class Ext.data.Field
 * <p>This class encapsulates the field definition information specified in the field definition objects
 * passed to {@link Ext.data.Record#create}.</p>
 * <p>Developers do not need to instantiate this class. Instances are created by {@link Ext.data.Record.create}
 * and cached in the {@link Ext.data.Record#fields fields} property of the created Record constructor's <b>prototype.</b></p>
 */
Ext.data.Field = function(config){
    if(typeof config == "string"){
        config = {name: config};
    }
    Ext.apply(this, config);

    if(!this.type){
        this.type = "auto";
    }

    var st = Ext.data.SortTypes;
    // named sortTypes are supported, here we look them up
    if(typeof this.sortType == "string"){
        this.sortType = st[this.sortType];
    }

    // set default sortType for strings and dates
    if(!this.sortType){
        switch(this.type){
            case "string":
                this.sortType = st.asUCString;
                break;
            case "date":
                this.sortType = st.asDate;
                break;
            default:
                this.sortType = st.none;
        }
    }

    // define once
    var stripRe = /[\$,%]/g;

    // prebuilt conversion function for this field, instead of
    // switching every time we're reading a value
    if(!this.convert){
        var cv, dateFormat = this.dateFormat;
        switch(this.type){
            case "":
            case "auto":
            case undefined:
                cv = function(v){ return v; };
                break;
            case "string":
                cv = function(v){ return (v === undefined || v === null) ? '' : String(v); };
                break;
            case "int":
                cv = function(v){
                    return v !== undefined && v !== null && v !== '' ?
                           parseInt(String(v).replace(stripRe, ""), 10) : '';
                    };
                break;
            case "float":
                cv = function(v){
                    return v !== undefined && v !== null && v !== '' ?
                           parseFloat(String(v).replace(stripRe, ""), 10) : '';
                    };
                break;
            case "bool":
            case "boolean":
                cv = function(v){ return v === true || v === "true" || v == 1; };
                break;
            case "date":
                cv = function(v){
                    if(!v){
                        return '';
                    }
                    if(Ext.isDate(v)){
                        return v;
                    }
                    if(dateFormat){
                        if(dateFormat == "timestamp"){
                            return new Date(v*1000);
                        }
                        if(dateFormat == "time"){
                            return new Date(parseInt(v, 10));
                        }
                        return Date.parseDate(v, dateFormat);
                    }
                    var parsed = Date.parse(v);
                    return parsed ? new Date(parsed) : null;
                };
             break;

        }
        this.convert = cv;
    }
};

Ext.data.Field.prototype = {
    /**
     * @cfg {String} name
     * The name by which the field is referenced within the Record. This is referenced by, for example,
     * the <tt>dataIndex</tt> property in column definition objects passed to {@link Ext.grid.ColumnModel}.
     * <p>Note: In the simplest case, if no properties other than <tt>name</tt> are required, a field
     * definition may consist of just a String for the field name.</p>
     */
    /**
     * @cfg {String} type
     * (Optional) The data type for conversion to displayable value if <tt>{@link Ext.data.Field#convert convert}</tt>
     * has not been specified. Possible values are
     * <div class="mdetail-params"><ul>
     * <li>auto (Default, implies no conversion)</li>
     * <li>string</li>
     * <li>int</li>
     * <li>float</li>
     * <li>boolean</li>
     * <li>date</li></ul></div>
     */
    /**
     * @cfg {Function} convert
     * (Optional) A function which converts the value provided by the Reader into an object that will be stored
     * in the Record. It is passed the following parameters:<div class="mdetail-params"><ul>
     * <li><b>v</b> : Mixed<div class="sub-desc">The data value as read by the Reader, if undefined will use
     * the configured <tt>{@link Ext.data.Field#defaultValue defaultValue}</tt>.</div></li>
     * <li><b>rec</b> : Mixed<div class="sub-desc">The data object containing the row as read by the Reader.
     * Depending on the Reader type, this could be an Array ({@link Ext.data.ArrayReader ArrayReader}), an object
     *  ({@link Ext.data.JsonReader JsonReader}), or an XML element ({@link Ext.data.XMLReader XMLReader}).</div></li>
     * </ul></div>
     * <pre><code>
// example of convert function
function fullName(v, record){
    return record.name.last + ', ' + record.name.first;
}

function location(v, record){
    return !record.city ? '' : (record.city + ', ' + record.state);
}

var Dude = Ext.data.Record.create([
    {name: 'fullname',  convert: fullName},
    {name: 'firstname', mapping: 'name.first'},
    {name: 'lastname',  mapping: 'name.last'},
    {name: 'city', defaultValue: 'homeless'},
    'state',
    {name: 'location',  convert: location}
]);

// create the data store
var store = new Ext.data.Store({
    reader: new Ext.data.JsonReader(
        {
            idProperty: 'key',
            root: 'daRoot',  
            totalProperty: 'total'
        },
        Dude  // recordType
    )
});

var myData = [
    { key: 1,
      name: { first: 'Fat',    last:  'Albert' }
      // notice no city, state provided in data object
    },
    { key: 2,
      name: { first: 'Barney', last:  'Rubble' },
      city: 'Bedrock', state: 'Stoneridge'
    },
    { key: 3,
      name: { first: 'Cliff',  last:  'Claven' },
      city: 'Boston',  state: 'MA'
    }
];
     * </code></pre>
     */
    /**
     * @cfg {String} dateFormat
     * (Optional) A format string for the {@link Date#parseDate Date.parseDate} function, or "timestamp" if the
     * value provided by the Reader is a UNIX timestamp, or "time" if the value provided by the Reader is a
     * javascript millisecond timestamp.
     */
    dateFormat: null,
    /**
     * @cfg {Mixed} defaultValue
     * (Optional) The default value used <b>when a Record is being created by a {@link Ext.data.Reader Reader}</b>
     * when the item referenced by the <tt>{@link Ext.data.Field#mapping mapping}</tt> does not exist in the data
     * object (i.e. undefined). (defaults to "")
     */
    defaultValue: "",
    /**
     * @cfg {String/Number} mapping
     * <p>(Optional) A path expression for use by the {@link Ext.data.DataReader} implementation
     * that is creating the {@link Ext.data.Record Record} to extract the Field value from the data object.
     * If the path expression is the same as the field name, the mapping may be omitted.</p>
     * <p>The form of the mapping expression depends on the Reader being used.</p>
     * <div class="mdetail-params"><ul>
     * <li>{@link Ext.data.JsonReader}<div class="sub-desc">The mapping is a string containing the javascript
     * expression to reference the data from an element of the data item's {@link Ext.data.JsonReader#root root} Array. Defaults to the field name.</div></li>
     * <li>{@link Ext.data.XmlReader}<div class="sub-desc">The mapping is an {@link Ext.DomQuery} path to the data
     * item relative to the DOM element that represents the {@link Ext.data.XmlReader#record record}. Defaults to the field name.</div></li>
     * <li>{@link Ext.data.ArrayReader}<div class="sub-desc">The mapping is a number indicating the Array index
     * of the field's value. Defaults to the field specification's Array position.</div></li>
     * </ul></div>
     * <p>If a more complex value extraction strategy is required, then configure the Field with a {@link #convert}
     * function. This is passed the whole row object, and may interrogate it in whatever way is necessary in order to
     * return the desired data.</p>
     */
    mapping: null,
    /**
     * @cfg {Function} sortType
     * (Optional) A function which converts a Field's value to a comparable value in order to ensure
     * correct sort ordering. Predefined functions are provided in {@link Ext.data.SortTypes}. A custom
     * sort example:<pre><code>
// current sort     after sort we want
// +-+------+          +-+------+
// |1|First |          |1|First |
// |2|Last  |          |3|Second|
// |3|Second|          |2|Last  |
// +-+------+          +-+------+

sortType: function(value) {
   switch (value.toLowerCase()) // native toLowerCase():
   {
      case 'first': return 1;
      case 'second': return 2;
      default: return 3;
   }
}
     * </code></pre>
     */
    sortType : null,
    /**
     * @cfg {String} sortDir
     * (Optional) Initial direction to sort (<tt>"ASC"</tt> or  <tt>"DESC"</tt>).  Defaults to
     * <tt>"ASC"</tt>.
     */
    sortDir : "ASC",
	/**
	 * @cfg {Boolean} allowBlank 
	 * (Optional) Used for validating a {@link Ext.data.Record record}, defaults to <tt>true</tt>.
	 * An empty value here will cause {@link Ext.data.Record}.{@link Ext.data.Record#isValid isValid}
	 * to evaluate to <tt>false</tt>.
	 */
	allowBlank : true
};/**
 * @class Ext.data.DataReader
 * Abstract base class for reading structured data from a data source and converting
 * it into an object containing {@link Ext.data.Record} objects and metadata for use
 * by an {@link Ext.data.Store}.  This class is intended to be extended and should not
 * be created directly. For existing implementations, see {@link Ext.data.ArrayReader},
 * {@link Ext.data.JsonReader} and {@link Ext.data.XmlReader}.
 * @constructor Create a new DataReader
 * @param {Object} meta Metadata configuration options (implementation-specific).
 * @param {Array/Object} recordType
 * <p>Either an Array of {@link Ext.data.Field Field} definition objects (which
 * will be passed to {@link Ext.data.Record#create}, or a {@link Ext.data.Record Record}
 * constructor created using {@link Ext.data.Record#create}.</p>
 */
Ext.data.DataReader = function(meta, recordType){
    /**
     * This DataReader's configured metadata as passed to the constructor.
     * @type Mixed
     * @property meta
     */
    this.meta = meta;
    /**
     * @cfg {Array/Object} fields
     * <p>Either an Array of {@link Ext.data.Field Field} definition objects (which
     * will be passed to {@link Ext.data.Record#create}, or a {@link Ext.data.Record Record}
     * constructor created from {@link Ext.data.Record#create}.</p>
     */
    this.recordType = Ext.isArray(recordType) ?
        Ext.data.Record.create(recordType) : recordType;
};

Ext.data.DataReader.prototype = {

    /**
     * Abstract method, overridden in {@link Ext.data.JsonReader}
     */
    buildExtractors : Ext.emptyFn,

    /**
     * Used for un-phantoming a record after a successful database insert.  Sets the records pk along with new data from server.
     * You <b>must</b> return at least the database pk using the idProperty defined in your DataReader configuration.  The incoming
     * data from server will be merged with the data in the local record.
     * In addition, you <b>must</b> return record-data from the server in the same order received.
     * Will perform a commit as well, un-marking dirty-fields.  Store's "update" event will be suppressed.
     * @param {Record/Record[]} record The phantom record to be realized.
     * @param {Object/Object[]} data The new record data to apply.  Must include the primary-key from database defined in idProperty field.
     */
    realize: function(rs, data){
        if (Ext.isArray(rs)) {
            for (var i = rs.length - 1; i >= 0; i--) {
                // recurse
                if (Ext.isArray(data)) {
                    this.realize(rs.splice(i,1).shift(), data.splice(i,1).shift());
                }
                else {
                    // weird...rs is an array but data isn't??  recurse but just send in the whole invalid data object.
                    // the else clause below will detect !this.isData and throw exception.
                    this.realize(rs.splice(i,1).shift(), data);
                }
            }
        }
        else {
            // If rs is NOT an array but data IS, see if data contains just 1 record.  If so extract it and carry on.
            if (Ext.isArray(data) && data.length == 1) {
                data = data.shift();
            }
            if (!this.isData(data)) {
                // TODO: Let exception-handler choose to commit or not rather than blindly rs.commit() here.
                //rs.commit();
                throw new Ext.data.DataReader.Error('realize', rs);
            }
            this.buildExtractors();
            var values = this.extractValues(data, rs.fields.items, rs.fields.items.length);
            rs.phantom = false; // <-- That's what it's all about
            rs._phid = rs.id;  // <-- copy phantom-id -> _phid, so we can remap in Store#onCreateRecords
            rs.id = data[this.meta.idProperty];
            rs.data = values;
            rs.commit();
        }
    },

    /**
     * Used for updating a non-phantom or "real" record's data with fresh data from server after remote-save.
     * You <b>must</b> return a complete new record from the server.  If you don't, your local record's missing fields
     * will be populated with the default values specified in your Ext.data.Record.create specification.  Without a defaultValue,
     * local fields will be populated with empty string "".  So return your entire record's data after both remote create and update.
     * In addition, you <b>must</b> return record-data from the server in the same order received.
     * Will perform a commit as well, un-marking dirty-fields.  Store's "update" event will be suppressed as the record receives
     * a fresh new data-hash.
     * @param {Record/Record[]} rs
     * @param {Object/Object[]} data
     */
    update : function(rs, data) {
        if (Ext.isArray(rs)) {
            for (var i=rs.length-1; i >= 0; i--) {
                if (Ext.isArray(data)) {
                    this.update(rs.splice(i,1).shift(), data.splice(i,1).shift());
                }
                else {
                    // weird...rs is an array but data isn't??  recurse but just send in the whole data object.
                    // the else clause below will detect !this.isData and throw exception.
                    this.update(rs.splice(i,1).shift(), data);
                }
            }
        }
        else {
                     // If rs is NOT an array but data IS, see if data contains just 1 record.  If so extract it and carry on.
            if (Ext.isArray(data) && data.length == 1) {
                data = data.shift();
            }
            if (!this.isData(data)) {
                // TODO: create custom Exception class to return record in thrown exception.  Allow exception-handler the choice
                // to commit or not rather than blindly rs.commit() here.
                rs.commit();
                throw new Ext.data.DataReader.Error('update', rs);
            }
            this.buildExtractors();
            rs.data = this.extractValues(Ext.apply(rs.data, data), rs.fields.items, rs.fields.items.length);
            rs.commit();
        }
    },

    /**
     * Returns true if the supplied data-hash <b>looks</b> and quacks like data.  Checks to see if it has a key
     * corresponding to idProperty defined in your DataReader config containing non-empty pk.
     * @param {Object} data
     * @return {Boolean}
     */
    isData : function(data) {
        return (data && Ext.isObject(data) && !Ext.isEmpty(data[this.meta.idProperty])) ? true : false;
    }
};

/**
 * @class Ext.data.DataReader.Error
 * @extends Ext.Error
 * General error class for Ext.data.DataReader
 */
Ext.data.DataReader.Error = Ext.extend(Ext.Error, {
    constructor : function(message, arg) {
        this.arg = arg;
        Ext.Error.call(this, message);
    },
    name: 'Ext.data.DataReader'
});
Ext.apply(Ext.data.DataReader.Error.prototype, {
    lang : {
        'update': "#update received invalid data from server.  Please see docs for DataReader#update and review your DataReader configuration.",
        'realize': "#realize was called with invalid remote-data.  Please see the docs for DataReader#realize and review your DataReader configuration.",
        'invalid-response': "#readResponse received an invalid response from the server."
    }
});


/**
 * @class Ext.data.DataWriter
 * <p>Ext.data.DataWriter facilitates create, update, and destroy actions between
 * an Ext.data.Store and a server-side framework. A Writer enabled Store will
 * automatically manage the Ajax requests to perform CRUD actions on a Store.</p>
 * <p>Ext.data.DataWriter is an abstract base class which is intended to be extended
 * and should not be created directly. For existing implementations, see
 * {@link Ext.data.JsonWriter}.</p>
 * <p>Creating a writer is simple:</p>
 * <pre><code>
var writer = new Ext.data.JsonWriter();
 * </code></pre>
 * <p>The proxy for a writer enabled store can be configured with a simple <code>url</code>:</p>
 * <pre><code>
// Create a standard HttpProxy instance.
var proxy = new Ext.data.HttpProxy({
    url: 'app.php/users'
});
 * </code></pre>
 * <p>For finer grained control, the proxy may also be configured with an <code>api</code>:</p>
 * <pre><code>
// Use the api specification
var proxy = new Ext.data.HttpProxy({
    api: {
        read    : 'app.php/users/read',
        create  : 'app.php/users/create',
        update  : 'app.php/users/update',
        destroy : 'app.php/users/destroy'
    }
});
 * </code></pre>
 * <p>Creating a Writer enabled store:</p>
 * <pre><code>
var store = new Ext.data.Store({
    proxy: proxy,
    reader: reader,
    writer: writer
});
 * </code></pre>
 * @constructor Create a new DataWriter
 * @param {Object} meta Metadata configuration options (implementation-specific)
 * @param {Object} recordType Either an Array of field definition objects as specified
 * in {@link Ext.data.Record#create}, or an {@link Ext.data.Record} object created
 * using {@link Ext.data.Record#create}.
 */
Ext.data.DataWriter = function(config){
    /**
     * This DataWriter's configured metadata as passed to the constructor.
     * @type Mixed
     * @property meta
     */
    Ext.apply(this, config);
};

Ext.data.DataWriter.prototype = {

    /**
     * @cfg {Boolean} writeAllFields
     * <tt>false</tt> by default.  Set <tt>true</tt> to have DataWriter return ALL fields of a modified
     * record -- not just those that changed.
     * <tt>false</tt> to have DataWriter only request modified fields from a record.
     */
    writeAllFields : false,
    /**
     * @cfg {Boolean} listful
     * <tt>false</tt> by default.  Set <tt>true</tt> to have the DataWriter <b>always</b> write HTTP params as a list,
     * even when acting upon a single record.
     */
    listful : false,    // <-- listful is actually not used internally here in DataWriter.  @see Ext.data.Store#execute.

    /**
     * Writes data in preparation for server-write action.  Simply proxies to DataWriter#update, DataWriter#create
     * DataWriter#destroy.
     * @param {String} action [CREATE|UPDATE|DESTROY]
     * @param {Object} params The params-hash to write-to
     * @param {Record/Record[]} rs The recordset write.
     */
    write : function(action, params, rs) {
        this.render(action, rs, params, this[action](rs));
    },

    /**
     * abstract method meant to be overridden by all DataWriter extensions.  It's the extension's job to apply the "data" to the "params".
     * The data-object provided to render is populated with data according to the meta-info defined in the user's DataReader config,
     * @param {String} action [Ext.data.Api.actions.create|read|update|destroy]
     * @param {Record[]} rs Store recordset
     * @param {Object} params Http params to be sent to server.
     * @param {Object} data object populated according to DataReader meta-data.
     */
    render : Ext.emptyFn,

    /**
     * update
     * @param {Object} p Params-hash to apply result to.
     * @param {Record/Record[]} rs Record(s) to write
     * @private
     */
    update : function(rs) {
        var params = {};
        if (Ext.isArray(rs)) {
            var data = [],
                ids = [];
            Ext.each(rs, function(val){
                ids.push(val.id);
                data.push(this.updateRecord(val));
            }, this);
            params[this.meta.idProperty] = ids;
            params[this.meta.root] = data;
        }
        else if (rs instanceof Ext.data.Record) {
            params[this.meta.idProperty] = rs.id;
            params[this.meta.root] = this.updateRecord(rs);
        }
        return params;
    },

    /**
     * @cfg {Function} saveRecord Abstract method that should be implemented in all subclasses
     * (e.g.: {@link Ext.data.JsonWriter#saveRecord JsonWriter.saveRecord}
     */
    updateRecord : Ext.emptyFn,

    /**
     * create
     * @param {Object} p Params-hash to apply result to.
     * @param {Record/Record[]} rs Record(s) to write
     * @private
     */
    create : function(rs) {
        var params = {};
        if (Ext.isArray(rs)) {
            var data = [];
            Ext.each(rs, function(val){
                data.push(this.createRecord(val));
            }, this);
            params[this.meta.root] = data;
        }
        else if (rs instanceof Ext.data.Record) {
            params[this.meta.root] = this.createRecord(rs);
        }
        return params;
    },

    /**
     * @cfg {Function} createRecord Abstract method that should be implemented in all subclasses
     * (e.g.: {@link Ext.data.JsonWriter#createRecord JsonWriter.createRecord})
     */
    createRecord : Ext.emptyFn,

    /**
     * destroy
     * @param {Object} p Params-hash to apply result to.
     * @param {Record/Record[]} rs Record(s) to write
     * @private
     */
    destroy : function(rs) {
        var params = {};
        if (Ext.isArray(rs)) {
            var data = [],
                ids = [];
            Ext.each(rs, function(val){
                data.push(this.destroyRecord(val));
            }, this);
            params[this.meta.root] = data;
        } else if (rs instanceof Ext.data.Record) {
            params[this.meta.root] = this.destroyRecord(rs);
        }
        return params;
    },

    /**
     * @cfg {Function} destroyRecord Abstract method that should be implemented in all subclasses
     * (e.g.: {@link Ext.data.JsonWriter#destroyRecord JsonWriter.destroyRecord})
     */
    destroyRecord : Ext.emptyFn,

    /**
     * Converts a Record to a hash
     * @param {Record}
     * @private
     */
    toHash : function(rec) {
        var map = rec.fields.map,
            data = {},
            raw = (this.writeAllFields === false && rec.phantom === false) ? rec.getChanges() : rec.data,
            m;
        Ext.iterate(raw, function(prop, value){
            if((m = map[prop])){
                data[m.mapping ? m.mapping : m.name] = value;
            }
        });
        data[this.meta.idProperty] = rec.id;
        return data;
    }
};/**
 * @class Ext.data.DataProxy
 * @extends Ext.util.Observable
 * <p>Abstract base class for implementations which provide retrieval of unformatted data objects.
 * This class is intended to be extended and should not be created directly. For existing implementations,
 * see {@link Ext.data.DirectProxy}, {@link Ext.data.HttpProxy}, {@link Ext.data.ScriptTagProxy} and
 * {@link Ext.data.MemoryProxy}.</p>
 * <p>DataProxy implementations are usually used in conjunction with an implementation of {@link Ext.data.DataReader}
 * (of the appropriate type which knows how to parse the data object) to provide a block of
 * {@link Ext.data.Records} to an {@link Ext.data.Store}.</p>
 * <p>The parameter to a DataProxy constructor may be an {@link Ext.data.Connection} or can also be the
 * config object to an {@link Ext.data.Connection}.</p>
 * <p>Custom implementations must implement either the <code><b>doRequest</b></code> method (preferred) or the
 * <code>load</code> method (deprecated). See
 * {@link Ext.data.HttpProxy}.{@link Ext.data.HttpProxy#doRequest doRequest} or
 * {@link Ext.data.HttpProxy}.{@link Ext.data.HttpProxy#load load} for additional details.</p>
 * <p><b><u>Example 1</u></b></p>
 * <pre><code>
proxy: new Ext.data.ScriptTagProxy({
    {@link Ext.data.Connection#url url}: 'http://extjs.com/forum/topics-remote.php'
}),
 * </code></pre>
 * <p><b><u>Example 2</u></b></p>
 * <pre><code>
proxy : new Ext.data.HttpProxy({
    {@link Ext.data.Connection#method method}: 'GET',
    {@link Ext.data.HttpProxy#prettyUrls prettyUrls}: false,
    {@link Ext.data.Connection#url url}: 'local/default.php', // see options parameter for {@link Ext.Ajax#request}
    {@link #api}: {
        // all actions except the following will use above url
        create  : 'local/new.php',
        update  : 'local/update.php'
    }
}),
 * </code></pre>
 */
Ext.data.DataProxy = function(conn){
    // make sure we have a config object here to support ux proxies.
    // All proxies should now send config into superclass constructor.
    conn = conn || {};

    // This line caused a bug when people use custom Connection object having its own request method.
    // http://extjs.com/forum/showthread.php?t=67194.  Have to set DataProxy config
    //Ext.applyIf(this, conn);

    this.api     = conn.api;
    this.url     = conn.url;
    this.restful = conn.restful;
    this.listeners = conn.listeners;

    // deprecated
    this.prettyUrls = conn.prettyUrls;

    /**
     * @cfg {Object} api
     * Specific urls to call on CRUD action methods "read", "create", "update" and "destroy".
     * Defaults to:<pre><code>
api: {
    read    : undefined,
    create  : undefined,
    update  : undefined,
    destroy : undefined
}
</code></pre>
     * <p>If the specific URL for a given CRUD action is undefined, the CRUD action request
     * will be directed to the configured <tt>{@link Ext.data.Connection#url url}</tt>.</p>
     * <br><p><b>Note</b>: To modify the URL for an action dynamically the appropriate API
     * property should be modified before the action is requested using the corresponding before
     * action event.  For example to modify the URL associated with the load action:
     * <pre><code>
// modify the url for the action
myStore.on({
    beforeload: {
        fn: function (store, options) {
            // use <tt>{@link Ext.data.HttpProxy#setUrl setUrl}</tt> to change the URL for *just* this request.
            store.proxy.setUrl('changed1.php');

            // set optional second parameter to true to make this URL change
            // permanent, applying this URL for all subsequent requests.
            store.proxy.setUrl('changed1.php', true);

            // manually set the <b>private</b> connection URL.
            // <b>Warning:</b>  Accessing the private URL property should be avoided.
            // Use the public method <tt>{@link Ext.data.HttpProxy#setUrl setUrl}</tt> instead, shown above.
            // It should be noted that changing the URL like this will affect
            // the URL for just this request.  Subsequent requests will use the
            // API or URL defined in your initial proxy configuration.
            store.proxy.conn.url = 'changed1.php';

            // proxy URL will be superseded by API (only if proxy created to use ajax):
            // It should be noted that proxy API changes are permanent and will
            // be used for all subsequent requests.
            store.proxy.api.load = 'changed2.php';

            // However, altering the proxy API should be done using the public
            // method <tt>{@link Ext.data.DataProxy#setApi setApi}</tt> instead.
            store.proxy.setApi('load', 'changed2.php');

            // Or set the entire API with a config-object.
            // When using the config-object option, you must redefine the <b>entire</b>
            // API -- not just a specific action of it.
            store.proxy.setApi({
                read    : 'changed_read.php',
                create  : 'changed_create.php',
                update  : 'changed_update.php',
                destroy : 'changed_destroy.php'
            });
        }
    }
});
     * </code></pre>
     * </p>
     */
    // Prepare the proxy api.  Ensures all API-actions are defined with the Object-form.
    try {
        Ext.data.Api.prepare(this);
    } catch (e) {
        if (e instanceof Ext.data.Api.Error) {
            e.toConsole();
        }
    }

    this.addEvents(
        /**
         * @event exception
         * <p>Fires if an exception occurs in the Proxy during a remote request.
         * This event is relayed through a corresponding
         * {@link Ext.data.Store}.{@link Ext.data.Store#exception exception},
         * so any Store instance may observe this event.
         * This event can be fired for one of two reasons:</p>
         * <div class="mdetail-params"><ul>
         * <li>remote-request <b>failed</b> : <div class="sub-desc">
         * The server did not return status === 200.
         * </div></li>
         * <li>remote-request <b>succeeded</b> : <div class="sub-desc">
         * The remote-request succeeded but the reader could not read the response.
         * This means the server returned data, but the configured Reader threw an
         * error while reading the response.  In this case, this event will be
         * raised and the caught error will be passed along into this event.
         * </div></li>
         * </ul></div>
         * <br><p>This event fires with two different contexts based upon the 2nd
         * parameter <tt>type [remote|response]</tt>.  The first four parameters
         * are identical between the two contexts -- only the final two parameters
         * differ.</p>
         * @param {DataProxy} this The proxy that sent the request
         * @param {String} type
         * <p>The value of this parameter will be either <tt>'response'</tt> or <tt>'remote'</tt>.</p>
         * <div class="mdetail-params"><ul>
         * <li><b><tt>'response'</tt></b> : <div class="sub-desc">
         * <p>An <b>invalid</b> response from the server was returned: either 404,
         * 500 or the response meta-data does not match that defined in the DataReader
         * (e.g.: root, idProperty, successProperty).</p>
         * </div></li>
         * <li><b><tt>'remote'</tt></b> : <div class="sub-desc">
         * <p>A <b>valid</b> response was returned from the server having
         * successProperty === false.  This response might contain an error-message
         * sent from the server.  For example, the user may have failed
         * authentication/authorization or a database validation error occurred.</p>
         * </div></li>
         * </ul></div>
         * @param {String} action Name of the action (see {@link Ext.data.Api#actions}.
         * @param {Object} options The options for the action that were specified in the {@link #request}.
         * @param {Object} response
         * <p>The value of this parameter depends on the value of the <code>type</code> parameter:</p>
         * <div class="mdetail-params"><ul>
         * <li><b><tt>'response'</tt></b> : <div class="sub-desc">
         * <p>The raw browser response object (e.g.: XMLHttpRequest)</p>
         * </div></li>
         * <li><b><tt>'remote'</tt></b> : <div class="sub-desc">
         * <p>The decoded response object sent from the server.</p>
         * </div></li>
         * </ul></div>
         * @param {Mixed} arg
         * <p>The type and value of this parameter depends on the value of the <code>type</code> parameter:</p>
         * <div class="mdetail-params"><ul>
         * <li><b><tt>'response'</tt></b> : Error<div class="sub-desc">
         * <p>The JavaScript Error object caught if the configured Reader could not read the data.
         * If the remote request returns success===false, this parameter will be null.</p>
         * </div></li>
         * <li><b><tt>'remote'</tt></b> : Record/Record[]<div class="sub-desc">
         * <p>This parameter will only exist if the <tt>action</tt> was a <b>write</b> action
         * (Ext.data.Api.actions.create|update|destroy).</p>
         * </div></li>
         * </ul></div>
         */
        'exception',
        /**
         * @event beforeload
         * Fires before a request to retrieve a data object.
         * @param {DataProxy} this The proxy for the request
         * @param {Object} params The params object passed to the {@link #request} function
         */
        'beforeload',
        /**
         * @event load
         * Fires before the load method's callback is called.
         * @param {DataProxy} this The proxy for the request
         * @param {Object} o The request transaction object
         * @param {Object} options The callback's <tt>options</tt> property as passed to the {@link #request} function
         */
        'load',
        /**
         * @event loadexception
         * <p>This event is <b>deprecated</b>.  The signature of the loadexception event
         * varies depending on the proxy, use the catch-all {@link #exception} event instead.
         * This event will fire in addition to the {@link #exception} event.</p>
         * @param {misc} misc See {@link #exception}.
         * @deprecated
         */
        'loadexception',
        /**
         * @event beforewrite
         * Fires before a request is generated for one of the actions Ext.data.Api.actions.create|update|destroy
         * @param {DataProxy} this The proxy for the request
         * @param {String} action [Ext.data.Api.actions.create|update|destroy]
         * @param {Record/Array[Record]} rs The Record(s) to create|update|destroy.
         * @param {Object} params The request <code>params</code> object.  Edit <code>params</code> to add parameters to the request.
         */
        'beforewrite',
        /**
         * @event write
         * Fires before the request-callback is called
         * @param {DataProxy} this The proxy that sent the request
         * @param {String} action [Ext.data.Api.actions.create|upate|destroy]
         * @param {Object} data The data object extracted from the server-response
         * @param {Object} response The decoded response from server
         * @param {Record/Record{}} rs The records from Store
         * @param {Object} options The callback's <tt>options</tt> property as passed to the {@link #request} function
         */
        'write'
    );
    Ext.data.DataProxy.superclass.constructor.call(this);
};

Ext.extend(Ext.data.DataProxy, Ext.util.Observable, {
    /**
     * @cfg {Boolean} restful
     * <p>Defaults to <tt>false</tt>.  Set to <tt>true</tt> to operate in a RESTful manner.</p>
     * <br><p> Note: this parameter will automatically be set to <tt>true</tt> if the
     * {@link Ext.data.Store} it is plugged into is set to <code>restful: true</code>. If the
     * Store is RESTful, there is no need to set this option on the proxy.</p>
     * <br><p>RESTful implementations enable the serverside framework to automatically route
     * actions sent to one url based upon the HTTP method, for example:
     * <pre><code>
store: new Ext.data.Store({
    restful: true,
    proxy: new Ext.data.HttpProxy({url:'/users'}); // all requests sent to /users
    ...
)}
     * </code></pre>
     * There is no <code>{@link #api}</code> specified in the configuration of the proxy,
     * all requests will be marshalled to a single RESTful url (/users) so the serverside
     * framework can inspect the HTTP Method and act accordingly:
     * <pre>
<u>Method</u>   <u>url</u>        <u>action</u>
POST     /users     create
GET      /users     read
PUT      /users/23  update
DESTROY  /users/23  delete
     * </pre></p>
     */
    restful: false,

    /**
     * <p>Redefines the Proxy's API or a single action of an API. Can be called with two method signatures.</p>
     * <p>If called with an object as the only parameter, the object should redefine the <b>entire</b> API, e.g.:</p><pre><code>
proxy.setApi({
    read    : '/users/read',
    create  : '/users/create',
    update  : '/users/update',
    destroy : '/users/destroy'
});
</code></pre>
     * <p>If called with two parameters, the first parameter should be a string specifying the API action to
     * redefine and the second parameter should be the URL (or function if using DirectProxy) to call for that action, e.g.:</p><pre><code>
proxy.setApi(Ext.data.Api.actions.read, '/users/new_load_url');
</code></pre>
     * @param {String/Object} api An API specification object, or the name of an action.
     * @param {String/Function} url The URL (or function if using DirectProxy) to call for the action.
     */
    setApi : function() {
        if (arguments.length == 1) {
            var valid = Ext.data.Api.isValid(arguments[0]);
            if (valid === true) {
                this.api = arguments[0];
            }
            else {
                throw new Ext.data.Api.Error('invalid', valid);
            }
        }
        else if (arguments.length == 2) {
            if (!Ext.data.Api.isAction(arguments[0])) {
                throw new Ext.data.Api.Error('invalid', arguments[0]);
            }
            this.api[arguments[0]] = arguments[1];
        }
        Ext.data.Api.prepare(this);
    },

    /**
     * Returns true if the specified action is defined as a unique action in the api-config.
     * request.  If all API-actions are routed to unique urls, the xaction parameter is unecessary.  However, if no api is defined
     * and all Proxy actions are routed to DataProxy#url, the server-side will require the xaction parameter to perform a switch to
     * the corresponding code for CRUD action.
     * @param {String [Ext.data.Api.CREATE|READ|UPDATE|DESTROY]} action
     * @return {Boolean}
     */
    isApiAction : function(action) {
        return (this.api[action]) ? true : false;
    },

    /**
     * All proxy actions are executed through this method.  Automatically fires the "before" + action event
     * @param {String} action Name of the action
     * @param {Ext.data.Record/Ext.data.Record[]/null} rs Will be null when action is 'load'
     * @param {Object} params
     * @param {Ext.data.DataReader} reader
     * @param {Function} callback
     * @param {Object} scope Scope with which to call the callback (defaults to the Proxy object)
     * @param {Object} options Any options specified for the action (e.g. see {@link Ext.data.Store#load}.
     */
    request : function(action, rs, params, reader, callback, scope, options) {
        if (!this.api[action] && !this.load) {
            throw new Ext.data.DataProxy.Error('action-undefined', action);
        }
        params = params || {};
        if ((action === Ext.data.Api.actions.read) ? this.fireEvent("beforeload", this, params) : this.fireEvent("beforewrite", this, action, rs, params) !== false) {
            this.doRequest.apply(this, arguments);
        }
        else {
            callback.call(scope || this, null, options, false);
        }
    },


    /**
     * <b>Deprecated</b> load method using old method signature. See {@doRequest} for preferred method.
     * @deprecated
     * @param {Object} params
     * @param {Object} reader
     * @param {Object} callback
     * @param {Object} scope
     * @param {Object} arg
     */
    load : null,

    /**
     * @cfg {Function} doRequest Abstract method that should be implemented in all subclasses
     * (e.g.: {@link Ext.data.HttpProxy#doRequest HttpProxy.doRequest},
     * {@link Ext.data.DirectProxy#doRequest DirectProxy.doRequest}).
     */
    doRequest : function(action, rs, params, reader, callback, scope, options) {
        // default implementation of doRequest for backwards compatibility with 2.0 proxies.
        // If we're executing here, the action is probably "load".
        // Call with the pre-3.0 method signature.
        this.load(params, reader, callback, scope, options);
    },

    /**
     * buildUrl
     * Sets the appropriate url based upon the action being executed.  If restful is true, and only a single record is being acted upon,
     * url will be built Rails-style, as in "/controller/action/32".  restful will aply iff the supplied record is an
     * instance of Ext.data.Record rather than an Array of them.
     * @param {String} action The api action being executed [read|create|update|destroy]
     * @param {Ext.data.Record/Array[Ext.data.Record]} The record or Array of Records being acted upon.
     * @return {String} url
     * @private
     */
    buildUrl : function(action, record) {
        record = record || null;
        var url = (this.api[action]) ? this.api[action].url : this.url;
        if (!url) {
            throw new Ext.data.Api.Error('invalid-url', action);
        }

        var format = null;
        var m = url.match(/(.*)(\.\w+)$/);  // <-- look for urls with "provides" suffix, e.g.: /users.json, /users.xml, etc
        if (m) {
            format = m[2];
            url = m[1];
        }
        // prettyUrls is deprectated in favor of restful-config
        if ((this.prettyUrls === true || this.restful === true) && record instanceof Ext.data.Record && !record.phantom) {
            url += '/' + record.id;
        }
        if (format) {   // <-- append the request format if exists (ie: /users/update/69[.json])
            url += format;
        }
        return url;
    },

    /**
     * Destroys the proxy by purging any event listeners and cancelling any active requests.
     */
    destroy: function(){
        this.purgeListeners();
    }
});

/**
 * @class Ext.data.DataProxy.Error
 * @extends Ext.Error
 * DataProxy Error extension.
 * constructor
 * @param {String} name
 * @param {Record/Array[Record]/Array}
 */
Ext.data.DataProxy.Error = Ext.extend(Ext.Error, {
    constructor : function(message, arg) {
        this.arg = arg;
        Ext.Error.call(this, message);
    },
    name: 'Ext.data.DataProxy'
});
Ext.apply(Ext.data.DataProxy.Error.prototype, {
    lang: {
        'action-undefined': "DataProxy attempted to execute an API-action but found an undefined url / function.  Please review your Proxy url/api-configuration.",
        'api-invalid': 'Recieved an invalid API-configuration.  Please ensure your proxy API-configuration contains only the actions from Ext.data.Api.actions.'
    }
});
/**
 * @class Ext.data.ScriptTagProxy
 * @extends Ext.data.DataProxy
 * An implementation of Ext.data.DataProxy that reads a data object from a URL which may be in a domain
 * other than the originating domain of the running page.<br>
 * <p>
 * <b>Note that if you are retrieving data from a page that is in a domain that is NOT the same as the originating domain
 * of the running page, you must use this class, rather than HttpProxy.</b><br>
 * <p>
 * The content passed back from a server resource requested by a ScriptTagProxy <b>must</b> be executable JavaScript
 * source code because it is used as the source inside a &lt;script> tag.<br>
 * <p>
 * In order for the browser to process the returned data, the server must wrap the data object
 * with a call to a callback function, the name of which is passed as a parameter by the ScriptTagProxy.
 * Below is a Java example for a servlet which returns data for either a ScriptTagProxy, or an HttpProxy
 * depending on whether the callback name was passed:
 * <p>
 * <pre><code>
boolean scriptTag = false;
String cb = request.getParameter("callback");
if (cb != null) {
    scriptTag = true;
    response.setContentType("text/javascript");
} else {
    response.setContentType("application/x-json");
}
Writer out = response.getWriter();
if (scriptTag) {
    out.write(cb + "(");
}
out.print(dataBlock.toJsonString());
if (scriptTag) {
    out.write(");");
}
</code></pre>
 *
 * @constructor
 * @param {Object} config A configuration object.
 */
Ext.data.ScriptTagProxy = function(config){
    Ext.apply(this, config);

    Ext.data.ScriptTagProxy.superclass.constructor.call(this, config);

    this.head = document.getElementsByTagName("head")[0];

    /**
     * @event loadexception
     * <b>Deprecated</b> in favor of 'exception' event.
     * Fires if an exception occurs in the Proxy during data loading.  This event can be fired for one of two reasons:
     * <ul><li><b>The load call timed out.</b>  This means the load callback did not execute within the time limit
     * specified by {@link #timeout}.  In this case, this event will be raised and the
     * fourth parameter (read error) will be null.</li>
     * <li><b>The load succeeded but the reader could not read the response.</b>  This means the server returned
     * data, but the configured Reader threw an error while reading the data.  In this case, this event will be
     * raised and the caught error will be passed along as the fourth parameter of this event.</li></ul>
     * Note that this event is also relayed through {@link Ext.data.Store}, so you can listen for it directly
     * on any Store instance.
     * @param {Object} this
     * @param {Object} options The loading options that were specified (see {@link #load} for details).  If the load
     * call timed out, this parameter will be null.
     * @param {Object} arg The callback's arg object passed to the {@link #load} function
     * @param {Error} e The JavaScript Error object caught if the configured Reader could not read the data.
     * If the remote request returns success: false, this parameter will be null.
     */
};

Ext.data.ScriptTagProxy.TRANS_ID = 1000;

Ext.extend(Ext.data.ScriptTagProxy, Ext.data.DataProxy, {
    /**
     * @cfg {String} url The URL from which to request the data object.
     */
    /**
     * @cfg {Number} timeout (optional) The number of milliseconds to wait for a response. Defaults to 30 seconds.
     */
    timeout : 30000,
    /**
     * @cfg {String} callbackParam (Optional) The name of the parameter to pass to the server which tells
     * the server the name of the callback function set up by the load call to process the returned data object.
     * Defaults to "callback".<p>The server-side processing must read this parameter value, and generate
     * javascript output which calls this named function passing the data object as its only parameter.
     */
    callbackParam : "callback",
    /**
     *  @cfg {Boolean} nocache (optional) Defaults to true. Disable caching by adding a unique parameter
     * name to the request.
     */
    nocache : true,

    /**
     * HttpProxy implementation of DataProxy#doRequest
     * @param {String} action
     * @param {Ext.data.Record/Ext.data.Record[]} rs If action is <tt>read</tt>, rs will be null
     * @param {Object} params An object containing properties which are to be used as HTTP parameters
     * for the request to the remote server.
     * @param {Ext.data.DataReader} reader The Reader object which converts the data
     * object into a block of Ext.data.Records.
     * @param {Function} callback The function into which to pass the block of Ext.data.Records.
     * The function must be passed <ul>
     * <li>The Record block object</li>
     * <li>The "arg" argument from the load function</li>
     * <li>A boolean success indicator</li>
     * </ul>
     * @param {Object} scope The scope in which to call the callback
     * @param {Object} arg An optional argument which is passed to the callback as its second parameter.
     */
    doRequest : function(action, rs, params, reader, callback, scope, arg) {
        var p = Ext.urlEncode(Ext.apply(params, this.extraParams));

        var url = this.buildUrl(action, rs);
        if (!url) {
            throw new Ext.data.Api.Error('invalid-url', url);
        }
        url = Ext.urlAppend(url, p);

        if(this.nocache){
            url = Ext.urlAppend(url, '_dc=' + (new Date().getTime()));
        }
        var transId = ++Ext.data.ScriptTagProxy.TRANS_ID;
        var trans = {
            id : transId,
            action: action,
            cb : "stcCallback"+transId,
            scriptId : "stcScript"+transId,
            params : params,
            arg : arg,
            url : url,
            callback : callback,
            scope : scope,
            reader : reader
        };
        window[trans.cb] = this.createCallback(action, rs, trans);
        url += String.format("&{0}={1}", this.callbackParam, trans.cb);
        if(this.autoAbort !== false){
            this.abort();
        }

        trans.timeoutId = this.handleFailure.defer(this.timeout, this, [trans]);

        var script = document.createElement("script");
        script.setAttribute("src", url);
        script.setAttribute("type", "text/javascript");
        script.setAttribute("id", trans.scriptId);
        this.head.appendChild(script);

        this.trans = trans;
    },

    // @private createCallback
    createCallback : function(action, rs, trans) {
        var self = this;
        return function(res) {
            self.trans = false;
            self.destroyTrans(trans, true);
            if (action === Ext.data.Api.actions.read) {
                self.onRead.call(self, action, trans, res);
            } else {
                self.onWrite.call(self, action, trans, res, rs);
            }
        };
    },
    /**
     * Callback for read actions
     * @param {String} action [Ext.data.Api.actions.create|read|update|destroy]
     * @param {Object} trans The request transaction object
     * @param {Object} res The server response
     * @private
     */
    onRead : function(action, trans, res) {
        var result;
        try {
            result = trans.reader.readRecords(res);
        }catch(e){
            // @deprecated: fire loadexception
            this.fireEvent("loadexception", this, trans, res, e);

            this.fireEvent('exception', this, 'response', action, trans, res, e);
            trans.callback.call(trans.scope||window, null, trans.arg, false);
            return;
        }
        if (result.success === false) {
            // @deprecated: fire old loadexception for backwards-compat.
            this.fireEvent('loadexception', this, trans, res);

            this.fireEvent('exception', this, 'remote', action, trans, res, null);
        } else {
            this.fireEvent("load", this, res, trans.arg);
        }
        trans.callback.call(trans.scope||window, result, trans.arg, result.success);
    },
    /**
     * Callback for write actions
     * @param {String} action [Ext.data.Api.actions.create|read|update|destroy]
     * @param {Object} trans The request transaction object
     * @param {Object} res The server response
     * @private
     */
    onWrite : function(action, trans, res, rs) {
        var reader = trans.reader;
        try {
            // though we already have a response object here in STP, run through readResponse to catch any meta-data exceptions.
            reader.readResponse(action, res);
        } catch (e) {
            this.fireEvent('exception', this, 'response', action, trans, res, e);
            trans.callback.call(trans.scope||window, null, res, false);
            return;
        }
        if(!res[reader.meta.successProperty] === true){
            this.fireEvent('exception', this, 'remote', action, trans, res, rs);
            trans.callback.call(trans.scope||window, null, res, false);
            return;
        }
        this.fireEvent("write", this, action, res[reader.meta.root], res, rs, trans.arg );
        trans.callback.call(trans.scope||window, res[reader.meta.root], res, true);
    },

    // private
    isLoading : function(){
        return this.trans ? true : false;
    },

    /**
     * Abort the current server request.
     */
    abort : function(){
        if(this.isLoading()){
            this.destroyTrans(this.trans);
        }
    },

    // private
    destroyTrans : function(trans, isLoaded){
        this.head.removeChild(document.getElementById(trans.scriptId));
        clearTimeout(trans.timeoutId);
        if(isLoaded){
            window[trans.cb] = undefined;
            try{
                delete window[trans.cb];
            }catch(e){}
        }else{
            // if hasn't been loaded, wait for load to remove it to prevent script error
            window[trans.cb] = function(){
                window[trans.cb] = undefined;
                try{
                    delete window[trans.cb];
                }catch(e){}
            };
        }
    },

    // private
    handleFailure : function(trans){
        this.trans = false;
        this.destroyTrans(trans, false);
        if (trans.action === Ext.data.Api.actions.read) {
            // @deprecated firing loadexception
            this.fireEvent("loadexception", this, null, trans.arg);
        }

        this.fireEvent('exception', this, 'response', trans.action, {
            response: null,
            options: trans.arg
        });
        trans.callback.call(trans.scope||window, null, trans.arg, false);
    },

    // inherit docs
    destroy: function(){
        this.abort();
        Ext.data.ScriptTagProxy.superclass.destroy.call(this);
    }
});/**
 * @class Ext.data.HttpProxy
 * @extends Ext.data.DataProxy
 * <p>An implementation of {@link Ext.data.DataProxy} that processes data requests within the same
 * domain of the originating page.</p>
 * <p><b>Note</b>: this class cannot be used to retrieve data from a domain other
 * than the domain from which the running page was served. For cross-domain requests, use a
 * {@link Ext.data.ScriptTagProxy ScriptTagProxy}.</p>
 * <p>Be aware that to enable the browser to parse an XML document, the server must set
 * the Content-Type header in the HTTP response to "<tt>text/xml</tt>".</p>
 * @constructor
 * @param {Object} conn
 * An {@link Ext.data.Connection} object, or options parameter to {@link Ext.Ajax#request}.
 * <p>Note that if this HttpProxy is being used by a (@link Ext.data.Store Store}, then the
 * Store's call to {@link #load} will override any specified <tt>callback</tt> and <tt>params</tt>
 * options. In this case, use the Store's {@link Ext.data.Store#events events} to modify parameters,
 * or react to loading events. The Store's {@link Ext.data.Store#baseParams baseParams} may also be
 * used to pass parameters known at instantiation time.</p>
 * <p>If an options parameter is passed, the singleton {@link Ext.Ajax} object will be used to make
 * the request.</p>
 */
Ext.data.HttpProxy = function(conn){
    Ext.data.HttpProxy.superclass.constructor.call(this, conn);

    /**
     * The Connection object (Or options parameter to {@link Ext.Ajax#request}) which this HttpProxy
     * uses to make requests to the server. Properties of this object may be changed dynamically to
     * change the way data is requested.
     * @property
     */
    this.conn = conn;

    // nullify the connection url.  The url param has been copied to 'this' above.  The connection
    // url will be set during each execution of doRequest when buildUrl is called.  This makes it easier for users to override the
    // connection url during beforeaction events (ie: beforeload, beforesave, etc).  The connection url will be nullified
    // after each request as well.  Url is always re-defined during doRequest.
    this.conn.url = null;

    this.useAjax = !conn || !conn.events;

    //private.  A hash containing active requests, keyed on action [Ext.data.Api.actions.create|read|update|destroy]
    var actions = Ext.data.Api.actions;
    this.activeRequest = {};
    for (var verb in actions) {
        this.activeRequest[actions[verb]] = undefined;
    }
};

Ext.extend(Ext.data.HttpProxy, Ext.data.DataProxy, {
    /**
     * @cfg {Boolean} restful
     * <p>If set to <tt>true</tt>, a {@link Ext.data.Record#phantom non-phantom} record's
     * {@link Ext.data.Record#id id} will be appended to the url (defaults to <tt>false</tt>).</p><br>
     * <p>The url is built based upon the action being executed <tt>[load|create|save|destroy]</tt>
     * using the commensurate <tt>{@link #api}</tt> property, or if undefined default to the
     * configured {@link Ext.data.Store}.{@link Ext.data.Store#url url}.</p><br>
     * <p>Some MVC (e.g., Ruby on Rails, Merb and Django) support this style of segment based urls
     * where the segments in the URL follow the Model-View-Controller approach.</p><pre><code>
     * someSite.com/controller/action/id
     * </code></pre>
     * Where the segments in the url are typically:<div class="mdetail-params"><ul>
     * <li>The first segment : represents the controller class that should be invoked.</li>
     * <li>The second segment : represents the class function, or method, that should be called.</li>
     * <li>The third segment : represents the ID (a variable typically passed to the method).</li>
     * </ul></div></p>
     * <p>For example:</p>
     * <pre><code>
api: {
    load :    '/controller/load',
    create :  '/controller/new',  // Server MUST return idProperty of new record
    save :    '/controller/update',
    destroy : '/controller/destroy_action'
}

// Alternatively, one can use the object-form to specify each API-action
api: {
    load: {url: 'read.php', method: 'GET'},
    create: 'create.php',
    destroy: 'destroy.php',
    save: 'update.php'
}
     */

    /**
     * Return the {@link Ext.data.Connection} object being used by this Proxy.
     * @return {Connection} The Connection object. This object may be used to subscribe to events on
     * a finer-grained basis than the DataProxy events.
     */
    getConnection : function() {
        return this.useAjax ? Ext.Ajax : this.conn;
    },

    /**
     * Used for overriding the url used for a single request.  Designed to be called during a beforeaction event.  Calling setUrl
     * will override any urls set via the api configuration parameter.  Set the optional parameter makePermanent to set the url for
     * all subsequent requests.  If not set to makePermanent, the next request will use the same url or api configuration defined
     * in the initial proxy configuration.
     * @param {String} url
     * @param {Boolean} makePermanent (Optional) [false]
     *
     * (e.g.: beforeload, beforesave, etc).
     */
    setUrl : function(url, makePermanent) {
        this.conn.url = url;
        if (makePermanent === true) {
            this.url = url;
            Ext.data.Api.prepare(this);
        }
    },

    /**
     * HttpProxy implementation of DataProxy#doRequest
     * @param {String} action The crud action type (create, read, update, destroy)
     * @param {Ext.data.Record/Ext.data.Record[]} rs If action is load, rs will be null
     * @param {Object} params An object containing properties which are to be used as HTTP parameters
     * for the request to the remote server.
     * @param {Ext.data.DataReader} reader The Reader object which converts the data
     * object into a block of Ext.data.Records.
     * @param {Function} callback
     * <div class="sub-desc"><p>A function to be called after the request.
     * The <tt>callback</tt> is passed the following arguments:<ul>
     * <li><tt>r</tt> : Ext.data.Record[] The block of Ext.data.Records.</li>
     * <li><tt>options</tt>: Options object from the action request</li>
     * <li><tt>success</tt>: Boolean success indicator</li></ul></p></div>
     * @param {Object} scope The scope in which to call the callback
     * @param {Object} arg An optional argument which is passed to the callback as its second parameter.
     */
    doRequest : function(action, rs, params, reader, cb, scope, arg) {
        var  o = {
            method: (this.api[action]) ? this.api[action]['method'] : undefined,
            request: {
                callback : cb,
                scope : scope,
                arg : arg
            },
            reader: reader,
            callback : this.createCallback(action, rs),
            scope: this
        };
        // Sample the request data:  If it's an object, then it hasn't been json-encoded yet.
        // Transmit data using jsonData config of Ext.Ajax.request
        if (typeof(params[reader.meta.root]) === 'object') {
            o.jsonData = params;
        } else {
            o.params = params || {};
        }
        // Set the connection url.  If this.conn.url is not null here,
        // the user may have overridden the url during a beforeaction event-handler.
        // this.conn.url is nullified after each request.
        if (this.conn.url === null) {
            this.conn.url = this.buildUrl(action, rs);
        }
        else if (this.restful === true && rs instanceof Ext.data.Record && !rs.phantom) {
            this.conn.url += '/' + rs.id;
        }
        if(this.useAjax){

            Ext.applyIf(o, this.conn);

            // If a currently running request is found for this action, abort it.
            if (this.activeRequest[action]) {
                // Disabled aborting activeRequest while implementing REST.  activeRequest[action] will have to become an array
                //Ext.Ajax.abort(this.activeRequest[action]);
            }
            this.activeRequest[action] = Ext.Ajax.request(o);
        }else{
            this.conn.request(o);
        }
        // request is sent, nullify the connection url in preparation for the next request
        this.conn.url = null;
    },

    /**
     * Returns a callback function for a request.  Note a special case is made for the
     * read action vs all the others.
     * @param {String} action [create|update|delete|load]
     * @param {Ext.data.Record[]} rs The Store-recordset being acted upon
     * @private
     */
    createCallback : function(action, rs) {
        return function(o, success, response) {
            this.activeRequest[action] = undefined;
            if (!success) {
                if (action === Ext.data.Api.actions.read) {
                    // @deprecated: fire loadexception for backwards compat.
                    this.fireEvent('loadexception', this, o, response);
                }
                this.fireEvent('exception', this, 'response', action, o, response);
                o.request.callback.call(o.request.scope, null, o.request.arg, false);
                return;
            }
            if (action === Ext.data.Api.actions.read) {
                this.onRead(action, o, response);
            } else {
                this.onWrite(action, o, response, rs);
            }
        }
    },

    /**
     * Callback for read action
     * @param {String} action Action name as per {@link Ext.data.Api.actions#read}.
     * @param {Object} o The request transaction object
     * @param {Object} res The server response
     * @private
     */
    onRead : function(action, o, response) {
        var result;
        try {
            result = o.reader.read(response);
        }catch(e){
            // @deprecated: fire old loadexception for backwards-compat.
            this.fireEvent('loadexception', this, o, response, e);
            this.fireEvent('exception', this, 'response', action, o, response, e);
            o.request.callback.call(o.request.scope, null, o.request.arg, false);
            return;
        }
        if (result.success === false) {
            // @deprecated: fire old loadexception for backwards-compat.
            this.fireEvent('loadexception', this, o, response);

            // Get DataReader read-back a response-object to pass along to exception event
            var res = o.reader.readResponse(action, response);
            this.fireEvent('exception', this, 'remote', action, o, res, null);
        }
        else {
            this.fireEvent('load', this, o, o.request.arg);
        }
        o.request.callback.call(o.request.scope, result, o.request.arg, result.success);
    },
    /**
     * Callback for write actions
     * @param {String} action [Ext.data.Api.actions.create|read|update|destroy]
     * @param {Object} trans The request transaction object
     * @param {Object} res The server response
     * @private
     */
    onWrite : function(action, o, response, rs) {
        var reader = o.reader;
        var res;
        try {
            res = reader.readResponse(action, response);
        } catch (e) {
            this.fireEvent('exception', this, 'response', action, o, response, e);
            o.request.callback.call(o.request.scope, null, o.request.arg, false);
            return;
        }
        if (res[reader.meta.successProperty] === false) {
            this.fireEvent('exception', this, 'remote', action, o, res, rs);
        } else {
            this.fireEvent('write', this, action, res[reader.meta.root], res, rs, o.request.arg);
        }
        o.request.callback.call(o.request.scope, res[reader.meta.root], res, res[reader.meta.successProperty]);
    },

    // inherit docs
    destroy: function(){
        if(!this.useAjax){
            this.conn.abort();
        }else if(this.activeRequest){
            var actions = Ext.data.Api.actions;
            for (var verb in actions) {
                if(this.activeRequest[actions[verb]]){
                    Ext.Ajax.abort(this.activeRequest[actions[verb]]);
                }
            }
        }
        Ext.data.HttpProxy.superclass.destroy.call(this);
    }
});/**
 * @class Ext.data.MemoryProxy
 * @extends Ext.data.DataProxy
 * An implementation of Ext.data.DataProxy that simply passes the data specified in its constructor
 * to the Reader when its load method is called.
 * @constructor
 * @param {Object} data The data object which the Reader uses to construct a block of Ext.data.Records.
 */
Ext.data.MemoryProxy = function(data){
    // Must define a dummy api with "read" action to satisfy DataProxy#doRequest and Ext.data.Api#prepare *before* calling super
    var api = {};
    api[Ext.data.Api.actions.read] = true;
    Ext.data.MemoryProxy.superclass.constructor.call(this, {
        api: api
    });
    this.data = data;
};

Ext.extend(Ext.data.MemoryProxy, Ext.data.DataProxy, {
    /**
     * @event loadexception
     * Fires if an exception occurs in the Proxy during data loading. Note that this event is also relayed
     * through {@link Ext.data.Store}, so you can listen for it directly on any Store instance.
     * @param {Object} this
     * @param {Object} arg The callback's arg object passed to the {@link #load} function
     * @param {Object} null This parameter does not apply and will always be null for MemoryProxy
     * @param {Error} e The JavaScript Error object caught if the configured Reader could not read the data
     */

       /**
     * MemoryProxy implementation of DataProxy#doRequest
     * @param {String} action
     * @param {Ext.data.Record/Ext.data.Record[]} rs If action is load, rs will be null
     * @param {Object} params An object containing properties which are to be used as HTTP parameters
     * for the request to the remote server.
     * @param {Ext.data.DataReader} reader The Reader object which converts the data
     * object into a block of Ext.data.Records.
     * @param {Function} callback The function into which to pass the block of Ext.data.Records.
     * The function must be passed <ul>
     * <li>The Record block object</li>
     * <li>The "arg" argument from the load function</li>
     * <li>A boolean success indicator</li>
     * </ul>
     * @param {Object} scope The scope in which to call the callback
     * @param {Object} arg An optional argument which is passed to the callback as its second parameter.
     */
    doRequest : function(action, rs, params, reader, callback, scope, arg) {
        // No implementation for CRUD in MemoryProxy.  Assumes all actions are 'load'
        params = params || {};
        var result;
        try {
            result = reader.readRecords(this.data);
        }catch(e){
            // @deprecated loadexception
            this.fireEvent("loadexception", this, null, arg, e);

            this.fireEvent('exception', this, 'response', action, arg, null, e);
            callback.call(scope, null, arg, false);
            return;
        }
        callback.call(scope, result, arg, true);
    }
});