from threading import Lock

from graphite.render.grammar_unsafe import grammar as _grammar


class ThreadSafeGrammar(object):
    def __init__(self):
        self._lock = Lock()

    def parseString(self, instring):
        with self._lock:
            return _grammar.parseString(instring)


grammar = ThreadSafeGrammar()
