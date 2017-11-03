"""Shared urllib3 pool."""
import urllib3

http = urllib3.PoolManager(num_pools=10, maxsize=5)
