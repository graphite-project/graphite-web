/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
/**
 * @class Ext.calendar.DateRangeField
 * @extends Ext.form.Field
 * <p>A combination field that includes start and end dates and times, as well as an optional all-day checkbox.</p>
 * @constructor
 * @param {Object} config The config object
 */
Ext.calendar.DateRangeField = Ext.extend(Ext.form.Field, {
    /**
     * @cfg {String} toText
     * The text to display in between the date/time fields (defaults to 'to')
     */
    toText: 'to',
    /**
     * @cfg {String} toText
     * The text to display as the label for the all day checkbox (defaults to 'All day')
     */
    allDayText: 'All day',

    // private
    onRender: function(ct, position) {
        if (!this.el) {
            this.startDate = new Ext.form.DateField({
                id: this.id + '-start-date',
                format: 'n/j/Y',
                width: 100,
                listeners: {
                    'change': {
                        fn: function() {
                            this.checkDates('date', 'start');
                        },
                        scope: this
                    }
                }
            });
            this.startTime = new Ext.form.TimeField({
                id: this.id + '-start-time',
                hidden: this.showTimes === false,
                labelWidth: 0,
                hideLabel: true,
                width: 90,
                listeners: {
                    'select': {
                        fn: function() {
                            this.checkDates('time', 'start');
                        },
                        scope: this
                    }
                }
            });
            this.endTime = new Ext.form.TimeField({
                id: this.id + '-end-time',
                hidden: this.showTimes === false,
                labelWidth: 0,
                hideLabel: true,
                width: 90,
                listeners: {
                    'select': {
                        fn: function() {
                            this.checkDates('time', 'end');
                        },
                        scope: this
                    }
                }
            });
            this.endDate = new Ext.form.DateField({
                id: this.id + '-end-date',
                format: 'n/j/Y',
                hideLabel: true,
                width: 100,
                listeners: {
                    'change': {
                        fn: function() {
                            this.checkDates('date', 'end');
                        },
                        scope: this
                    }
                }
            });
            this.allDay = new Ext.form.Checkbox({
                id: this.id + '-allday',
                hidden: this.showTimes === false || this.showAllDay === false,
                boxLabel: this.allDayText,
                handler: function(chk, checked) {
                    this.startTime.setVisible(!checked);
                    this.endTime.setVisible(!checked);
                },
                scope: this
            });
            this.toLabel = new Ext.form.Label({
                xtype: 'label',
                id: this.id + '-to-label',
                text: this.toText
            });

            this.fieldCt = new Ext.Container({
                autoEl: {
                    id: this.id
                },
                //make sure the container el has the field's id
                cls: 'ext-dt-range',
                renderTo: ct,
                layout: 'table',
                layoutConfig: {
                    columns: 6
                },
                defaults: {
                    hideParent: true
                },
                items: [
                this.startDate,
                this.startTime,
                this.toLabel,
                this.endTime,
                this.endDate,
                this.allDay
                ]
            });

            this.fieldCt.ownerCt = this;
            this.el = this.fieldCt.getEl();
            this.items = new Ext.util.MixedCollection();
            this.items.addAll([this.startDate, this.endDate, this.toLabel, this.startTime, this.endTime, this.allDay]);
        }
        Ext.calendar.DateRangeField.superclass.onRender.call(this, ct, position);
    },

    // private
    checkDates: function(type, startend) {
        var startField = Ext.getCmp(this.id + '-start-' + type),
        endField = Ext.getCmp(this.id + '-end-' + type),
        startValue = this.getDT('start'),
        endValue = this.getDT('end');

        if (startValue > endValue) {
            if (startend == 'start') {
                endField.setValue(startValue);
            } else {
                startField.setValue(endValue);
                this.checkDates(type, 'start');
            }
        }
        if (type == 'date') {
            this.checkDates('time', startend);
        }
    },

    /**
     * Returns an array containing the following values in order:<div class="mdetail-params"><ul>
     * <li><b><code>DateTime</code></b> : <div class="sub-desc">The start date/time</div></li>
     * <li><b><code>DateTime</code></b> : <div class="sub-desc">The end date/time</div></li>
     * <li><b><code>Boolean</code></b> : <div class="sub-desc">True if the dates are all-day, false 
     * if the time values should be used</div></li><ul></div>
     * @return {Array} The array of return values
     */
    getValue: function() {
        return [
        this.getDT('start'),
        this.getDT('end'),
        this.allDay.getValue()
        ];
    },

    // private getValue helper
    getDT: function(startend) {
        var time = this[startend + 'Time'].getValue(),
        dt = this[startend + 'Date'].getValue();

        if (Ext.isDate(dt)) {
            dt = dt.format(this[startend + 'Date'].format);
        }
        else {
            return null;
        };
        if (time != '' && this[startend + 'Time'].isVisible()) {
            return Date.parseDate(dt + ' ' + time, this[startend + 'Date'].format + ' ' + this[startend + 'Time'].format);
        }
        return Date.parseDate(dt, this[startend + 'Date'].format);

    },

    /**
     * Sets the values to use in the date range.
     * @param {Array/Date/Object} v The value(s) to set into the field. Valid types are as follows:<div class="mdetail-params"><ul>
     * <li><b><code>Array</code></b> : <div class="sub-desc">An array containing, in order, a start date, end date and all-day flag.
     * This array should exactly match the return type as specified by {@link #getValue}.</div></li>
     * <li><b><code>DateTime</code></b> : <div class="sub-desc">A single Date object, which will be used for both the start and
     * end dates in the range.  The all-day flag will be defaulted to false.</div></li>
     * <li><b><code>Object</code></b> : <div class="sub-desc">An object containing properties for StartDate, EndDate and IsAllDay
     * as defined in {@link Ext.calendar.EventMappings}.</div></li><ul></div>
     */
    setValue: function(v) {
        if (Ext.isArray(v)) {
            this.setDT(v[0], 'start');
            this.setDT(v[1], 'end');
            this.allDay.setValue( !! v[2]);
        }
        else if (Ext.isDate(v)) {
            this.setDT(v, 'start');
            this.setDT(v, 'end');
            this.allDay.setValue(false);
        }
        else if (v[Ext.calendar.EventMappings.StartDate.name]) {
            //object
            this.setDT(v[Ext.calendar.EventMappings.StartDate.name], 'start');
            if (!this.setDT(v[Ext.calendar.EventMappings.EndDate.name], 'end')) {
                this.setDT(v[Ext.calendar.EventMappings.StartDate.name], 'end');
            }
            this.allDay.setValue( !! v[Ext.calendar.EventMappings.IsAllDay.name]);
        }
    },

    // private setValue helper
    setDT: function(dt, startend) {
        if (dt && Ext.isDate(dt)) {
            this[startend + 'Date'].setValue(dt);
            this[startend + 'Time'].setValue(dt.format(this[startend + 'Time'].format));
            return true;
        }
    },

    // inherited docs
    isDirty: function() {
        var dirty = false;
        if (this.rendered && !this.disabled) {
            this.items.each(function(item) {
                if (item.isDirty()) {
                    dirty = true;
                    return false;
                }
            });
        }
        return dirty;
    },

    // private
    onDisable: function() {
        this.delegateFn('disable');
    },

    // private
    onEnable: function() {
        this.delegateFn('enable');
    },

    // inherited docs
    reset: function() {
        this.delegateFn('reset');
    },

    // private
    delegateFn: function(fn) {
        this.items.each(function(item) {
            if (item[fn]) {
                item[fn]();
            }
        });
    },

    // private
    beforeDestroy: function() {
        Ext.destroy(this.fieldCt);
        Ext.calendar.DateRangeField.superclass.beforeDestroy.call(this);
    },

    /**
     * @method getRawValue
     * @hide
     */
    getRawValue: Ext.emptyFn,
    /**
     * @method setRawValue
     * @hide
     */
    setRawValue: Ext.emptyFn
});

Ext.reg('daterangefield', Ext.calendar.DateRangeField);
