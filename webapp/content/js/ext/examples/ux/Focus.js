/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
(function(){
Ext.ns('Ext.a11y');

Ext.a11y.Frame = Ext.extend(Object, {
    initialized: false,
    
    constructor: function(size, color){
        this.setSize(size || 1);
        this.setColor(color || '15428B');
    },
    
    init: function(){
        if (!this.initialized) {
            this.sides = [];
            
            var s, i;
            
            this.ct = Ext.DomHelper.append(document.body, {
                cls: 'x-a11y-focusframe'
            }, true);
            
            for (i = 0; i < 4; i++) {
                s = Ext.DomHelper.append(this.ct, {
                    cls: 'x-a11y-focusframe-side',
                    style: 'background-color: #' + this.color
                }, true);
                s.visibilityMode = Ext.Element.DISPLAY;
                this.sides.push(s);
            }
            
            this.frameTask = new Ext.util.DelayedTask(function(el){
                var newEl = Ext.get(el);
                if (newEl != this.curEl) {
                    var w = newEl.getWidth();
                    var h = newEl.getHeight();
                    this.sides[0].show().setSize(w, this.size).anchorTo(el, 'tl', [0, -1]);
                    this.sides[2].show().setSize(w, this.size).anchorTo(el, 'bl', [0, -1]);
                    this.sides[1].show().setSize(this.size, h).anchorTo(el, 'tr', [-1, 0]);
                    this.sides[3].show().setSize(this.size, h).anchorTo(el, 'tl', [-1, 0]);
                    this.curEl = newEl;
                }
            }, this);
            
            this.unframeTask = new Ext.util.DelayedTask(function(){
                if (this.initialized) {
                    this.sides[0].hide();
                    this.sides[1].hide();
                    this.sides[2].hide();
                    this.sides[3].hide();
                    this.curEl = null;
                }
            }, this);
            this.initialized = true;
        }
    },
    
    frame: function(el){
        this.init();
        this.unframeTask.cancel();
        this.frameTask.delay(2, false, false, [el]);
    },
    
    unframe: function(){
        this.init();
        this.unframeTask.delay(2);
    },
    
    setSize: function(size){
        this.size = size;
    },
    
    setColor: function(color){
        this.color = color;
    }
});

Ext.a11y.FocusFrame = new Ext.a11y.Frame(2, '15428B');
Ext.a11y.RelayFrame = new Ext.a11y.Frame(1, '6B8CBF');

Ext.a11y.Focusable = Ext.extend(Ext.util.Observable, {
    constructor: function(el, relayTo, noFrame, frameEl){
        Ext.a11y.Focusable.superclass.constructor.call(this);
        
        this.addEvents('focus', 'blur', 'left', 'right', 'up', 'down', 'esc', 'enter', 'space');
        
        if (el instanceof Ext.Component) {
            this.el = el.el;
            this.setComponent(el);
        }
        else {
            this.el = Ext.get(el);
            this.setComponent(null);
        }
        
        this.setRelayTo(relayTo)
        this.setNoFrame(noFrame);
        this.setFrameEl(frameEl);
        
        this.init();
        
        Ext.a11y.FocusMgr.register(this);
    },
    
    init: function(){
        this.el.dom.tabIndex = '1';
        this.el.addClass('x-a11y-focusable');
        this.el.on({
            focus: this.onFocus,
            blur: this.onBlur,
            keydown: this.onKeyDown,
            scope: this
        });
    },
    
    setRelayTo: function(relayTo){
        this.relayTo = relayTo ? Ext.a11y.FocusMgr.get(relayTo) : null;
    },
    
    setNoFrame: function(noFrame){
        this.noFrame = (noFrame === true) ? true : false;
    },
    
    setFrameEl: function(frameEl){
        this.frameEl = frameEl && Ext.get(frameEl) || this.el;
    },
    
    setComponent: function(cmp){
        this.component = cmp || null;
    },
    
    onKeyDown: function(e, t){
        var k = e.getKey(), SK = Ext.a11y.Focusable.SpecialKeys, ret, tf;
        
        tf = (t !== this.el.dom) ? Ext.a11y.FocusMgr.get(t, true) : this;
        if (!tf) {
            // this can happen when you are on a focused item within a panel body
            // that is not a Ext.a11y.Focusable
            tf = Ext.a11y.FocusMgr.get(Ext.fly(t).parent('.x-a11y-focusable'));
        }
        
        if (SK[k] !== undefined) {
            ret = this.fireEvent(SK[k], e, t, tf, this);
        }
        if (ret === false || this.fireEvent('keydown', e, t, tf, this) === false) {
            e.stopEvent();
        }
    },
    
    focus: function(){
        this.el.dom.focus();
    },
    
    blur: function(){
        this.el.dom.blur();
    },
    
    onFocus: function(e, t){
        this.el.addClass('x-a11y-focused');
        if (this.relayTo) {
            this.relayTo.el.addClass('x-a11y-focused-relay');
            if (!this.relayTo.noFrame) {
                Ext.a11y.FocusFrame.frame(this.relayTo.frameEl);
            }
            if (!this.noFrame) {
                Ext.a11y.RelayFrame.frame(this.frameEl);
            }
        }
        else {
            if (!this.noFrame) {
                Ext.a11y.FocusFrame.frame(this.frameEl);
            }
        }
        
        this.fireEvent('focus', e, t, this);
    },
    
    onBlur: function(e, t){
        if (this.relayTo) {
            this.relayTo.el.removeClass('x-a11y-focused-relay');
            Ext.a11y.RelayFrame.unframe();
        }
        this.el.removeClass('x-a11y-focused');
        Ext.a11y.FocusFrame.unframe();
        this.fireEvent('blur', e, t, this);
    },
    
    destroy: function(){
        this.el.un('keydown', this.onKeyDown);
        this.el.un('focus', this.onFocus);
        this.el.un('blur', this.onBlur);
        this.el.removeClass('x-a11y-focusable');
        this.el.removeClass('x-a11y-focused');
        if (this.relayTo) {
            this.relayTo.el.removeClass('x-a11y-focused-relay');
        }
    }
});

Ext.a11y.FocusItem = Ext.extend(Object, {
    constructor: function(el, enableTabbing){
        Ext.a11y.FocusItem.superclass.constructor.call(this);
        
        this.el = Ext.get(el);
        this.fi = new Ext.a11y.Focusable(el);
        this.fi.setComponent(this);
        
        this.fi.on('tab', this.onTab, this);
        
        this.enableTabbing = enableTabbing === true ? true : false;
    },
    
    getEnterItem: function(){
        if (this.enableTabbing) {
            var items = this.getFocusItems();
            if (items && items.length) {
                return items[0];
            }
        }
    },
    
    getFocusItems: function(){
        if (this.enableTabbing) {
            return this.el.query('a, button, input, select');
        }
        return null;
    },
    
    onTab: function(e, t){
        var items = this.getFocusItems(), i;
        
        if (items && items.length && (i = items.indexOf(t)) !== -1) {
            if (e.shiftKey && i > 0) {
                e.stopEvent();
                items[i - 1].focus();
                Ext.a11y.FocusFrame.frame.defer(20, Ext.a11y.FocusFrame, [this.el]);
                return;
            }
            else 
                if (!e.shiftKey && i < items.length - 1) {
                    e.stopEvent();
                    items[i + 1].focus();
                    Ext.a11y.FocusFrame.frame.defer(20, Ext.a11y.FocusFrame, [this.el]);
                    return;
                }
        }
    },
    
    focus: function(){
        if (this.enableTabbing) {
            var items = this.getFocusItems();
            if (items && items.length) {
                items[0].focus();
                Ext.a11y.FocusFrame.frame.defer(20, Ext.a11y.FocusFrame, [this.el]);
                return;
            }
        }
        this.fi.focus();
    },
    
    blur: function(){
        this.fi.blur();
    }
});

Ext.a11y.FocusMgr = function(){
    var all = new Ext.util.MixedCollection();
    
    return {
        register: function(f){
            all.add(f.el && Ext.id(f.el), f);
        },
        
        unregister: function(f){
            all.remove(f);
        },
        
        get: function(el, noCreate){
            return all.get(Ext.id(el)) || (noCreate ? false : new Ext.a11y.Focusable(el));
        },
        
        all: all
    }
}();

Ext.a11y.Focusable.SpecialKeys = {};
Ext.a11y.Focusable.SpecialKeys[Ext.EventObjectImpl.prototype.LEFT] = 'left';
Ext.a11y.Focusable.SpecialKeys[Ext.EventObjectImpl.prototype.RIGHT] = 'right';
Ext.a11y.Focusable.SpecialKeys[Ext.EventObjectImpl.prototype.DOWN] = 'down';
Ext.a11y.Focusable.SpecialKeys[Ext.EventObjectImpl.prototype.UP] = 'up';
Ext.a11y.Focusable.SpecialKeys[Ext.EventObjectImpl.prototype.ESC] = 'esc';
Ext.a11y.Focusable.SpecialKeys[Ext.EventObjectImpl.prototype.ENTER] = 'enter';
Ext.a11y.Focusable.SpecialKeys[Ext.EventObjectImpl.prototype.SPACE] = 'space';
Ext.a11y.Focusable.SpecialKeys[Ext.EventObjectImpl.prototype.TAB] = 'tab';

// we use the new observeClass method to fire our new initFocus method on components
Ext.util.Observable.observeClass(Ext.Component);
Ext.Component.on('render', function(cmp){
    cmp.initFocus();
    cmp.initARIA();
});
Ext.override(Ext.Component, {
    initFocus: Ext.emptyFn,
    initARIA: Ext.emptyFn
});

Ext.override(Ext.Container, {
    isFocusable: true,
    noFocus: false,
    
    // private
    initFocus: function(){
        if (!this.fi && !this.noFocus) {
            this.fi = new Ext.a11y.Focusable(this);
        }
        this.mon(this.fi, {
            focus: this.onFocus,
            blur: this.onBlur,
            tab: this.onTab,
            enter: this.onEnter,
            esc: this.onEsc,
            scope: this
        });
        
        if (this.hidden) {
            this.isFocusable = false;
        }
        
        this.on('show', function(){
            this.isFocusable = true;
        }, this);
        this.on('hide', function(){
            this.isFocusable = false;
        }, this);
    },
    
    focus: function(){
        this.fi.focus();
    },
    
    blur: function(){
        this.fi.blur();
    },
    
    enter: function(){
        var eitem = this.getEnterItem();
        if (eitem) {
            eitem.focus();
        }
    },
    
    onFocus: Ext.emptyFn,
    onBlur: Ext.emptyFn,
    
    onTab: function(e, t, tf){
        var rf = tf.relayTo || tf;
        if (rf.component && rf.component !== this) {
            e.stopEvent();
            var item = e.shiftKey ? this.getPreviousFocus(rf.component) : this.getNextFocus(rf.component);
            item.focus();
        }
    },
    
    onEnter: function(e, t, tf){
        // check to see if enter is pressed while "on" the panel
        if (tf.component && tf.component === this) {
            e.stopEvent();
            this.enter();
        }
        e.stopPropagation();
    },
    
    onEsc: function(e, t){
        e.preventDefault();
        
        // check to see if esc is pressed while "inside" the panel
        // or while "on" the panel
        if (t === this.el.dom) {
            // "on" the panel, check if this panel has an owner panel and focus that
            // we dont stop the event in this case so that this same check will be
            // done for this ownerCt
            if (this.ownerCt) {
                this.ownerCt.focus();
            }
        }
        else {
            // we were inside the panel when esc was pressed,
            // so go back "on" the panel
            if (this.ownerCt && this.ownerCt.isFocusable) {
                var si = this.ownerCt.getFocusItems();
                
                if (si && si.getCount() > 1) {
                    e.stopEvent();
                }
            }
            this.focus();
        }
    },
    
    getFocusItems: function(){
        return this.items &&
            this.items.filterBy(function(o){
                return o.isFocusable;
            }) ||
            null;
    },
    
    getEnterItem: function(){
        var ci = this.getFocusItems(), length = ci ? ci.getCount() : 0;
        
        if (length === 1) {
            return ci.first().getEnterItem && ci.first().getEnterItem() || ci.first();
        }
        else if (length > 1) {
            return ci.first();
        }
    },
    
    getNextFocus: function(current){
        var items = this.getFocusItems(), next = current, i = items.indexOf(current), length = items.getCount();
        
        if (i === length - 1) {
            next = items.first();
        }
        else {
            next = items.get(i + 1);
        }
        return next;
    },
    
    getPreviousFocus: function(current){
        var items = this.getFocusItems(), prev = current, i = items.indexOf(current), length = items.getCount();
        
        if (i === 0) {
            prev = items.last();
        }
        else {
            prev = items.get(i - 1);
        }
        return prev;
    },
    
    getFocusable : function() {
        return this.fi;
    }
});

Ext.override(Ext.Panel, {
    /**
     * @cfg {Boolean} enableTabbing <tt>true</tt> to enable tabbing. Default is <tt>false</tt>.
     */        
    getFocusItems: function(){
        // items gets all the items inside the body
        var items = Ext.Panel.superclass.getFocusItems.call(this), bodyFocus = null;

        if (!items) {
            items = new Ext.util.MixedCollection();
            this.bodyFocus = this.bodyFocus || new Ext.a11y.FocusItem(this.body, this.enableTabbing);
            items.add('body', this.bodyFocus);
        }
        // but panels can also have tbar, bbar, fbar
        if (this.tbar && this.topToolbar) {
            items.insert(0, this.topToolbar);
        }
        if (this.bbar && this.bottomToolbar) {
            items.add(this.bottomToolbar);
        }
        if (this.fbar) {
            items.add(this.fbar);
        }
        
        return items;
    }
});

Ext.override(Ext.TabPanel, {
    // private
    initFocus: function(){
        Ext.TabPanel.superclass.initFocus.call(this);
        this.mon(this.fi, {
            left: this.onLeft,
            right: this.onRight,
            scope: this
        });
    },
    
    onLeft: function(e){
        if (!this.activeTab) {
            return;
        }
        e.stopEvent();
        var prev = this.items.itemAt(this.items.indexOf(this.activeTab) - 1);
        if (prev) {
            this.setActiveTab(prev);
        }
        return false;
    },
    
    onRight: function(e){
        if (!this.activeTab) {
            return;
        }
        e.stopEvent();
        var next = this.items.itemAt(this.items.indexOf(this.activeTab) + 1);
        if (next) {
            this.setActiveTab(next);
        }
        return false;
    }
});

Ext.override(Ext.tree.TreeNodeUI, {
    // private
    focus: function(){
        this.node.getOwnerTree().bodyFocus.focus();
    }
});

Ext.override(Ext.tree.TreePanel, {
    // private
    afterRender : function(){
        Ext.tree.TreePanel.superclass.afterRender.call(this);
        this.root.render();
        if(!this.rootVisible){
            this.root.renderChildren();
        }
        this.bodyFocus = new Ext.a11y.FocusItem(this.body.down('.x-tree-root-ct'));
        this.bodyFocus.fi.setFrameEl(this.body);
    } 
});

Ext.override(Ext.grid.GridPanel, {
    initFocus: function(){
        Ext.grid.GridPanel.superclass.initFocus.call(this);
        this.bodyFocus = new Ext.a11y.FocusItem(this.view.focusEl);
        this.bodyFocus.fi.setFrameEl(this.body);
    }
});

Ext.override(Ext.Button, {
    isFocusable: true,
    noFocus: false,
    
    initFocus: function(){
        Ext.Button.superclass.initFocus.call(this);
        this.fi = this.fi || new Ext.a11y.Focusable(this.btnEl, null, null, this.el);
        this.fi.setComponent(this);
        
        this.mon(this.fi, {
            focus: this.onFocus,
            blur: this.onBlur,
            scope: this
        });
        
        if (this.menu) {
            this.mon(this.fi, 'down', this.showMenu, this);
            this.on('menuhide', this.focus, this);
        }
        
        if (this.hidden) {
            this.isFocusable = false;
        }
        
        this.on('show', function(){
            this.isFocusable = true;
        }, this);
        this.on('hide', function(){
            this.isFocusable = false;
        }, this);
    },
    
    focus: function(){
        this.fi.focus();
    },
    
    blur: function(){
        this.fi.blur();
    },
    
    onFocus: function(){
        if (!this.disabled) {
            this.el.addClass("x-btn-focus");
        }
    },
    
    onBlur: function(){
        this.el.removeClass("x-btn-focus");
    }
});

Ext.override(Ext.Toolbar, {
    initFocus: function(){
        Ext.Toolbar.superclass.initFocus.call(this);
        this.mon(this.fi, {
            left: this.onLeft,
            right: this.onRight,
            scope: this
        });
        
        this.on('focus', this.onButtonFocus, this, {
            stopEvent: true
        });
    },
    
    add: function(){
        var item = Ext.Toolbar.superclass.add.apply(this, arguments);
        if(!item || !item.events) {
            return item;
        }
        if (item.rendered && item.fi !== undefined) {
            item.fi.setRelayTo(this.el);
            this.relayEvents(item.fi, ['focus']);
        }
        else {
            item.on('render', function(){
                if (item.fi !== undefined) {
                    item.fi.setRelayTo(this.el);
                    this.relayEvents(item.fi, ['focus']);
                }
            }, this, {
                single: true
            });
        }
        return item;
    },
    
    onFocus: function(){
        var items = this.getFocusItems();
        if (items && items.getCount() > 0) {
            if (this.lastFocus && items.indexOf(this.lastFocus) !== -1) {
                this.lastFocus.focus();
            }
            else {
                items.first().focus();
            }
        }
    },
    
    onButtonFocus: function(e, t, tf){
        this.lastFocus = tf.component || null;
    },
    
    onLeft: function(e, t, tf){
        e.stopEvent();
        this.getPreviousFocus(tf.component).focus();
    },
    
    onRight: function(e, t, tf){
        e.stopEvent();
        this.getNextFocus(tf.component).focus();
    },
    
    getEnterItem: Ext.emptyFn,
    onTab: Ext.emptyFn,
    onEsc: Ext.emptyFn
});

Ext.override(Ext.menu.BaseItem, {
    initFocus: function(){
        this.fi = new Ext.a11y.Focusable(this, this.parentMenu && this.parentMenu.el || null, true);
    }
});

Ext.override(Ext.menu.Menu, {
    initFocus: function(){
        this.fi = new Ext.a11y.Focusable(this);
        this.focusEl = this.fi;
    }
});

Ext.a11y.WindowMgr = new Ext.WindowGroup();

Ext.apply(Ext.WindowMgr, {
    bringToFront: function(win){
        Ext.a11y.WindowMgr.bringToFront.call(this, win);
        if (win.modal) {
            win.enter();
        }
        else {
            win.focus();
        }
    }
});

Ext.override(Ext.Window, {
    initFocus: function(){
        Ext.Window.superclass.initFocus.call(this);
        this.on('beforehide', function(){
            Ext.a11y.RelayFrame.unframe();
            Ext.a11y.FocusFrame.unframe();
        });
    }
});

Ext.override(Ext.form.Field, {
    isFocusable: true,
    noFocus: false,
    
    initFocus: function(){
        this.fi = this.fi || new Ext.a11y.Focusable(this, null, true);
        
        Ext.form.Field.superclass.initFocus.call(this);
        
        if (this.hidden) {
            this.isFocusable = false;
        }
        
        this.on('show', function(){
            this.isFocusable = true;
        }, this);
        this.on('hide', function(){
            this.isFocusable = false;
        }, this);
    }
});

Ext.override(Ext.FormPanel, {
    initFocus: function(){
        Ext.FormPanel.superclass.initFocus.call(this);
        this.on('focus', this.onFieldFocus, this, {
            stopEvent: true
        });
    },
    
    // private
    createForm: function(){
        delete this.initialConfig.listeners;
        var form = new Ext.form.BasicForm(null, this.initialConfig);
        form.afterMethod('add', this.formItemAdd, this);
        return form;
    },
    
    formItemAdd: function(item){
        item.on('render', function(field){
            field.fi.setRelayTo(this.el);
            this.relayEvents(field.fi, ['focus']);
        }, this, {
            single: true
        });
    },
    
    onFocus: function(){
        var items = this.getFocusItems();
        if (items && items.getCount() > 0) {
            if (this.lastFocus && items.indexOf(this.lastFocus) !== -1) {
                this.lastFocus.focus();
            }
            else {
                items.first().focus();
            }
        }
    },
    
    onFieldFocus: function(e, t, tf){
        this.lastFocus = tf.component || null;
    },
    
    onTab: function(e, t, tf){
        if (tf.relayTo.component === this) {
            var item = e.shiftKey ? this.getPreviousFocus(tf.component) : this.getNextFocus(tf.component);
            
            if (item) {
                ev.stopEvent();
                item.focus();
                return;
            }
        }
        Ext.FormPanel.superclass.onTab.apply(this, arguments);
    },
    
    getNextFocus: function(current){
        var items = this.getFocusItems(), i = items.indexOf(current), length = items.getCount();
        
        return (i < length - 1) ? items.get(i + 1) : false;
    },
    
    getPreviousFocus: function(current){
        var items = this.getFocusItems(), i = items.indexOf(current), length = items.getCount();
        
        return (i > 0) ? items.get(i - 1) : false;
    }
});

Ext.override(Ext.Viewport, {
    initFocus: function(){
        Ext.Viewport.superclass.initFocus.apply(this);
        this.mon(Ext.get(document), 'focus', this.focus, this);
        this.mon(Ext.get(document), 'blur', this.blur, this);
        this.fi.setNoFrame(true);
    },
    
    onTab: function(e, t, tf, f){
        e.stopEvent();
        
        if (tf === f) {
            items = this.getFocusItems();
            if (items && items.getCount() > 0) {
                items.first().focus();
            }
        }
        else {
            var rf = tf.relayTo || tf;
            var item = e.shiftKey ? this.getPreviousFocus(rf.component) : this.getNextFocus(rf.component);
            item.focus();
        }
    }
});
    
})();