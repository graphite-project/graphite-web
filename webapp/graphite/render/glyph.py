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

import math, itertools, re
from datetime import datetime, timedelta
from six.moves import range, zip
from six.moves.urllib.parse import unquote_plus
from six.moves.configparser import SafeConfigParser
from django.conf import settings
import pytz
import six

from graphite.render.datalib import TimeSeries
from graphite.util import json, BytesIO

try:
    import cairocffi as cairo
except ImportError:
    import cairo

INFINITY = float('inf')

colorAliases = {
  'black' : (0,0,0),
  'white' : (255,255,255),
  'blue' : (100,100,255),
  'green' : (0,200,0),
  'red' : (200,00,50),
  'yellow' : (255,255,0),
  'orange' : (255, 165, 0),
  'purple' : (200,100,255),
  'brown' : (150,100,50),
  'cyan' : (0,255,255),
  'aqua' : (0,150,150),
  'gray' : (175,175,175),
  'grey' : (175,175,175),
  'magenta' : (255,0,255),
  'pink' : (255,100,100),
  'gold' : (200,200,0),
  'rose' : (200,150,200),
  'darkblue' : (0,0,255),
  'darkgreen' : (0,255,0),
  'darkred' : (255,0,0),
  'darkgray' : (111,111,111),
  'darkgrey' : (111,111,111),
}

# This gets overridden by graphTemplates.conf
defaultGraphOptions = dict(
  background='white',
  foreground='black',
  majorline='rose',
  minorline='grey',
  linecolors='blue,green,red,purple,brown,yellow,aqua,grey,magenta,pink,gold,rose',
  fontname='Sans',
  fontsize=10,
  fontbold='false',
  fontitalic='false',
)

# X-axis configurations (copied from rrdtool, this technique is evil & ugly but effective)
SEC = 1
MIN = 60
HOUR = MIN * 60
DAY = HOUR * 24
WEEK = DAY * 7
MONTH = DAY * 31
YEAR = DAY * 365

# Set a flag to indicate whether the '%l' option can be used safely.
# On Windows, in particular the %l option in strftime is not supported.
# '%l' can also fail silently in Linux.
# (It is not one of the documented Python formatters).
try:
    if datetime.now().strftime("%a %l%p"):
        percent_l_supported = True
    else:
        percent_l_supported = False
except ValueError as e:
    percent_l_supported = False

DATE_FORMAT = settings.DATE_FORMAT

xAxisConfigs = (
  dict(seconds=0.00,  minorGridUnit=SEC,  minorGridStep=5,  majorGridUnit=MIN,  majorGridStep=1,  labelUnit=SEC,  labelStep=5,  format="%H:%M:%S", maxInterval=10*MIN),
  dict(seconds=0.07,  minorGridUnit=SEC,  minorGridStep=10, majorGridUnit=MIN,  majorGridStep=1,  labelUnit=SEC,  labelStep=10, format="%H:%M:%S", maxInterval=20*MIN),
  dict(seconds=0.14,  minorGridUnit=SEC,  minorGridStep=15, majorGridUnit=MIN,  majorGridStep=1,  labelUnit=SEC,  labelStep=15, format="%H:%M:%S", maxInterval=30*MIN),
  dict(seconds=0.27,  minorGridUnit=SEC,  minorGridStep=30, majorGridUnit=MIN,  majorGridStep=2,  labelUnit=MIN,  labelStep=1,  format="%H:%M", maxInterval=2*HOUR),
  dict(seconds=0.5,   minorGridUnit=MIN,  minorGridStep=1,  majorGridUnit=MIN,  majorGridStep=2,  labelUnit=MIN,  labelStep=1,  format="%H:%M", maxInterval=2*HOUR),
  dict(seconds=1.2,   minorGridUnit=MIN,  minorGridStep=1,  majorGridUnit=MIN,  majorGridStep=4,  labelUnit=MIN,  labelStep=2,  format="%H:%M", maxInterval=3*HOUR),
  dict(seconds=2,     minorGridUnit=MIN,  minorGridStep=1,  majorGridUnit=MIN,  majorGridStep=10, labelUnit=MIN,  labelStep=5,  format="%H:%M", maxInterval=6*HOUR),
  dict(seconds=5,     minorGridUnit=MIN,  minorGridStep=2,  majorGridUnit=MIN,  majorGridStep=10, labelUnit=MIN,  labelStep=10, format="%H:%M", maxInterval=12*HOUR),
  dict(seconds=10,    minorGridUnit=MIN,  minorGridStep=5,  majorGridUnit=MIN,  majorGridStep=20, labelUnit=MIN,  labelStep=20, format="%H:%M", maxInterval=1*DAY),
  dict(seconds=30,    minorGridUnit=MIN,  minorGridStep=10, majorGridUnit=HOUR, majorGridStep=1,  labelUnit=HOUR, labelStep=1,  format="%H:%M", maxInterval=2*DAY),
  dict(seconds=60,    minorGridUnit=MIN,  minorGridStep=30, majorGridUnit=HOUR, majorGridStep=2,  labelUnit=HOUR, labelStep=2,  format="%H:%M", maxInterval=2*DAY),
  dict(seconds=100,   minorGridUnit=HOUR, minorGridStep=2,  majorGridUnit=HOUR, majorGridStep=4,  labelUnit=HOUR, labelStep=4,  format="%a %H:%M", maxInterval=6*DAY),
  dict(seconds=255,   minorGridUnit=HOUR, minorGridStep=6,  majorGridUnit=HOUR, majorGridStep=12, labelUnit=HOUR, labelStep=12, format=DATE_FORMAT + " %H:%M", maxInterval=10*DAY),
  dict(seconds=600,   minorGridUnit=HOUR, minorGridStep=6,  majorGridUnit=DAY,  majorGridStep=1,  labelUnit=DAY,  labelStep=1,  format=DATE_FORMAT, maxInterval=14*DAY),
  dict(seconds=1000,   minorGridUnit=HOUR, minorGridStep=12, majorGridUnit=DAY,  majorGridStep=1,  labelUnit=DAY,  labelStep=1,  format=DATE_FORMAT, maxInterval=365*DAY),
  dict(seconds=2000,  minorGridUnit=DAY,  minorGridStep=1,  majorGridUnit=DAY,  majorGridStep=2,  labelUnit=DAY,  labelStep=2,  format=DATE_FORMAT, maxInterval=365*DAY),
  dict(seconds=4000,  minorGridUnit=DAY,  minorGridStep=2,  majorGridUnit=DAY,  majorGridStep=4,  labelUnit=DAY,  labelStep=4,  format=DATE_FORMAT, maxInterval=365*DAY),
  dict(seconds=8000,  minorGridUnit=DAY,  minorGridStep=3.5,majorGridUnit=DAY,  majorGridStep=7,  labelUnit=DAY,  labelStep=7,  format=DATE_FORMAT, maxInterval=365*DAY),
  dict(seconds=16000, minorGridUnit=DAY,  minorGridStep=7,  majorGridUnit=DAY,  majorGridStep=14, labelUnit=DAY,  labelStep=14, format=DATE_FORMAT, maxInterval=365*DAY),
  dict(seconds=32000, minorGridUnit=DAY,  minorGridStep=15, majorGridUnit=DAY,  majorGridStep=30, labelUnit=DAY,  labelStep=30, format=DATE_FORMAT, maxInterval=365*DAY),
  dict(seconds=64000, minorGridUnit=DAY,  minorGridStep=30, majorGridUnit=DAY,  majorGridStep=60, labelUnit=DAY,  labelStep=60, format=DATE_FORMAT + " %Y"),
  dict(seconds=100000,minorGridUnit=DAY,  minorGridStep=60, majorGridUnit=DAY,  majorGridStep=120,labelUnit=DAY,  labelStep=120, format=DATE_FORMAT + " %Y"),
  dict(seconds=120000,minorGridUnit=DAY,  minorGridStep=120,majorGridUnit=DAY,  majorGridStep=240,labelUnit=DAY,  labelStep=240, format=DATE_FORMAT + " %Y"),
)

UnitSystems = {
  'binary': (
    ('Pi', 1024.0**5),
    ('Ti', 1024.0**4),
    ('Gi', 1024.0**3),
    ('Mi', 1024.0**2),
    ('Ki', 1024.0   )),
  'si': (
    ('P', 1000.0**5),
    ('T', 1000.0**4),
    ('G', 1000.0**3),
    ('M', 1000.0**2),
    ('k', 1000.0   )),
  'sec': (
    ('Y', 60*60*24*365),
    ('M', 60*60*24*30),
    ('D', 60*60*24),
    ('H', 60*60),
    ('m', 60)),
  'msec': (
    ('Y', 60*60*24*365*1000),
    ('M', 60*60*24*30*1000),
    ('D', 60*60*24*1000),
    ('H', 60*60*1000),
    ('m', 60*1000),
    ('s', 1000)),
  'none' : [],
}


# We accept values fractionally outside of nominal limits, so that
# rounding errors don't cause weird effects. Since our goal is to
# create plots, and the maximum resolution of the plots is likely to
# be less than 10000 pixels, errors smaller than this size shouldn't
# create any visible effects.
EPSILON = 0.0001


class GraphError(Exception):
  pass


class _AxisTics:
  def __init__(self, minValue, maxValue, unitSystem=None):
    self.minValue = self.checkFinite(minValue, "data value")
    self.minValueSource = 'data'
    self.maxValue = self.checkFinite(maxValue, "data value")
    self.maxValueSource = 'data'
    self.unitSystem = unitSystem

  @staticmethod
  def checkFinite(value, name='value'):
    """Check that value is a finite number.

    If it is, return it. If not, raise GraphError describing the
    problem, using name in the error message.
    """

    if math.isnan(value):
      raise GraphError('Encountered NaN %s' % (name,))
    elif math.isinf(value):
      raise GraphError('Encountered infinite %s' % (name,))
    return value

  @staticmethod
  def chooseDelta(x):
    """Choose a reasonable axis range given that one limit is x.

    Given that end of the axis range (i.e., minValue or maxValue) is
    x, choose a reasonable distance to the other limit.
    """

    if abs(x) < 1.0e-9:
      return 1.0
    else:
      return 0.1 * abs(x)

  def reconcileLimits(self):
    """If self.minValue is not less than self.maxValue, fix the problem.

    If self.minValue is not less than self.maxValue, adjust
    self.minValue and/or self.maxValue (depending on which was not
    specified explicitly by the user) to make self.minValue <
    self.maxValue. If the user specified both limits explicitly, then
    raise GraphError.
    """

    if self.minValue < self.maxValue:
      # The limits are already OK.
      return

    minFixed = (self.minValueSource in ['min'])
    maxFixed = (self.maxValueSource in ['max', 'limit'])

    if minFixed and maxFixed:
      raise GraphError('The %s must be less than the %s' %
                       (self.minValueSource, self.maxValueSource))
    elif minFixed:
      self.maxValue = self.minValue + self.chooseDelta(self.minValue)
    elif maxFixed:
      self.minValue = self.maxValue - self.chooseDelta(self.maxValue)
    else:
      delta = self.chooseDelta(max(abs(self.minValue), abs(self.maxValue)))
      average = (self.minValue + self.maxValue) / 2.0
      self.minValue = average - delta
      self.maxValue = average + delta

  def applySettings(self, axisMin=None, axisMax=None, axisLimit=None):
    """Apply the specified settings to this axis.

    Set self.minValue, self.minValueSource, self.maxValue,
    self.maxValueSource, and self.axisLimit reasonably based on the
    parameters provided.

    Arguments:

    axisMin -- a finite number, or None to choose a round minimum
        limit that includes all of the data.

    axisMax -- a finite number, 'max' to use the maximum value
        contained in the data, or None to choose a round maximum limit
        that includes all of the data.

    axisLimit -- a finite number to use as an upper limit on maxValue,
        or None to impose no upper limit.

    """

    if axisMin is not None and not math.isnan(axisMin):
      self.minValueSource = 'min'
      self.minValue = self.checkFinite(axisMin, 'axis min')

    if axisMax == 'max':
      self.maxValueSource = 'extremum'
    elif axisMax is not None and not math.isnan(axisMax):
      self.maxValueSource = 'max'
      self.maxValue = self.checkFinite(axisMax, 'axis max')

    if axisLimit is None or math.isnan(axisLimit):
      self.axisLimit = None
    elif axisLimit < self.maxValue:
      self.maxValue = self.checkFinite(axisLimit, 'axis limit')
      self.maxValueSource = 'limit'
      # The limit has already been imposed, so there is no need to
      # remember it:
      self.axisLimit = None
    elif math.isinf(axisLimit):
      # It must be positive infinity, which is the same as no limit:
      self.axisLimit = None
    else:
      # We still need to remember axisLimit to avoid rounding top to
      # a value larger than axisLimit:
      self.axisLimit = axisLimit

    self.reconcileLimits()

  def makeLabel(self, value):
    """Create a label for the specified value.

    Create a label string containing the value and its units (if any),
    based on the values of self.step, self.span, and self.unitSystem.

    """

    value, prefix = format_units(value, self.step, system=self.unitSystem)
    span, spanPrefix = format_units(self.span, self.step, system=self.unitSystem)
    if prefix:
      prefix += " "
    if value < 0.1:
      return "%g %s" % (float(value), prefix)
    elif value < 1.0:
      return "%.2f %s" % (float(value), prefix)
    if (span is not None and span > 10) or spanPrefix != prefix:
      if type(value) is float:
        return "%.1f %s" % (value, prefix)
      else:
        return "%d %s" % (int(value), prefix)
    elif span is not None and span > 3:
      return "%.1f %s" % (float(value), prefix)
    elif span is not None and span > 0.1:
      return "%.2f %s" % (float(value), prefix)
    else:
      return "%g %s" % (float(value), prefix)


class _LinearAxisTics(_AxisTics):
  """Axis ticmarks with uniform spacing."""

  def __init__(self, minValue, maxValue, unitSystem=None):
    _AxisTics.__init__(self, minValue, maxValue, unitSystem=unitSystem)
    self.step = None
    self.span = None
    self.binary = None

  def setStep(self, step):
    """Set the size of steps between ticmarks."""

    self.step = self.checkFinite(float(step), 'axis step')

  def generateSteps(self, minStep):
    """Generate allowed steps with step >= minStep in increasing order."""

    self.checkFinite(minStep)

    if self.binary:
      base = 2.0
      mantissas = [1.0]
      exponent = math.floor(math.log(minStep, 2) - EPSILON)
    else:
      base = 10.0
      mantissas = [1.0, 2.0, 5.0]
      exponent = math.floor(math.log10(minStep) - EPSILON)

    while True:
      multiplier = base ** exponent
      for mantissa in mantissas:
        value = mantissa * multiplier
        if value >= minStep * (1.0 - EPSILON):
          yield value
      exponent += 1

  def computeSlop(self, step, divisor):
    """Compute the slop that would result from step and divisor.

    Return the slop, or None if this combination can't cover the full
    range. See chooseStep() for the definition of "slop".

    """

    bottom = step * math.floor(self.minValue / float(step) + EPSILON)
    top = bottom + step * divisor

    if top >= self.maxValue - EPSILON * step:
      return max(top - self.maxValue, self.minValue - bottom)
    else:
      return None

  def chooseStep(self, divisors=None, binary=False):
    """Choose a nice, pretty size for the steps between axis labels.

    Our main constraint is that the number of divisions must be taken
    from the divisors list. We pick a number of divisions and a step
    size that minimizes the amount of whitespace ("slop") that would
    need to be included outside of the range [self.minValue,
    self.maxValue] if we were to push out the axis values to the next
    larger multiples of the step size.

    The minimum step that could possibly cover the variance satisfies

        minStep * max(divisors) >= variance

    or

        minStep = variance / max(divisors)

    It's not necessarily possible to cover the variance with a step
    that size, but we know that any smaller step definitely *cannot*
    cover it. So we can start there.

    For a sufficiently large step size, it is definitely possible to
    cover the variance, but at some point the slop will start growing.
    Let's define the slop to be

        slop = max(minValue - bottom, top - maxValue)

    Then for a given, step size, we know that

        slop >= (1/2) * (step * min(divisors) - variance)

    (the factor of 1/2 is for the best-case scenario that the slop is
    distributed equally on the two sides of the range). So suppose we
    already have a choice that yields bestSlop. Then there is no need
    to choose steps so large that the slop is guaranteed to be larger
    than bestSlop. Therefore, the maximum step size that we need to
    consider is

        maxStep = (2 * bestSlop + variance) / min(divisors)

    """

    self.binary = binary
    if divisors is None:
      divisors = [4,5,6]
    else:
      for divisor in divisors:
        self.checkFinite(divisor, 'divisor')
        if divisor < 1:
          raise GraphError('Divisors must be greater than or equal to one')

    if self.minValue == self.maxValue:
      if self.minValue == 0.0:
        self.maxValue = 1.0
      elif self.minValue < 0.0:
        self.minValue *= 1.1
        self.maxValue *= 0.9
      else:
        self.minValue *= 0.9
        self.maxValue *= 1.1

    variance = self.maxValue - self.minValue

    bestSlop = None
    bestStep = None
    for step in self.generateSteps(variance / float(max(divisors))):
      if bestSlop is not None and step * min(divisors) >= 2 * bestSlop + variance:
        break
      for divisor in divisors:
        slop = self.computeSlop(step, divisor)
        if slop is not None and (bestSlop is None or slop < bestSlop):
          bestSlop = slop
          bestStep = step

    self.step = bestStep

  def chooseLimits(self):
    if self.minValueSource == 'data':
      # Start labels at the greatest multiple of step <= minValue:
      self.bottom = self.step * math.floor(self.minValue / self.step + EPSILON)
    else:
      self.bottom = self.minValue

    if self.maxValueSource == 'data':
      # Extend the top of our graph to the lowest step multiple >= maxValue:
      self.top = self.step * math.ceil(self.maxValue / self.step - EPSILON)
      # ...but never exceed a user-specified limit:
      if self.axisLimit is not None and self.top > self.axisLimit + EPSILON * self.step:
        self.top = self.axisLimit
    else:
      self.top = self.maxValue

    self.span = self.top - self.bottom

    if self.span == 0:
      self.top += 1
      self.span += 1

  def getLabelValues(self):
    if self.step <= 0.0:
      raise GraphError('The step size must be positive')
    if self.span > 1000.0 * self.step:
      # This is insane. Pick something that won't cause trouble:
      self.chooseStep()

    values = []

    start = self.step * math.ceil(self.bottom / self.step - EPSILON)
    i = 0
    while True:
      value = start + i * self.step
      if value > self.top + EPSILON * self.step:
        break
      values.append(value)
      i += 1

    return values


class _LogAxisTics(_AxisTics):
  def __init__(self, minValue, maxValue, unitSystem=None, base=10.0):
    _AxisTics.__init__(self, minValue, maxValue, unitSystem=unitSystem)
    if base <= 1.0:
      raise GraphError('Logarithmic base must be greater than one')
    self.base = self.checkFinite(base, 'log base')
    self.step = None
    self.span = None

  def setStep(self, step):
    # step is ignored for Logarithmic tics:
    self.step = None

  def chooseStep(self, divisors=None, binary=False):
    # step is ignored for Logarithmic tics:
    self.step = None

  def chooseLimits(self):
    if self.minValue <= 0:
      raise GraphError('Logarithmic scale specified with a dataset with a '
                       'minimum value less than or equal to zero')
    self.bottom = math.pow(self.base, math.floor(math.log(self.minValue, self.base)))
    self.top = math.pow(self.base, math.ceil(math.log(self.maxValue, self.base)))

    self.span = self.top - self.bottom

    if self.span == 0:
      self.top *= self.base
      self.span = self.top - self.bottom

  def getLabelValues(self):
    values = []

    value = math.pow(self.base, math.ceil(math.log(self.bottom, self.base) - EPSILON))
    while value < self.top * (1.0 + EPSILON):
       values.append(value)
       value *= self.base

    return values


class Graph:
  customizable = ('width','height','margin','bgcolor','fgcolor', \
                 'fontName','fontSize','fontBold','fontItalic', \
                 'colorList','template','yAxisSide','outputFormat')

  def __init__(self,**params):
    self.params = params
    self.data = params['data']
    self.dataLeft = []
    self.dataRight = []
    self.secondYAxis = False
    self.width = int( params.get('width',200) )
    self.height = int( params.get('height',200) )
    self.margin = int( params.get('margin',10) )
    self.userTimeZone = params.get('tz')
    self.logBase = params.get('logBase', None)
    self.minorY = int(params.get('minorY', 1))

    if self.logBase:
      if self.logBase == 'e':
        self.logBase = math.e
      elif self.logBase < 1:
        self.logBase = None
        params['logBase'] = None
      else:
        self.logBase = float(self.logBase)

    if self.margin < 0:
      self.margin = 10

    self.setupCairo( params.get('outputFormat','png').lower() )

    self.area = {
      'xmin' : self.margin + 10, # Need extra room when the time is near the left edge
      'xmax' : self.width - self.margin,
      'ymin' : self.margin,
      'ymax' : self.height - self.margin,
    }

    self.loadTemplate( params.get('template','default') )

    opts = self.ctx.get_font_options()
    opts.set_antialias( cairo.ANTIALIAS_NONE )
    self.ctx.set_font_options( opts )

    self.foregroundColor = params.get('fgcolor',self.defaultForeground)
    self.backgroundColor = params.get('bgcolor',self.defaultBackground)
    self.setColor( self.backgroundColor )
    self.drawRectangle( 0, 0, self.width, self.height )

    if 'colorList' in params:
      colorList = unquote_plus( str(params['colorList']) ).split(',')
    else:
      colorList = self.defaultColorList
    self.colors = itertools.cycle( colorList )

    self.drawGraph(**params)

  def setupCairo(self,outputFormat='png'):
    self.outputFormat = outputFormat
    if outputFormat == 'png':
      self.surface = cairo.ImageSurface(cairo.FORMAT_ARGB32, self.width, self.height)
    elif outputFormat == 'svg':
      self.surfaceData = BytesIO()
      self.surface = cairo.SVGSurface(self.surfaceData, self.width, self.height)
    elif outputFormat == 'pdf':
      self.surfaceData = BytesIO()
      self.surface = cairo.PDFSurface(self.surfaceData, self.width, self.height)
      res_x, res_y = self.surface.get_fallback_resolution()
      self.width = float(self.width / res_x) * 72
      self.height = float(self.height / res_y) * 72
      self.surface.set_size(self.width, self.height)
    self.ctx = cairo.Context(self.surface)

  def setColor(self, value, alpha=1.0, forceAlpha=False):
    if type(value) is tuple and len(value) == 3:
      r,g,b = value
    elif value in colorAliases:
      r,g,b = colorAliases[value]
    elif isinstance(value, six.string_types) and len(value) >= 6:
      s = value
      if s[0] == '#': s = s[1:]
      if s[0:3] == '%23': s = s[3:]
      r,g,b = ( int(s[0:2],base=16), int(s[2:4],base=16), int(s[4:6],base=16) )
      if len(s) == 8 and not forceAlpha:
        alpha = float( int(s[6:8],base=16) ) / 255.0
    elif isinstance(value, int) and len(str(value)) == 6:
      s = str(value)
      r,g,b = ( int(s[0:2],base=16), int(s[2:4],base=16), int(s[4:6],base=16) )
    else:
      raise ValueError("Must specify an RGB 3-tuple, an html color string, or a known color alias!")
    r,g,b = [float(c) / 255.0 for c in (r,g,b)]
    self.ctx.set_source_rgba(r,g,b,alpha)

  def setFont(self, **params):
    p = self.defaultFontParams.copy()
    p.update(params)
    self.ctx.select_font_face(p['name'], p['italic'], p['bold'])
    self.ctx.set_font_size( float(p['size']) )

  def getExtents(self,text=None,fontOptions={}):
    if fontOptions:
      self.setFont(**fontOptions)
    F = self.ctx.font_extents()
    extents = { 'maxHeight' : F[2], 'maxAscent' : F[0], 'maxDescent' : F[1] }
    if text:
      T = self.ctx.text_extents(text)
      extents['width'] = T[4]
      extents['height'] = T[3]
    return extents

  def drawRectangle(self, x, y, w, h, fill=True, dash=False):
    if not fill:
      o = self.ctx.get_line_width() / 2.0 #offset for borders so they are drawn as lines would be
      x += o
      y += o
      w -= o
      h -= o
    self.ctx.rectangle(x,y,w,h)
    if fill:
      self.ctx.fill()
    else:
      if dash:
        self.ctx.set_dash(dash,1)
      else:
        self.ctx.set_dash([],0)
      self.ctx.stroke()

  def drawText(self,text,x,y,font={},color={},align='left',valign='top',border=False,rotate=0):
    if font: self.setFont(**font)
    if color: self.setColor(**color)
    extents = self.getExtents(text)
    angle = math.radians(rotate)
    origMatrix = self.ctx.get_matrix()

    horizontal = {
      'left' : 0,
      'center' : extents['width'] / 2,
      'right' : extents['width'],
    }[align.lower()]
    vertical = {
      'top' : extents['maxAscent'],
      'middle' : extents['maxHeight'] / 2 - extents['maxDescent'],
      'bottom' : -extents['maxDescent'],
      'baseline' : 0,
    }[valign.lower()]

    self.ctx.move_to(x,y)
    self.ctx.rel_move_to( math.sin(angle) * -vertical, math.cos(angle) * vertical)
    self.ctx.rotate(angle)
    self.ctx.rel_move_to( -horizontal, 0 )
    bx, by = self.ctx.get_current_point()
    by -= extents['maxAscent']
    self.ctx.text_path(text)
    self.ctx.fill()
    if border:
      self.drawRectangle(bx, by, extents['width'], extents['maxHeight'], fill=False)
    else:
      self.ctx.set_matrix(origMatrix)

  def drawTitle(self,text):
    self.encodeHeader('title')

    y = self.area['ymin']
    x = self.width / 2
    lineHeight = self.getExtents()['maxHeight']
    for line in text.split('\n'):
      self.drawText(line, x, y, align='center')
      y += lineHeight
    if self.params.get('yAxisSide') == 'right':
      self.area['ymin'] = y
    else:
      self.area['ymin'] = y + self.margin


  def drawLegend(self, elements, unique=False): #elements is [ (name,color,rightSide), (name,color,rightSide), ... ]
    self.encodeHeader('legend')

    if unique:
      # remove duplicate names
      namesSeen = []
      newElements = []
      for e in elements:
        if e[0] not in namesSeen:
          namesSeen.append(e[0])
          newElements.append(e)
      elements = newElements

    # Check if there's enough room to use two columns.
    rightSideLabels = False
    padding = 5
    longestName = sorted([e[0] for e in elements],key=len)[-1]
    testSizeName = longestName + " " + longestName # Double it to check if there's enough room for 2 columns
    testExt = self.getExtents(testSizeName)
    testBoxSize = testExt['maxHeight'] - 1
    testWidth = testExt['width'] + 2 * (testBoxSize + padding)
    if testWidth + 50 < self.width:
      rightSideLabels = True

    if(self.secondYAxis and rightSideLabels):
      extents = self.getExtents(longestName)
      padding = 5
      boxSize = extents['maxHeight'] - 1
      lineHeight = extents['maxHeight'] + 1
      labelWidth = extents['width'] + 2 * (boxSize + padding)
      columns = max(1, math.floor( (self.width - self.area['xmin']) / labelWidth ))
      numRight = len([name for (name,color,rightSide) in elements if rightSide])
      numberOfLines = max(len(elements) - numRight, numRight)
      columns = math.floor(columns / 2.0)
      if columns < 1: columns = 1
      legendHeight = (max(1, (numberOfLines / columns)) * lineHeight) + padding
      self.area['ymax'] -= legendHeight #scoot the drawing area up to fit the legend
      self.ctx.set_line_width(1.0)
      x = self.area['xmin']
      y = self.area['ymax'] + (2 * padding)
      n = 0
      xRight = self.area['xmax'] - self.area['xmin']
      yRight = y
      nRight = 0
      for (name,color,rightSide) in elements:
        self.setColor( color )
        if rightSide:
          nRight += 1
          self.drawRectangle(xRight - padding,yRight,boxSize,boxSize)
          self.setColor( 'darkgrey' )
          self.drawRectangle(xRight - padding,yRight,boxSize,boxSize,fill=False)
          self.setColor( self.foregroundColor )
          self.drawText(name, xRight - boxSize, yRight, align='right')
          xRight -= labelWidth
          if nRight % columns == 0:
            xRight = self.area['xmax'] - self.area['xmin']
            yRight += lineHeight
        else:
          n += 1
          self.drawRectangle(x,y,boxSize,boxSize)
          self.setColor( 'darkgrey' )
          self.drawRectangle(x,y,boxSize,boxSize,fill=False)
          self.setColor( self.foregroundColor )
          self.drawText(name, x + boxSize + padding, y, align='left')
          x += labelWidth
          if n % columns == 0:
            x = self.area['xmin']
            y += lineHeight
    else:
      extents = self.getExtents(longestName)
      boxSize = extents['maxHeight'] - 1
      lineHeight = extents['maxHeight'] + 1
      labelWidth = extents['width'] + 2 * (boxSize + padding)
      columns = math.floor( self.width / labelWidth )
      if columns < 1: columns = 1
      numberOfLines = math.ceil( float(len(elements)) / columns )
      legendHeight = (numberOfLines * lineHeight) + padding
      self.area['ymax'] -= legendHeight #scoot the drawing area up to fit the legend
      self.ctx.set_line_width(1.0)
      x = self.area['xmin']
      y = self.area['ymax'] + (2 * padding)
      for i,(name,color,rightSide) in enumerate(elements):
        if rightSide:
          self.setColor( color )
          self.drawRectangle(x + labelWidth + padding,y,boxSize,boxSize)
          self.setColor( 'darkgrey' )
          self.drawRectangle(x + labelWidth + padding,y,boxSize,boxSize,fill=False)
          self.setColor( self.foregroundColor )
          self.drawText(name, x + labelWidth, y, align='right')
          x += labelWidth
        else:
          self.setColor( color )
          self.drawRectangle(x,y,boxSize,boxSize)
          self.setColor( 'darkgrey' )
          self.drawRectangle(x,y,boxSize,boxSize,fill=False)
          self.setColor( self.foregroundColor )
          self.drawText(name, x + boxSize + padding, y, align='left')
          x += labelWidth
        if (i + 1) % columns == 0:
          x = self.area['xmin']
          y += lineHeight

  def encodeHeader(self,text):
    self.ctx.save()
    self.setColor( self.backgroundColor )
    self.ctx.move_to(-88,-88) # identifier
    for i, char in enumerate(text):
      self.ctx.line_to(-ord(char), -i-1)
    self.ctx.stroke()
    self.ctx.restore()

  def loadTemplate(self,template):
    conf = SafeConfigParser()
    if conf.read(settings.GRAPHTEMPLATES_CONF):
      defaults = defaultGraphOptions
      # If a graphTemplates.conf exists, read in
      # the values from it, but make sure that
      # all of the default values properly exist
      defaults.update(dict(conf.items('default')))
      if template in conf.sections():
        opts = dict( conf.items(template) )
      else:
        opts = defaults
    else:
      opts = defaults = defaultGraphOptions

    self.defaultBackground = opts.get('background', defaults['background'])
    self.defaultForeground = opts.get('foreground', defaults['foreground'])
    self.defaultMajorGridLineColor = opts.get('majorline', defaults['majorline'])
    self.defaultMinorGridLineColor = opts.get('minorline', defaults['minorline'])
    self.defaultColorList = [c.strip() for c in opts.get('linecolors', defaults['linecolors']).split(',')]
    fontName = opts.get('fontname', defaults['fontname'])
    fontSize = float( opts.get('fontsize', defaults['fontsize']) )
    fontBold = opts.get('fontbold', defaults['fontbold']).lower() == 'true'
    fontItalic = opts.get('fontitalic', defaults['fontitalic']).lower() == 'true'
    self.defaultFontParams = {
      'name' : self.params.get('fontName',fontName),
      'size' : int( self.params.get('fontSize',fontSize) ),
      'bold' : self.params.get('fontBold',fontBold),
      'italic' : self.params.get('fontItalic',fontItalic),
    }

  def output(self, fileObj):
    if self.outputFormat == 'png':
      self.surface.write_to_png(fileObj)
    elif self.outputFormat == 'pdf':
      self.surface.finish()
      pdfData = self.surfaceData.getvalue()
      self.surfaceData.close()
      fileObj.write(pdfData)
    else:
      if hasattr(self, 'startTime'):
        hasData = True
        metaData = {
          'x': {
            'start': self.startTime,
            'end': self.endTime
          },
          'options': {
            'lineWidth': self.lineWidth
          },
          'font': self.defaultFontParams,
          'area': self.area,
          'series': []
        }

        if not self.secondYAxis:
          metaData['y'] = {
            'top': self.yTop,
            'bottom': self.yBottom,
            'step': self.yStep,
            'labels': self.yLabels,
            'labelValues': self.yLabelValues
          }

        for series in self.data:
          if 'stacked' not in series.options:
            metaData['series'].append({
              'name': series.name,
              'start': series.start,
              'end': series.end,
              'step': series.step,
              'valuesPerPoint': series.valuesPerPoint,
              'color': series.color,
              'data': series,
              'options': series.options
            })
      else:
        hasData = False
        metaData = { }

      self.surface.finish()
      svgData = str(self.surfaceData.getvalue())
      self.surfaceData.close()

      svgData = svgData.replace('pt"', 'px"', 2) # we expect height/width in pixels, not points
      svgData = svgData.replace('</svg>\n', '', 1)
      svgData = svgData.replace('</defs>\n<g', '</defs>\n<g class="graphite"', 1)

      if hasData:
        # We encode headers using special paths with d^="M -88 -88"
        # Find these, and turn them into <g> wrappers instead
        def onHeaderPath(match):
          name = ''
          for char in re.findall(r'L -(\d+) -\d+', match.group(1)):
            name += chr(int(char))
          return '</g><g data-header="true" class="%s">' % name
        (svgData, subsMade) = re.subn(r'<path.+?d="M -88 -88 (.+?)"/>', onHeaderPath, svgData)

        # Replace the first </g><g> with <g>, and close out the last </g> at the end
        svgData = svgData.replace('</g><g data-header','<g data-header',1)
        if subsMade > 0:
          svgData += "</g>"
        svgData = svgData.replace(' data-header="true"','')

      fileObj.write(svgData.encode('utf-8'))
      fileObj.write(("""<script>
  <![CDATA[
    metadata = %s
  ]]>
</script>
</svg>""" % json.dumps(metaData)).encode('utf-8'))


class LineGraph(Graph):
  customizable = Graph.customizable + \
                 ('title','vtitle','lineMode','lineWidth','hideLegend', \
                  'hideAxes','minXStep','hideGrid','majorGridLineColor', \
                  'minorGridLineColor','thickness','min','max', \
                  'graphOnly','yMin','yMax','yLimit','yStep','areaMode', \
                  'areaAlpha','drawNullAsZero','tz', 'yAxisSide','pieMode', \
                  'yUnitSystem', 'logBase','yMinLeft','yMinRight','yMaxLeft', \
                  'yMaxRight', 'yLimitLeft', 'yLimitRight', 'yStepLeft', \
                  'yStepRight', 'rightWidth', 'rightColor', 'rightDashed', \
                  'leftWidth', 'leftColor', 'leftDashed', 'xFormat', 'minorY', \
                  'hideYAxis', 'uniqueLegend', 'vtitleRight', 'yDivisors', \
                  'connectedLimit', 'hideXAxis', 'hideNullFromLegend')
  validLineModes = ('staircase','slope','connected')
  validAreaModes = ('none','first','all','stacked')
  validPieModes = ('maximum', 'minimum', 'average')

  def drawGraph(self,**params):
    # Make sure we've got datapoints to draw
    if self.data:
      startTime = min([series.start for series in self.data])
      endTime = max([series.end for series in self.data])
      timeRange = endTime - startTime
    else:
      timeRange = None

    if not timeRange:
      x = self.width / 2
      y = self.height / 2
      self.setColor('red')
      self.setFont(size=math.log(self.width * self.height) )
      self.drawText("No Data", x, y, align='center')
      return

    # Determine if we're doing a 2 y-axis graph.
    for series in self.data:
      if 'secondYAxis' in series.options:
        self.dataRight.append(series)
      else:
        self.dataLeft.append(series)
    if len(self.dataRight) > 0:
      self.secondYAxis = True

    # API compatibility hacks
    if params.get('graphOnly',False):
      params['hideLegend'] = True
      params['hideGrid'] = True
      params['hideAxes'] = True
      params['hideXAxis'] = False
      params['hideYAxis'] = False
      params['yAxisSide'] = 'left'
      params['title'] = ''
      params['vtitle'] = ''
      params['margin'] = 0
      params['tz'] = ''
      self.margin = 0
      self.area['xmin'] = 0
      self.area['xmax'] = self.width
      self.area['ymin'] = 0
      self.area['ymax'] = self.height
    if 'yMin' not in params and 'min' in params:
      params['yMin'] = params['min']
    if 'yMax' not in params and 'max' in params:
      params['yMax'] = params['max']
    if 'lineWidth' not in params and 'thickness' in params:
      params['lineWidth'] = params['thickness']
    if 'yAxisSide' not in params:
      params['yAxisSide'] = 'left'
    if 'yUnitSystem' not in params:
      params['yUnitSystem'] = 'si'
    else:
      params['yUnitSystem'] = six.text_type(params['yUnitSystem']).lower()
      if params['yUnitSystem'] not in UnitSystems:
        params['yUnitSystem'] = 'si'

    self.params = params

    # Don't do any of the special right y-axis stuff if we're drawing 2 y-axes.
    if self.secondYAxis:
      params['yAxisSide'] = 'left'

    # When Y Axis is labeled on the right, we subtract x-axis positions from the max,
    # instead of adding to the minimum
    if self.params.get('yAxisSide') == 'right':
      self.margin = self.width

    # Now to setup our LineGraph specific options
    self.lineWidth = float( params.get('lineWidth', 1.2) )
    self.lineMode = params.get('lineMode','slope').lower()
    self.connectedLimit = params.get("connectedLimit", INFINITY)
    assert self.lineMode in self.validLineModes, "Invalid line mode!"
    self.areaMode = params.get('areaMode','none').lower()
    assert self.areaMode in self.validAreaModes, "Invalid area mode!"
    self.pieMode = params.get('pieMode', 'maximum').lower()
    assert self.pieMode in self.validPieModes, "Invalid pie mode!"

    # Line mode slope does not work (or even make sense) for series that have
    # only one datapoint. So if any series have one datapoint we force staircase mode.
    if self.lineMode == 'slope':
      for series in self.data:
        if len(series) == 1:
          self.lineMode = 'staircase'
          break

    if self.secondYAxis:
      for series in self.data:
        if 'secondYAxis' in series.options:
          if 'rightWidth' in params:
            series.options['lineWidth'] = params['rightWidth']
          if 'rightDashed' in params:
            series.options['dashed'] = params['rightDashed']
          if 'rightColor' in params:
            series.color = params['rightColor']
        else:
          if 'leftWidth' in params:
            series.options['lineWidth'] = params['leftWidth']
          if 'leftDashed' in params:
            series.options['dashed'] = params['leftDashed']
          if 'leftColor' in params:
            series.color = params['leftColor']

    for series in self.data:
      if not hasattr(series, 'color'):
        series.color = next(self.colors)

    titleSize = self.defaultFontParams['size'] + math.floor( math.log(self.defaultFontParams['size']) )
    self.setFont( size=titleSize )
    self.setColor( self.foregroundColor )

    if params.get('title'):
      self.drawTitle( six.text_type( unquote_plus(params['title']) ) )
    if params.get('vtitle'):
      self.drawVTitle( six.text_type( unquote_plus(params['vtitle']) ) )
    if self.secondYAxis and params.get('vtitleRight'):
      self.drawVTitle( six.text_type( unquote_plus(params['vtitleRight']) ), rightAlign=True )
    self.setFont()

    if not params.get('hideLegend', len(self.data) > settings.LEGEND_MAX_ITEMS):
      elements = []
      for series in self.data:
        if series.name:
          if not (params.get('hideNullFromLegend', False) and all(v is None for v in list(series))):
            elements.append((unquote_plus(series.name),series.color,series.options.get('secondYAxis')))
      if len(elements) > 0:
        self.drawLegend(elements, params.get('uniqueLegend', False))

    # Setup axes, labels, and grid
    # First we adjust the drawing area size to fit X-axis labels
    if not self.params.get('hideAxes',False) and not self.params.get('hideXAxis', False):
      self.area['ymax'] -= self.getExtents()['maxAscent'] * 2

    self.startTime = min([series.start for series in self.data])
    if self.lineMode == 'staircase':
      self.endTime = max([series.end for series in self.data])
    else:
      self.endTime = max([(series.end - series.step) for series in self.data])
    self.timeRange = self.endTime - self.startTime

    # Now we consolidate our data points to fit in the currently estimated drawing area
    self.consolidateDataPoints()

    self.encodeHeader('axes')

    # Now its time to fully configure the Y-axis and determine the space required for Y-axis labels
    # Since we'll probably have to squeeze the drawing area to fit the Y labels, we may need to
    # reconsolidate our data points, which in turn means re-scaling the Y axis, this process will
    # repeat until we have accurate Y labels and enough space to fit our data points
    currentXMin = self.area['xmin']
    currentXMax = self.area['xmax']

    if self.secondYAxis:
      self.setupTwoYAxes()
    else:
      self.setupYAxis()
    while currentXMin != self.area['xmin'] or currentXMax != self.area['xmax']: #see if the Y-labels require more space
      self.consolidateDataPoints() #this can cause the Y values to change
      currentXMin = self.area['xmin'] #so let's keep track of the previous Y-label space requirements
      currentXMax = self.area['xmax']
      if self.secondYAxis: #and recalculate their new requirements
        self.setupTwoYAxes()
      else:
        self.setupYAxis()

    # Now that our Y-axis is finalized, let's determine our X labels (this won't affect the drawing area)
    self.setupXAxis()

    if not self.params.get('hideAxes',False):
      self.drawLabels()
      if not self.params.get('hideGrid',False): #hideAxes implies hideGrid
        self.encodeHeader('grid')
        self.drawGridLines()

    # Finally, draw the graph lines
    self.encodeHeader('lines')
    self.drawLines()

  def drawVTitle(self, text, rightAlign=False):
    lineHeight = self.getExtents()['maxHeight']

    if rightAlign:
      self.encodeHeader('vtitleRight')
      x = self.area['xmax'] - lineHeight
      y = self.height / 2
      for line in text.split('\n'):
        self.drawText(line, x, y, align='center', valign='baseline', rotate=90)
        x -= lineHeight
      self.area['xmax'] = x - self.margin - lineHeight
    else:
      self.encodeHeader('vtitle')
      x = self.area['xmin'] + lineHeight
      y = self.height / 2
      for line in text.split('\n'):
        self.drawText(line, x, y, align='center', valign='baseline', rotate=270)
        x += lineHeight
      self.area['xmin'] = x + self.margin + lineHeight

  def getYCoord(self, value, side=None):
    if "left" == side:
      yLabelValues = self.yLabelValuesL
      yTop = self.yTopL
      yBottom = self.yBottomL
    elif "right" == side:
      yLabelValues = self.yLabelValuesR
      yTop = self.yTopR
      yBottom = self.yBottomR
    else:
      yLabelValues = self.yLabelValues
      yTop = self.yTop
      yBottom = self.yBottom

    try:
      highestValue = max(yLabelValues)
      lowestValue = min(yLabelValues)
    except ValueError:
      highestValue = yTop
      lowestValue = yBottom

    pixelRange = self.area['ymax'] - self.area['ymin']

    relativeValue = value - lowestValue
    valueRange = highestValue - lowestValue

    if self.logBase:
        if value <= 0:
            return None
        relativeValue = math.log(value, self.logBase) - math.log(lowestValue, self.logBase)
        valueRange = math.log(highestValue, self.logBase) - math.log(lowestValue, self.logBase)

    pixelToValueRatio = pixelRange / valueRange
    valueInPixels = pixelToValueRatio * relativeValue
    return self.area['ymax'] - valueInPixels


  def drawLines(self, width=None, dash=None, linecap='butt', linejoin='miter'):
    if not width: width = self.lineWidth
    self.ctx.set_line_width(width)
    originalWidth = width
    width = float(int(width) % 2) / 2
    if dash:
      self.ctx.set_dash(dash,1)
    else:
      self.ctx.set_dash([],0)
    self.ctx.set_line_cap({
      'butt' : cairo.LINE_CAP_BUTT,
      'round' : cairo.LINE_CAP_ROUND,
      'square' : cairo.LINE_CAP_SQUARE,
    }[linecap])
    self.ctx.set_line_join({
      'miter' : cairo.LINE_JOIN_MITER,
      'round' : cairo.LINE_JOIN_ROUND,
      'bevel' : cairo.LINE_JOIN_BEVEL,
    }[linejoin])

    # check whether there is an stacked metric
    singleStacked = False
    for series in self.data:
      if 'stacked' in series.options:
        singleStacked = True
    if singleStacked:
      self.data = sort_stacked(self.data)

    # stack the values
    if self.areaMode == 'stacked' and not self.secondYAxis: #TODO Allow stacked area mode with secondYAxis
      total = []
      for series in self.data:
        if 'drawAsInfinite' in series.options:
          continue

        series.options['stacked'] = True
        for i in range(len(series)):
          if len(total) <= i: total.append(0)

          if series[i] is not None:
            original = series[i]
            series[i] += total[i]
            total[i] += original
    elif self.areaMode == 'first':
      self.data[0].options['stacked'] = True
    elif self.areaMode == 'all':
      for series in self.data:
        if 'drawAsInfinite' not in series.options:
          series.options['stacked'] = True

    # apply alpha channel and create separate stroke series
    if self.params.get('areaAlpha'):
      try:
        alpha = float(self.params['areaAlpha'])
      except ValueError:
        alpha = 0.5
        pass

      strokeSeries = []
      for series in self.data:
        if 'stacked' in series.options:
          series.options['alpha'] = alpha

          newSeries = TimeSeries(series.name, series.start, series.end, series.step*series.valuesPerPoint, [x for x in series])
          newSeries.xStep = series.xStep
          newSeries.color = series.color
          if 'secondYAxis' in series.options:
            newSeries.options['secondYAxis'] = True
          strokeSeries.append(newSeries)
      self.data += strokeSeries

    # setup the clip region
    self.ctx.set_line_width(1.0)
    self.ctx.rectangle(self.area['xmin'], self.area['ymin'], self.area['xmax'] - self.area['xmin'], self.area['ymax'] - self.area['ymin'])
    self.ctx.clip()
    self.ctx.set_line_width(originalWidth)

    # save clip to restore once stacked areas are drawn
    self.ctx.save()
    clipRestored = False

    for series in self.data:

      if 'stacked' not in series.options:
        # stacked areas are always drawn first. if this series is not stacked, we finished stacking.
        # reset the clip region so lines can show up on top of the stacked areas.
        if not clipRestored:
          clipRestored = True
          self.ctx.restore()

      if 'lineWidth' in series.options:
        self.ctx.set_line_width(series.options['lineWidth'])

      if 'dashed' in series.options:
        self.ctx.set_dash([ series.options['dashed'] ], 1)
      else:
        self.ctx.set_dash([], 0)

      # Shift the beginning of drawing area to the start of the series if the
      # graph itself has a larger range
      missingPoints = (series.start - self.startTime) / series.step
      startShift = series.xStep * (missingPoints / series.valuesPerPoint)
      x = float(self.area['xmin']) + startShift + (self.lineWidth / 2.0)
      y = float(self.area['ymin'])

      startX = x

      if series.options.get('invisible'):
        self.setColor( series.color, 0, True )
      else:
        self.setColor( series.color, series.options.get('alpha') or 1.0 )

      # The number of preceding datapoints that had a None value.
      consecutiveNones = 0

      for index, value in enumerate(series):
        if value != value: # convert NaN to None
          value = None

        if value is None and self.params.get('drawNullAsZero'):
          value = 0.0

        if value is None:
          if consecutiveNones == 0:
            self.ctx.line_to(x, y)
            if 'stacked' in series.options: #Close off and fill area before unknown interval
              if self.secondYAxis:
                if 'secondYAxis' in series.options:
                  self.fillAreaAndClip(x, y, startX, self.getYCoord(0, "right"))
                else:
                  self.fillAreaAndClip(x, y, startX, self.getYCoord(0, "left"))
              else:
                self.fillAreaAndClip(x, y, startX, self.getYCoord(0))

          x += series.xStep
          consecutiveNones += 1

        else:
          if self.secondYAxis:
            if 'secondYAxis' in series.options:
              y = self.getYCoord(value, "right")
            else:
              y = self.getYCoord(value, "left")
          else:
            y = self.getYCoord(value)

          if y is None:
            value = None
          elif y < 0:
              y = 0

          if 'drawAsInfinite' in series.options and value > 0:
            self.ctx.move_to(x, self.area['ymax'])
            self.ctx.line_to(x, self.area['ymin'])
            self.ctx.stroke()
            x += series.xStep
            continue

          if consecutiveNones > 0:
            startX = x

          if self.lineMode == 'staircase':
            if consecutiveNones > 0:
              self.ctx.move_to(x, y)
            else:
              self.ctx.line_to(x, y)

            x += series.xStep
            self.ctx.line_to(x, y)

          elif self.lineMode == 'slope':
            if consecutiveNones > 0:
              self.ctx.move_to(x, y)

            self.ctx.line_to(x, y)
            x += series.xStep

          elif self.lineMode == 'connected':
            # If if the gap is larger than the connectedLimit or if this is the
            # first non-None datapoint in the series, start drawing from that datapoint.
            if consecutiveNones > self.connectedLimit or consecutiveNones == index:
               self.ctx.move_to(x, y)

            self.ctx.line_to(x, y)
            x += series.xStep

          consecutiveNones = 0

      if 'stacked' in series.options:
        if self.lineMode == 'staircase':
          xPos = x
        else:
          xPos = x-series.xStep
        if self.secondYAxis:
          if 'secondYAxis' in series.options:
            areaYFrom = self.getYCoord(0, "right")
          else:
            areaYFrom = self.getYCoord(0, "left")
        else:
          areaYFrom = self.getYCoord(0)

        self.fillAreaAndClip(xPos, y, startX, areaYFrom)

      else:
        self.ctx.stroke()

      self.ctx.set_line_width(originalWidth) # return to the original line width
      if 'dash' in series.options: # if we changed the dash setting before, change it back now
        if dash:
          self.ctx.set_dash(dash,1)
        else:
          self.ctx.set_dash([],0)

  def fillAreaAndClip(self, x, y, startX=None, areaYFrom=None):
    startX = (startX or self.area['xmin'])
    areaYFrom = (areaYFrom or self.area['ymax'])
    pattern = self.ctx.copy_path()

    # fill
    self.ctx.line_to(x, areaYFrom)                  # bottom endX
    self.ctx.line_to(startX, areaYFrom)             # bottom startX
    self.ctx.close_path()
    self.ctx.fill()

    # clip above y axis
    self.ctx.append_path(pattern)
    self.ctx.line_to(x, areaYFrom)                  # yZero endX
    self.ctx.line_to(self.area['xmax'], areaYFrom)  # yZero right
    self.ctx.line_to(self.area['xmax'], self.area['ymin'])  # top right
    self.ctx.line_to(self.area['xmin'], self.area['ymin'])  # top left
    self.ctx.line_to(self.area['xmin'], areaYFrom)  # yZero left
    self.ctx.line_to(startX, areaYFrom)             # yZero startX

    # clip below y axis
    self.ctx.line_to(x, areaYFrom)                  # yZero endX
    self.ctx.line_to(self.area['xmax'], areaYFrom)  # yZero right
    self.ctx.line_to(self.area['xmax'], self.area['ymax'])  # bottom right
    self.ctx.line_to(self.area['xmin'], self.area['ymax'])  # bottom left
    self.ctx.line_to(self.area['xmin'], areaYFrom)  # yZero left
    self.ctx.line_to(startX, areaYFrom)             # yZero startX
    self.ctx.close_path()
    self.ctx.clip()

  def consolidateDataPoints(self):
    numberOfPixels = self.graphWidth = self.area['xmax'] - self.area['xmin'] - (self.lineWidth + 1)
    for series in self.data:
      numberOfDataPoints = self.timeRange/series.step
      minXStep = float( self.params.get('minXStep',1.0) )
      divisor = self.timeRange / series.step
      bestXStep = numberOfPixels / divisor
      if bestXStep < minXStep:
        drawableDataPoints = int( numberOfPixels / minXStep )
        pointsPerPixel = math.ceil( float(numberOfDataPoints) / float(drawableDataPoints) )
        series.consolidate(pointsPerPixel)
        series.xStep = (numberOfPixels * pointsPerPixel) / numberOfDataPoints
      else:
        series.xStep = bestXStep

  def _adjustLimits(self, minValue, maxValue, minName, maxName, limitName):
    if maxName in self.params and self.params[maxName] != 'max':
      maxValue = self.params[maxName]

    if limitName in self.params and self.params[limitName] < maxValue:
      maxValue = self.params[limitName]

    if minName in self.params:
      minValue = self.params[minName]

    if maxValue <= minValue:
      maxValue = minValue + 1

    return (minValue, maxValue)

  def setupYAxis(self):
    (yMinValue, yMaxValue) = dataLimits(self.data,
                                        drawNullAsZero=self.params.get('drawNullAsZero'),
                                        stacked=(self.areaMode == 'stacked'))

    if self.logBase:
      yTics = _LogAxisTics(yMinValue, yMaxValue,
                           unitSystem=self.params.get('yUnitSystem'), base=self.logBase)
    else:
      yTics = _LinearAxisTics(yMinValue, yMaxValue,
                           unitSystem=self.params.get('yUnitSystem'))

    yTics.applySettings(axisMin=self.params.get('yMin'),
                        axisMax=self.params.get('yMax'),
                        axisLimit=self.params.get('yLimit'))

    if 'yStep' in self.params:
      yTics.setStep(self.params['yStep'])
    else:
      yDivisors = str(self.params.get('yDivisors', '4,5,6'))
      yDivisors = [int(d) for d in yDivisors.split(',')]
      binary = self.params.get('yUnitSystem') == 'binary'
      yTics.chooseStep(divisors=yDivisors, binary=binary)

    yTics.chooseLimits()

    # Copy the values we need back out of the yTics object:
    self.yStep = yTics.step
    self.yBottom = yTics.bottom
    self.yTop = yTics.top
    self.ySpan = yTics.span

    if not self.params.get('hideAxes', False):
      #Create and measure the Y-labels

      self.yLabelValues = yTics.getLabelValues()
      self.yLabels = [yTics.makeLabel(value) for value in self.yLabelValues]
      self.yLabelWidth = max([self.getExtents(label)['width'] for label in self.yLabels])

      if not self.params.get('hideYAxis'):
        if self.params.get('yAxisSide') == 'left':
          # Scoot the graph over to the left just enough to fit the y-labels:
          xMin = self.margin + (self.yLabelWidth * 1.02)
          if self.area['xmin'] < xMin:
            self.area['xmin'] = xMin
        else:
          # Scoot the graph over to the right just enough to fit the y-labels:
          xMin = 0
          xMax = self.margin - (self.yLabelWidth * 1.02)
          if self.area['xmax'] >= xMax:
            self.area['xmax'] = xMax
    else:
      self.yLabelValues = []
      self.yLabels = []
      self.yLabelWidth = 0.0

  def setupTwoYAxes(self):
    drawNullAsZero = self.params.get('drawNullAsZero')
    stacked = (self.areaMode == 'stacked')

    (yMinValueL, yMaxValueL) = dataLimits(self.dataLeft, drawNullAsZero, stacked)
    (yMinValueR, yMaxValueR) = dataLimits(self.dataRight, drawNullAsZero, stacked)

    # TODO: Allow separate bases for L & R Axes.
    if self.logBase:
      yTicsL = _LogAxisTics(yMinValueL, yMaxValueL,
                            unitSystem=self.params.get('yUnitSystem'), base=self.logBase)
      yTicsR = _LogAxisTics(yMinValueR, yMaxValueR,
                            unitSystem=self.params.get('yUnitSystem'), base=self.logBase)
    else:
      yTicsL = _LinearAxisTics(yMinValueL, yMaxValueL,
                               unitSystem=self.params.get('yUnitSystem'))
      yTicsR = _LinearAxisTics(yMinValueR, yMaxValueR,
                               unitSystem=self.params.get('yUnitSystem'))

    yTicsL.applySettings(axisMin=self.params.get('yMinLeft'),
                         axisMax=self.params.get('yMaxLeft'),
                         axisLimit=self.params.get('yLimitLeft'))
    yTicsR.applySettings(axisMin=self.params.get('yMinRight'),
                         axisMax=self.params.get('yMaxRight'),
                         axisLimit=self.params.get('yLimitRight'))

    yDivisors = str(self.params.get('yDivisors', '4,5,6'))
    yDivisors = [int(d) for d in yDivisors.split(',')]
    binary = self.params.get('yUnitSystem') == 'binary'

    if 'yStepLeft' in self.params:
      yTicsL.setStep(self.params['yStepLeft'])
    else:
      yTicsL.chooseStep(divisors=yDivisors, binary=binary)

    if 'yStepRight' in self.params:
      yTicsR.setStep(self.params['yStepRight'])
    else:
      yTicsR.chooseStep(divisors=yDivisors, binary=binary)

    yTicsL.chooseLimits()
    yTicsR.chooseLimits()

    # Copy the values we need back out of the yTics objects:
    self.yStepL = yTicsL.step
    self.yBottomL = yTicsL.bottom
    self.yTopL = yTicsL.top
    self.ySpanL = yTicsL.span

    self.yStepR = yTicsR.step
    self.yBottomR = yTicsR.bottom
    self.yTopR = yTicsR.top
    self.ySpanR = yTicsR.span

    #Create and measure the Y-labels
    self.yLabelValuesL = yTicsL.getLabelValues()
    self.yLabelValuesR = yTicsR.getLabelValues()

    self.yLabelsL = [yTicsL.makeLabel(value) for value in self.yLabelValuesL]
    self.yLabelsR = [yTicsR.makeLabel(value) for value in self.yLabelValuesR]

    self.yLabelWidthL = max([self.getExtents(label)['width'] for label in self.yLabelsL])
    self.yLabelWidthR = max([self.getExtents(label)['width'] for label in self.yLabelsR])
    #scoot the graph over to the left just enough to fit the y-labels

    #xMin = self.margin + self.margin + (self.yLabelWidthL * 1.02)
    xMin = self.margin + (self.yLabelWidthL * 1.02)
    if self.area['xmin'] < xMin:
      self.area['xmin'] = xMin
    #scoot the graph over to the right just enough to fit the y-labels
    xMax = self.width - (self.yLabelWidthR * 1.02)
    if self.area['xmax'] >= xMax:
      self.area['xmax'] = xMax

  def setupXAxis(self):
    if self.userTimeZone:
      tzinfo = pytz.timezone(self.userTimeZone)
    else:
      tzinfo = pytz.timezone(settings.TIME_ZONE)

    self.start_dt = datetime.fromtimestamp(self.startTime, tzinfo)
    self.end_dt = datetime.fromtimestamp(self.endTime, tzinfo)

    secondsPerPixel = float(self.timeRange) / float(self.graphWidth)
    self.xScaleFactor = float(self.graphWidth) / float(self.timeRange) #pixels per second

    potential = [c for c in xAxisConfigs if c['seconds'] <= secondsPerPixel and c.get('maxInterval', self.timeRange + 1) >= self.timeRange]
    if potential:
      self.xConf = potential[-1]
    else:
      self.xConf = xAxisConfigs[-1]

    self.xLabelStep = self.xConf['labelUnit'] * self.xConf['labelStep']
    self.xMinorGridStep = self.xConf['minorGridUnit'] * self.xConf['minorGridStep']
    self.xMajorGridStep = self.xConf['majorGridUnit'] * self.xConf['majorGridStep']


  def drawLabels(self):
    # Draw the Y-labels
    if not self.params.get('hideYAxis'):
      if not self.secondYAxis:
        for value,label in zip(self.yLabelValues,self.yLabels):
          if self.params.get('yAxisSide') == 'left':
            x = self.area['xmin'] - (self.yLabelWidth * 0.02)
          else:
            x = self.area['xmax'] + (self.yLabelWidth * 0.02) #Inverted for right side Y Axis

          y = self.getYCoord(value)
          if y is None:
              value = None
          elif y < 0:
              y = 0

          if self.params.get('yAxisSide') == 'left':
            self.drawText(label, x, y, align='right', valign='middle')
          else:
            self.drawText(label, x, y, align='left', valign='middle') #Inverted for right side Y Axis
      else: # Draws a right side and a Left side axis
        for valueL,labelL in zip(self.yLabelValuesL,self.yLabelsL):
          xL = self.area['xmin'] - (self.yLabelWidthL * 0.02)
          yL = self.getYCoord(valueL, "left")
          if yL is None:
            value = None
          elif yL < 0:
            yL = 0
          self.drawText(labelL, xL, yL, align='right', valign='middle')

          ### Right Side
        for valueR,labelR in zip(self.yLabelValuesR,self.yLabelsR):
          xR = self.area['xmax'] + (self.yLabelWidthR * 0.02) + 3 #Inverted for right side Y Axis
          yR = self.getYCoord(valueR, "right")
          if yR is None:
            valueR = None
          elif yR < 0:
            yR = 0
          self.drawText(labelR, xR, yR, align='left', valign='middle') #Inverted for right side Y Axis

    if not self.params.get('hideXAxis'):
      (dt, x_label_delta) = find_x_times(self.start_dt, self.xConf['labelUnit'], self.xConf['labelStep'])

      # Draw the X-labels
      xFormat = self.params.get('xFormat', self.xConf['format'])
      while dt < self.end_dt:
        label = dt.strftime(xFormat)
        x = self.area['xmin'] + (toSeconds(dt - self.start_dt) * self.xScaleFactor)
        y = self.area['ymax'] + self.getExtents()['maxAscent']
        self.drawText(label, x, y, align='center', valign='top')
        dt += x_label_delta

  def drawGridLines(self):
    # Not sure how to handle this for 2 y-axes
    # Just using the left side info for the grid.

    # Horizontal grid lines
    leftSide = self.area['xmin']
    rightSide = self.area['xmax']
    labels = []
    if self.secondYAxis:
      labels = self.yLabelValuesL
    else:
      labels = self.yLabelValues

    for i, value in enumerate(labels):
      self.ctx.set_line_width(0.4)
      self.setColor( self.params.get('majorGridLineColor',self.defaultMajorGridLineColor) )

      if self.secondYAxis:
        y = self.getYCoord(value,"left")
      else:
        y = self.getYCoord(value)

      if y is None or y < 0:
          continue
      self.ctx.move_to(leftSide, y)
      self.ctx.line_to(rightSide, y)
      self.ctx.stroke()

      # draw minor gridlines if this isn't the last label
      if self.minorY >= 1 and i < (len(labels) - 1):
        # in case graphite supports inverted Y axis now or someday
        (valueLower, valueUpper) = sorted((value, labels[i+1]))

        # each minor gridline is 1/minorY apart from the nearby gridlines.
        # we calculate that distance, for adding to the value in the loop.
        distance = ((valueUpper - valueLower) / float(1 + self.minorY))

        # starting from the initial valueLower, we add the minor distance
        # for each minor gridline that we wish to draw, and then draw it.
        for minor in range(self.minorY):
          self.ctx.set_line_width(0.3)
          self.setColor( self.params.get('minorGridLineColor',self.defaultMinorGridLineColor) )

          # the current minor gridline value is halfway between the current and next major gridline values
          value = (valueLower + ((1+minor) * distance))

          if self.logBase:
            yTopFactor = self.logBase * self.logBase
          else:
            yTopFactor = 1

          if self.secondYAxis:
            if value >= (yTopFactor * self.yTopL):
              continue
          else:
            if value >= (yTopFactor * self.yTop):
              continue

          if self.secondYAxis:
            y = self.getYCoord(value,"left")
          else:
            y = self.getYCoord(value)
          if y is None or y < 0:
              continue

          self.ctx.move_to(leftSide, y)
          self.ctx.line_to(rightSide, y)
          self.ctx.stroke()

    # Vertical grid lines
    top = self.area['ymin']
    bottom = self.area['ymax']

    # First we do the minor grid lines (majors will paint over them)
    self.ctx.set_line_width(0.25)
    self.setColor( self.params.get('minorGridLineColor',self.defaultMinorGridLineColor) )
    (dt, x_minor_delta) = find_x_times(self.start_dt, self.xConf['minorGridUnit'], self.xConf['minorGridStep'])

    while dt < self.end_dt:
      x = self.area['xmin'] + (toSeconds(dt - self.start_dt) * self.xScaleFactor)

      if x < self.area['xmax']:
        self.ctx.move_to(x, bottom)
        self.ctx.line_to(x, top)
        self.ctx.stroke()

      dt += x_minor_delta

    # Now we do the major grid lines
    self.ctx.set_line_width(0.33)
    self.setColor( self.params.get('majorGridLineColor',self.defaultMajorGridLineColor) )
    (dt, x_major_delta) = find_x_times(self.start_dt, self.xConf['majorGridUnit'], self.xConf['majorGridStep'])

    while dt < self.end_dt:
      x = self.area['xmin'] + (toSeconds(dt - self.start_dt) * self.xScaleFactor)

      if x < self.area['xmax']:
        self.ctx.move_to(x, bottom)
        self.ctx.line_to(x, top)
        self.ctx.stroke()

      dt += x_major_delta

    # Draw side borders for our graph area
    self.ctx.set_line_width(0.5)
    self.ctx.move_to(self.area['xmax'], bottom)
    self.ctx.line_to(self.area['xmax'], top)
    self.ctx.move_to(self.area['xmin'], bottom)
    self.ctx.line_to(self.area['xmin'], top)
    self.ctx.stroke()



class PieGraph(Graph):
  customizable = Graph.customizable + \
                 ('title','valueLabels','valueLabelsMin','hideLegend','pieLabels','areaAlpha','valueLabelsColor')
  validValueLabels = ('none','number','percent')

  def drawGraph(self,**params):
    self.pieLabels = params.get('pieLabels', 'horizontal')
    self.total = sum( [t[1] for t in self.data] )

    if not self.data:
      x = self.width / 2
      y = self.height / 2
      self.setColor('red')
      self.setFont(size=math.log(self.width * self.height) )
      self.drawText("No Data", x, y, align='center')
      return

    if self.params.get('areaAlpha'):
      try:
        self.alpha = float(self.params['areaAlpha'])
      except ValueError:
        self.alpha = 1.0
        pass
    else:
      self.alpha = 1.0

    self.slices = []
    for name,value in self.data:
      self.slices.append({
        'name' : name,
        'value' : value,
        'percent' : value / self.total,
        'color' : next(self.colors),
        'alpha' : self.alpha,
      })

    titleSize = self.defaultFontParams['size'] + math.floor( math.log(self.defaultFontParams['size']) )
    self.setFont( size=titleSize )
    self.setColor( self.foregroundColor )
    if params.get('title'):
      self.drawTitle( unquote_plus(params['title']) )
    self.setFont()

    if not params.get('hideLegend',False):
      elements = [ (slice['name'],slice['color'],None) for slice in self.slices ]
      if len(elements) > 0:
        self.drawLegend(elements)

    self.drawSlices()

    if params.get('valueLabelsColor'):
      self.valueLabelsColor = params.get('valueLabelsColor')
    else:
      self.valueLabelsColor = 'black'

    self.valueLabelsMin = float( params.get('valueLabelsMin',5) )
    self.valueLabels = params.get('valueLabels','percent')
    assert self.valueLabels in self.validValueLabels, \
    "valueLabels=%s must be one of %s" % (self.valueLabels,self.validValueLabels)
    if self.valueLabels != 'none':
      self.drawLabels()

  def drawSlices(self):
    theta = 3.0 * math.pi / 2.0
    halfX = (self.area['xmax'] - self.area['xmin']) / 2.0
    halfY = (self.area['ymax'] - self.area['ymin']) / 2.0
    self.x0 = x0 = self.area['xmin'] + halfX
    self.y0 = y0 = self.area['ymin'] + halfY
    self.radius = radius = min(halfX,halfY) * 0.95
    for slice in self.slices:
      self.setColor( slice['color'], slice['alpha'] )
      self.ctx.move_to(x0,y0)
      phi = theta + (2 * math.pi) * slice['percent']
      self.ctx.arc( x0, y0, radius, theta, phi )
      self.ctx.line_to(x0,y0)
      self.ctx.fill()
      slice['midAngle'] = (theta + phi) / 2.0
      slice['midAngle'] %= 2.0 * math.pi
      theta = phi

  def drawLabels(self):
    self.setFont()
    self.setColor( self.valueLabelsColor )
    for slice in self.slices:
      if self.valueLabels == 'percent':
        if (slice['percent'] * 100.0) < self.valueLabelsMin: continue
        label = "%%%.2f" % (slice['percent'] * 100.0)
      elif self.valueLabels == 'number':
        if slice['value'] < self.valueLabelsMin: continue
        if slice['value'] < 10 and slice['value'] != int(slice['value']):
          label = "%.2f" % slice['value']
        else:
          label = six.text_type(int(slice['value']))
      theta = slice['midAngle']
      x = self.x0 + (self.radius / 2.0 * math.cos(theta))
      y = self.y0 + (self.radius / 2.0 * math.sin(theta))

      if self.pieLabels == 'rotated':
        if theta > (math.pi / 2.0) and theta <= (3.0 * math.pi / 2.0):
          theta -= math.pi
        self.drawText( label, x, y, align='center', valign='middle', rotate=math.degrees(theta) )
      else:
        self.drawText( label, x, y, align='center', valign='middle')


GraphTypes = {
  'line' : LineGraph,
  'pie' : PieGraph,
}


# Convenience functions
def toSeconds(t):
  return (t.days * 86400) + t.seconds


def safeArgs(args):
  """Iterate over valid, finite values in an iterable.

  Skip any items that are None, NaN, or infinite.
  """

  return (arg for arg in args
          if arg is not None and not math.isnan(arg) and not math.isinf(arg))


def safeMin(args):
  args = list(safeArgs(args))
  if args:
    return min(args)


def safeMax(args):
  args = list(safeArgs(args))
  if args:
    return max(args)


def safeSum(values):
  return sum(safeArgs(values))


def any(args):
  for arg in args:
    if arg:
      return True
  return False


def dataLimits(data, drawNullAsZero=False, stacked=False):
  """Return the range of values in data as (yMinValue, yMaxValue).

  data is an array of TimeSeries objects.
  """

  missingValues = any(None in series for series in data)
  finiteData = [series for series in data if not series.options.get('drawAsInfinite')]

  yMinValue = safeMin(safeMin(series) for series in finiteData)

  if yMinValue is None:
    # This can only happen if there are no valid, non-infinite data.
    return (0.0, 1.0)

  if yMinValue > 0.0 and drawNullAsZero and missingValues:
    yMinValue = 0.0

  if stacked:
    length = safeMin(len(series) for series in finiteData)
    sumSeries = []

    for i in range(0, length):
      sumSeries.append( safeSum(series[i] for series in finiteData) )
    yMaxValue = safeMax( sumSeries )
  else:
    yMaxValue = safeMax(safeMax(series) for series in finiteData)

  if yMaxValue < 0.0 and drawNullAsZero and missingValues:
    yMaxValue = 0.0

  return (yMinValue, yMaxValue)


def sort_stacked(series_list):
  stacked = [s for s in series_list if 'stacked' in s.options]
  not_stacked = [s for s in series_list if 'stacked' not in s.options]
  return stacked + not_stacked


def format_units(v, step=None, system='si', units=None):
  """Format the given value in standardized units.

  ``system`` is either 'binary' or 'si'

  For more info, see:
    http://en.wikipedia.org/wiki/SI_prefix
    http://en.wikipedia.org/wiki/Binary_prefix
  """

  if v is None:
    return v, ''

  if step is None:
    condition = lambda size: abs(v) >= size
  else:
    condition = lambda size: abs(v) >= size and step >= size

  for prefix, size in UnitSystems[system]:
    if condition(size):
      v2 = v / size
      if (v2 - math.floor(v2)) < 0.00000000001 and v > 1:
        v2 = float(math.floor(v2))
      if units:
        prefix = "%s%s" % (prefix, units)
      return v2, prefix

  if (v - math.floor(v)) < 0.00000000001 and v > 1 :
    v = float(math.floor(v))
  if units:
    prefix = units
  else:
    prefix = ''
  return v, prefix


def find_x_times(start_dt, unit, step):
  if not isinstance(start_dt, datetime):
    raise ValueError("Invalid start_dt: %s" % start_dt)
  if not isinstance(step, int) or not step > 0:
    if not isinstance(step, float) or unit != DAY or not step > 0.0:
      raise ValueError("Invalid step value: %s" % step)

  if unit == SEC:
    dt = start_dt.replace(second=start_dt.second - (start_dt.second % step))
    x_delta = timedelta(seconds=step)

  elif unit == MIN:
    dt = start_dt.replace(second=0, minute=start_dt.minute - (start_dt.minute % step))
    x_delta = timedelta(minutes=step)

  elif unit == HOUR:
    dt = start_dt.replace(second=0, minute=0, hour=start_dt.hour - (start_dt.hour % step))
    x_delta = timedelta(hours=step)

  elif unit == DAY:
    dt = start_dt.replace(second=0, minute=0, hour=0)
    x_delta = timedelta(days=step)

  else:
    raise ValueError("Invalid unit: %s" % unit)

  while dt < start_dt:
    dt += x_delta

  return (dt, x_delta)
