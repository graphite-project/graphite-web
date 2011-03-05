/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */

// Asbtract base class for SqlDB classes
Ext.data.SqlDB = function(config){
	Ext.apply(this, config);
	Ext.data.SqlDB.superclass.constructor.call(this);

	this.addEvents({
		open : true,
		close: true
	});
};

Ext.extend(Ext.data.SqlDB, Ext.util.Observable, {
	maxResults: 10000,
	openState : false,

    // abstract methods
    open : function(file, cb, scope){
	},

	close : function(){
	},

    exec : function(sql, cb, scope){
	},

	execBy : function(sql, args, cb, scope){
	},

	query : function(sql, cb, scope){
	},

	queryBy : function(sql, args, cb, scope){
	},

    // protected/inherited method
    isOpen : function(){
		return this.openState;
	},

	getTable : function(name, keyName){
		return new Ext.data.SqlDB.Table(this, name, keyName);
	},

	createTable : function(o){
		var tableName = o.name,
		    keyName = o.key,
		    fs = o.fields,
		    cb = o.callback,
		    scope = o.scope,
            buf = [],
            types = Ext.data.Types;
            
		if(!(fs instanceof Array)){ // Ext fields collection
			fs = fs.items;
		}
		for(var i = 0, len = fs.length; i < len; i++){
			var f = fs[i], 
                s = f.name;
			switch(f.type){
	            case types.INT:
	            case types.BOOL:
	                s += ' INTEGER';
	                break;
	            case types.FLOAT:
	                s += ' REAL';
	                break;
	            default:
	            	s += ' TEXT';
	        }
	        if(f.allowNull === false || f.name == keyName){
	        	s += ' NOT NULL';
	        }
	        if(f.name == keyName){
	        	s += ' PRIMARY KEY';
	        }
	        if(f.unique === true){
	        	s += ' UNIQUE';
	        }

	        buf[buf.length] = s;
	    }
	    var sql = ['CREATE TABLE IF NOT EXISTS ', tableName, ' (', buf.join(','), ')'].join('');
        this.exec(sql, cb, scope);
	}
});


Ext.data.SqlDB.getInstance = function(db, config){
    if(window.htmlControl){ // air
        return new Ext.data.AirDB(config);
    } else { // gears
        return new Ext.data.GearsDB(config);
    }
};


Ext.data.SqlDB.Table = function(conn, name, keyName){
	this.conn = conn;
	this.name = name;
	this.keyName = keyName;
};

Ext.data.SqlDB.Table.prototype = {
	update : function(o, cb, scope){
		var clause = this.keyName + " = :" + this.keyName;
		this.updateBy(o, clause, {}, cb, scope);
	},

	updateBy : function(o, clause, args, cb, scope){
		var sql = "UPDATE " + this.name + " set ";
		var fs = [], a = [];
		for(var key in o){
			if(o.hasOwnProperty(key)){
				fs[fs.length] = key + ' = ?';
				a[a.length] = o[key];
			}
		}
		for(var key in args){
			if(args.hasOwnProperty(key)){
				a[a.length] = args[key];
			}
		}
		sql = [sql, fs.join(','), ' WHERE ', clause].join('');
		this.conn.execBy(sql, a, cb, scope);
	},

	insert : function(o, cb, scope){
		var sql = "INSERT into " + this.name + " ";
		var fs = [], vs = [], a = [];
		for(var key in o){
			if(o.hasOwnProperty(key)){
				fs[fs.length] = key;
				vs[vs.length] = '?';
				a[a.length] = o[key];
			}
		}
		sql = [sql, '(', fs.join(','), ') VALUES (', vs.join(','), ')'].join('');
        this.conn.execBy(sql, a, cb, scope);
    },

	select : function(clause, cb, scope){
		this.selectBy(clause, null, cb, scope);
	},

	selectBy : function(clause, args, cb, scope){
		var sql = "select * from " + this.name;
		if(clause){
			sql += ' ' + clause;
		}
		args = args || {};
		this.conn.queryBy(sql, args, cb, scope);
	},

	remove : function(clause, cb, scope){
		this.deleteBy(clause, null, cb, scope);
	},

	removeBy : function(clause, args, cb, scope){
		var sql = "delete from " + this.name;
		if(clause){
			sql += ' where ' + clause;
		}
		args = args || {};
		this.conn.execBy(sql, args, cb, scope);
	}
};

Ext.data.SqlDB.Proxy = function(conn, table, keyName, store){
    Ext.data.SqlDB.Proxy.superclass.constructor.call(this);
    this.conn = conn;
    this.table = this.conn.getTable(table, keyName);
    this.store = store;

    this.store.on('add', this.onAdd, this);
    this.store.on('update', this.onUpdate, this);
    this.store.on('remove', this.onRemove, this);
};

Ext.extend(Ext.data.SqlDB.Proxy, Ext.data.DataProxy, {
    load : function(params, reader, callback, scope, arg){
    	if(!this.conn.isOpen()){ // assume that the connection is in the process of opening
    		this.conn.on('open', function(){
    			this.load(params, reader, callback, scope, arg);
    		}, this, {single:true});
    		return;
    	};
    	if(this.fireEvent("beforeload", this, params, reader, callback, scope, arg) !== false){
			var clause = params.where || '';
			var args = params.args || [];
			var group = params.groupBy;
			var sort = params.sort;
			var dir = params.dir;

			if(group || sort){
				clause += ' ORDER BY ';
				if(group && group != sort){
					clause += group + ' ASC, ';
				}
				clause += sort + ' ' + (dir || 'ASC');
			}

			this.table.selectBy(clause, args,
					this.onLoad.createDelegate(this, [{callback:callback, scope:scope, arg:arg, reader: reader}], 0));
        }else{
            callback.call(scope||this, null, arg, false);
        }
    },

    onLoad : function(trans, rs, e, stmt){
        if(rs === false){
    		this.fireEvent("loadexception", this, null, trans.arg, e);
            trans.callback.call(trans.scope||window, null, trans.arg, false);
            return;
    	}
    	var result = trans.reader.readRecords(rs);
        this.fireEvent("load", this, rs, trans.arg);
        trans.callback.call(trans.scope||window, result, trans.arg, true);
    },

    processData : function(o){
    	var fs = this.store.fields,
    	    r = {},
            types = Ext.data.Types;
    	for(var key in o){
    		var f = fs.key(key), v = o[key];
			if(f){
				if(f.type == types.DATE){
					r[key] = v ? v.format('Y-m-d H:i:s') : '';
				}else if(f.type == types.BOOL){
					r[key] = v ? 1 : 0;
				}else{
					r[key] = v;
				}
			}
		}
		return r;
    },

    onUpdate : function(ds, record){
    	var changes = record.getChanges();
    	var kn = this.table.keyName;
    	this.table.updateBy(this.processData(changes), kn + ' = ?', [record.data[kn]]);
    	record.commit(true);
    },

    onAdd : function(ds, records, index){
    	for(var i = 0, len = records.length; i < len; i++){
        	this.table.insert(this.processData(records[i].data));
    	}
    },

    onRemove : function(ds, record, index){
        var kn = this.table.keyName;
    	this.table.removeBy(kn + ' = ?', [record.data[kn]]);
    }
});