from django.contrib import admin
from graphite.metrics.models import UserMetric

admin.site.register(UserMetric)
