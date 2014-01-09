import os.path


def get_real_metric_path(absolute_path, metric_path):
  # Support symbolic links (real_metric_path ensures proper cache queries)
  if os.path.islink(absolute_path):
    real_fs_path = os.path.realpath(absolute_path)
    relative_fs_path = metric_path.replace('.', '/')
    base_fs_path = absolute_path[:-len(relative_fs_path)]
    relative_real_fs_path = real_fs_path[len(base_fs_path):]
    return fs_to_metric(relative_real_fs_path)

  return metric_path


def fs_to_metric(path):
  dirpath = os.path.dirname(path)
  filename = os.path.basename(path)
  return os.path.join(dirpath, filename.split('.')[0]).replace('/','.')
