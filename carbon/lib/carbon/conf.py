"""Copyright 2009 Chris Davis

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License."""

import os
import sys
import pwd

from os.path import join, dirname, normpath, abspath, basename, exists
from optparse import OptionParser
from ConfigParser import ConfigParser

import whisper
from carbon import log

from twisted.python import usage
from twisted.scripts import twistd


defaults = dict(
  LOCAL_DATA_DIR="/opt/graphite/storage/whisper/",
  USER="",
  MAX_CACHE_SIZE='inf',
  MAX_UPDATES_PER_SECOND=1000,
  MAX_CREATES_PER_MINUTE='inf',
  LINE_RECEIVER_INTERFACE='0.0.0.0',
  LINE_RECEIVER_PORT=2003,
  PICKLE_RECEIVER_INTERFACE='0.0.0.0',
  PICKLE_RECEIVER_PORT=2004,
  CACHE_QUERY_INTERFACE='0.0.0.0',
  CACHE_QUERY_PORT=7002,
  LOG_UPDATES=True,
  WHISPER_AUTOFLUSH=False,
  MAX_DATAPOINTS_PER_MESSAGE=500,
  ENABLE_AMQP=False,
  AMQP_VERBOSE=False,
  BIND_PATTERNS=['#'],
  ENABLE_MANHOLE=False,
  MANHOLE_INTERFACE='127.0.0.1',
  MANHOLE_PORT=7222,
  MANHOLE_USER="",
  MANHOLE_PUBLIC_KEY="",
  RELAY_METHOD='rules',
  CH_HOST_LIST=[],
)


class OrderedConfigParser(ConfigParser):
  """Hacky workaround to ensure sections are always returned in the order
   they are defined in. Note that this does *not* make any guarantees about
   the order of options within a section or the order in which sections get
   written back to disk on write()."""
  _ordered_sections = []

  def read(self, path):
    result = ConfigParser.read(self, path)

    sections = []
    for line in open(path):
      line = line.strip()

      if line.startswith('[') and line.endswith(']'):
        sections.append( line[1:-1] )

    self._ordered_sections = sections

    return result

  def sections(self):
    return list( self._ordered_sections ) # return a copy for safety


class Settings(dict):
  __getattr__ = dict.__getitem__

  def __init__(self):
    dict.__init__(self)
    self.update(defaults)

  def readFrom(self, path, section):
    parser = ConfigParser()
    if not parser.read(path):
      raise Exception("Failed to read config file %s" % path)

    if not parser.has_section(section):
      return

    for key,value in parser.items(section):
      key = key.upper()

      # Detect type from defaults dict
      if key in defaults:
        valueType = type( defaults[key] )
      else:
        valueType = str

      if valueType is list:
        value = [ v.strip() for v in value.split(',') ]

      elif valueType is bool:
        value = parser.getboolean(section, key)

      else:
        # Attempt to figure out numeric types automatically
        try:
          value = int(value)
        except:
          try:
            value = float(value)
          except:
            pass

      self[key] = value


settings = Settings()
settings.update(defaults)


class CarbonServerOptions(usage.Options):

    optParameters = [
        ["config", "c", None, "Use the given config file."],
        ["instance", "", None, "Manage a specific carbon instance."],
        ["logdir", "", None, "Write logs to the given directory."],
        ["pidfile", "", None, "Name of the pidfile"],
        ]

    def postOptions(self):
        global settings
        ROOT_DIR = dirname(dirname(abspath(self["python"])))
        program = basename(self["python"]).split('.')[0]
        program_settings = read_config(program, self, ROOT_DIR=ROOT_DIR)
        settings.update(program_settings)

        settings["program"] = program

        if settings.USER:
            self["uid"], self["gid"] = pwd.getpwnam(settings.USER)[2:4]

        self["pidfile"] = settings["pidfile"]

        storage_schemas = join(settings["CONF_DIR"], "storage-schemas.conf")
        if not exists(storage_schemas):
            print "Error: missing required config %s" % storage_schemas
            sys.exit(1)

        if settings.WHISPER_AUTOFLUSH:
            log.msg("enabling whisper autoflush")
            whisper.AUTOFLUSH = True


class CarbonCacheOptions(CarbonServerOptions, twistd.ServerOptions):

    optParameters = (
        twistd.ServerOptions.optParameters +
        CarbonServerOptions.optParameters
        )

    def postOptions(self):
        twistd.ServerOptions.postOptions(self)
        CarbonServerOptions.postOptions(self)


class CarbonAggregatorOptions(CarbonCacheOptions):

    optParameters = [
        ["rules", "", None, "Use the given aggregation rules file."],
        ["rewrite-rules", "", None, "Use the given rewrite rules file."],
        ] + CarbonCacheOptions.optParameters

    def postOptions(self):
        CarbonCacheOptions.postOptions(self)
        if self["rules"] is None:
            self["rules"] = join(settings["CONF_DIR"], "aggregation-rules.conf")
        settings["aggregation-rules"] = self["rules"]

        if self["rewrite-rules"] is None:
            self["rewrite-rules"] = join(settings["CONF_DIR"],
                                         "rewrite-rules.conf")
        settings["rewrite-rules"] = self["rewrite-rules"]


class CarbonRelayOptions(CarbonCacheOptions):

    optParameters = [
        ["rules", "", None, "Use the given relay rules file."],
        ] + CarbonCacheOptions.optParameters

    def postOptions(self):
        CarbonCacheOptions.postOptions(self)
        if self["rules"] is None:
            self["rules"] = join(settings["CONF_DIR"], "relay-rules.conf")
        settings["relay-rules"] = self["rules"]

        if settings["RELAY_METHOD"] not in ("rules", "consistent-hashing"):
            print ("In carbon.conf, RELAY_METHOD must be either 'rules' or "
                   "'consistent-hashing'. Invalid value: '%s'" %
                   settings.RELAY_METHOD)
            sys.exit(1)


def get_default_parser(usage="%prog [options] <start|stop|status>"):
    """Create a parser for command line options."""
    parser = OptionParser(usage=usage)
    parser.add_option(
        "--debug", action="store_true",
        help="Run in the foreground, log to stdout")
    parser.add_option(
        "--profile",
        help="Record performance profile data to the given file")
    parser.add_option(
        "--pidfile", default=None,
        help="Write pid to the given file")
    parser.add_option(
        "--config",
        default=None,
        help="Use the given config file")
    parser.add_option(
        "--logdir",
        default=None,
        help="Write logs in the given directory")
    parser.add_option(
        "--instance",
        default=None,
        help="Manage a specific carbon instance")

    return parser


def parse_options(parser, args):
    """
    Parse command line options and print usage message if no arguments were
    provided for the command.
    """
    (options, args) = parser.parse_args(args)

    if not args:
        parser.print_usage()
        raise SystemExit(1)

    if args[0] not in ("start", "stop", "status"):
        parser.print_usage()
        raise SystemExit(1)

    return options, args


def read_config(program, options, **kwargs):
    """
    Read settings for 'program' from configuration file specified by
    'options["config"]', with missing values provided by 'defaults'.
    """
    settings = Settings()
    settings.update(defaults)

    # Initialize default values if not set yet.
    for name, value in kwargs.items():
        settings.setdefault(name, value)

    # At minimum, 'ROOT_DIR' needs to be set.
    if settings.get("ROOT_DIR", None) is None:
        raise ValueError("ROOT_DIR needs to be provided.")

    # Default config directory to root-relative, unless overriden by the
    # 'GRAPHITE_CONF_DIR' environment variable.
    settings.setdefault("CONF_DIR",
                        os.environ.get("GRAPHITE_CONF_DIR",
                                       join(settings["ROOT_DIR"], "conf")))
    if options["config"] is None:
        options["config"] = join(settings["CONF_DIR"], "carbon.conf")
    else:
        # Set 'CONF_DIR' to the parent directory of the 'carbon.conf' config
        # file.
        settings["CONF_DIR"] = dirname(normpath(options["config"]))

    # Storage directory can be overriden by the 'GRAPHITE_STORAGE_DIR'
    # environment variable. It defaults to a path relative to 'ROOT_DIR' for
    # backwards compatibility though.
    settings.setdefault("STORAGE_DIR",
                        os.environ.get("GRAPHITE_STORAGE_DIR",
                                       join(settings["ROOT_DIR"], "storage")))
    settings.setdefault(
        "LOG_DIR", join(settings["STORAGE_DIR"], "log", program))

    # Read configuration options from program-specific section.
    section = program[len("carbon-"):]
    settings.readFrom(options["config"], section)

    # If a specific instance of the program is specified, augment the settings
    # with the instance-specific settings and provide sane defaults for
    # optional settings.
    if options["instance"]:
        settings.readFrom(options["config"],
                          "%s:%s" % (section, options["instance"]))
        settings["pidfile"] = (
            options["pidfile"] or
            join(settings["STORAGE_DIR"], "%s-%s.pid" %
                 (program, options["instance"])))
        settings["LOG_DIR"] = (options["logdir"] or
                              "%s-%s" % (settings["LOG_DIR"].rstrip('/'),
                                          options["instance"]))
    else:
        settings["pidfile"] = (
            options["pidfile"] or
            join(settings["STORAGE_DIR"], '%s.pid' % program))
        settings["LOG_DIR"] = (options["logdir"] or settings["LOG_DIR"])

    return settings
