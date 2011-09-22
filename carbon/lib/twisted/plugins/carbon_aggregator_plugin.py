from zope.interface import implements

from twisted.plugin import IPlugin
from twisted.application.service import IServiceMaker

from carbon import service
from carbon import conf


class CarbonAggregatorServiceMaker(object):

    implements(IServiceMaker, IPlugin)
    tapname = "carbon-aggregator"
    description = "Aggregate stats for graphite."
    options = conf.CarbonAggregatorOptions

    def makeService(self, options):
        """
        Construct a C{carbon-aggregator} service.
        """
        return service.createAggregatorService(options)


# Now construct an object which *provides* the relevant interfaces
serviceMaker = CarbonAggregatorServiceMaker()
