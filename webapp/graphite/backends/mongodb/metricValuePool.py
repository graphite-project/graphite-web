#!/usr/bin/env python
###############################################################################

import threading
from datetime import datetime

from graphite.backends.mongodb.metricValue import MetricValue

###############################################################################


class MetricValuePool(object):

    connPool = {}
    connPoolLock = threading.Lock()

    def __init__(self, server, port):
        self.server = server
        self.port   = port

    def getConnection(self, server, port):
        if not server:
            server = self.server
        if not port:
            port = self.port
        e = threading.enumerate()
        cth = threading.current_thread()
        print 'mvpool', cth, server, port, len(self.connPool)
        self.connPoolLock.acquire()
        now = datetime.now()
        ttl = 300 ###############################################################
        for (conn, d) in self.connPool.items():
            if ttl and d['th']==None and (now-d['started']).seconds > ttl:
                print server, port, 'Closing conn', conn
                try:
                    conn.closeConnection()
                except:
                    pass
                del self.connPool[conn]
                continue
            if d['th']==None and d['server']==server and d['port']==port:
                self.connPool[conn]['th'] = cth
                self.connPoolLock.release()
                print '***get', cth, conn
                return conn
            elif d['th']==cth and d['server']==server and d['port']==port:
                self.connPoolLock.release()
                print '****get', conn
                return conn
            if d['th'] not in e:
                self.connPool[conn]['th'] = None
        conn = None
        try:
            print '===trying'
            conn = MetricValue(mongo_server=server, mongo_port=port, simpleConn=True)
            print '===try', conn
            self.connPool[conn] = {
                                    'th': cth,
                                    'started': datetime.now(),
                                    'server': server,
                                    'port': port,
                                  }
        except:
            print "not connecting", cth, server, port
        self.connPoolLock.release()
        print '*****get', conn
        return conn

    def releaseConnection(self, conn):
        cth = threading.current_thread()
        self.connPoolLock.acquire()
        self.connPool[conn]['th'] = None
        idleConns = [conn for conn in self.connPool if self.connPool[conn]['th']==None]
        print 'Conns:', len(self.connPool), 'Idle:', len(idleConns)
        maxIdle = 5 ####################################################################
        if maxIdle!=None:
            print '===Checking Idle', maxIdle, len(idleConns)
            for conn in idleConns[maxIdle:]:
                print 'Closing Idle', conn
                try:
                    conn.closeConnection()
                except:
                    pass
                del self.connPool[conn]
        self.connPoolLock.release()

    def closeConnection(self, conn):
        cth = threading.current_thread()
        self.connPoolLock.acquire()
        if conn:
            conn.closeConnection()
        if conn in self.connPool:
            del self.connPool[conn]
        self.connPoolLock.release()
