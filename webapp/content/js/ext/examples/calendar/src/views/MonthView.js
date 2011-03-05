/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
/**
 * @class Ext.calendar.MonthView
 * @extends Ext.calendar.CalendarView
 * <p>Displays a calendar view by month. This class does not usually need ot be used directly as you can
 * use a {@link Ext.calendar.CalendarPanel CalendarPanel} to manage multiple calendar views at once including
 * the month view.</p>
 * @constructor
 * @param {Object} config The config object
 */
Ext.calendar.MonthView = Ext.extend(Ext.calendar.CalendarView, {
    /**
     * @cfg {Boolean} showTime
     * True to display the current time in today's box in the calendar, false to not display it (defautls to true)
     */
    showTime: true,
    /**
     * @cfg {Boolean} showTodayText
     * True to display the {@link #todayText} string in today's box in the calendar, false to not display it (defautls to true)
     */
    showTodayText: true,
    /**
     * @cfg {String} todayText
     * The text to display in the current day's box in the calendar when {@link #showTodayText} is true (defaults to 'Today')
     */
    todayText: 'Today',
    /**
     * @cfg {Boolean} showHeader
     * True to display a header beneath the navigation bar containing the week names above each week's column, false not to 
     * show it and instead display the week names in the first row of days in the calendar (defaults to false).
     */
    showHeader: false,
    /**
     * @cfg {Boolean} showWeekLinks
     * True to display an extra column before the first day in the calendar that links to the {@link Ext.calendar.WeekView view}
     * for each individual week, false to not show it (defaults to false). If true, the week links can also contain the week 
     * number depending on the value of {@link #showWeekNumbers}.
     */
    showWeekLinks: false,
    /**
     * @cfg {Boolean} showWeekNumbers
     * True to show the week number for each week in the calendar in the week link column, false to show nothing (defaults to false).
     * Note that if {@link #showWeekLinks} is false this config will have no affect even if true.
     */
    showWeekNumbers: false,
    /**
     * @cfg {String} weekLinkOverClass
     * The CSS class name applied when the mouse moves over a week link element (only applies when {@link #showWeekLinks} is true,
     * defaults to 'ext-week-link-over').
     */
    weekLinkOverClass: 'ext-week-link-over',

    //private properties -- do not override:
    daySelector: '.ext-cal-day',
    moreSelector: '.ext-cal-ev-more',
    weekLinkSelector: '.ext-cal-week-link',
    weekCount: -1,
    // defaults to auto by month
    dayCount: 7,
    moreElIdDelimiter: '-more-',
    weekLinkIdDelimiter: 'ext-cal-week-',

    // private
    initComponent: function() {
        Ext.calendar.MonthView.superclass.initComponent.call(this);
        this.addEvents({
            /**
             * @event dayclick
             * Fires after the user clicks within the view container and not on an event element
             * @param {Ext.calendar.MonthView} this
             * @param {Date} dt The date/time that was clicked on
             * @param {Boolean} allday True if the day clicked on represents an all-day box, else false. Clicks within the 
             * MonthView always return true for this param.
             * @param {Ext.Element} el The Element that was clicked on
             */
            dayclick: true,
            /**
             * @event weekclick
             * Fires after the user clicks within a week link (when {@link #showWeekLinks is true)
             * @param {Ext.calendar.MonthView} this
             * @param {Date} dt The start date of the week that was clicked on
             */
            weekclick: true,
            // inherited docs
            dayover: true,
            // inherited docs
            dayout: true
        });
    },

    // private
    initDD: function() {
        var cfg = {
            view: this,
            createText: this.ddCreateEventText,
            moveText: this.ddMoveEventText,
            ddGroup: 'MonthViewDD'
        };

        this.dragZone = new Ext.calendar.DragZone(this.el, cfg);
        this.dropZone = new Ext.calendar.DropZone(this.el, cfg);
    },

    // private
    onDestroy: function() {
        Ext.destroy(this.ddSelector);
        Ext.destroy(this.dragZone);
        Ext.destroy(this.dropZone);
        Ext.calendar.MonthView.superclass.onDestroy.call(this);
    },

    // private
    afterRender: function() {
        if (!this.tpl) {
            this.tpl = new Ext.calendar.MonthViewTemplate({
                id: this.id,
                showTodayText: this.showTodayText,
                todayText: this.todayText,
                showTime: this.showTime,
                showHeader: this.showHeader,
                showWeekLinks: this.showWeekLinks,
                showWeekNumbers: this.showWeekNumbers
            });
        }
        this.tpl.compile();
        this.addClass('ext-cal-monthview ext-cal-ct');

        Ext.calendar.MonthView.superclass.afterRender.call(this);
    },

    // private
    onResize: function() {
        if (this.monitorResize) {
            this.maxEventsPerDay = this.getMaxEventsPerDay();
            this.refresh();
        }
    },

    // private
    forceSize: function() {
        // Compensate for the week link gutter width if visible
        if (this.showWeekLinks && this.el && this.el.child) {
            var hd = this.el.select('.ext-cal-hd-days-tbl'),
            bgTbl = this.el.select('.ext-cal-bg-tbl'),
            evTbl = this.el.select('.ext-cal-evt-tbl'),
            wkLinkW = this.el.child('.ext-cal-week-link').getWidth(),
            w = this.el.getWidth() - wkLinkW;

            hd.setWidth(w);
            bgTbl.setWidth(w);
            evTbl.setWidth(w);
        }
        Ext.calendar.MonthView.superclass.forceSize.call(this);
    },

    //private
    initClock: function() {
        if (Ext.fly(this.id + '-clock') !== null) {
            this.prevClockDay = new Date().getDay();
            if (this.clockTask) {
                Ext.TaskMgr.stop(this.clockTask);
            }
            this.clockTask = Ext.TaskMgr.start({
                run: function() {
                    var el = Ext.fly(this.id + '-clock'),
                    t = new Date();

                    if (t.getDay() == this.prevClockDay) {
                        if (el) {
                            el.update(t.format('g:i a'));
                        }
                    }
                    else {
                        this.prevClockDay = t.getDay();
                        this.moveTo(t);
                    }
                },
                scope: this,
                interval: 1000
            });
        }
    },

    // inherited docs
    getEventBodyMarkup: function() {
        if (!this.eventBodyMarkup) {
            this.eventBodyMarkup = ['{Title}',
            '<tpl if="_isReminder">',
            '<i class="ext-cal-ic ext-cal-ic-rem">&nbsp;</i>',
            '</tpl>',
            '<tpl if="_isRecurring">',
            '<i class="ext-cal-ic ext-cal-ic-rcr">&nbsp;</i>',
            '</tpl>',
            '<tpl if="spanLeft">',
            '<i class="ext-cal-spl">&nbsp;</i>',
            '</tpl>',
            '<tpl if="spanRight">',
            '<i class="ext-cal-spr">&nbsp;</i>',
            '</tpl>'
            ].join('');
        }
        return this.eventBodyMarkup;
    },

    // inherited docs
    getEventTemplate: function() {
        if (!this.eventTpl) {
            var tpl,
            body = this.getEventBodyMarkup();

            tpl = !(Ext.isIE || Ext.isOpera) ?
            new Ext.XTemplate(
            '<div id="{_elId}" class="{_selectorCls} {_colorCls} {values.spanCls} ext-cal-evt ext-cal-evr">',
            body,
            '</div>'
            )
            : new Ext.XTemplate(
            '<tpl if="_renderAsAllDay">',
            '<div id="{_elId}" class="{_selectorCls} {values.spanCls} {_colorCls} ext-cal-evt ext-cal-evo">',
            '<div class="ext-cal-evm">',
            '<div class="ext-cal-evi">',
            '</tpl>',
            '<tpl if="!_renderAsAllDay">',
            '<div id="{_elId}" class="{_selectorCls} {_colorCls} ext-cal-evt ext-cal-evr">',
            '</tpl>',
            body,
            '<tpl if="_renderAsAllDay">',
            '</div>',
            '</div>',
            '</tpl>',
            '</div>'
            );
            tpl.compile();
            this.eventTpl = tpl;
        }
        return this.eventTpl;
    },

    // private
    getTemplateEventData: function(evt) {
        var M = Ext.calendar.EventMappings,
        selector = this.getEventSelectorCls(evt[M.EventId.name]),
        title = evt[M.Title.name];

        return Ext.applyIf({
            _selectorCls: selector,
            _colorCls: 'ext-color-' + (evt[M.CalendarId.name] ?
            evt[M.CalendarId.name] : 'default') + (evt._renderAsAllDay ? '-ad': ''),
            _elId: selector + '-' + evt._weekIndex,
            _isRecurring: evt.Recurrence && evt.Recurrence != '',
            _isReminder: evt[M.Reminder.name] && evt[M.Reminder.name] != '',
            Title: (evt[M.IsAllDay.name] ? '': evt[M.StartDate.name].format('g:ia ')) + (!title || title.length == 0 ? '(No title)': title)
        },
        evt);
    },

    // private
    refresh: function() {
        if (this.detailPanel) {
            this.detailPanel.hide();
        }
        Ext.calendar.MonthView.superclass.refresh.call(this);

        if (this.showTime !== false) {
            this.initClock();
        }
    },

    // private
    renderItems: function() {
        Ext.calendar.WeekEventRenderer.render({
            eventGrid: this.allDayOnly ? this.allDayGrid: this.eventGrid,
            viewStart: this.viewStart,
            tpl: this.getEventTemplate(),
            maxEventsPerDay: this.maxEventsPerDay,
            id: this.id,
            templateDataFn: this.getTemplateEventData.createDelegate(this),
            evtMaxCount: this.evtMaxCount,
            weekCount: this.weekCount,
            dayCount: this.dayCount
        });
        this.fireEvent('eventsrendered', this);
    },

    // private
    getDayEl: function(dt) {
        return Ext.get(this.getDayId(dt));
    },

    // private
    getDayId: function(dt) {
        if (Ext.isDate(dt)) {
            dt = dt.format('Ymd');
        }
        return this.id + this.dayElIdDelimiter + dt;
    },

    // private
    getWeekIndex: function(dt) {
        var el = this.getDayEl(dt).up('.ext-cal-wk-ct');
        return parseInt(el.id.split('-wk-')[1], 10);
    },

    // private
    getDaySize: function(contentOnly) {
        var box = this.el.getBox(),
        w = box.width / this.dayCount,
        h = box.height / this.getWeekCount();

        if (contentOnly) {
            var hd = this.el.select('.ext-cal-dtitle').first().parent('tr');
            h = hd ? h - hd.getHeight(true) : h;
        }
        return {
            height: h,
            width: w
        };
    },

    // private
    getEventHeight: function() {
        if (!this.eventHeight) {
            var evt = this.el.select('.ext-cal-evt').first();
            this.eventHeight = evt ? evt.parent('tr').getHeight() : 18;
        }
        return this.eventHeight;
    },

    // private
    getMaxEventsPerDay: function() {
        var dayHeight = this.getDaySize(true).height,
            h = this.getEventHeight(),
            max = Math.max(Math.floor((dayHeight - h) / h), 0);

        return max;
    },

    // private
    getDayAt: function(x, y) {
        var box = this.el.getBox(),
            daySize = this.getDaySize(),
            dayL = Math.floor(((x - box.x) / daySize.width)),
            dayT = Math.floor(((y - box.y) / daySize.height)),
            days = (dayT * 7) + dayL,
            dt = this.viewStart.add(Date.DAY, days);
        return {
            date: dt,
            el: this.getDayEl(dt)
        };
    },

    // inherited docs
    moveNext: function() {
        return this.moveMonths(1);
    },

    // inherited docs
    movePrev: function() {
        return this.moveMonths( - 1);
    },

    // private
    onInitDrag: function() {
        Ext.calendar.MonthView.superclass.onInitDrag.call(this);
        Ext.select(this.daySelector).removeClass(this.dayOverClass);
        if (this.detailPanel) {
            this.detailPanel.hide();
        }
    },

    // private
    onMoreClick: function(dt) {
        if (!this.detailPanel) {
            this.detailPanel = new Ext.Panel({
                id: this.id + '-details-panel',
                title: dt.format('F j'),
                layout: 'fit',
                floating: true,
                renderTo: Ext.getBody(),
                tools: [{
                    id: 'close',
                    handler: function(e, t, p) {
                        p.hide();
                    }
                }],
                items: {
                    xtype: 'monthdaydetailview',
                    id: this.id + '-details-view',
                    date: dt,
                    view: this,
                    store: this.store,
                    listeners: {
                        'eventsrendered': this.onDetailViewUpdated.createDelegate(this)
                    }
                }
            });
        }
        else {
            this.detailPanel.setTitle(dt.format('F j'));
        }
        this.detailPanel.getComponent(this.id + '-details-view').update(dt);
    },

    // private
    onDetailViewUpdated: function(view, dt, numEvents) {
        var p = this.detailPanel,
        frameH = p.getFrameHeight(),
        evtH = this.getEventHeight(),
        bodyH = frameH + (numEvents * evtH) + 3,
        dayEl = this.getDayEl(dt),
        box = dayEl.getBox();

        p.updateBox(box);
        p.setHeight(bodyH);
        p.setWidth(Math.max(box.width, 220));
        p.show();
        p.getPositionEl().alignTo(dayEl, 't-t?');
    },

    // private
    onHide: function() {
        Ext.calendar.MonthView.superclass.onHide.call(this);
        if (this.detailPanel) {
            this.detailPanel.hide();
        }
    },

    // private
    onClick: function(e, t) {
        if (this.detailPanel) {
            this.detailPanel.hide();
        }
        if (Ext.calendar.MonthView.superclass.onClick.apply(this, arguments)) {
            // The superclass handled the click already so exit
            return;
        }
        if (this.dropZone) {
            this.dropZone.clearShims();
        }
        var el = e.getTarget(this.weekLinkSelector, 3),
            dt,
            parts;
        if (el) {
            dt = el.id.split(this.weekLinkIdDelimiter)[1];
            this.fireEvent('weekclick', this, Date.parseDate(dt, 'Ymd'));
            return;
        }
        el = e.getTarget(this.moreSelector, 3);
        if (el) {
            dt = el.id.split(this.moreElIdDelimiter)[1];
            this.onMoreClick(Date.parseDate(dt, 'Ymd'));
            return;
        }
        el = e.getTarget('td', 3);
        if (el) {
            if (el.id && el.id.indexOf(this.dayElIdDelimiter) > -1) {
                parts = el.id.split(this.dayElIdDelimiter);
                dt = parts[parts.length - 1];

                this.fireEvent('dayclick', this, Date.parseDate(dt, 'Ymd'), false, Ext.get(this.getDayId(dt)));
                return;
            }
        }
    },

    // private
    handleDayMouseEvent: function(e, t, type) {
        var el = e.getTarget(this.weekLinkSelector, 3, true);
        if (el) {
            el[type == 'over' ? 'addClass': 'removeClass'](this.weekLinkOverClass);
            return;
        }
        Ext.calendar.MonthView.superclass.handleDayMouseEvent.apply(this, arguments);
    }
});

Ext.reg('monthview', Ext.calendar.MonthView);
