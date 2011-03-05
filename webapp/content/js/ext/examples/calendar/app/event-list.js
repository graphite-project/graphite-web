/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
var today = new Date().clearTime();
var eventList = {
    "evts": [{
        "id": 1001,
        "cid": 1,
        "title": "Vacation",
        "start": today.add(Date.DAY, -20).add(Date.HOUR, 10),
        "end": today.add(Date.DAY, -10).add(Date.HOUR, 15),
        "ad": false,
        "notes": "Have fun"
    },
    {
        "id": 1002,
        "cid": 2,
        "title": "Lunch with Matt",
        "start": today.add(Date.HOUR, 11).add(Date.MINUTE, 30),
        "end": today.add(Date.HOUR, 13),
        "ad": false,
        "loc": "Chuy's!",
        "url": "http://chuys.com",
        "notes": "Order the queso",
        "rem": "15"
    },
    {
        "id": 1003,
        "cid": 3,
        "title": "Project due",
        "start": today.add(Date.HOUR, 15),
        "end": today.add(Date.HOUR, 15),
        "ad": false
    },
    {
        "id": 1004,
        "cid": 1,
        "title": "Sarah's birthday",
        "start": today,
        "end": today,
        "notes": "Need to get a gift",
        "ad": true
    },
    {
        "id": 1005,
        "cid": 2,
        "title": "A long one...",
        "start": today.add(Date.DAY, -12),
        "end": today.add(Date.DAY, 10).add(Date.SECOND, -1),
        "ad": true
    },
    {
        "id": 1006,
        "cid": 3,
        "title": "School holiday",
        "start": today.add(Date.DAY, 5),
        "end": today.add(Date.DAY, 7).add(Date.SECOND, -1),
        "ad": true,
        "rem": "2880"
    },
    {
        "id": 1007,
        "cid": 1,
        "title": "Haircut",
        "start": today.add(Date.HOUR, 9),
        "end": today.add(Date.HOUR, 9).add(Date.MINUTE, 30),
        "ad": false,
        "notes": "Get cash on the way"
    },
    {
        "id": 1008,
        "cid": 3,
        "title": "An old event",
        "start": today.add(Date.DAY, -30),
        "end": today.add(Date.DAY, -28),
        "ad": true,
        "notes": "Get cash on the way"
    },
    {
        "id": 1009,
        "cid": 2,
        "title": "Board meeting",
        "start": today.add(Date.DAY, -2).add(Date.HOUR, 13),
        "end": today.add(Date.DAY, -2).add(Date.HOUR, 18),
        "ad": false,
        "loc": "ABC Inc.",
        "rem": "60"
    },
    {
        "id": 1010,
        "cid": 3,
        "title": "Jenny's final exams",
        "start": today.add(Date.DAY, -2),
        "end": today.add(Date.DAY, 3).add(Date.SECOND, -1),
        "ad": true
    },
    {
        "id": 10011,
        "cid": 1,
        "title": "Movie night",
        "start": today.add(Date.DAY, 2).add(Date.HOUR, 19),
        "end": today.add(Date.DAY, 2).add(Date.HOUR, 23),
        "ad": false,
        "notes": "Don't forget the tickets!",
        "rem": "60"
    }]
};
