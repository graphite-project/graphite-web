import json


class FloatEncoder(json.JSONEncoder):
    def __init__(self, nan_str="null", **kwargs):
        super(FloatEncoder, self).__init__(**kwargs)
        self.nan_str = nan_str

    def default(self, o):
        if type(o) == float:
            if o != o:
                return self.nan_str
            if o == _inf:
                return '1e9999'
            if o == _neginf:
                return '-1e9999'
        return super(FloatEncoder, self).default(o)
