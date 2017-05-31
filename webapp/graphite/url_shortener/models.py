from django.db import models


class Link(models.Model):
    url = models.TextField()
    date_submitted = models.DateTimeField(auto_now_add=True)
