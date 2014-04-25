from unittest import TestCase

class QueryTestCase(TestCase):
    def test_query(self):
        from graphite import query
        data = query.eval_qs("format=raw&target=localhost.Disks_Stats.sda_rKB_by_sec")

