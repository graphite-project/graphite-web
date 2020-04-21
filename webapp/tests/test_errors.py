from .base import TestCase

from graphite.errors import InputParameterError


class ErrorTest(TestCase):
    def test_input_parameter_error_basic(self):
        e = InputParameterError('exception details')
        self.assertEqual(
            str(e),
            'Invalid parameters (exception details)',
        )

    def test_input_parameter_error_with_func(self):
        e = InputParameterError('exception details')
        e.setFunction('test_func', [], {})
        self.assertEqual(
            str(e),
            'Invalid parameters (exception details); func: "test_func()"',
        )

    def test_input_parameter_error_with_func_and_args(self):
        e = InputParameterError('exception details')
        e.setFunction('test_func', [1, 'a'], {})
        self.assertEqual(
            str(e),
            'Invalid parameters (exception details); func: "test_func(1, \'a\')"',
        )

    def test_input_parameter_error_with_func_and_kwargs(self):
        e = InputParameterError('exception details')
        e.setFunction('test_func', [], {'a': 1, 'b': 'b'})
        self.assertEqual(
            str(e),
            'Invalid parameters (exception details); func: "test_func(a=1, b=\'b\')"',
        )

    def test_input_parameter_error_with_func_args_kwargs(self):
        e = InputParameterError('exception details')
        e.setFunction('test_func', [3, 'd'], {'a': 1, 'b': 'b'})
        self.assertEqual(
            str(e),
            'Invalid parameters (exception details); func: "test_func(3, \'d\', a=1, b=\'b\')"',
        )

    def test_input_parameter_error_with_target(self):
        e = InputParameterError('exception details')
        e.setTargets(['some_func(a.b.c)'])
        self.assertEqual(
            str(e),
            'Invalid parameters (exception details); targets: "some_func(a.b.c)"',
        )

    def test_input_parameter_error_with_multiple_targets(self):
        e = InputParameterError('exception details')
        e.setTargets(['some_func(a.b.c)', 'otherfunc(c.b.a)'])
        self.assertEqual(
            str(e),
            'Invalid parameters (exception details); targets: "some_func(a.b.c), otherfunc(c.b.a)"',
        )

    def test_input_parameter_error_with_grafana_org_id(self):
        e = InputParameterError('exception details')
        e.setSourceIdHeaders({'X-GRAFANA-ORG-ID': 3})
        self.assertEqual(
            str(e),
            'Invalid parameters (exception details); source: "X-GRAFANA-ORG-ID: 3"',
        )

    def test_input_parameter_error_with_dashboard_id(self):
        e = InputParameterError('exception details')
        e.setSourceIdHeaders({'X-DASHBOARD-ID': 'abcde123'})
        self.assertEqual(
            str(e),
            'Invalid parameters (exception details); source: "X-DASHBOARD-ID: abcde123"',
        )

    def test_input_parameter_error_with_panel_id(self):
        e = InputParameterError('exception details')
        e.setSourceIdHeaders({'X-PANEL-ID': 12})
        self.assertEqual(
            str(e),
            'Invalid parameters (exception details); source: "X-PANEL-ID: 12"',
        )

    def test_input_parameter_error_with_all_source_id(self):
        e = InputParameterError('exception details')
        e.setSourceIdHeaders({'X-GRAFANA-ORG-ID': 25, 'X-DASHBOARD-ID': 12})
        e.setSourceIdHeaders({'X-PANEL-ID': 3})
        self.assertEqual(
            str(e),
            'Invalid parameters (exception details); source: "X-DASHBOARD-ID: 12, X-GRAFANA-ORG-ID: 25, X-PANEL-ID: 3"',
        )

    def test_input_parameter_error_with_all_properties(self):
        e = InputParameterError('exception details')
        e.setSourceIdHeaders({'X-DASHBOARD-ID': 'a'})
        e.setSourceIdHeaders({'X-GRAFANA-ORG-ID': 'b'})
        e.setSourceIdHeaders({'X-PANEL-ID': 'c'})
        e.setTargets(['some(target, extra="value")'])
        e.setFunction('some', ['target'], {'extra': 'value'})
        self.assertEqual(
            str(e),
            'Invalid parameters (exception details)'
            '; targets: "some(target, extra="value")"'
            '; source: "X-DASHBOARD-ID: a, X-GRAFANA-ORG-ID: b, X-PANEL-ID: c"'
            '; func: "some(\'target\', extra=\'value\')"'
        )
