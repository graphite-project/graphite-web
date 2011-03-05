/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */

Ext.ns('Ext.ux.MultiCombo');
/**
 * Checkable
 * @plugin
 */
Ext.ux.MultiCombo.Checkable = function(cfg) {
	Ext.apply(this, cfg);
};
Ext.ux.MultiCombo.Checkable.prototype = {
	/**
	 * @cfg {String} checkSelector DomQuery config for locating checkbox
	 */
	checkSelector: 'input[type=checkbox]',
	/**
	 * @cfg {String} itemSelector The itemSelector used with Combo's internal DataView [x-combo-list]
	 */
	itemSelector : 'x-combo-list',
	/**
	 * @cfg {String} cls
	 */
	cls: 'combo-checkable',
	/**
	 * @cfg {String} selectAllText The "SELECT ALL" phrase [Select All]
	 */
	selectAllText: 'Select All',
	/**
	 * @cfg {String} clearAllText the text to display for "clear all" link
	 */
	clearAllText : 'clear all',

	/**
	 * @cfg {String} separatorHtml arbitrary html rendered after Checkable controls.  Can be used to add an
	 * html separator markup.
	 */
	separatorHtml : '',

	// private {Boolean} checked
	checked : null,

	init : function(combo) {
		this.combo = combo;
		var checkable = this;
		var id = Ext.id();
		var cls = combo.itemSelector || this.itemSelector;

		if (!combo.tpl) {
			combo.tpl =['<tpl for=".">','<div class="'+cls+'-item">{'+combo.displayField+'}</div>','</tpl>']       .  join('');
		}
		combo.tpl = [
			'<div class="plugin ' + this.cls + '">',
				'<span class="' + this.cls + '-select-all">',
					'<input id="'+id+'" type="checkbox" />&nbsp;<label>'+this.selectAllText+'</label>',
				'</span>',
				'&nbsp;<span class="'+this.cls+'-clear-all">(<a href="#">' + this.clearAllText + '</a>)</span>',
			'</div>',
			this.separatorHtml
		].join('') + combo.tpl.replace(new RegExp('({'+combo.displayField+'})'), "<input type=\"checkbox\" <tpl if=\"values._checked\">checked</tpl> />&nbsp;<label>$1</label>");

		combo.on('initview', function(c, dv) {
			dv.on('containerclick', this.onContainerClick.createDelegate(this));
			dv.on('selectionchange', this.onSelectionChange.createDelegate(this));
			dv.el.on('mouseover', this.onViewOver, this);
		},this);
		combo.on('select', this.onSelect.createDelegate(this));
	},

    onViewOver : function(ev, node){
		var target = ev.getTarget('.' + this.cls, 5);
		if (target) {
			this.combo.clearHighlight();
			Ext.fly(target).addClass(this.combo.highlightClass);
		}
        if(this.inKeyMode){ // prevent key nav and mouse over conflicts
            return;
        }
        return;
    },

	onSelect : function(rec, index) {
		// anything?
	},

	/**
	 * getCheckbox
	 * @return {DomNode}
	 */
	getCheckbox : function() {
		return this.combo.view.el.child('.'+this.cls+' '+this.checkSelector, true);
	},

	/**
	 * onSelectChange Fired by MultiCombo
	 * @param {Object} dv
	 * @param {Object} rs
	 */
	onSelectionChange : function(dv, rs) {
		this.checked = (rs.length > 0 && rs.length == this.combo.store.getCount()) ? true : false;
		this.getCheckbox().checked = this.checked;

		var selector = this.checkSelector;
		setTimeout(function() {
			dv.el.select(dv.itemSelector + ' ' + selector).each(function(f) {
				f.dom.checked = false;
			});
			dv.el.select('.' + dv.selectedClass + ' ' + selector).each(function(f) {
				f.dom.checked = true;
			});
		},1);
	},

	/**
	 * selectNext Called by MultiCombo.  use this to apply hover-class to this row.
	 * @param {Object} sender
	 */
	selectNext: function(sender) {
		sender.view.el.child('.' + this.cls).addClass(sender.highlightClass);
	},

	/**
	 * selectPrev Called by MultiCombo, use this to apply hover class to row.
	 * @param {Object} sender
	 */
	selectPrev : function(sender) {
		sender.view.el.child('.' + this.cls).addClass(sender.highlightClass);
	},

	/**
	 * onEnter Called by MultiCombo
	 * @param {Object} sender
	 */
	onEnter : function(sender) {
		this.setChecked(!this.checked);
	},

	/**
	 * onContainerClick Fired by MultiCombo
	 * @param {Object} dv
	 * @param {Object} ev
	 */
	onContainerClick : function(dv, ev) {
		var btnClearAll = ev.getTarget('.'+this.cls+'-clear-all');
		if (btnClearAll) {
			this.clearAll();
		}
		else {
			this.setChecked(!this.checked);
		}
		return false;
	},

	// private selectAll
	selectAll : function() {
		var value = [];
		this.combo.store.each(function(r) { value.push(r.data[this.combo.valueField]); },this);
		this.combo.setValue(value);
		this.combo.selectByValue(this.combo.getValue());
		this.combo.focus();
	},

	// private clearAll
	clearAll : function() {
		this.combo.updateValue([]);
		this.combo.selectByValue([]);
		this.combo.view.clearSelections();
		this.combo.focus();
        this.combo.fireEvent('clearall', this.combo);
	},

	/**
	 * setChecked
	 * @param {Object} v
	 */
	setChecked : function(v) {
		if (v == this.checked) {
			return;
		}
		this.checked = v;
		this.getCheckbox().checked = this.checked;
		if (this.checked == true) {
			this.selectAll();
		}
		else {
			this.clearAll();
		}
	}
}