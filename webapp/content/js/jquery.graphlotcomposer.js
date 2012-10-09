// build an interactive graph composer/editor based on graphlot
// adds a bunch of widgets which, per convention, are members of the g_wrap DOM element, and have these names:
// g_metricrow
// g_newmetric
// g_newmetricrow
// g_metricname
// g_from contains from datetime
// g_until contains until datetime
// g_update rerenders everything
// g_clearzoom resets zoom on graph
// g_graphurl link that points to a page showing solely this graph
// g_eventdesc
// g_eventcount

(function( $ ) {
    $.fn.editable_in_place = function(callback) {
        var editable = this;
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
    $.fn.graphlotComposer = function(config) {
        var wrap = this;
        config = config || {};
        var graph = new wrap.graphlot(config);
            var autocompleteoptions = {
		minChars: 0,
		selectFirst: false,
		matchCase: true //Metrics can be case sensitive
        };

	// misc/common stuff
	var post_render = function () {
		// update link
		wrap.find('.g_graphurl').attr("href", graph.build_url_graph());
	}

        var recalculate_all = function () {
            wrap.find('.g_metricrow').each(function () {
                var metric = $(this);
                update_metric_row(metric);
            });
            get_events(wrap.find('.g_eventdesc'), '.eventcount')
            graph.render(post_render);
        }

        wrap.find('.g_update').bind('click',recalculate_all);
        wrap.find('.g_clearzoom').bind('click',graph.clear_zoom);

        // configure the date boxes
        wrap.find('.g_from').editable_in_place(
            function(editable, value) {
                $(editable).text(value);
                alert("editable callback. calling setFrom to " + value);
                graph.setFrom(value); // might not be needed if change event is properly raised
		recalculate_all();
            }
        );
        wrap.find('.g_until').editable_in_place(
            function(editable, value) {
                $(editable).text(value);
                graph.setUntil(value); // might not be needed
		recalculate_all();
            }
        );
        wrap.find('.g_from').change(function () {
            alert ("change event" + $(this).text());
            graph.setFrom($(this).text());
		recalculate_all();
        });

        // configure new event input
        wrap.find('.g_eventdesc').each(function () {
            var edit = $(this);
            edit.keydown(function(e) {
                if(e.which===13) { // on enter
                    // add row
                    edit.blur();
                    get_events(edit, '.g_eventcount');
                }
            });
        });
        var get_events = function(events_text, event_count) {
            if (events_text.val() == "") {
                events_text.removeClass("ajaxworking");
                events_text.removeClass("ajaxerror");
                markings = [];
                render(post_render);
            } else {
                events_text.addClass("ajaxworking");
                $.ajax({
                    url: build_url_events(events_text.val()),
                    success: function(req_data) {
                        events_text.removeClass("ajaxerror");
                        events_text.removeClass("ajaxworking");
                        markings = [];
                        $(event_count).text(req_data.length);
                    graph.setEvents(req_data);
                    },
                    error: function(req, status, err) {
                        events_text.removeClass("ajaxworking");
                        events_text.addClass("ajaxerror");
                        render(post_render);
                    }
                });
            }

        }

        // configure new metric input
        wrap.find('.g_newmetric').each(function () {
            var edit = $(this);
            edit.autocomplete('findmetric', autocompleteoptions);
            edit.keydown(function(e) {
                if(e.which===13) { // on enter
            	// add row
            	edit.blur();
            	if (graph_lines[edit.val()] == null) {
            	var new_row = $('<tr class="g_metricrow"><td><a href=#><span class="g_metricname">'+edit.val()+'</span></a></td><td><a href=#><span class="g_yaxis">one</span></a></td><td class="g_killrow"><img src="../content/img/delete.gif"></td></tr>');
            	    setup_row(new_row);
            	    wrap.find('.g_newmetricrow').before(new_row);
            	    update_metric_row(new_row);
            	    // clear input
            	}
            	edit.val('');
                }
            });
        });


        // configure metricrows
        var setup_metric_row = function (metric_row) {
            var metric_name = metric.find('.g_metricname').text();

            metric.find('.g_metricname').editable_in_place(
                function(editable, value) {
                    $(editable).text(value);
                    update_metric_row(metric);
                }
            );
            metric.find('.g_killrow').bind('click', function() {
                graph.removeMetric(metric.find('.g_metricname').text());
                metric.remove();
                render(post_render);
            });

            metric.find('.g_yaxis').bind('click', function() {
                    if ($(this).text() == "one") {
                    $(this).text("two");
                } else {
                    $(this).text("one");
                }
                metric_yaxis[metric_name] = metric.find(".g_yaxis").text();
                render(post_render);
            });
        }

        var update_metric_row = function(metric_row) {
            var metric = $(metric_row);
            var metric_name = metric.find(".g_metricname").text();
            metric.find(".g_metricname").addClass("ajaxworking");
            metric_yaxis[metric_name] = metric.find(".g_yaxis").text();

            graph.updateMetric(metric_name, function () {
                metric.find(".g_metricname").removeClass("ajaxerror");
                metric.find(".g_metricname").removeClass("ajaxworking");
            }, function () {
                metric.find(".g_metricname").removeClass("ajaxworking");
                metric.find(".g_metricname").addClass("ajaxerror");
            });
        }

        wrap.find('.g_metricrow').each(function() {
            setup_row($(this));
        });

        wrap.find('.g_metricrow').each(function() {
            var row = $(this);
        });
    }


    }
})( jQuery );
