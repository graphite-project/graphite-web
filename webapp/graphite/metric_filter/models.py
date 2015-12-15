from django.db import models
from django.contrib.auth.models import Group
from django.contrib.auth.models import User
from django.core.exceptions import ObjectDoesNotExist


class MetricFilter(models.Model):
  id = models.AutoField(primary_key=True)
  filter = models.CharField(max_length=256)
  description = models.CharField(max_length=200)
  type_filter = models.IntegerField(choices=[(0, 'include'), (1, 'exclude')])
  __str__ = lambda self: "%s: %s" % (getTypeFilter(self.type_filter) ,self.filter)

  class Meta:
    db_table = "metric_filter"

class UserMetricFilter(models.Model):
  user = models.ForeignKey(User)
  metric_filter = models.ManyToManyField(MetricFilter)
  __str__ = lambda self: "User: [%s]" % self.use

  class Meta:
    db_table = "user_metric_filter"

  @staticmethod
  def getFilters(id):
    try:
      userFilter = UserMetricFilter.objects.get(user = id)
    except ObjectDoesNotExist:
      userFilter = None
    if userFilter is not None:
      return userFilter.metric_filter

class GroupMetricFilter(models.Model):
  group = models.ForeignKey(Group)
  metric_filter = models.ManyToManyField(MetricFilter)
  _str__ = lambda self: "%s: %s" % (getTypeFilter(self.metric_filter.all()[0].type_filter), self.group)

  class Meta:
    db_table = "group_metric_filter"

  @staticmethod
  def getFiltersByUser(user):
    for userGroup in user.groups.all():
      try:
        groupsFilter = GroupMetricFilter.objects.filter(group = userGroup.id)
      except ObjectDoesNotExist:
        groupsFilter = None
      if groupsFilter is not None:
        for groupFilter in GroupMetricFilter.objects.filter(group = userGroup.id):
          yield groupFilter.metric_filter

def getTypeFilter(filter):
  if filter is 0:
    return 'include'
  else:
    return 'exclude'
