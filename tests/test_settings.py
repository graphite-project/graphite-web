from __setup import TestCase

class TestLogger(TestCase):

    def test_setup_storage_variables(self):
        from graphite import settings
        settings.setup_storage_variables("dummy")
        self.assertEqual(settings.INDEX_FILE, "dummy/index")
        self.assertEqual(settings.CERES_DIR, "dummy/ceres")
        self.assertEqual(settings.WHISPER_DIR, "dummy/whisper")
        self.assertEqual(settings.STANDARD_DIRS, ["dummy/whisper"])
