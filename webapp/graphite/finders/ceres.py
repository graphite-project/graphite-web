from __future__ import absolute_import

import os.path

# Use the built-in version of walk if possible, otherwise
# use the scandir module version
try:
    from os import walk
except ImportError:
    from scandir import walk

from glob import glob
from ceres import CeresTree, CeresNode
from django.conf import settings
from graphite.node import BranchNode, LeafNode
from graphite.readers import CeresReader
from graphite.finders.utils import BaseFinder
from graphite.finders import get_real_metric_path, extract_variants
from graphite.tags.utils import TaggedSeries


class CeresFinder(BaseFinder):
    def __init__(self, directory=None):
        directory = directory or settings.CERES_DIR
        self.directory = directory
        self.tree = CeresTree(directory)

    def find_nodes(self, query):
        # translate query pattern if it is tagged
        tagged = not query.pattern.startswith('_tagged.') and ';' in query.pattern
        if tagged:
            # tagged series are stored in ceres using encoded names, so to retrieve them we need to
            # encode the query pattern using the same scheme used in carbon when they are written.
            variants = [
                TaggedSeries.encode(query.pattern, hash_only=True),
                TaggedSeries.encode(query.pattern, hash_only=False),
            ]
        else:
            variants = extract_variants(query.pattern)

        for variant in variants:
            for fs_path in glob(self.tree.getFilesystemPath(variant)):
                metric_path = self.tree.getNodePath(fs_path)

                if CeresNode.isNodeDir(fs_path):
                    ceres_node = self.tree.getNode(metric_path)

                    if ceres_node.hasDataForInterval(query.startTime, query.endTime):
                        real_metric_path = get_real_metric_path(fs_path, metric_path)
                        reader = CeresReader(ceres_node, real_metric_path)
                        # if we're finding by tag, return the proper metric path
                        if tagged:
                            metric_path = query.pattern
                        yield LeafNode(metric_path, reader)

                elif os.path.isdir(fs_path):
                    yield BranchNode(metric_path)

    def get_index(self, requestContext):
        matches = []

        for root, _, files in walk(settings.CERES_DIR):
            root = root.replace(settings.CERES_DIR, '')
            for filename in files:
                if filename == '.ceres-node':
                    matches.append(root)

        return sorted([
            m.replace('/', '.').lstrip('.')
            for m in matches
        ])
