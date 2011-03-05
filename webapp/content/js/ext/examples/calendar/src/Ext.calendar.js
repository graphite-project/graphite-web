/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
Ext.ns('Ext.calendar');

 (function() {
    Ext.apply(Ext.calendar, {
        Date: {
            diffDays: function(start, end) {
                day = 1000 * 60 * 60 * 24;
                diff = end.clearTime(true).getTime() - start.clearTime(true).getTime();
                return Math.ceil(diff / day);
            },

            copyTime: function(fromDt, toDt) {
                var dt = toDt.clone();
                dt.setHours(
                fromDt.getHours(),
                fromDt.getMinutes(),
                fromDt.getSeconds(),
                fromDt.getMilliseconds());

                return dt;
            },

            compare: function(dt1, dt2, precise) {
                if (precise !== true) {
                    dt1 = dt1.clone();
                    dt1.setMilliseconds(0);
                    dt2 = dt2.clone();
                    dt2.setMilliseconds(0);
                }
                return dt2.getTime() - dt1.getTime();
            },

            // private helper fn
            maxOrMin: function(max) {
                var dt = (max ? 0: Number.MAX_VALUE),
                i = 0,
                args = arguments[1],
                ln = args.length;
                for (; i < ln; i++) {
                    dt = Math[max ? 'max': 'min'](dt, args[i].getTime());
                }
                return new Date(dt);
            },

            max: function() {
                return this.maxOrMin.apply(this, [true, arguments]);
            },

            min: function() {
                return this.maxOrMin.apply(this, [false, arguments]);
            }
        }
    });
})();