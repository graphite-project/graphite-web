/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
/*
 * @class Ext.calendar.StatusProxy
 * A specialized drag proxy that supports a drop status icon, {@link Ext.Layer} styles and auto-repair. It also
 * contains a calendar-specific drag status message containing details about the dragged event's target drop date range.  
 * This is the default drag proxy used by all calendar views.
 * @constructor
 * @param {Object} config
 */
Ext.calendar.StatusProxy = function(config) {
    Ext.apply(this, config);
    this.id = this.id || Ext.id();
    this.el = new Ext.Layer({
        dh: {
            id: this.id,
            cls: 'ext-dd-drag-proxy x-dd-drag-proxy ' + this.dropNotAllowed,
            cn: [
            {
                cls: 'x-dd-drop-icon'
            },
            {
                cls: 'ext-dd-ghost-ct',
                cn: [
                {
                    cls: 'x-dd-drag-ghost'
                },
                {
                    cls: 'ext-dd-msg'
                }
                ]
            }
            ]
        },
        shadow: !config || config.shadow !== false
    });
    this.ghost = Ext.get(this.el.dom.childNodes[1].childNodes[0]);
    this.message = Ext.get(this.el.dom.childNodes[1].childNodes[1]);
    this.dropStatus = this.dropNotAllowed;
};

Ext.extend(Ext.calendar.StatusProxy, Ext.dd.StatusProxy, {
    /**
     * @cfg {String} moveEventCls
     * The CSS class to apply to the status element when an event is being dragged (defaults to 'ext-cal-dd-move').
     */
    moveEventCls: 'ext-cal-dd-move',
    /**
     * @cfg {String} addEventCls
     * The CSS class to apply to the status element when drop is not allowed (defaults to 'ext-cal-dd-add').
     */
    addEventCls: 'ext-cal-dd-add',

    // inherit docs
    update: function(html) {
        if (typeof html == 'string') {
            this.ghost.update(html);
        } else {
            this.ghost.update('');
            html.style.margin = '0';
            this.ghost.dom.appendChild(html);
        }
        var el = this.ghost.dom.firstChild;
        if (el) {
            Ext.fly(el).setStyle('float', 'none').setHeight('auto');
            Ext.getDom(el).id += '-ddproxy';
        }
    },

    /**
     * Update the calendar-specific drag status message without altering the ghost element.
     * @param {String} msg The new status message
     */
    updateMsg: function(msg) {
        this.message.update(msg);
    }
});