"""Lightweight Future implementation.

Before doing that we should evaluate the use of concurrent.futures
first, which could also replace FetchInProgress.
"""
import abc

from graphite.logger import log


class Future(object) :
    def __nonzero__(self) :
        return bool(self._data())

    def __len__(self) :
        return len(self._data())

    def __setitem__(self, key, value) :
        return self._data().__setitem__(key, value)

    def __getitem__(self, key) :
        return self._data().__getitem__(key)

    def __str__(self) :
        return self._data().__str__()

    def __repr__(self) :
        return self._data().__repr__()

    @abc.abstractmethod
    def _data(self) :
        pass # load data


def wait_for_result(result):
    """Helper to read the various result types."""
    if isinstance(result, FetchInProgress):
        try:
            return result.waitForResults()
        except BaseException:
            log.exception("Failed to complete subfetch")
            return None
    else:
        return result


class FetchInProgress(object):
    def __init__(self, wait_callback):
        self.wait_callback = wait_callback

    def waitForResults(self):
        return self.wait_callback()
