"""Copyright 2008 Orbitz WorldWide

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License."""

from django.db import models
from django.contrib.auth import models as auth_models


class Profile(models.Model):
    user = models.OneToOneField(auth_models.User, on_delete=models.CASCADE)
    history = models.TextField(default="")
    advancedUI = models.BooleanField(default=False)
    __str__ = lambda self: "Profile for %s" % self.user


class Variable(models.Model):
    profile = models.ForeignKey(Profile, on_delete=models.CASCADE)
    name = models.CharField(max_length=64)
    value = models.CharField(max_length=64)


class View(models.Model):
    profile = models.ForeignKey(Profile, on_delete=models.CASCADE)
    name = models.CharField(max_length=64)


class Window(models.Model):
    view = models.ForeignKey(View, on_delete=models.CASCADE)
    name = models.CharField(max_length=64)
    top = models.IntegerField()
    left = models.IntegerField()
    width = models.IntegerField()
    height = models.IntegerField()
    url = models.TextField()
    interval = models.IntegerField(null=True)


class MyGraph(models.Model):
    profile = models.ForeignKey(Profile, on_delete=models.CASCADE)
    name = models.CharField(max_length=64)
    url = models.TextField()
