from graphite.functions.params import Param

def test(seriesList):
  """This is a test function"""
  return seriesList

test.group = 'Test'
test.params = [
  Param('seriesList', 'bad', required=True),
]

SeriesFunctions = {
  'testFunc': test,
}
