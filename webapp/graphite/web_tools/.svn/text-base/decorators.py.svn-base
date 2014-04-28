from django.http import HttpResponse,HttpResponseBadRequest
from django.utils.functional import wraps

def ajax_required(view):
    """
    AJAX request required decorator
    use it in your views:

    @ajax_required
    def my_view(request):
        ....

    """    
    def wrap(request, *args, **kwargs):
            if not request.is_ajax():
                return HttpResponseBadRequest
            return view(request, *args, **kwargs)
    return wraps(view)(wrapper)


def Json_crossDomain_response(view):
    """
    Json response decorator for cross-domain "ajax" call.
    The idea is that remote ajax request can be made via a <script></script> html tag 
    injected into current html.
    """
    modified_contentType = ["text/json","application/json",]    
    def wrapper(request, *args, **kwargs):
            cb = request.REQUEST.get("callback", None)
            if cb: 
                scriptTag = True
                mimetype = "text/javascript"
            else:
                scriptTag = False
                mimetype = "application/x-json"
            resp = view(request, *args, **kwargs)
            if resp['Content-Type'] in modified_contentType:
                if scriptTag:
                    resp = "".join([cb, "(", resp.content,  ")"])
                return HttpResponse(resp, mimetype)
            else:
                return resp
    return wraps(view) (wrapper)