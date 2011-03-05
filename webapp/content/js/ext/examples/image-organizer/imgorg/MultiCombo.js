/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
Ext.ns('Ext.ux');

/**
 * Ext.ux.MultiCombo
 */
Ext.ux.MultiCombo = Ext.extend(Ext.form.ComboBox, {

	/**
	 * @cfg {String} overClass [x-grid3-row-over]
	 */
	overClass : 'x-grid3-row-over',
	/**
	 * @cfg {Boolean} enableKeyEvents for typeAhead
	 */
	enableKeyEvents: true,
	/**
	 * @cfg {String} selectedClass [x-grid3-row-selected]
	 */
	selectedClass: 'x-grid3-row-selected',
	/**
	 * @cfg {String} highlightClass The css class applied to rows which are hovered with mouse
	 * selected via key-nav, or highlighted when a text-query matches a single item.
	 */
	highlightClass: 'x-grid3-row-over',
	/**
	 * @cfg {Number} autoSelectKey [44] COMMA Sets the key used to auto-select an auto-suggest
	 * highlighted query.  When pressed, the highlighted text-item will be selected as if the user
	 * selected the row with a mouse click.
	 */
	autoSelectKey : 44,
	/**
	 * @cfg {String} allSelectedText Text to display when all items are selected
	 */
	allSelectedText : 'All selected',
	/**
	 * @cfg {Number} maxDisplayRows The maximum number of rows to show before applying vscroll
	 */
	maxDisplayRows: null,

	mode: 'local',
	triggerAction: 'all',
	typeAhead: true,

	// private
	highlightIndex : null,
	highlightIndexPrev : null,

	query : null,


	/**
	 * @cfg {Array} value CheckboxCombo expresses its value as an array.
	 */
	value: [],

	/**
	 * @cfg {Integer} minChars [0]
	 */
	minChars: 0,

	initComponent : function() {
		var cls = 'x-combo-list';

		// when blurring out of field, ensure that rawValue contains ONLY items contained in Store.
		this.on('blur', this.validateSelections.createDelegate(this));

		// create an auto-select key handler, like *nix-based console [tab] key behaviour
		this.on('keypress', function(field, ev) {
			if (ev.getKey() == this.autoSelectKey) {	// COMMA
				this.onAutoSelect();
			}
		},this);

		this.addEvents(
			/**
			 * @event initview Fires when Combo#initView is called.
			 * gives plugins a chance to interact with DataView
			 * @author Chris Scott
			 * @param {Combo} this
			 * @param {DataView} dv
			 */
			'initview',
            'clearall'
		);

		// when list expands, constrain the height with @cfg maxDisplayRows
		if (this.maxDisplayRows) {
			this.on('expand', function(){
				var cnt = this.store.getCount();
				if (cnt > this.maxDisplayRows) {
					var children = this.view.getNodes();
					var h = 0;
					for (var n = 0; n < this.maxDisplayRows; n++) {
						h += Ext.fly(children[n]).getHeight();
					}
					this.maxHeight = h;
				}
			}, this, {
				single: true
			});
		}

		this.on('beforequery', this.onQuery, this);

		// Enforce that plugins is an Array.
		if (typeof(this.plugins) == 'undefined'){
			this.plugins = [];
		}
		else if (!Ext.isArray(this.plugins)) {
			this.plugins = [this.plugins];
		}

		var tmp = this.value;	// for case where transform is set.
		Ext.ux.MultiCombo.superclass.initComponent.call(this);
		if (this.transform) {
			if (typeof(tmp) == 'undefined') {
				tmp = [];
			}
			this.setValue(tmp);
		}
	},

	// private
    onViewClick : function(dv, index, node, ev){
		var rec = this.store.getAt(index);
		this.onSelect(rec, index);
		this.el.focus();
		/*
        if(doFocus !== false){
            this.el.focus();
        }
        */
    },

	// onTriggerClick, overrides Ext.form.ComboBox#onTriggerClick
	onTriggerClick: function() {
		if (this.highlightIndex != -1) {
			this.clearHighlight();
		}
		this.highlightIndex = -1;

		if(this.disabled){
            return;
        }
		if(this.isExpanded()){
            this.collapse();
            this.el.focus();
        }else {
            this.onFocus({});
			if(this.triggerAction == 'all') {
				this.doQuery(this.getRawValue(), true);
				var vlen = this.getValue().length, slen = this.view.getSelectedRecords().length;
				if (vlen != slen || vlen == 0) {
					this.selectByValue(this.value, true);
				}
            } else {
                this.expand();
				this.doQuery(this.getRawValue());
            }

			this.highlightIndex = -1
			this.highlightIndexPrev = null;
			this.selectNext();
			this.scrollIntoView();
            this.el.focus();
        }
	},

	// onQuery, beforequery listener, @return false
	onQuery : function(qe) {
		q = qe.query;
        forceAll = qe.forceAll;
        if(forceAll === true || (q.length >= this.minChars)){
            if(this.lastQuery !== q){
				if (typeof(this.lastQuery) != 'undefined') {
					if (q.match(new RegExp('^'+this.allSelectedText))) {
						this.query = this.store.data;
					}
					else if (this.lastQuery.length > q.length) {
						var items = q.replace(/\s+/g, '').split(',');
						if (items[items.length-1].length == 0) {
							items.pop();
						}
						this.query = this.store.data.filterBy(this.store.createFilterFn(this.displayField, new RegExp('^'+items.join('$|^')+'$', "i"), false, false));
					}
					else {
						this.query = null;
					}
				}
                this.lastQuery = q;
                if(this.mode == 'local'){
					var raw = this.getRawValue();
					if (raw == this.allSelectedText) {

					}
					var items = raw.replace(/\s+/g, '').split(',');
					var last = items.pop();
					this.matches = this.store.data.filterBy(this.store.createFilterFn(this.displayField, new RegExp('^'+last, "i"), false, false)).filterBy(this.createTypeAheadFilterFn(items));
					if (this.matches.getCount() == 0) {
						this.clearHighlight();
					}
					if (q.length == 0) {
						this.view.clearSelections();
						this.updateValue([]);
					}

                    this.onLoad();
                } else {
                    this.store.baseParams[this.queryParam] = q;
                    this.store.load({
                        params: this.getParams(q)
                    });
                    this.expand();
                }
            }else{
                this.selectedIndex = -1;
                this.onLoad();
            }
        }

		return false;
	},

	// onLoad, overrides Ext.form.ComboBox#onLoad
	onLoad : function(){

        if(!this.hasFocus){
            return;
        }
        if(this.store.getCount() > 0){
            if (!this.isExpanded()) {
				this.expand();
				this.restrictHeight();
			}
            if(this.lastQuery == this.allQuery){
                if(this.editable){
                    this.el.dom.select();
                }
            }else{
				if (this.query != null) {
					var values = [], indexes = [];
					this.query.each(function(r){
						values.push(r.data[this.valueField]);
						indexes.push(this.store.indexOf(r));
					}, this);
					this.view.clearSelections();
					this.updateValue(values, this.getRawValue());
					this.view.select(indexes);
				}
				if (this.matches != null) {
					if (this.matches.getCount() == 1) {
						this.highlight(this.store.indexOf(this.matches.first()));
						this.scrollIntoView();
					}
				}
				else {
					// @HACK: If store was configured with a proxy, set its mode to local now that its populated with data.
					// Re-execute the query now.
					this.mode = 'local';
					this.lastQuery = undefined;
					this.doQuery(this.getRawValue(), true);
				}
                if(this.typeAhead && this.lastKey != Ext.EventObject.DOWN && this.lastKey != Ext.EventObject.BACKSPACE && this.lastKey != Ext.EventObject.DELETE){
					this.taTask.delay(this.typeAheadDelay);
                }
            }
        }else{
            this.onEmptyResults();
        }
    },

	onSelect : function(record, index) {
		if (index == -1) {
			throw new Error('MultiCombo#onSelect did not receive a valid index');
		}

		// select only when user clicks [apply] button
		if (this.selectOnApply == true) {
			return;
		}

		if (this.fireEvent('beforeselect', this, record, index) !== false) {
			var text = [];
			var value = [];
			var rs = this.view.getSelectedRecords();
			for (var n = 0, len = rs.length; n < len; n++) {
				text.push(rs[n].data[this.displayField]);
				value.push(rs[n].data[this.valueField]);
			}
			this.updateValue(value, (value.length != this.store.getCount()) ? text.join(', ') : this.allSelectedText);
			var node = this.view.getNode(index);
			this.innerList.scrollChildIntoView(node, false);
			this.fireEvent('select', this, record, index);
		}
	},

	// private
    onViewOver : function(ev, node){
		var t = ev.getTarget(this.view.itemSelector);
		if (t == null) {
			return;
		}
		this.highlightIndex = this.store.indexOf(this.view.getRecord(t));
		this.clearHighlight();
		this.highlight(this.highlightIndex);
        if(this.inKeyMode){ // prevent key nav and mouse over conflicts
            return;null
        }
        return;
    },

	// private
    onTypeAhead : function(){
		if(this.store.getCount() > 0){
			this.inKeyMode = false;
            var raw = this.getRawValue();
			var pos = this.getCaretPosition(raw);
			var items = [];
			var query = '';
			if (pos !== false && pos < raw.length) {
				items = raw.substr(0, pos).replace(/\s+/g, '').split(',');
				query = items.pop();
			} else {
				items = raw.replace(/\s+/g, '').split(',');
				query = items.pop();
			}
			var rs = this.store.data.filterBy(this.store.createFilterFn(this.displayField, new RegExp(query, "i"), false, false)).filterBy(this.createTypeAheadFilterFn(items));

			if (rs.getCount() == 1) {
				var r = rs.first();
				var rindex = this.store.indexOf(r)
				if (!this.view.isSelected(rindex)) {
		            this.typeAheadSelected = true;
					var selStart = raw.length;
					var len = items.join(',').length;
					var selEnd = null;
					var newValue = r.data[this.displayField];
					if (pos !== false && pos < raw.length) {
						var insertIdx = items.length;
						var selStart = pos;
						items = raw.replace(/\s+/g, '').split(',');
						items.splice(insertIdx, 1, newValue);
						selEnd = items.slice(0, insertIdx+1).join(', ').length;
						this.highlight(rindex);
						this.scrollIntoView();

					}
					else {
						items.push(newValue);
					}
					var len = items.join(',').length;
		            if(selStart != len){
						var lastWord = raw.split(',').pop();
						if (items.length >1 && lastWord.match(/^\s+/) == null) {
							selStart++;
						}
						this.setRawValue(items.join(', '));
		                this.selectText(selStart, (selEnd!=null) ? selEnd : this.getRawValue().length);
		            }
				}
			}
        }
    },

	apply : function() {
		var selected = 	this.view.getSelectedRecords();
		var value = [];
		for (var n=0,len=selected.length;n<len;n++) {
			value.push(selected[n].data[this.valueField]);
		}
		this.setValue(value);
	},

	getCaretPosition : function(raw) {
		raw = raw || this.getRawValue();
		if(document.selection) {	// <-- IE, ugh:  http://parentnode.org/javascript/working-with-the-cursor-position/
        	var range = document.selection.createRange();
			//Save the current value. We will need this value later to find out, where the text has been changed
			var orig = obj.value.replace(/rn/g, "n");
			// replace the text
			range.text = text;
			// Now get the new content and save it into a temporary variable
			var actual = tmp = obj.value.replace(/rn/g, "n");
			/* Find the first occurance, where the original differs
			   from the actual content. This could be the startposition
			   of our text selection, but it has not to be. Think of the
			   selection "ab" and replacing it with "ac". The first
			   difference would be the "c", while the start position
			   is the "a"
			*/
			for(var diff = 0; diff < orig.length; diff++) {
			    if(orig.charAt(diff) != actual.charAt(diff)) break;
			}

			/* To get the real start position, we iterate through
			   the string searching for the whole replacement
			   text - "abc", as long as the first difference is not
			   reached. If you do not understand that logic - no
			   blame to you, just copy & paste it ;)
			*/
			for(var index = 0, start = 0; tmp.match(text) && (tmp = tmp.replace(text, "")) && index <= diff; index = start + text.length) {
			    start = actual.indexOf(text, index);
			}
	    } else if(this.el.dom.selectionStart) {	// <-- Go the Gecko way
			return this.el.dom.selectionStart;
	    } else {
	        // Fallback for any other browser
			return false;
	    }
	},

	onAutoSelect : function() {
		if (!this.isExpanded()) {
			var vlen = this.getValue().length, slen = this.view.getSelectedRecords().length;
			if (vlen != slen || vlen == 0) {
				this.selectByValue(this.value, true);
			}
		}
		var raw = this.getRawValue();
		this.selectText(raw.length, raw.length);

		var pos = this.getCaretPosition(raw);
		var word = '';
		if (pos !== false && pos < raw.length) {
			word = Ext.util.Format.trim(raw.substr(0, pos).split(',').pop());
		} else {
			word = Ext.util.Format.trim(raw.split(',').pop());
		}
		var idx = this.store.find(this.displayField, word);
		if (idx > -1 && !this.view.isSelected(idx)) {
			var rec = this.store.getAt(idx);
			this.select(idx);
		}
	},
	// filters-out already-selected items from type-ahead queries.
	// e.g.: if store contains: "betty, barney, bart" and betty is already selected,
	// when user types "b", only "bart" and "barney" should be returned as possible matches,
	// since betty is *already* selected
	createTypeAheadFilterFn : function(items) {
		var key = this.displayField;
		return function(rec) {
			var re = new RegExp(rec.data[key], "i");
			var add = true;
			for (var n=0,len=items.length;n<len;n++) {
				if (re.test(items[n])) {
					add = false;
					break;
				}
			}
			return add;
		}
	},

	updateValue : function(value, text) {
		this.value = value;
		if(this.hiddenField){
			this.hiddenField.value = value.join(',');
		}
		if (typeof(text) == 'string') {
			this.setRawValue(text);
		}

	},

	/**
	 * setValue
	 * Accepts a comma-separated list of ids or an array.  if given a string, will conver to Array.
	 * @param {Array, String} v
	 */
	setValue : function(v) {
		var text = [];
		var value = [];

		if (typeof(v) == 'string') {	// <-- "1,2,3"
			value = v.match(/\d+/g); // <-- strip multiple spaces and split on ","
            if(value){
			    for (var n=0,len=value.length;n<len;n++) {
				    value[n] = parseInt(value[n]);
			    }
            }
		}
		else if (Ext.isArray(v)) {			// <-- [1,2,3]
			value = v;
		}
		if (value && value.length) {
			if (this.mode == 'local') {
				this.updateValue(value);
				this.setRawValue(this.getTextValue());
			}
			else {
				this.updateValue(value);
				this.store.load({
					callback: function() {
						this.setRawValue(this.getTextValue());
					},
					scope: this
				});
				this.mode = 'local';
			}
		}
	},

	getTextValue : function() {
		if (this.value.length == this.store.getCount()) {
			return this.allSelectedText;
		}
		else {
			var text = [];
			this.store.data.filterBy(this.store.createFilterFn(this.valueField, new RegExp(this.value.join('|'), "i"), false, false)).each(function(r){
				text.push(r.data[this.displayField]);
			}, this);
			return text.join(', ');
		}
	},

	/**
     * Select an item in the dropdown list by its numeric index in the list. This function does NOT cause the select event to fire.
     * The store must be loaded and the list expanded for this function to work, otherwise use setValue.
     * @param {Number} index The zero-based index of the list item to select
     * @param {Boolean} scrollIntoView False to prevent the dropdown list from autoscrolling to display the
     * selected item if it is not currently in view (defaults to true)
     */
    select : function(index, scrollIntoView){
		if (!typeof(index) == 'number') {
			throw new Error('MultiCombo#select expected @param {Number} index but got: ' + typeof(index));
		}
        this.view.isSelected(index) ? this.view.deselect(index, true) : this.view.select(index, true);
		this.onSelect(this.store.getAt(index), index);

		this.matches = null;
        if(scrollIntoView !== false){
            var el = this.view.getNode(index);
            if(el){
                this.innerList.scrollChildIntoView(el, false);
            }
        }

    },

	getLastValue : function() {
		return Ext.util.Format.trim(this.getRawValue().split(',').pop());
	},

	/**
     * Select an item in the dropdown list by its data value. This function does NOT cause the select event to fire.
     * The store must be loaded and the list expanded for this function to work, otherwise use setValue.
     * @param {String} value The data value of the item to select
     * @param {Boolean} scrollIntoView False to prevent the dropdown list from autoscrolling to display the
     * selected item if it is not currently in view (defaults to true)
     * @return {Boolean} True if the value matched an item in the list, else false
     */
    selectByValue : function(v, scrollIntoView){
		if (v.length) {
			var indexes = [];
			var rs = this.store.data.filterBy(this.store.createFilterFn(this.valueField, new RegExp(v.join('|'), "i"))).each(function(r){
				indexes.push(this.store.indexOf(r));
			}, this);
			if (indexes.length) {
				this.view.select(indexes);
				return true;
			}
		}
		else {
			this.view.clearSelections();
			this.setRawValue('');
			return false;
		}
    },

	// private
    initEvents : function(){
        Ext.form.ComboBox.superclass.initEvents.call(this);
        this.keyNav = new Ext.KeyNav(this.el, {
            "up" : function(e){
				this.lastKey = Ext.EventObject.UP;
                this.inKeyMode = true;
                this.selectPrev();
				this.scrollIntoView();
            },

            "down" : function(e){
                this.inKeyMode = true;
				if(!this.isExpanded()){
					this.lastKey = Ext.EventObject.DOWN;
                    this.onTriggerClick();
                }else{
                    this.selectNext();
					this.scrollIntoView();
                }

            },

            "enter" : function(e){
				var idx = this.highlightIndex;
				if (this.inKeyMode === true) {
					if (this.plugins.length && (idx <= -1)) {
						if (this.plugins[idx + 1]) {
							this.plugins[idx + 1].onEnter(this);
						}
					}
					else
						if (this.plugins.length && this.highlightIndex == 0 && this.highlightIndexPrev == -1) {
							if (this.plugins[idx]) {
								this.plugins[idx].onEnter(this);
							}
						}
						else {
							var idx = this.getHighlightedIndex() || 0;
							if (this.highlightIndex != null && idx != null) {
								this.select(idx, true);
								//this.delayedCheck = true;
								//this.unsetDelayCheck.defer(10, this);

							}
						}
				}
				else {
					var v = this.getLastValue();
					var raw = this.getRawValue();

					/** this block should be moved to method getCurrentWord
					 *
					 */
					var pos = this.getCaretPosition(raw);
					var word = '';
					if (pos !== false && pos < raw.length) {
						word = Ext.util.Format.trim(raw.substr(0, pos).split(',').pop());
					} else {
						word = Ext.util.Format.trim(raw.split(',').pop());
					}
					/*******************************************************/

					var idx = this.store.find(this.displayField, word);
					if (idx != -1) {
						var rec = this.store.getAt(idx);
						this.select(idx, true);
					}
					raw = this.getRawValue();
					this.selectText(raw.length, raw.length);
					this.collapse();
				}
            },

            "esc" : function(e){
                this.collapse();
            },

            "tab" : function(e){
				if (this.matches != null && this.matches.getCount() == 1) {
					var idx = this.store.indexOf(this.matches.first());
					if (!this.view.isSelected(idx)) {
						this.select(this.store.indexOf(this.matches.first()), true);
					}
				}
				else if (this.value.length == 0 && this.getRawValue().length > 0) {
					this.setRawValue('');
				}
				this.collapse();
                return true;
            },

            scope : this,

            doRelay : function(foo, bar, hname){
                if(hname == 'down' || this.scope.isExpanded()){
                   return Ext.KeyNav.prototype.doRelay.apply(this, arguments);
                }
                return true;
            },

            forceKeyDown : true
        });
        this.queryDelay = Math.max(this.queryDelay || 10,
                this.mode == 'local' ? 10 : 250);
        this.dqTask = new Ext.util.DelayedTask(this.initQuery, this);
        if(this.typeAhead){
            this.taTask = new Ext.util.DelayedTask(this.onTypeAhead, this);
        }
        if(this.editable !== false){
            this.el.on("keyup", this.onKeyUp, this);
        }
        if(this.forceSelection){
            this.on('blur', this.doForce, this);
        }
    },

	// private, blur-handler to ensure that rawValue contains only values from selections, in the same order as selected
	validateSelections : function(field) {
		var v = this.getValue();
		var text = [];
		for (var i=0,len=v.length;i<len;i++) {
			var idx = this.store.find(this.valueField, v[i]);
			if (idx >=0) {
				text.push(this.store.getAt(idx).data[this.displayField]);
			}
		}
		this.setRawValue(text.join(', '));
	},

	scrollIntoView : function() {
		var el = this.getHighlightedNode();
		if (el) {
			this.innerList.scrollChildIntoView(el);
		}
	},

	// private
    selectNext : function(){
		this.clearHighlight();
		if (this.highlightIndex == null) {
			this.highlightIndex = -1;
		}
		if (this.highlightIndex <= -1 && this.highlightIndexPrev != -1) {
			if (this.plugins.length > 0) {
				var idx = Math.abs(this.highlightIndex)-1;
				if (this.plugins.length >= Math.abs(this.highlightIndex)) {
					this.plugins[idx].selectNext(this);
					this.highlightIndexPrev = this.highlightIndex;
					this.highlightIndex++;
					return false;
				}
			}
		}
		if (this.highlightIndexPrev == -1 && this.highlightIndex == 0) {
			this.highlightIndex = -1;
		}
		var ct = this.store.getCount();
		if(ct > 0){
            if (this.highlightIndex == -1 || this.highlightIndex+1 < ct) {
				if (this.highlightIndex == -1) {
					this.highlightIndexPrev = 0;
				}
				else {
					this.highlightIndexPrev = this.highlightIndex -1;
				}
				this.highlight(++this.highlightIndex);

			}
			else {
				this.highlight(ct-1);
			}
        }
    },

    // private
    selectPrev : function(){
		this.clearHighlight();
		if (this.highlightIndex <= 0) {
			var idx = Math.abs(this.highlightIndex);
			if (this.plugins.length >= idx+1 && this.highlightIndexPrev >= 0) {
				this.clearHighlight();
				this.plugins[idx].selectPrev(this);
				this.highlightIndexPrev = this.highlightIndex;
				this.highlightIndex--;
				if (this.highlightIndex == -1) {
					this.highlightIndexPrev = -1;
				}
				return false;
			}
			else {
				this.highlightIndex = -1;
				this.highlightIndexPrev = -1;
				this.collapse();
				return;
			}
		}

		this.highlightIndexPrev = this.highlightIndex;
        var ct = this.store.getCount();
        if(ct > 0){
			if (this.highlighIndex == -1) {
				this.highlightIndex = 0;
			}
			else if (this.highlightIndex != 0) {
				this.highlightIndex--;
			}
			else if (this.highlightIndex == 0) {
				this.collapse();
			}
			this.highlight(this.highlightIndex);
        }
    },

	collapse : function() {
		if (this.isExpanded()) {
			this.highlightIndex = null;
			this.highlightIndexPrev = null;
		}
		Ext.ux.MultiCombo.superclass.collapse.call(this);
	},

	highlight : function(index) {
		this.view.el.select('.'+this.highlightClass).removeClass(this.highlightClass);
		var node = Ext.fly(this.view.getNode(index));
		if (node) {
			node.addClass(this.highlightClass);
		}
	},

	getHighlightedIndex : function() {
		var node = this.view.el.child('.' + this.highlightClass, true);
		return (node) ? this.store.indexOf(this.view.getRecord(node)) : this.highlightIndex;
	},
	getHighlightedNode : function() {
		return this.view.el.child('.'+this.highlightClass, true);
	},

	clearHighlight : function() {
		if (typeof(this.view) != 'object') { return false; }
		var el = this.view.el.select('.'+this.highlightClass);
		if (el) {
			el.removeClass(this.highlightClass);
		}
	},

    // private
    initList : function(){
        if(!this.list){
            var cls = 'x-combo-list';

            this.list = new Ext.Layer({
                shadow: this.shadow, cls: [cls, this.listClass].join(' '), constrain:false
            });

            var lw = this.listWidth || Math.max(this.wrap.getWidth(), this.minListWidth);
            this.list.setWidth(lw);
            this.list.swallowEvent('mousewheel');
            this.assetHeight = 0;
            if(this.syncFont !== false){
                this.list.setStyle('font-size', this.el.getStyle('font-size'));
            }
            if(this.title){
                this.header = this.list.createChild({cls:cls+'-hd', html: this.title});
                this.assetHeight += this.header.getHeight();
            }

            this.innerList = this.list.createChild({cls:cls+'-inner'});
            this.innerList.on('mouseover', this.onViewOver, this);
            this.innerList.on('mousemove', this.onViewMove, this);
            this.innerList.setWidth(lw - this.list.getFrameWidth('lr'));

            if(this.pageSize){
                this.footer = this.list.createChild({cls:cls+'-ft'});
                this.pageTb = new Ext.PagingToolbar({
                    store:this.store,
                    pageSize: this.pageSize,
                    renderTo:this.footer
                });
                this.assetHeight += this.footer.getHeight();
            }

            if(!this.tpl){
                /**
                * @cfg {String/Ext.XTemplate} tpl The template string, or {@link Ext.XTemplate}
                * instance to use to display each item in the dropdown list. Use
                * this to create custom UI layouts for items in the list.
                * <p>
                * If you wish to preserve the default visual look of list items, add the CSS
                * class name <pre>x-combo-list-item</pre> to the template's container element.
                * <p>
                * <b>The template must contain one or more substitution parameters using field
                * names from the Combo's</b> {@link #store Store}. An example of a custom template
                * would be adding an <pre>ext:qtip</pre> attribute which might display other fields
                * from the Store.
                * <p>
                * The dropdown list is displayed in a DataView. See {@link Ext.DataView} for details.
                */
                this.tpl = '<tpl for="."><div class="'+cls+'-item">{' + this.displayField + '}</div></tpl>';
                /**
                 * @cfg {String} itemSelector
                 * <b>This setting is required if a custom XTemplate has been specified in {@link #tpl}
                 * which assigns a class other than <pre>'x-combo-list-item'</pre> to dropdown list items</b>.
                 * A simple CSS selector (e.g. div.some-class or span:first-child) that will be
                 * used to determine what nodes the DataView which handles the dropdown display will
                 * be working with.
                 */
            }

            /**
            * The {@link Ext.DataView DataView} used to display the ComboBox's options.
            * @type Ext.DataView
            */
            this.view = new Ext.DataView({
                applyTo: this.innerList,
                tpl: this.tpl,
				simpleSelect: true,
                multiSelect: true,
				overClass: this.overClass,
                selectedClass: this.selectedClass,
                itemSelector: this.itemSelector || '.' + cls + '-item'
            });
            this.view.on('click', this.onViewClick, this);
			this.fireEvent('initview', this, this.view);
            this.bindStore(this.store, true);

            if(this.resizable){
                this.resizer = new Ext.Resizable(this.list,  {
                   pinned:true, handles:'se'
                });
                this.resizer.on('resize', function(r, w, h){
                    this.maxHeight = h-this.handleHeight-this.list.getFrameWidth('tb')-this.assetHeight;
                    this.listWidth = w;
                    this.innerList.setWidth(w - this.list.getFrameWidth('lr'));
                    this.restrictHeight();
                }, this);
                this[this.pageSize?'footer':'innerList'].setStyle('margin-bottom', this.handleHeight+'px');
            }
        }
    }
});


Ext.reg('multicombo', Ext.ux.MultiCombo);