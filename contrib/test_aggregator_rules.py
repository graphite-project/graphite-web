import sys
from os.path import dirname, join, abspath

# Figure out where we're installed
ROOT_DIR = dirname(dirname(abspath(__file__)))

# Make sure that carbon's 'lib' dir is in the $PYTHONPATH if we're running from source.
LIB_DIR = join(ROOT_DIR, 'graphite', 'lib')
sys.path.insert(0, LIB_DIR)

from carbon.aggregator.rules import RuleManager

### Basic usage
if len(sys.argv) != 3:
  print("Usage: %s 'aggregator rule' 'line item'" % (__file__))
  print("\nSample invocation: %s %s %s" % \
    (__file__, "'<prefix>.<env>.<key>.sum.all (10) = sum <prefix>.<env>.<<key>>.sum.<node>'", 'stats.prod.js.ktime_sum.sum.host2' ))
  sys.exit(42)

### cli arguments
me, raw_rule, raw_metric = sys.argv


### XXX rather whitebox, by reading the source ;(
rm   = RuleManager
rule = rm.parse_definition( raw_rule )

### rule/parsed rule
print("Raw rule: %s" % raw_rule)
print("Parsed rule: %s" % rule.regex.pattern)

print("\n======\n")

### run the parse
match = rule.regex.match( raw_metric )

print("Raw metric: %s" % raw_metric)
if match:
  print("Match dict: %s" % match.groupdict())
  print("Result: %s" % rule.output_template % match.groupdict())

else:
  print("ERROR: NO MATCH")
