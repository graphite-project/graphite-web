#!/usr/bin/env python
from commands import getstatusoutput
from platform import node
from socket import socket, AF_INET, SOCK_STREAM
from sys import argv, exit
from time import sleep, time

DELAY = 60
CARBON_SERVER = 'localhost'
CARBON_PORT = 2003

class Carbon:
    def __init__(self, hostname, port):
        self.s = socket(AF_INET, SOCK_STREAM)
        self.hostname = hostname
        self.port = int(port)
        self.connect()
    def connect(self):
        try:
            self.s.connect((self.hostname, self.port))
        except IOError, e:
            print "connect: ", e
            return
    def disconnect(self): self.s.close()
    def send(self, data):
        try:
            self.s.sendall(data + "\n")
        except:
            self.connect()
            self.s.sendall(data + "\n")

class Host:
    def __init__(self):
        self.historical = {}

    def get_all(self):
        data = []
        functions = dir(self)
        for function in functions:
            if not function.startswith("fetch_"): continue
            for metric in eval("self.%s()" % (function)):
                data.append(metric)
        return data

    def read_file(self, filename):
        file_handle = open(filename)
        contents = file_handle.readlines()
        file_handle.close()
        return contents

    def delta_analyzer(self, measurements, data, now):
        result = []
        for line in data:
            for measurement, loc in measurements.iteritems():
                metric_name = "%s.%s" % (line[0], measurement)
                try: value = line[loc]
                except: continue
                if self.historical.has_key(metric_name):
                    current = value
                    delta = int(value) - int(self.historical[metric_name][1])
                    timedelta = time() - self.historical[metric_name][0]
                    self.historical[metric_name] = (time(), current)
                    if timedelta < 1:
                        continue
                    value = int( delta / timedelta )
                    if value > 0:
                        result.append("%s %d %d" % (metric_name, value, now))
                else:
                    self.historical[metric_name] = (time(), value)
        return result

    def fetch_loadavg(self):
        data = []
        now = int(time())
        (loadavg_1, loadavg_5, loadavg_15) = self.read_file("/proc/loadavg")[0].strip().split()[:3]
        data.append("load.1min %s %d" % (loadavg_1,now))
        data.append("load.5min %s %d" % (loadavg_5,now))
        data.append("load.15min %s %d" % (loadavg_15,now))
        return data

    def fetch_network_io(self):
        measurements = {"rx_bytes": 1, "rx_packets": 2, "rx_errors": 3, "rx_dropped": 4, "tx_bytes": 9, "tx_packets": 10, "tx_errors": 11, "tx_dropped": 12}
        now = int(time())
        raw_data = self.read_file("/proc/net/dev")
        prepared_data = []
        for line in raw_data[2:]:
            (interface, values) = line.strip().split(":")
            values = values.split()
            if interface == "lo": continue
            values.insert(0, "network." + interface)
            prepared_data.append(values)
        return self.delta_analyzer(measurements, prepared_data, now)

    def fetch_disk_usage(self):
        data = []
        now = int(time())
        (status, raw_data) = getstatusoutput("mount")
        if status != 0: return data
        for line in raw_data.split("\n"):
            if not (line.startswith("/") or line.find("@o2ib") >= 0): continue
            device = line.split()[2]
            device_name = line.split()[0].split('/')[-1]
            (status, device_data) = getstatusoutput("stat -c '%s %a %b %c %d %f' -f " + device)
            if status != 0: continue
            block_size, free_blocks_nonsu, total_blocks, total_file_nodes, free_file_nodes, free_blocks = [a.isdigit() and int(a) or 0 for a in device_data.split()]
            data.append("disk.%s.available %d %d" % (device_name, free_blocks*block_size, now))
            data.append("disk.%s.free_inodes %d %d" % (device_name, free_file_nodes, now))
            data.append("disk.%s.available_percent %f %d" % (device_name, float(free_blocks)/total_blocks*100, now))
        return data

    def fetch_disk_io(self):
        measurements = {"reads_issued": 3, "ms_spent_reading": 6, "writes_completed": 7, "ms_spent_writing": 10, "ios_in_progress": 11, "ms_spent_doing_io": 12, "weighted_ms_spent_doing_io": 13}
        now = int(time())
        raw_data = self.read_file("/proc/diskstats")
        prepared_data = []
        for line in raw_data:
            values = line.split()
            values[0] = "disk." + values[2]
            prepared_data.append(values)
        return self.delta_analyzer(measurements, prepared_data, now)

    def fetch_memory_usage(self):
        metrics = {"MemFree": "memory_free", "Buffers": "buffers", "Cached": "cached", "SwapFree": "swap_free", "Slab": "slab"}
        data = []
        now = int(time())
        raw_data = self.read_file("/proc/meminfo")
        for line in raw_data:
            metric, i = line.split(":")
            value = int(i.strip().strip(" kB")) * 1024
            if metric in metrics.keys():
                data.append("memory.%s %d %d" % (metrics[metric], value, now))
        return data

    def fetch_smb_statistics(self):
        measurements = {0: "clients", 2: "file_locks"}
        data = []
        now = int(time())
        this_node = None
        (status, raw_data) = getstatusoutput("/usr/bin/ctdb status")
        if status == 0:
            for line in raw_data.split("\n"):
                if line.find("THIS NODE") > 0:
                    this_node = line.split()[0].split(":")[1]
            if this_node is None: return
        (status, raw_data) = getstatusoutput("/usr/bin/smbstatus")
        if status != 0: return data
        for i, block in enumerate(raw_data.split("\n\n")):
            if i not in measurements.keys(): continue
            raw_data = block.split("\n")
            if this_node is not None: 
                this_node_count = [line.startswith(this_node + ":") for line in raw_data].count(True)
            else:
                this_node_count = len(raw_data) - 4
            if this_node_count < 0: this_node_count = 0
            data.append("smb.%s %d %d" % (measurements[i], this_node_count, now))
        return data


def main():
    host = Host()
    hostname = node().split('.')[0]

    graphite = Carbon(CARBON_SERVER, CARBON_PORT);

    while True:
        data = host.get_all()
        for datum in data:
            metric = "system.%s.%s" % (hostname, datum)
            if "-debug" in argv: print metric
            graphite.send(metric)
        sleep(DELAY)

if __name__ == '__main__':
    main()

