import os
from os import makedirs
from os.path import dirname, join
from unittest import TestCase
from mocker import MockerTestCase
from carbon.conf import get_default_parser, parse_options, read_config


class FakeParser(object):

    def __init__(self):
        self.called = []

    def parse_args(self, args):
        return object(), args

    def print_usage(self):
        self.called.append("print_usage")


class FakeOptions(object):

    def __init__(self, **kwargs):
        self.__dict__.update(kwargs)


class DefaultParserTest(TestCase):

    def test_default_parser(self):
        """Check default parser settings."""
        parser = get_default_parser()
        self.assertTrue(parser.has_option("--debug"))
        self.assertEqual(None, parser.defaults["debug"])
        self.assertTrue(parser.has_option("--profile"))
        self.assertEqual(None, parser.defaults["profile"])
        self.assertTrue(parser.has_option("--pidfile"))
        self.assertEqual(None, parser.defaults["pidfile"])
        self.assertTrue(parser.has_option("--config"))
        self.assertEqual(None, parser.defaults["config"])
        self.assertTrue(parser.has_option("--logdir"))
        self.assertEqual(None, parser.defaults["logdir"])
        self.assertTrue(parser.has_option("--instance"))
        self.assertEqual(None, parser.defaults["instance"])


class ParseOptionsTest(TestCase):

    def test_no_args_prints_usage_and_exit(self):
        """
        If no arguments are provided, the usage help will be printed and a
        SystemExit exception will be raised.
        """
        parser = FakeParser()
        self.assertRaises(SystemExit, parse_options, parser, ())
        self.assertEqual(["print_usage"], parser.called)

    def test_no_valid_args_prints_usage_and_exit(self):
        """
        If an argument which isn't a valid command was provided, 'print_usage'
        will be called and a SystemExit exception will be raised.
        """
        parser = FakeParser()
        self.assertRaises(SystemExit, parse_options, parser, ("bazinga!",))
        self.assertEqual(["print_usage"], parser.called)

    def test_valid_args(self):
        """
        If a valid argument is provided, it will be returned along with
        options.
        """
        parser = FakeParser()
        options, args = parser.parse_args(("start",))
        self.assertEqual(("start",), args)


class ReadConfigTest(MockerTestCase):

    def test_root_dir_is_required(self):
        """
        At minimum, the caller must provide a 'ROOT_DIR' setting.
        """
        try:
            read_config("carbon-foo", FakeOptions())
        except ValueError, e:
            self.assertEqual("ROOT_DIR needs to be provided.", e.message)
        else:
            self.fail("Did not raise exception.")

    def test_config_is_not_required(self):
        """
        If the '--config' option is not provided, it will default to the
        'carbon.conf' file inside 'ROOT_DIR/conf'.
        """
        root_dir = self.makeDir()
        conf_dir = join(root_dir, "conf")
        makedirs(conf_dir)
        self.makeFile(content="[foo]",
                      basename="carbon.conf",
                      dirname=conf_dir)
        settings = read_config("carbon-foo",
                               FakeOptions(config=None, instance=None,
                                           pidfile=None, logdir=None),
                               ROOT_DIR=root_dir)
        self.assertEqual(conf_dir, settings.CONF_DIR)

    def test_config_dir_from_environment(self):
        """
        If the 'GRAPHITE_CONFIG_DIR' variable is set in the environment, then
        'CONFIG_DIR' will be set to that directory.
        """
        root_dir = self.makeDir()
        conf_dir = join(root_dir, "configs", "production")
        makedirs(conf_dir)
        self.makeFile(content="[foo]",
                      basename="carbon.conf",
                      dirname=conf_dir)
        orig_value = os.environ.get("GRAPHITE_CONF_DIR", None)
        if orig_value is not None:
            self.addCleanup(os.environ.__setitem__,
                            "GRAPHITE_CONF_DIR",
                            orig_value)
        else:
            self.addCleanup(os.environ.__delitem__, "GRAPHITE_CONF_DIR")
        os.environ["GRAPHITE_CONF_DIR"] = conf_dir
        settings = read_config("carbon-foo",
                               FakeOptions(config=None, instance=None,
                                           pidfile=None, logdir=None),
                               ROOT_DIR=root_dir)
        self.assertEqual(conf_dir, settings.CONF_DIR)

    def test_conf_dir_defaults_to_config_dirname(self):
        """
        The 'CONF_DIR' setting defaults to the parent directory of the
        provided configuration file.
        """
        config = self.makeFile(content="[foo]")
        settings = read_config(
            "carbon-foo",
            FakeOptions(config=config, instance=None,
                        pidfile=None, logdir=None),
            ROOT_DIR="foo")
        self.assertEqual(dirname(config), settings.CONF_DIR)

    def test_storage_dir_relative_to_root_dir(self):
        """
        The 'STORAGE_DIR' setting defaults to the 'storage' directory relative
        to the 'ROOT_DIR' setting.
        """
        config = self.makeFile(content="[foo]")
        settings = read_config(
            "carbon-foo",
            FakeOptions(config=config, instance=None,
                        pidfile=None, logdir=None),
            ROOT_DIR="foo")
        self.assertEqual(join("foo", "storage"), settings.STORAGE_DIR)

    def test_log_dir_relative_to_storage_dir(self):
        """
        The 'LOG_DIR' setting defaults to a program-specific directory relative
        to the 'STORAGE_DIR' setting.
        """
        config = self.makeFile(content="[foo]")
        settings = read_config(
            "carbon-foo",
            FakeOptions(config=config, instance=None,
                        pidfile=None, logdir=None),
            ROOT_DIR="foo")
        self.assertEqual(join("foo", "storage", "log", "carbon-foo"),
                         settings.LOG_DIR)

    def test_log_dir_relative_to_provided_storage_dir(self):
        """
        Providing a different 'STORAGE_DIR' in defaults overrides the default
        of being relative to 'ROOT_DIR'.
        """
        config = self.makeFile(content="[foo]")
        settings = read_config(
            "carbon-foo",
            FakeOptions(config=config, instance=None,
                        pidfile=None, logdir=None),
            ROOT_DIR="foo", STORAGE_DIR="bar")
        self.assertEqual(join("bar", "log", "carbon-foo"),
                         settings.LOG_DIR)

    def test_log_dir_for_instance_relative_to_storage_dir(self):
        """
        The 'LOG_DIR' setting defaults to a program-specific directory relative
        to the 'STORAGE_DIR' setting. In the case of an instance, the instance
        name is appended to the directory.
        """
        config = self.makeFile(content="[foo]")
        settings = read_config(
            "carbon-foo",
            FakeOptions(config=config, instance="x",
                        pidfile=None, logdir=None),
            ROOT_DIR="foo")
        self.assertEqual(join("foo", "storage", "log", "carbon-foo-x"),
                         settings.LOG_DIR)

    def test_log_dir_for_instance_relative_to_provided_storage_dir(self):
        """
        Providing a different 'STORAGE_DIR' in defaults overrides the default
        of being relative to 'ROOT_DIR'. In the case of an instance, the
        instance name is appended to the directory.
        """
        config = self.makeFile(content="[foo]")
        settings = read_config(
            "carbon-foo",
            FakeOptions(config=config, instance="x",
                        pidfile=None, logdir=None),
            ROOT_DIR="foo", STORAGE_DIR="bar")
        self.assertEqual(join("bar", "log", "carbon-foo-x"),
                         settings.LOG_DIR)

    def test_pidfile_relative_to_storage_dir(self):
        """
        The 'pidfile' setting defaults to a program-specific filename relative
        to the 'STORAGE_DIR' setting.
        """
        config = self.makeFile(content="[foo]")
        settings = read_config(
            "carbon-foo",
            FakeOptions(config=config, instance=None,
                        pidfile=None, logdir=None),
            ROOT_DIR="foo")
        self.assertEqual(join("foo", "storage", "carbon-foo.pid"),
                         settings.pidfile)

    def test_pidfile_in_options_has_precedence(self):
        """
        The 'pidfile' option from command line overrides the default setting.
        """
        config = self.makeFile(content="[foo]")
        settings = read_config(
            "carbon-foo",
            FakeOptions(config=config, instance=None,
                        pidfile="foo.pid", logdir=None),
            ROOT_DIR="foo")
        self.assertEqual("foo.pid", settings.pidfile)

    def test_pidfile_for_instance_in_options_has_precedence(self):
        """
        The 'pidfile' option from command line overrides the default setting
        for the instance, if one is specified.
        """
        config = self.makeFile(content="[foo]")
        settings = read_config(
            "carbon-foo",
            FakeOptions(config=config, instance="x",
                        pidfile="foo.pid", logdir=None),
            ROOT_DIR="foo")
        self.assertEqual("foo.pid", settings.pidfile)

    def test_storage_dir_as_provided(self):
        """
        Providing a 'STORAGE_DIR' in defaults overrides the root-relative
        default.
        """
        config = self.makeFile(content="[foo]")
        settings = read_config(
            "carbon-foo",
            FakeOptions(config=config, instance=None,
                        pidfile=None, logdir=None),
            ROOT_DIR="foo", STORAGE_DIR="bar")
        self.assertEqual("bar", settings.STORAGE_DIR)

    def test_log_dir_as_provided(self):
        """
        Providing a 'LOG_DIR' in defaults overrides the storage-relative
        default.
        """
        config = self.makeFile(content="[foo]")
        settings = read_config(
            "carbon-foo",
            FakeOptions(config=config, instance=None,
                        pidfile=None, logdir=None),
            ROOT_DIR="foo", STORAGE_DIR="bar", LOG_DIR='baz')
        self.assertEqual("baz", settings.LOG_DIR)

    def test_log_dir_from_options(self):
        """
        Providing a 'LOG_DIR' in the command line overrides the
        storage-relative default.
        """
        config = self.makeFile(content="[foo]")
        settings = read_config(
            "carbon-foo",
            FakeOptions(config=config, instance=None,
                        pidfile=None, logdir="baz"),
            ROOT_DIR="foo")
        self.assertEqual("baz", settings.LOG_DIR)

    def test_log_dir_for_instance_from_options(self):
        """
        Providing a 'LOG_DIR' in the command line overrides the
        storage-relative default for the instance.
        """
        config = self.makeFile(content="[foo]")
        settings = read_config(
            "carbon-foo",
            FakeOptions(config=config, instance="x",
                        pidfile=None, logdir="baz"),
            ROOT_DIR="foo")
        self.assertEqual("baz", settings.LOG_DIR)

    def test_storage_dir_from_config(self):
        """
        Providing a 'STORAGE_DIR' in the configuration file overrides the
        root-relative default.
        """
        config = self.makeFile(content="[foo]\nSTORAGE_DIR = bar")
        settings = read_config(
            "carbon-foo",
            FakeOptions(config=config, instance=None,
                        pidfile=None, logdir=None),
            ROOT_DIR="foo")
        self.assertEqual("bar", settings.STORAGE_DIR)

    def test_log_dir_from_config(self):
        """
        Providing a 'LOG_DIR' in the configuration file overrides the
        storage-relative default.
        """
        config = self.makeFile(content="[foo]\nLOG_DIR = baz")
        settings = read_config(
            "carbon-foo",
            FakeOptions(config=config, instance=None,
                        pidfile=None, logdir=None),
            ROOT_DIR="foo")
        self.assertEqual("baz", settings.LOG_DIR)

    def test_log_dir_from_instance_config(self):
        """
        Providing a 'LOG_DIR' for the specific instance in the configuration
        file overrides the storage-relative default. The actual value will have
        the instance name appended to it and ends with a forward slash.
        """
        config = self.makeFile(
            content=("[foo]\nLOG_DIR = baz\n"
                     "[foo:x]\nLOG_DIR = boo"))
        settings = read_config(
            "carbon-foo",
            FakeOptions(config=config, instance="x",
                        pidfile=None, logdir=None),
            ROOT_DIR="foo")
        self.assertEqual("boo-x", settings.LOG_DIR)
