from django.shortcuts import render
from graphite import settings


def index(request):
    context = {
        'version' : settings.WEBAPP_VERSION,
    }
    return render(request, 'version.html', context)
