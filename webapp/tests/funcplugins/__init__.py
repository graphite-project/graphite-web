from unittest import TestSuite

def load_tests(loader, standard_tests, pattern):
  """Prevent unittest from trying to automatically load files in this directory"""
  return TestSuite()
