from django.db import models

class Series(models.Model):
  path = models.TextField(unique=True)
  __str__ = lambda self: "Series [%s]" % self.path

class Tag(models.Model):
  tag = models.TextField(unique=True)
  __str__ = lambda self: "Tag [%s]" % self.tag

class TagValue(models.Model):
  value = models.TextField(unique=True)
  __str__ = lambda self: "TagValue [%s]" % self.value

class SeriesTag(models.Model):
  series = models.ForeignKey(Series, on_delete=models.CASCADE)
  tag = models.ForeignKey(Tag, on_delete=models.CASCADE)
  value = models.ForeignKey(TagValue, on_delete=models.CASCADE)

  class Meta:
    unique_together = ("series", "tag", "value")

  __str__ = lambda self: "SeriesTag [%s %s %s]" % (self.series, self.tag, self.value)
