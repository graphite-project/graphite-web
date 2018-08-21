
from tagging.managers import (ModelTaggedItemManager as BaseModelTaggedItemManager,
                            TaggedItem)


class ContentTypeMixin(object):
    def with_intersection(self, tags, queryset=None):
        if queryset is None:
            return TaggedItem.objects.get_intersection_by_model(self.model, tags)
        else:
            return TaggedItem.objects.get_intersection_by_model(queryset, tags)


class ModelTaggedItemManager(ContentTypeMixin, BaseModelTaggedItemManager):
    pass
