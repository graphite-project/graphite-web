from graphite.functions.params import Param, ParamTypes

def test(seriesList):
  """This is a test function"""
  return seriesList

test.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
]

SeriesFunctions = {
  'testFunc': test,
}
