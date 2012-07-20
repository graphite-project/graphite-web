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

    $.fn.editable_in_place = function(callback) {
        var editable = $(this);
        if (editable.length > 1) {
            console.error("Call $().editable_in_place only on a singular jquery object.");
        }

        var editing = false;

        editable.bind('click', function () {
            var $element = this;

            if (editing == true) return;

            editing = true;

            var $edit = $('<input type="text" class="edit_in_place" value="' + editable.text() + '"/>');

            $edit.css({'height' : editable.height(), 'width' : editable.width()});
            editable.hide();
            editable.after($edit);
            $edit.focus();

            $edit.bind('blur', function() { // on blur, forget edits and reset.
                $edit.remove();
                editable.show();
                editing = false;
            });

            $edit.keydown(function(e) {
                if(e.which===27)$edit.blur(); // blur on Esc: see above
                if(e.which===13 || e.which===9) { // Enter or Tab: run the callback with the value
                    e.preventDefault();
                    $edit.hide();
                    editable.show();
                    if($edit.val()!=='') {
                        editing = false;
                        callback($element, $edit.val());
                    }
                    $edit.remove();
                }
            });
        });
    };

    function id(name, graph) {
        // for more convenient matching.  see below
        return "#g_" + name + "_" + graph;
    }

    $.fn.graphiteGraph = function(config) {
            // run this function on on a wrapping element containing other elements (g_wrap_{{graph}})
            // (we will find them by name, {{graph}} should be passed in the config
            // id g_wrap_{{graph}} this element, containing the following DOM elements
            // id g_canvas_{{graph}} currently not used for actual logic, but can contain the container, overview, legend, etc
            // id g_container_{{graph}} 
            // id g_graph_{{graph}}
            // id g_overview_{{graph}}
            // id g_side_{{graph}}
            // id g_legend_{{graph}} legend
            // id g_from_{{graph}} contains from datetime
            // id g_until_{{graph}} contains until datetime
            // id g_update_{{graph}} rerenders everything
            // id g_clearzoom_{{graph}} resets zoom on graph
            // id g_graphurl_{{graph}} link that points to a page showing solely this graph
            // id g_eventdesc_{{graph}}
            // id g_eventcount_{{graph}}
            // id g_newmetricrow_{{graph}}
            // id g_newmetric_{{graph}}
            // class g_metricrow
            // class g_metricname
            // this convention allows to consistently find the right DOM elements, irrespective of the number of graphs on the page

            config = config || {};
            // something like http://<graphitehost[:port]>.  empty implicitly means current protocol/host/port
            var url_host = (typeof config.url_host === 'undefined') ? '' : config.url_host 
            // a prefix to apply to all paths to denote location of graphite web application.
            var url_path_prefix = (typeof config.url_path_prefix === 'undefined') ? '' : config.url_path_prefix
            // parameter to construct the id's of the elements to interact with (see above)
            var graph = config.graph

        return this.each(function() {
            var wrap = $(this);
            var plot = null;
            var graph_lines = {};
            var metric_yaxis = {};
            var xaxisranges = {};
            var yaxisranges = {};
            var legends = null;
            var updateLegendTimeout = null;
            var latestPosition = null;
            var autocompleteoptions = {
                        minChars: 0,
                        selectFirst: false,
                        matchCase: true //Metrics can be case sensitive
            };
            var markings = [];

            var parse_incoming = function(incoming_data) {
                var result = [];
                var start = incoming_data.start;
                var end = incoming_data.end;
                var step = incoming_data.step;

                for (i in incoming_data.data) {
                    result.push([(start+step*i)*1000, incoming_data.data[i]]);

                }
                return {
                    label: incoming_data.name,
                    data: result,
                    lines: {show: true, fill: false}
                };
            };


            var render = function () {
                var lines = []
                for (i in graph_lines) {
                    for (j in graph_lines[i]) {
                        var newline = $.extend({}, graph_lines[i][j]);
                        if (metric_yaxis[i] == "two") {
                            newline['yaxis'] = 2;
                        }
                        lines.push(newline);
                    }
                }
                var xaxismode = { mode: "time" };
                var yaxismode = { };

                $.extend(xaxismode, xaxisranges);
                $.extend(yaxismode, yaxisranges);

                plot = $.plot($(id('graph', graph)),
                    lines,
                    {
                        xaxis: xaxismode,
                        yaxis: yaxismode,
                        grid: { hoverable: true, markings: markings },
                        selection: { mode: "xy" },
                        legend: { show: true, container: wrap.find(id('legend', graph)) },
                        crosshair: { mode: "x" },
                    }
                );


                for (i in lines) {
                    lines[i] = $.extend({}, lines[i]);
                    lines[i].label = null;
                }
                var overview = $.plot($(id('overview', graph)),
                    lines,
                    {
                        xaxis: { mode: "time" },
                        selection: { mode: "x" },
                    }
                );

                // legends magic
                legends = wrap.find(".legendLabel");
                // update link
                wrap.find(id('graphurl', graph)).attr("href", build_url_graph());

            }

            function updateLegend() {
                updateLegendTimeout = null;

                var pos = latestPosition;

                var axes = plot.getAxes();
                if (pos.x < axes.xaxis.min || pos.x > axes.xaxis.max ||
                        pos.y < axes.yaxis.min || pos.y > axes.yaxis.max) {
                    var i, j, dataset = plot.getData();
                    for (i = 0; i < dataset.length; ++i) {
                        var series = dataset[i];
                        legends.eq(i).text(series.label);
                    }
                }

                var i, j, dataset = plot.getData();
                for (i = 0; i < dataset.length; ++i) {
                    var series = dataset[i];

                    // find the nearest points, x-wise
                    for (j = 0; j < series.data.length; ++j)
                        if (series.data[j][0] > pos.x)
                            break;

                    // now interpolate
                    var y, p1 = series.data[j - 1], p2 = series.data[j];
                    if (p1 == null)
                        y = p2[1];
                    else if (p2 == null)
                        y = p1[1];
                    else
                        y = p1[1] + (p2[1] - p1[1]) * (pos.x - p1[0]) / (p2[0] - p1[0]);

                    if ( y != null ) {
                        legends.eq(i).text(series.label + " = " + y.toFixed(2));
                    } else {
                        legends.eq(i).text(series.label);
                    }
                    legends.eq(i).css('width', legends.eq(i).width());
                }
            }

            $(id('graph', graph)).bind("plothover",  function (event, pos, item) {
                latestPosition = pos;
                if (!updateLegendTimeout)
                    updateLegendTimeout = setTimeout(updateLegend, 50);
            });

            function showTooltip(x, y, contents) {
                $('<div id="g_tooltip_' + graph + '">' + contents + '</div>').css( {
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
            $(id('graph', graph)).bind("plothover", function (event, pos, item) {
                if (item) {
                    if ( !arrays_equal(previousPoint, item.datapoint)) {
                        previousPoint = item.datapoint;

                        $(id('tooltip', graph)).remove();
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
                    for (marki in markings) {
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
                            $(id('tooltip', graph)).remove();
                            showTooltip(pos.pageX-20, pos.pageY-20, winner.text);
                        }
                    } else {
                        if (previousPoint != null) {
                            previousPoint = null;
                            $(id('tooltip', graph)).remove();
                        }

                    }
                }
            });

            $(id('overview', graph)).bind("plotselected", function (event, ranges) {
                xaxisranges = { min: ranges.xaxis.from, max: ranges.xaxis.to };
                yaxisranges = { min: ranges.yaxis.from, max: ranges.yaxis.to };
                render()
            });

            $(id('graph', graph)).bind("plotselected", function (event, ranges) {
                xaxisranges = { min: ranges.xaxis.from, max: ranges.xaxis.to };
                yaxisranges = { min: ranges.yaxis.from, max: ranges.yaxis.to };
                render()
            });

            var clear_zoom = function () {
                xaxisranges = {};
                yaxisranges = {};
                render();
            }

            var recalculate_all = function () {
                wrap.find('.g_metricrow').each(function () {
                    var metric = $(this);
                    update_metric_row(metric);
                });
                get_events(wrap.find(id('eventdesc', graph)), id('eventcount', graph))
                render();
            }

            var build_when = function () {
                var when = new Array();
                var from  = wrap.find(id('from', graph)).text();
                if (from) {
                    when.push('from=' + from);
                }
                var until = wrap.find(id('until', graph)).text();
                if (until) {
                    when.push('until=' + until);
                }
                return when
            }

            var build_url_graph = function() {
                var url = url_host + url_path_prefix + '/graphlot/?';
                params = build_when();
                for (series in graph_lines) {
                    if (metric_yaxis[series] == "two") {
                        params.push('y2target=' + series);
                    } else {
                        params.push('target=' + series);
                    }
                }
                events = wrap.find(id('eventdesc', graph)).val();
                if (events != "") {
                    params.push('events=' + events);
                }

                return url + params.join("&");
            }
            var build_url_rawdata = function (series) {
                var url = url_host + url_path_prefix + '/graphlot/rawdata?';
                params = build_when();
                params.push('target=' + series);
                return url + params.join("&");
            }

            var build_url_events = function (tags) {
                var url = url_host + url_path_prefix + '/events/get_data?';
                params = build_when();
                if (tags != "*") {
                    params.push('tags=' + tags);
                }
                return url + params.join("&");
            }

            var update_metric_row = function(metric_row) {
                var metric = $(metric_row);
                var metric_name = metric.find(".g_metricname").text();
                metric.find(".g_metricname").addClass("ajaxworking");
                metric_yaxis[metric_name] = metric.find(".g_yaxis").text();

                $.ajax({
                    url: build_url_rawdata(metric_name),
                    success: function(req_data) {
                        metric.find(".g_metricname").removeClass("ajaxerror");
                        metric.find(".g_metricname").removeClass("ajaxworking");
                        graph_lines[metric_name] = [];
                        target = graph_lines[metric_name];
                        for (i in req_data) {
                            target.push(parse_incoming(req_data[i]));
                        }
                        render();
                    },
                    error: function(req, status, err) {
                        metric.find(".g_metricname").removeClass("ajaxworking");
                        metric.find(".g_metricname").addClass("ajaxerror");
                        render();
                    }
                });


            }

            var get_events = function(events_text, event_count) {
                if (events_text.val() == "") {
                    events_text.removeClass("ajaxworking");
                    events_text.removeClass("ajaxerror");
                    markings = [];
                    render();
                } else {
                    events_text.addClass("ajaxworking");
                    $.ajax({
                        url: build_url_events(events_text.val()),
                        success: function(req_data) {
                            events_text.removeClass("ajaxerror");
                            events_text.removeClass("ajaxworking");
                            markings = [];
                            $(event_count).text(req_data.length);
                            for (i in req_data) {
                                row = req_data[i];
                                markings.push({
                                    color: '#000',
                                    lineWidth: 1,
                                    xaxis: { from: row.when*1000, to: row.when*1000 },
                                    text:'<a href="'+SLASH+'events/'+row.id+'/">'+row.what+'<a>'
                                });
                            }
                            render();
                        },
                        error: function(req, status, err) {
                            events_text.removeClass("ajaxworking");
                            events_text.addClass("ajaxerror");
                            render();
                        }
                    });
                }

            }


            // configure the date boxes
            wrap.find(id('from', graph)).editable_in_place(
                function(editable, value) {
                    $(editable).text(value);
                    recalculate_all();
                }
            );


            wrap.find(id('until', graph)).editable_in_place(
                function(editable, value) {
                    $(editable).text(value);
                    recalculate_all();
                }
            );

            wrap.find(id('update', graph)).bind('click',
                function() {
                    recalculate_all();
                }
            );

            wrap.find(id('clearzoom',graph)).bind('click',
                clear_zoom
            );

            // configure metricrows
            var setup_row = function (metric) {
                var metric_name = metric.find('.g_metricname').text();

                metric.find('.g_metricname').editable_in_place(
                    function(editable, value) {
                        delete graph_lines[$(editable).text()];
                        $(editable).text(value);
                        update_metric_row(metric);
                    }
                );
                metric.find('.g_killrow').bind('click', function() {
                    delete graph_lines[metric.find('.g_metricname').text()];
                    metric.remove();
                    render();
                });

                metric.find('.g_yaxis').bind('click', function() {
                    if ($(this).text() == "one") {
                        $(this).text("two");
                    } else {
                        $(this).text("one");
                    }
                    metric_yaxis[metric_name] = metric.find(".g_yaxis").text();
                    render();
                });
            }

            wrap.find('.g_metricrow').each(function() {
                setup_row($(this));
            });

            wrap.find('.g_metricrow').each(function() {
                var row = $(this);

            });
            // configure new metric input
            wrap.find(id('newmetric', graph)).each(function () {
                var edit = $(this);
                edit.autocomplete('findmetric', autocompleteoptions);
                edit.keydown(function(e) {
                    if(e.which===13) { // on enter
                        // add row
                        edit.blur();
                        if (graph_lines[edit.val()] == null) {
                        var new_row = $('<tr class="g_metricrow"><td><a href=#><span class="g_metricname">'+edit.val()+'</span></a></td><td><a href=#><span class="g_yaxis">one</span></a></td><td class="g_killrow"><img src="../content/img/delete.gif"></td></tr>');
                            setup_row(new_row);
                            wrap.find(id('newmetricrow', graph)).before(new_row);
                            update_metric_row(new_row);
                            // clear input
                        }
                        edit.val('');
                    }
                });
            });

            // configure new metric input
            wrap.find(id('eventdesc', graph)).each(function () {
                var edit = $(this);
                edit.keydown(function(e) {
                    if(e.which===13) { // on enter
                        // add row
                        edit.blur();
                        get_events(edit, id('eventcount', graph));
                    }
                });
            });


            // get data
            recalculate_all();
        });
    };

})( jQuery );

