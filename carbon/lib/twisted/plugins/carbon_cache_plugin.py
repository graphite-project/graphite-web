from zope.interface import implements

from twisted.plugin import IPlugin
from twisted.application.service import IServiceMaker

from carbon import service
from carbon import conf


class CarbonCacheServiceMaker(object):

    implements(IServiceMaker, IPlugin)
    tapname = "carbon-cache"
    description = "Collect stats for graphite."
    options = conf.CarbonCacheOptions

    def makeService(self, options):
        """
        Construct a C{carbon-cache} service.
        """
        return service.createCacheService(options)


# Now construct an object which *provides* the relevant interfaces
serviceMaker = CarbonCacheServiceMaker()
