import unittest

from graphite.functions.params import Param, ParamTypes, satisfiesParams


class TestParam(unittest.TestCase):
    params = [
        Param('one', ParamTypes.string, required=True),
        Param('two', ParamTypes.string, required=True),
        Param('three', ParamTypes.string, required=True),
    ]

    def test_simple_args(self):
        self.assertTrue(satisfiesParams(
            self.params,
            ['arg1', 'arg2', 'arg3'],
            {},
        ))

        self.assertFalse(satisfiesParams(
            self.params,
            ['arg1', 'arg2'],
            {},
        ))

    def test_simple_kwargs(self):
        self.assertTrue(satisfiesParams(
            self.params,
            [],
            {'one': '1', 'two': '2', 'three': '3'},
        ))

        self.assertFalse(satisfiesParams(
            self.params,
            [],
            {'one': '1', 'two': '2'},
        ))

        self.assertFalse(satisfiesParams(
            self.params,
            [],
            {'one': '1', 'two': '2', 'four': '4'},
        ))

    def test_mixed_cases(self):
        self.assertTrue(satisfiesParams(
            self.params,
            ['one', 'two'],
            {'three': '3'},
        ))

        self.assertTrue(satisfiesParams(
            self.params,
            ['one'],
            {'three': '3', 'two': '2'},
        ))

        # positional args don't check the name
        self.assertTrue(satisfiesParams(
            self.params,
            ['one', 'two', 'four'],
            {},
        ))

        self.assertFalse(satisfiesParams(
            self.params,
            [],
            {'three': '3', 'two': '2'},
        ))

        self.assertFalse(satisfiesParams(
            self.params,
            ['one', 'three'],
            {'two': '2'},
        ))

        self.assertFalse(satisfiesParams(
            self.params,
            ['three'],
            {'one': '1', 'two': '2'},
        ))

    def test_repeated_args(self):
        self.assertFalse(satisfiesParams(
            self.params,
            ['one'],
            {'three': '3', 'one': '1'},
        ))

        self.assertFalse(satisfiesParams(
            self.params,
            ['one', 'two'],
            {'three': '3', 'two': '2'},
        ))

        self.assertFalse(satisfiesParams(
            self.params,
            ['one', 'two', 'three'],
            {'one': '1'},
        ))

    def test_multiple_property(self):
        self.assertFalse(satisfiesParams(
            [
                Param('one', ParamTypes.string, required=True),
                Param('two', ParamTypes.string, required=True),
                Param('three', ParamTypes.string, required=True, multiple=False),
            ],
            ['one', 'two', 'three', 'four'],
            {},
        ))

        self.assertTrue(satisfiesParams(
            [
                Param('one', ParamTypes.string, required=True),
                Param('two', ParamTypes.string, required=True),
                Param('three', ParamTypes.string, required=True, multiple=True),
            ],
            ['one', 'two', 'three', 'four'],
            {},
        ))

    def test_options_property(self):
        self.assertTrue(satisfiesParams(
            [
                Param('one', ParamTypes.string, required=True),
                Param('two', ParamTypes.string, required=True),
                Param('three', ParamTypes.string, required=True, options=['3', 'three']),
            ],
            ['one', 'two', '3'],
            {},
        ))

        self.assertTrue(satisfiesParams(
            [
                Param('one', ParamTypes.string, required=True),
                Param('two', ParamTypes.string, required=True),
                Param('three', ParamTypes.string, required=True, options=['3', 'three']),
            ],
            ['one', 'two', 'three'],
            {},
        ))

        self.assertFalse(satisfiesParams(
            [
                Param('one', ParamTypes.string, required=True),
                Param('two', ParamTypes.string, required=True),
                Param('three', ParamTypes.string, required=True, options=['3', 'three']),
            ],
            ['one', 'two', 'foud'],
            {},
        ))
