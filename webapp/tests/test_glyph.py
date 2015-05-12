from django.test import TestCase

from graphite.render.glyph import format_units

class GlyphTest(TestCase):
    def test_format_units_in_ms(self):
    	fmt = 'time-ms'
    	self.assertEqual(format_units(1537, None, fmt), (1.0, 's'))
    	self.assertEqual(format_units(537, 10000, fmt), (537, 'ms'))
    	self.assertEqual(format_units(1000*60, None, fmt), (1.0, 'm'))
    	self.assertEqual(format_units(1000*60*12, None, fmt), (12.0, 'm'))
    	self.assertEqual(format_units(1000*60*60*14, None, fmt), (14, 'h'))
    	self.assertEqual(format_units(1000*60*60*24*2, None, fmt), (2, 'd'))
    	self.assertEqual(format_units(1000*60*60*24*366, None, fmt), (1, 'y'))