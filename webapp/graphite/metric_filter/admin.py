from django.contrib import admin
from graphite.metric_filter.models import MetricFilter
from graphite.metric_filter.models import UserMetricFilter
from graphite.metric_filter.models import GroupMetricFilter


class MetricFilterAdmin(admin.ModelAdmin):
    list_display = ('filter', 'description', 'type_filter')
    search_fields = ('filter', 'description', 'type_filter')
    ordering = ('id',)


class UserMetricFilterAdmin(admin.ModelAdmin):
    filter_horizontal = ('metric_filter',)


class GroupMetricFilterAdmin(admin.ModelAdmin):
    filter_horizontal = ('metric_filter',)

admin.site.register(MetricFilter, MetricFilterAdmin)
admin.site.register(UserMetricFilter, UserMetricFilterAdmin)
admin.site.register(GroupMetricFilter, GroupMetricFilterAdmin)
