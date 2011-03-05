/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
/**
 * @class Ext.calendar.EventMappings
 * @extends Object
 * A simple object that provides the field definitions for EventRecords so that they can be easily overridden.
 */
Ext.calendar.EventMappings = {
    EventId: {
        name: 'EventId',
        mapping: 'id',
        type: 'int'
    },
    CalendarId: {
        name: 'CalendarId',
        mapping: 'cid',
        type: 'int'
    },
    Title: {
        name: 'Title',
        mapping: 'title',
        type: 'string'
    },
    StartDate: {
        name: 'StartDate',
        mapping: 'start',
        type: 'date',
        dateFormat: 'c'
    },
    EndDate: {
        name: 'EndDate',
        mapping: 'end',
        type: 'date',
        dateFormat: 'c'
    },
    Location: {
        name: 'Location',
        mapping: 'loc',
        type: 'string'
    },
    Notes: {
        name: 'Notes',
        mapping: 'notes',
        type: 'string'
    },
    Url: {
        name: 'Url',
        mapping: 'url',
        type: 'string'
    },
    IsAllDay: {
        name: 'IsAllDay',
        mapping: 'ad',
        type: 'boolean'
    },
    Reminder: {
        name: 'Reminder',
        mapping: 'rem',
        type: 'string'
    },
    IsNew: {
        name: 'IsNew',
        mapping: 'n',
        type: 'boolean'
    }
};

/**
 * @class Ext.calendar.EventRecord
 * @extends Ext.data.Record
 * <p>This is the {@link Ext.data.Record Record} specification for calendar event data used by the
 * {@link Ext.calendar.CalendarPanel CalendarPanel}'s underlying store. It can be overridden as 
 * necessary to customize the fields supported by events, although the existing column names should
 * not be altered. If your model fields are named differently you should update the <b>mapping</b>
 * configs accordingly.</p>
 * <p>The only required fields when creating a new event record instance are StartDate and
 * EndDate.  All other fields are either optional are will be defaulted if blank.</p>
 * <p>Here is a basic example for how to create a new record of this type:<pre><code>
rec = new Ext.calendar.EventRecord({
    StartDate: '2101-01-12 12:00:00',
    EndDate: '2101-01-12 13:30:00',
    Title: 'My cool event',
    Notes: 'Some notes'
});
</code></pre>
 * If you have overridden any of the record's data mappings via the Ext.calendar.EventMappings object
 * you may need to set the values using this alternate syntax to ensure that the fields match up correctly:<pre><code>
var M = Ext.calendar.EventMappings;

rec = new Ext.calendar.EventRecord();
rec.data[M.StartDate.name] = '2101-01-12 12:00:00';
rec.data[M.EndDate.name] = '2101-01-12 13:30:00';
rec.data[M.Title.name] = 'My cool event';
rec.data[M.Notes.name] = 'Some notes';
</code></pre>
 * @constructor
 * @param {Object} data (Optional) An object, the properties of which provide values for the new Record's
 * fields. If not specified the {@link Ext.data.Field#defaultValue defaultValue}
 * for each field will be assigned.
 * @param {Object} id (Optional) The id of the Record. The id is used by the
 * {@link Ext.data.Store} object which owns the Record to index its collection
 * of Records (therefore this id should be unique within each store). If an
 * id is not specified a {@link #phantom}
 * Record will be created with an {@link #Record.id automatically generated id}.
 */
 (function() {
    var M = Ext.calendar.EventMappings;

    Ext.calendar.EventRecord = Ext.data.Record.create([
    M.EventId,
    M.CalendarId,
    M.Title,
    M.StartDate,
    M.EndDate,
    M.Location,
    M.Notes,
    M.Url,
    M.IsAllDay,
    M.Reminder,
    M.IsNew
    ]);

    /**
     * Reconfigures the default record definition based on the current Ext.calendar.EventMappings object
     */
    Ext.calendar.EventRecord.reconfigure = function() {
        Ext.calendar.EventRecord = Ext.data.Record.create([
        M.EventId,
        M.CalendarId,
        M.Title,
        M.StartDate,
        M.EndDate,
        M.Location,
        M.Notes,
        M.Url,
        M.IsAllDay,
        M.Reminder,
        M.IsNew
        ]);
    };
})();
