from django.db import models
from django.contrib.auth import models as auth_models
from graphite.account.models import Profile


class Dashboard(models.Model):
  class Admin: pass
  name = models.CharField(primary_key=True, max_length=128)
  owners = models.ManyToManyField(Profile, related_name='dashboards')
  state = models.TextField()
  __str__ = lambda self: "Dashboard [%s]" % self.name

class UserDashboard(models.Model):
  class Admin: pass
  profile = models.ForeignKey(Profile)
  dashboard = models.ForeignKey(Dashboard)
  def __str__(self):
    return "Dashboard - User - who can view protected dashboard [%s - %s]" % (self.profile.user.username, self.dashboard.name)

class AdminDashboard(models.Model):
  class Admin: pass
  profile = models.ForeignKey(Profile)
  dashboard = models.ForeignKey(Dashboard)
  def __str__(self):
    return "Dashboard - User - who can change or delete dashboard  [%s - %s]" % (self.profile.user.username, self.dashboard.name)
