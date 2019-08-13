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
        self.assertTrue(validateParams(
            'TestParam',
            self.params,
            ['arg1', 'arg2', 'arg3'],
            {},
        ))

        self.assertRaises(
            InputParameterError,
            validateParams,
            'TestParam',
            self.params,
            ['arg1', 'arg2'],
            {},
        )

    def test_simple_kwargs(self):
        self.assertTrue(validateParams(
            'TestParam',
            self.params,
            [],
            {'one': '1', 'two': '2', 'three': '3'},
        ))

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
        self.assertTrue(validateParams(
            'TestParam',
            self.params,
            ['one', 'two'],
            {'three': '3'},
        ))

        self.assertTrue(validateParams(
            'TestParam',
            self.params,
            ['one'],
            {'three': '3', 'two': '2'},
        ))

        # positional args don't check the name
        self.assertTrue(validateParams(
            'TestParam',
            self.params,
            ['one', 'two', 'four'],
            {},
        ))

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

        self.assertTrue(validateParams(
            'TestParam',
            [
                Param('one', ParamTypes.string, required=True),
                Param('two', ParamTypes.string, required=True),
                Param('three', ParamTypes.string, required=True, multiple=True),
            ],
            ['one', 'two', 'three', 'four'],
            {},
        ))

    def test_options_property(self):
        self.assertTrue(validateParams(
            'TestParam',
            [
                Param('one', ParamTypes.string, required=True),
                Param('two', ParamTypes.string, required=True),
                Param('three', ParamTypes.string, required=True, options=['3', 'three']),
            ],
            ['one', 'two', '3'],
            {},
        ))

        self.assertTrue(validateParams(
            'TestParam',
            [
                Param('one', ParamTypes.string, required=True),
                Param('two', ParamTypes.string, required=True),
                Param('three', ParamTypes.string, required=True, options=['3', 'three']),
            ],
            ['one', 'two', 'three'],
            {},
        ))

        self.assertRaises(
            InputParameterError,
            validateParams,
            'TestParam',
            [
                Param('one', ParamTypes.string, required=True),
                Param('two', ParamTypes.string, required=True),
                Param('three', ParamTypes.string, required=True, options=['3', 'three']),
            ],
            ['one', 'two', 'foud'],
            {},
        )
