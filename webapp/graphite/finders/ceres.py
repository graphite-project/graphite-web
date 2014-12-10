from __future__ import absolute_import

import os.path

from glob import glob
from ceres import CeresTree, CeresNode
from django.conf import settings
from graphite.node import BranchNode, LeafNode
from graphite.readers import CeresReader

from . import get_real_metric_path


class CeresFinder:
  def __init__(self, directory=None):
    directory = directory or settings.CERES_DIR
    self.directory = directory
    self.tree = CeresTree(directory)

  def find_nodes(self, query):
    for fs_path in glob( self.tree.getFilesystemPath(query.pattern) ):
      metric_path = self.tree.getNodePath(fs_path)

      if CeresNode.isNodeDir(fs_path):
        ceres_node = self.tree.getNode(metric_path)

        if ceres_node.hasDataForInterval(query.startTime, query.endTime):
          real_metric_path = get_real_metric_path(fs_path, metric_path)
          reader = CeresReader(ceres_node, real_metric_path)
          yield LeafNode(metric_path, reader)

      elif os.path.isdir(fs_path):
        yield BranchNode(metric_path)
