/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
/**
 * @class Ext.calendar.BoxLayoutTemplate
 * @extends Ext.XTemplate
 * <p>This is the template used to render calendar views based on small day boxes within a non-scrolling container (currently
 * the {@link Ext.calendar.MonthView MonthView} and the all-day headers for {@link Ext.calendar.DayView DayView} and 
 * {@link Ext.calendar.WeekView WeekView}. This template is automatically bound to the underlying event store by the 
 * calendar components and expects records of type {@link Ext.calendar.EventRecord}.</p>
 * @constructor
 * @param {Object} config The config object
 */
Ext.calendar.BoxLayoutTemplate = function(config){
    
    Ext.apply(this, config);
    
    var weekLinkTpl = this.showWeekLinks ? '<div id="{weekLinkId}" class="ext-cal-week-link">{weekNum}</div>' : '';
    
    Ext.calendar.BoxLayoutTemplate.superclass.constructor.call(this,
        '<tpl for="weeks">',
            '<div id="{[this.id]}-wk-{[xindex-1]}" class="ext-cal-wk-ct" style="top:{[this.getRowTop(xindex, xcount)]}%; height:{[this.getRowHeight(xcount)]}%;">',
                weekLinkTpl,
                '<table class="ext-cal-bg-tbl" cellpadding="0" cellspacing="0">',
                    '<tbody>',
                        '<tr>',
                            '<tpl for=".">',
                                 '<td id="{[this.id]}-day-{date:date("Ymd")}" class="{cellCls}">&nbsp;</td>',
                            '</tpl>',
                        '</tr>',
                    '</tbody>',
                '</table>',
                '<table class="ext-cal-evt-tbl" cellpadding="0" cellspacing="0">',
                    '<tbody>',
                        '<tr>',
                            '<tpl for=".">',
                                '<td id="{[this.id]}-ev-day-{date:date("Ymd")}" class="{titleCls}"><div>{title}</div></td>',
                            '</tpl>',
                        '</tr>',
                    '</tbody>',
                '</table>',
            '</div>',
        '</tpl>', {
            getRowTop: function(i, ln){
                return ((i-1)*(100/ln));
            },
            getRowHeight: function(ln){
                return 100/ln;
            }
        }
    );
};

Ext.extend(Ext.calendar.BoxLayoutTemplate, Ext.XTemplate, {
    // private
    applyTemplate : function(o){
        
        Ext.apply(this, o);
        
        var w = 0, title = '', first = true, isToday = false, showMonth = false, prevMonth = false, nextMonth = false,
            weeks = [[]],
            today = new Date().clearTime(),
            dt = this.viewStart.clone(),
            thisMonth = this.startDate.getMonth();
        
        for(; w < this.weekCount || this.weekCount == -1; w++){
            if(dt > this.viewEnd){
                break;
            }
            weeks[w] = [];
            
            for(var d = 0; d < this.dayCount; d++){
                isToday = dt.getTime() === today.getTime();
                showMonth = first || (dt.getDate() == 1);
                prevMonth = (dt.getMonth() < thisMonth) && this.weekCount == -1;
                nextMonth = (dt.getMonth() > thisMonth) && this.weekCount == -1;
                
                if(dt.getDay() == 1){
                    // The ISO week format 'W' is relative to a Monday week start. If we
                    // make this check on Sunday the week number will be off.
                    weeks[w].weekNum = this.showWeekNumbers ? dt.format('W') : '&nbsp;';
                    weeks[w].weekLinkId = 'ext-cal-week-'+dt.format('Ymd');
                }
                
                if(showMonth){
                    if(isToday){
                        title = this.getTodayText();
                    }
                    else{
                        title = dt.format(this.dayCount == 1 ? 'l, F j, Y' : (first ? 'M j, Y' : 'M j'));
                    }
                }
                else{
                    var dayFmt = (w == 0 && this.showHeader !== true) ? 'D j' : 'j';
                    title = isToday ? this.getTodayText() : dt.format(dayFmt);
                }
                
                weeks[w].push({
                    title: title,
                    date: dt.clone(),
                    titleCls: 'ext-cal-dtitle ' + (isToday ? ' ext-cal-dtitle-today' : '') + 
                        (w==0 ? ' ext-cal-dtitle-first' : '') +
                        (prevMonth ? ' ext-cal-dtitle-prev' : '') + 
                        (nextMonth ? ' ext-cal-dtitle-next' : ''),
                    cellCls: 'ext-cal-day ' + (isToday ? ' ext-cal-day-today' : '') + 
                        (d==0 ? ' ext-cal-day-first' : '') +
                        (prevMonth ? ' ext-cal-day-prev' : '') +
                        (nextMonth ? ' ext-cal-day-next' : '')
                });
                dt = dt.add(Date.DAY, 1);
                first = false;
            }
        }
        
        return Ext.calendar.BoxLayoutTemplate.superclass.applyTemplate.call(this, {
            weeks: weeks
        });
    },
    
    // private
    getTodayText : function(){
        var dt = new Date().format('l, F j, Y'),
            todayText = this.showTodayText !== false ? this.todayText : '',
            timeText = this.showTime !== false ? ' <span id="'+this.id+'-clock" class="ext-cal-dtitle-time">' + 
                    new Date().format('g:i a') + '</span>' : '',
            separator = todayText.length > 0 || timeText.length > 0 ? ' &mdash; ' : '';
        
        if(this.dayCount == 1){
            return dt + separator + todayText + timeText;
        }
        fmt = this.weekCount == 1 ? 'D j' : 'j';
        return todayText.length > 0 ? todayText + timeText : new Date().format(fmt) + timeText;
    }
});

Ext.calendar.BoxLayoutTemplate.prototype.apply = Ext.calendar.BoxLayoutTemplate.prototype.applyTemplate;
