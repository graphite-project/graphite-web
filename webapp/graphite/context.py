
from django.conf import settings

# grab some path info
def graphite_content(request):
    content_dir = getattr(settings, 'CONTENT_WEB_PATH', '/content/')
    if not content_dir.endswith('/'):
        content_dir += "/"

    return {
        'static_content_path' : content_dir
    }