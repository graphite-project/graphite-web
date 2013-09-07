(function( $ ) {
    
    function arrays_equal(array1, array2) {
        if (array1 == null || array2 == null) {
            return false;
        }
        var temp = new Array();
        if ( (!array1[0]) || (!array2[0]) ) { // If either is not an array
           return false;
        }
        if (array1.length != array2.length) {
           return false;
        }
        // Put all the elements from array1 into a "tagged" array
        for (var i=0; i<array1.length; i++) {
           key = (typeof array1[i]) + "~" + array1[i];
        // Use "typeof" so a number 1 isn't equal to a string "1".
           if (temp[key]) { temp[key]++; } else { temp[key] = 1; }
        // temp[key] = # of occurrences of the value (so an element could appear multiple times)
        }
        // Go through array2 - if same tag missing in "tagged" array, not equal
        for (var i=0; i<array2.length; i++) {
           key = (typeof array2[i]) + "~" + array2[i];
           if (temp[key]) {
              if (temp[key] == 0) { return false; } else { temp[key]--; }
           // Subtract to keep track of # of appearances in array2
           } else { // Key didn't appear in array1, arrays are not equal.
              return false;
           }
        }
        // If we get to this point, then every generated key in array1 showed up the exact same
        // number of times in array2, so the arrays are equal.
        return true;
    }

    $.fn.graphiteGraph = function(graph_div, graph_overview_div, graph_metrics, graph_from, graph_until, fill_area) {
        return this.each(function() {
            var graph = $(this);
            var plot = null;
            var graph_lines = {};
            var xaxisranges = {};
            var yaxisranges = {};
            var latestPosition = null;
            var markings = [];
            var parse_incoming = function(incoming_data) {
                var result = [];
                var start = incoming_data.start;
                var end = incoming_data.end;
                var step = incoming_data.step;
                var stack = incoming_data.stack;

                for (i in incoming_data.data) {
                    result.push([(start+step*i)*1000, incoming_data.data[i]]);

                }
                return {
                    label: incoming_data.name,
                    data: result,
                    lines: {show: true, fill: fill_area, lineWidth: 1},
                    'stack': stack,
                };
            };

            var render = function () {
                var lines = []
                for (i in graph_lines) {
                    for (j in graph_lines[i]) {
                        var newline = $.extend({}, graph_lines[i][j]);
                        lines.push(newline);
                    }
                }
                var xaxismode = { mode: "time" };
                var yaxismode = { };
                $.extend(xaxismode, xaxisranges);
                $.extend(yaxismode, yaxisranges);

                var options = {
                        xaxis: xaxismode,
                        yaxis: yaxismode,
                        grid: { hoverable: true, markings: markings },
                        legend: { show: false },
                        crosshair: { mode: "x" }
                }

                options.colors = $.map( lines, function ( o, i ) {
                        return jQuery.Color({ hue: (i*200/lines.length), saturation: 0.95, lightness: 0.45, alpha: 1 }).toHexString( );
                });

                plot = $.plot($(graph_div), lines, options );

                for (i in lines) {
                    lines[i] = $.extend({}, lines[i]);
                    lines[i].label = null;
                }
            }

            $(graph_div).bind("plothover",  function (event, pos, item) {
                latestPosition = pos;
            });

            function showTooltip(x, y, contents) {
                $('<div id="tooltip">' + contents + '</div>').css( {
                    position: 'absolute',
                    display: 'none',
                    top: y + 5,
                    left: x + 5,
                    border: '1px solid #fdd',
                    padding: '2px',
                    'background-color': '#fee',
                    opacity: 0.80
                }).appendTo("body").fadeIn(200);
            }

            var previousPoint = null;
            $(graph_div).bind("plothover", function (event, pos, item) {

                if (item) {
                    if ( !arrays_equal(previousPoint, item.datapoint)) {
                        previousPoint = item.datapoint;

                        $("#tooltip").remove();
                        var x = item.datapoint[0].toFixed(2),
                            y = item.datapoint[1].toFixed(2);

                        showTooltip(item.pageX, item.pageY,
                                    item.series.label + " = " + y);
                    }
                } else {
                    calc_distance = function(mark, event) {
                        mark_where = plot.pointOffset({ x: mark.xaxis.from, y: 0});
                        d = plot.offset().left + mark_where.left - event.pageX - plot.getPlotOffset().left;
                        return d*d;
                    }
                    distance = undefined;
                    winner = null;
                    for (var marki = 0; marki < markings.length; marki++) {
                        mark = markings[marki];
                        dist = calc_distance(mark, pos);
                        if (distance == undefined || distance > dist) {
                            distance = dist;
                            winner = mark;
                        }
                    }
                    if (distance < 20) {
                        if (!arrays_equal(previousPoint,[winner])) {
                            previousPoint = [winner]
                            $("#tooltip").remove();
                            showTooltip(pos.pageX-20, pos.pageY-20, winner.text);
                        }
                    } else {
                        if (previousPoint != null) {
                            previousPoint = null;
                            $("#tooltip").remove();
                        }

                    }
                }

            });

            var recalculate_all = function () {
                for (var i = 0; i < graph_metrics.length; i++) {
                    gm = graph_metrics[i]
                    if(gm.substring(0, 7) == 'events(') {
                        event_substr = gm.substring(7, gm.length-1);
                        if(event_substr[0] == '"' || event_substr[0] == "'") {
                            event_substr = event_substr.substring(1, event_substr.length-1);
                        }
                        console.info(event_substr);
                        get_events(event_substr);
                    } else {
                        update_metric_row(gm);
                    }
                }
                render();
            }

            var build_full_url = function() {
                var url = window.location.protocol + '//' +
                        window.location.host + window.location.pathname +
                        '?' + build_when();
                for (series in graph_lines) {
                    url = url + '&target=' + series;
                }
                xrange = $(graph_div).width();
                url = url + '&xrange=' + xrange;
                return url;
            }

            var build_when = function () {
                var when = '';
                if (graph_from) {
                    when = when + '&from=' + graph_from;
                }
                if (graph_until) {
                    when = when + '&until=' + graph_until;
                }
                return when
            }
            var build_url = function (series) {
                when = build_when();
                xrange = $(graph_div).width();
                return '/graphlot/render/rawdata?'+when+'&target='+series+'&xrange='+xrange;
            }

            var build_url_events = function (tags) {
                when = build_when();
            if (tags == "*") {
                    return '/events/get_data?'+when;
                } else {
                    return '/events/get_data?'+when+'&tags='+tags;
                }
            }

            var update_metric_row = function(metric_row) {
                var metric_name = metric_row
                $.ajax({
                    url: build_url(metric_name),
                    success: function(req_data) {
                        graph_lines[metric_name] = [];
                        target = graph_lines[metric_name];
                        for (var i = 0; i < req_data.length; i++) {
                            parsed_incoming = parse_incoming(req_data[i])
                            target.push(parsed_incoming);
                        }
                        render();
                    },
                    error: function(req, status, err) {
                        render();
                    }
                });


            }

            var get_events = function(events_text) {
                if (events_text != "") {
                    $.ajax({
                        url: build_url_events(events_text),
                        success: function(req_data) {
                            markings = [];
                            for (var i = 0; i < req_data.length; i++) {
                                row = req_data[i];
                                markings.push({
                                    color: '#0000ff',
                                    lineWidth: 1,
                                    xaxis: { from: row.when*1000, to: row.when*1000 },
                                    text:'<a target="_blank" href="/events/'+row.id+'/">'+row.what+'</a>'
                                });
                            }
                            render();
                        },
                        error: function(req, status, err) {
                            render();
                        }
                    });
                }

            }


            // get data
            recalculate_all();
        });
    };

})( jQuery );

