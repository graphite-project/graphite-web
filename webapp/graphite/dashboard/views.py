import re
import errno

from os.path import getmtime
from six.moves.urllib.parse import urlencode
from six.moves.configparser import ConfigParser
from django.shortcuts import render
from django.http import QueryDict
from django.conf import settings
from django.contrib.auth import login, authenticate, logout
from django.contrib.staticfiles import finders
from django.utils.safestring import mark_safe
from graphite.compat import HttpResponse
from graphite.dashboard.models import Dashboard, Template
from graphite.dashboard.send_graph import send_graph_email
from graphite.render.views import renderView
from graphite.util import json
from graphite.user_util import isAuthenticated

fieldRegex = re.compile(r'<([^>]+)>')
defaultScheme = {
  'name' : 'Everything',
  'pattern' : '<category>',
  'fields' : [ dict(name='category', label='Category') ],
}
defaultUIConfig = {
  'default_graph_width'  : 400,
  'default_graph_height' : 250,
  'refresh_interval'     :  60,
  'autocomplete_delay'   : 375,
  'merge_hover_delay'    : 700,
  'theme'                : 'default',
}
defaultKeyboardShortcuts = {
  'toggle_toolbar' : 'ctrl-z',
  'toggle_metrics_panel' : 'ctrl-space',
  'erase_all_graphs' : 'alt-x',
  'save_dashboard' : 'alt-s',
  'completer_add_metrics' : 'alt-enter',
  'completer_del_metrics' : 'alt-backspace',
  'give_completer_focus' : 'shift-space',
}

ALL_PERMISSIONS = ['change', 'delete']


class DashboardConfig:
  def __init__(self):
    self.last_read = 0
    self.schemes = [defaultScheme]
    self.ui_config = defaultUIConfig.copy()

  def check(self):
    if getmtime(settings.DASHBOARD_CONF) > self.last_read:
      self.load()

  def load(self):
    schemes = [defaultScheme]
    parser = ConfigParser()
    parser.read(settings.DASHBOARD_CONF)

    for option, default_value in defaultUIConfig.items():
      if parser.has_option('ui', option):
        try:
          self.ui_config[option] = parser.getint('ui', option)
        except ValueError:
          self.ui_config[option] = parser.get('ui', option)
      else:
        self.ui_config[option] = default_value

    if parser.has_option('ui', 'automatic_variants'):
      self.ui_config['automatic_variants']   = parser.getboolean('ui', 'automatic_variants')
    else:
      self.ui_config['automatic_variants'] = True

    self.ui_config['keyboard_shortcuts'] = defaultKeyboardShortcuts.copy()
    if parser.has_section('keyboard-shortcuts'):
      self.ui_config['keyboard_shortcuts'].update( parser.items('keyboard-shortcuts') )

    for section in parser.sections():
      if section in ('ui', 'keyboard-shortcuts'):
        continue

      scheme = parser.get(section, 'scheme')
      fields = []

      for match in fieldRegex.finditer(scheme):
        field = match.group(1)
        if parser.has_option(section, '%s.label' % field):
          label = parser.get(section, '%s.label' % field)
        else:
          label = field

        fields.append({
          'name' : field,
          'label' : label
        })

      schemes.append({
        'name' : section,
        'pattern' : scheme,
        'fields' : fields,
      })

    self.schemes = schemes


config = DashboardConfig()


def dashboard(request, name=None):
  dashboard_conf_missing = False

  try:
    config.check()
  except OSError as e:
    if e.errno == errno.ENOENT:
      dashboard_conf_missing = True
    else:
      raise

  initialError = None
  debug = request.GET.get('debug', False)
  theme = request.GET.get('theme', config.ui_config['theme'])
  css_file = finders.find('css/dashboard-%s.css' % theme)
  if css_file is None:
    initialError = "Invalid theme '%s'" % theme
    theme = config.ui_config['theme']

  context = {
    'schemes_json': mark_safe(json.dumps(config.schemes)),
    'ui_config_json': mark_safe(json.dumps(config.ui_config)),
    'jsdebug': debug or settings.JAVASCRIPT_DEBUG,
    'debug': debug,
    'theme': theme,
    'initialError': initialError,
    'querystring': mark_safe(json.dumps(dict(request.GET.items()))),
    'dashboard_conf_missing': dashboard_conf_missing,
    'userName': '',
    'permissions': mark_safe(json.dumps(getPermissions(request.user))),
    'permissionsUnauthenticated': mark_safe(json.dumps(getPermissions(None)))
  }
  user = request.user
  if user:
      context['userName'] = user.username

  if name is not None:
    try:
      dashboard = Dashboard.objects.get(name=name)
    except Dashboard.DoesNotExist:
      context['initialError'] = "Dashboard '%s' does not exist." % name
    else:
      context['initialState'] = dashboard.state

  return render(request, "dashboard.html", context)


def template(request, name, val):
  template_conf_missing = False

  try:
    config.check()
  except OSError as e:
    if e.errno == errno.ENOENT:
      template_conf_missing = True
    else:
      raise

  initialError = None
  debug = request.GET.get('debug', False)
  theme = request.GET.get('theme', config.ui_config['theme'])
  css_file = finders.find('css/dashboard-%s.css' % theme)
  if css_file is None:
    initialError = "Invalid theme '%s'" % theme
    theme = config.ui_config['theme']

  context = {
    'schemes_json' : json.dumps(config.schemes),
    'ui_config_json' : json.dumps(config.ui_config),
    'jsdebug' : debug or settings.JAVASCRIPT_DEBUG,
    'debug' : debug,
    'theme' : theme,
    'initialError' : initialError,
    'querystring' : json.dumps( dict( request.GET.items() ) ),
    'template_conf_missing' : template_conf_missing,
    'userName': '',
    'permissions': json.dumps(getPermissions(request.user)),
    'permissionsUnauthenticated': json.dumps(getPermissions(None))
  }

  user = request.user
  if user:
      context['userName'] = user.username

  try:
    template = Template.objects.get(name=name)
  except Template.DoesNotExist:
    context['initialError'] = "Template '%s' does not exist." % name
  else:
    state = json.loads(template.loadState(val))
    state['name'] = '%s/%s' % (name, val)
    context['initialState'] = json.dumps(state)
  return render(request, "dashboard.html", context)


def getPermissions(user):
  """Return [change, delete] based on authorisation model and user privileges/groups"""
  if user and not isAuthenticated(user):
    user = None
  if not settings.DASHBOARD_REQUIRE_AUTHENTICATION:
    return ALL_PERMISSIONS      # don't require login
  if not user:
      return []
  # from here on, we have a user
  permissions = ALL_PERMISSIONS
  if settings.DASHBOARD_REQUIRE_PERMISSIONS:
    permissions = [permission for permission in ALL_PERMISSIONS if user.has_perm('dashboard.%s_dashboard' % permission)]
  editGroup = settings.DASHBOARD_REQUIRE_EDIT_GROUP
  if editGroup and len(user.groups.filter(name = editGroup)) == 0:
    permissions = []
  return permissions


def save(request, name):
  if 'change' not in getPermissions(request.user):
    return json_response( dict(error="Must be logged in with appropriate permissions to save") )
  # Deserialize and reserialize as a validation step
  state = str( json.dumps( json.loads( request.POST['state'] ) ) )

  try:
    dashboard = Dashboard.objects.get(name=name)
  except Dashboard.DoesNotExist:
    dashboard = Dashboard.objects.create(name=name, state=state)
  else:
    dashboard.state = state
    dashboard.save()

  return json_response( dict(success=True) )


def save_template(request, name, key):
  if 'change' not in getPermissions(request.user):
    return json_response( dict(error="Must be logged in with appropriate permissions to save the template") )
  # Deserialize and reserialize as a validation step
  state = str( json.dumps( json.loads( request.POST['state'] ) ) )

  try:
    template = Template.objects.get(name=name)
  except Template.DoesNotExist:
    template = Template.objects.create(name=name)
    template.setState(state, key)
    template.save()
  else:
    template.setState(state, key)
    template.save()

  return json_response( dict(success=True) )


def load(request, name):
  try:
    dashboard = Dashboard.objects.get(name=name)
  except Dashboard.DoesNotExist:
    return json_response( dict(error="Dashboard '%s' does not exist. " % name) )

  return json_response( dict(state=json.loads(dashboard.state)) )


def load_template(request, name, val):
  try:
    template = Template.objects.get(name=name)
  except Template.DoesNotExist:
    return json_response( dict(error="Template '%s' does not exist. " % name) )

  state = json.loads(template.loadState(val))
  state['name'] = '%s/%s' % (name, val)
  return json_response( dict(state=state) )


def delete(request, name):
  if 'delete' not in getPermissions(request.user):
    return json_response( dict(error="Must be logged in with appropriate permissions to delete") )

  try:
    dashboard = Dashboard.objects.get(name=name)
  except Dashboard.DoesNotExist:
    return json_response( dict(error="Dashboard '%s' does not exist. " % name) )
  else:
    dashboard.delete()
    return json_response( dict(success=True) )


def delete_template(request, name):
  if 'delete' not in getPermissions(request.user):
    return json_response( dict(error="Must be logged in with appropriate permissions to delete the template") )

  try:
    template = Template.objects.get(name=name)
  except Template.DoesNotExist:
    return json_response( dict(error="Template '%s' does not exist. " % name) )
  else:
    template.delete()
    return json_response( dict(success=True) )


def find(request):
  queryParams = request.GET.copy()
  queryParams.update(request.POST)

  query = queryParams.get('query', False)
  query_terms = set( query.lower().split() )
  results = []

  # Find all dashboard names that contain each of our query terms as a substring
  for dashboard_name in Dashboard.objects.order_by('name').values_list('name', flat=True):
    name = dashboard_name.lower()

    if name.startswith('temporary-'):
      continue

    found = True # blank queries return everything
    for term in query_terms:
      if term in name:
        found = True
      else:
        found = False
        break

    if found:
      results.append( dict(name=dashboard_name) )

  return json_response( dict(dashboards=results) )


def find_template(request):
  queryParams = request.GET.copy()
  queryParams.update(request.POST)

  query = queryParams.get('query', False)
  query_terms = set( query.lower().split() )
  results = []

  # Find all dashboard names that contain each of our query terms as a substring
  for template in Template.objects.all():
    name = template.name.lower()

    found = True # blank queries return everything
    for term in query_terms:
      if term in name:
        found = True
      else:
        found = False
        break

    if found:
      results.append( dict(name=template.name) )

  return json_response( dict(templates=results) )


def help(request):
  context = {}
  return render(request, "dashboardHelp.html", context)


def email(request):
    sender = request.POST['sender']
    recipients = request.POST['recipients'].split()
    subject = request.POST['subject']
    message = request.POST['message']

    # these need to be passed to the render function in an HTTP request.
    graph_params = json.loads(request.POST['graph_params'], parse_int=str)
    target = QueryDict(urlencode({'target': graph_params.pop('target')}))
    graph_params = QueryDict(urlencode(graph_params))

    new_post = request.POST.copy()
    new_post.update(graph_params)
    new_post.update(target)
    request.POST = new_post

    resp = renderView(request)
    img = resp.content

    if img:
        attachments = [('graph.png', img, 'image/png')]
        send_graph_email(subject, sender, recipients, attachments, message)

    return json_response(dict(success=True))


def create_temporary(request):
  state = str( json.dumps( json.loads( request.POST['state'] ) ) )
  i = 0
  while True:
    name = "temporary-%d" % i
    try:
      Dashboard.objects.get(name=name)
    except Dashboard.DoesNotExist:
      dashboard = Dashboard.objects.create(name=name, state=state)
      break
    else:
      i += 1

  return json_response( dict(name=dashboard.name) )


def json_response(obj):
  return HttpResponse(content_type='application/json', content=json.dumps(obj))


def user_login(request):
  response = dict(errors={}, text={}, success=False, permissions=[])
  user = authenticate(username=request.POST['username'],
                      password=request.POST['password'])
  if user is not None:
    if user.is_active:
      login(request, user)
      response['success'] = True
      response['permissions'].extend(getPermissions(user))
    else:
      response['errors']['reason'] = 'Account disabled.'
  else:
    response['errors']['reason'] = 'Username and/or password invalid.'
  return json_response(response)


def user_logout(request):
  response = dict(errors={}, text={}, success=True)
  logout(request)
  return json_response(response)
