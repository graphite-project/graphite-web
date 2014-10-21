from django.db import models
from django.contrib.auth import models as auth_models
from graphite.account.models import Profile

class UserMetric(models.Model):
  class Admin: pass
  profile = models.ForeignKey(Profile)
  metric = models.TextField()
  def __str__(self):
    return "Dashboard - User - who can view protected metric [%s - %s]" % (self.profile.user.username, self.metric)
