from django.contrib import admin
from graphite.account.models import Profile,MyGraph

class MyGraphAdmin(admin.ModelAdmin):
  list_display = ('profile','name')
  list_filter = ('profile',)

admin.site.register(Profile)
admin.site.register(MyGraph, MyGraphAdmin)
