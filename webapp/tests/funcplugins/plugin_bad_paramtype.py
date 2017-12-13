from graphite.functions.params import Param, ParamTypes

def test(seriesList):
  """This is a test function"""
  return seriesList

test.group = 'Test'
test.params = [
  Param('seriesList', ParamTypes.bad, required=True),
]

SeriesFunctions = {
  'testFunc': test,
}
