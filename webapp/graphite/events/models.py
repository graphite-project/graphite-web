import os

from django.db import models
from tagging.managers import ModelTaggedItemManager
from tagging.models import Tag

if os.environ.get('READTHEDOCS'):
    TagField = lambda *args, **kwargs: None
else:
    from tagging.fields import TagField

class Event(models.Model):
    when = models.DateTimeField()
    what = models.CharField(max_length=255)
    data = models.TextField(blank=True)
    tags = TagField(default="")

    def get_tags(self):
        return Tag.objects.get_for_object(self)

    def __str__(self):
        return "%s: %s" % (self.when, self.what)

    @staticmethod
    def find_events(time_from=None, time_until=None, tags=None):

        if tags is not None:
            query = Event.tagged.with_all(tags)
        else:
            query = Event.objects.all()

        if time_from is not None:
            query = query.filter(when__gte=time_from)

        if time_until is not None:
            query = query.filter(when__lte=time_until)


        result = list(query.order_by("when"))
        return result

    def as_dict(self):
        return dict(
            when=self.when,
            what=self.what,
            data=self.data,
            tags=self.tags,
            id=self.id,
        )

# We use this rather than tagging.register() so that tags can be exposed
# in the admin UI
ModelTaggedItemManager().contribute_to_class(Event, 'tagged')
