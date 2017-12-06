def test(seriesList):
  """This is a test function"""
  return seriesList

test.group = 'Test'
test.params = [
  {
    'name': 'seriesList',
    'type': 'seriesList',
    'required': True,
  },
]

SeriesFunctions = {
  'testFunc': test,
}
