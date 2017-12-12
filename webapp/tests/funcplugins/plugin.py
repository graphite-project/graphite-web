from graphite.functions.params import Param, ParamTypes

def test(seriesList):
  """This is a test function"""
  return seriesList

test.group = 'Test'
test.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
]

SeriesFunctions = {
  'testFunc': test,
}

def pieTest(series):
  """This is a test pie function"""
  return max(series)

pieTest.group = 'Test'
pieTest.params = [
  Param('series', ParamTypes.series, required=True),
]

PieFunctions = {
  'testFunc': pieTest,
}
