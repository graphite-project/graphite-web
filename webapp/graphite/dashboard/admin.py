from django.contrib import admin
from graphite.dashboard.models import Dashboard, UserDashboard, AdminDashboard

admin.site.register(Dashboard)
admin.site.register(UserDashboard)
admin.site.register(AdminDashboard)
