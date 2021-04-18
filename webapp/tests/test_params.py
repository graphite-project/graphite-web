import unittest

from graphite.errors import InputParameterError
from graphite.functions.params import Param, ParamTypes, validateParams


class TestParam(unittest.TestCase):
    params = [
        Param('one', ParamTypes.string, required=True),
        Param('two', ParamTypes.string, required=True),
        Param('three', ParamTypes.string, required=True),
    ]

    def test_simple_args(self):
        self.assertEqual(validateParams(
            'TestParam',
            self.params,
            ['arg1', 'arg2', 'arg3'],
            {}),
            (['arg1', 'arg2', 'arg3'], {}),
        )

        self.assertRaises(
            InputParameterError,
            validateParams,
            'TestParam',
            self.params,
            ['arg1', 'arg2'],
            {},
        )

    def test_simple_kwargs(self):
        self.assertEqual(validateParams(
            'TestParam',
            self.params,
            [],
            {'one': '1', 'two': '2', 'three': '3'}),
            ([], {'one': '1', 'two': '2', 'three': '3'}),
        )

        self.assertRaises(
            InputParameterError,
            validateParams,
            'TestParam',
            self.params,
            [],
            {'one': '1', 'two': '2'},
        )

        self.assertRaises(
            InputParameterError,
            validateParams,
            'TestParam',
            self.params,
            [],
            {'one': '1', 'two': '2', 'four': '4'},
        )

    def test_mixed_cases(self):
        self.assertEqual(validateParams(
            'TestParam',
            self.params,
            ['one', 'two'],
            {'three': '3'}),
            (['one', 'two'],
            {'three': '3'})
        )

        self.assertEqual(validateParams(
            'TestParam',
            self.params,
            ['one'],
            {'three': '3', 'two': '2'}),
            (['one'], {'three': '3', 'two': '2'}),
        )

        # positional args don't check the name
        self.assertEqual(validateParams(
            'TestParam',
            self.params,
            ['one', 'two', 'four'],
            {}),
            (['one', 'two', 'four'], {})
        )

        self.assertRaises(
            InputParameterError,
            validateParams,
            'TestParam',
            self.params,
            [],
            {'three': '3', 'two': '2'},
        )

        self.assertRaises(
            InputParameterError,
            validateParams,
            'TestParam',
            self.params,
            ['one', 'three'],
            {'two': '2'},
        )

        self.assertRaises(
            InputParameterError,
            validateParams,
            'TestParam',
            self.params,
            ['three'],
            {'one': '1', 'two': '2'},
        )

    def test_repeated_args(self):
        self.assertRaises(
            InputParameterError,
            validateParams,
            'TestParam',
            self.params,
            ['one'],
            {'three': '3', 'one': '1'},
        )

        self.assertRaises(
            InputParameterError,
            validateParams,
            'TestParam',
            self.params,
            ['one', 'two'],
            {'three': '3', 'two': '2'},
        )

        self.assertRaises(
            InputParameterError,
            validateParams,
            'TestParam',
            self.params,
            ['one', 'two', 'three'],
            {'one': '1'},
        )

    def test_multiple_property(self):
        self.assertRaises(
            InputParameterError,
            validateParams,
            'TestParam',
            [
                Param('one', ParamTypes.string, required=True),
                Param('two', ParamTypes.string, required=True),
                Param('three', ParamTypes.string, required=True, multiple=False),
            ],
            ['one', 'two', 'three', 'four'],
            {},
        )

        self.assertEqual(validateParams(
            'TestParam',
            [
                Param('one', ParamTypes.string, required=True),
                Param('two', ParamTypes.string, required=True),
                Param('three', ParamTypes.string, required=True, multiple=True),
            ],
            ['one', 'two', 'three', 'four'],
            {}),
            (['one', 'two', 'three', 'four'], {}),
        )

        self.assertRaises(
            InputParameterError,
            validateParams,
            'TestParam',
            [
                Param('one', ParamTypes.string, required=True),
                Param('two', ParamTypes.string, required=True),
                Param('three', ParamTypes.string, required=True, multiple=True),
            ],
            ['one', 'two', 'three'],
            # should fail because parameters which are specified multiple times
            # cannot be in kwargs, only args
            {'three': '3'},
        )

    def test_options_property(self):
        self.assertEqual(validateParams(
            'TestParam',
            [
                Param('one', ParamTypes.string, required=True),
                Param('two', ParamTypes.string, required=True),
                Param('three', ParamTypes.string, required=True, options=['3', 'three']),
            ],
            ['one', 'two', '3'],
            {}),
            (['one', 'two', '3'], {}),
        )

        self.assertEqual(validateParams(
            'TestParam',
            [
                Param('one', ParamTypes.string, required=True),
                Param('two', ParamTypes.string, required=True),
                Param('three', ParamTypes.string, required=True, options=['3', 'three']),
            ],
            ['one', 'two', 'three'],
            {}),
            (['one', 'two', 'three'], {}),
        )

        self.assertRaises(
            InputParameterError,
            validateParams,
            'TestParam',
            [
                Param('one', ParamTypes.string, required=True),
                Param('two', ParamTypes.string, required=True),
                Param('three', ParamTypes.string, required=True, options=['3', 'three']),
            ],
            ['one', 'two', 'four'],
            {},
        )

    def test_use_series_function_as_aggregator(self):
        # powSeries is a series function which is marked as a valid aggregator
        self.assertEqual(validateParams(
            'TestParam',
            [
                Param('func', ParamTypes.aggOrSeriesFunc, required=True),
            ],
            ['powSeries'],
            {}),
            (['powSeries'], {}),
        )

        # squareRoot is a series function which is not marked as a valid aggregator
        self.assertRaises(
            InputParameterError,
            validateParams,
            'TestParam',
            [
                Param('func', ParamTypes.aggOrSeriesFunc, required=True),
            ],
            ['squareRoot'],
            {},
        )

    def test_param_type_int_or_inf(self):
        self.assertEqual(validateParams(
            'TestParam',
            [Param('param', ParamTypes.intOrInf)],
            [1],
            {}),
            ([1], {}),
        )

        self.assertEqual(validateParams(
            'TestParam',
            [Param('param', ParamTypes.intOrInf)],
            [float('inf')],
            {}),
            ([float('inf')], {}),
        )

        self.assertRaises(
            InputParameterError,
            validateParams,
            'TestParam',
            [Param('param', ParamTypes.intOrInf)],
            [1.2],
            {},
        )

    def test_unexpected_kwargs(self):
        self.assertRaises(
            InputParameterError,
            validateParams,
            'TestParam',
            [Param('param', ParamTypes.integer)],
            [],
            {'param': 1, 'param2': 2},
        )

    def test_default_value(self):
        # if no value is specified, but there is a default value, we don't
        # want the validator to raise an exception because 'None' is invalid
        self.assertEqual(validateParams(
            'TestParam',
            [
                Param('one', ParamTypes.aggFunc, default='sum'),
            ],
            [],
            {}),
            ([], {}),
        )

    def test_various_type_conversions(self):
        self.assertEqual(validateParams(
            'TestParam',
            [
                Param('bool', ParamTypes.boolean),
            ],
            ['true'],
            {}),
            ([True], {}),
        )

        self.assertEqual(validateParams(
            'TestParam',
            [
                Param('bool', ParamTypes.boolean),
            ],
            [],
            {'bool': 'false'}),
            ([], {'bool': False}),
        )

        self.assertEqual(validateParams(
            'TestParam',
            [
                Param('bool1', ParamTypes.boolean),
                Param('bool2', ParamTypes.boolean),
            ],
            [0],
            {'bool2': 1}),
            ([False], {'bool2': True}),
        )

        self.assertEqual(validateParams(
            'TestParam',
            [
                Param('float', ParamTypes.float),
            ],
            ['1e3'],
            {}),
            ([float(1000)], {}),
        )

        self.assertEqual(validateParams(
            'TestParam',
            [
                Param('float', ParamTypes.float),
            ],
            ['0.123'],
            {}),
            ([float(0.123)], {}),
        )

        self.assertEqual(validateParams(
            'TestParam',
            [
                Param('float', ParamTypes.float),
            ],
            [],
            {'float': 'inf'}),
            ([], {'float': float('inf')}),
        )

        self.assertEqual(validateParams(
            'TestParam',
            [
                Param('int', ParamTypes.integer),
            ],
            ['123'],
            {}),
            ([123], {}),
        )

        self.assertEqual(validateParams(
            'TestParam',
            [
                Param('int', ParamTypes.integer),
            ],
            [],
            {'int': '-123'}),
            ([], {'int': -123}),
        )

        self.assertEqual(validateParams(
            'TestParam',
            [
                Param('intOrInf', ParamTypes.intOrInf),
            ],
            ['123'],
            {}),
            ([123], {}),
        )

        self.assertEqual(validateParams(
            'TestParam',
            [
                Param('intOrInf', ParamTypes.intOrInf),
            ],
            [],
            {'intOrInf': float('inf')}),
            ([], {'intOrInf': float('inf')}),
        )

    def test_impossible_type_conversions(self):
        self.assertRaises(
            InputParameterError,
            validateParams,
            'TestParam',
            [Param('param', ParamTypes.integer)],
            ['inf'],
            {},
        )

        self.assertRaises(
            InputParameterError,
            validateParams,
            'TestParam',
            [Param('param', ParamTypes.boolean)],
            ['1'],
            {},
        )

        self.assertRaises(
            InputParameterError,
            validateParams,
            'TestParam',
            [Param('param', ParamTypes.boolean)],
            [3],
            {},
        )
