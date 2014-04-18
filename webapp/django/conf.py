from graphite import settings

try:
    from graphite import local_settings
    for KEY in dir(local_settings):
        if KEY.startswith("_"):
            pass
        else:
            setattr(settings, KEY, getattr(local_settings, KEY))
except ImportError:
    pass


# Settings some variables that are required
# by webapp's graphite code

# Required by graphite.render.views
if "TIME_ZONE" not in dir(settings):
    settings.TIME_ZONE = "UTC"

# Required for whisper to know where to get data from
# STORAGE_DIR = '/opt/graphite/storage/'
