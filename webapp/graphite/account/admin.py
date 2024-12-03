from django.contrib import admin
from graphite.account.models import Profile,MyGraph


@admin.register(MyGraph)
class MyGraphAdmin(admin.ModelAdmin):
    list_display = ('profile','name')
    list_filter = ('profile',)


admin.site.register(Profile)
