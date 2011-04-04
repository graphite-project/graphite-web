from django.db import models
from django.contrib.auth import models as auth_models
from graphite.account.models import Profile


class Dashboard(models.Model):
  class Admin: pass
  name = models.CharField(primary_key=True, max_length=128)
  owners = models.ManyToManyField(Profile, related_name='dashboards')
  state = models.TextField()
  __str__ = lambda self: "Dashboard [%s]" % self.name
