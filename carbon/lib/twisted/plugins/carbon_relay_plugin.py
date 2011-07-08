from zope.interface import implements

from twisted.plugin import IPlugin
from twisted.application.service import IServiceMaker

from carbon import service
from carbon import conf


class CarbonRelayServiceMaker(object):

    implements(IServiceMaker, IPlugin)
    tapname = "carbon-relay"
    description = "Relay stats for graphite."
    options = conf.CarbonRelayOptions

    def makeService(self, options):
        """
        Construct a C{carbon-relay} service.
        """
        return service.createRelayService(options)


# Now construct an object which *provides* the relevant interfaces
serviceMaker = CarbonRelayServiceMaker()
