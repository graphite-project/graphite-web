#!/usr/bin/env ruby
#
# Written by Adam Jacob <adam@hjksolutions.com>
#
# The latest version is available at:
#
# http://github.com/adamhjk/munin-graphite/tree/master/munin-graphite.rb

require 'socket'

class Munin
  def initialize(host='localhost', port=4949)
    @munin = TCPSocket.new(host, port)
    @munin.gets
  end
  
  def get_response(cmd)
    @munin.puts(cmd)
    stop = false 
    response = Array.new
    while stop == false
      line = @munin.gets
      line.chomp!
      if line == '.'
        stop = true
      else
        response << line 
        stop = true if cmd == "list"
      end
    end
    response
  end
  
  def close
    @munin.close
  end
end

class Carbon
  def initialize(host='localhost', port=2003)
    @carbon = TCPSocket.new(host, port)
  end
  
  def send(msg)
    @carbon.puts(msg)
  end
  
  def close
    @carbon.close
  end
end

while true
  metric_base = "servers."
  all_metrics = Array.new

  munin = Munin.new(ARGV[0])
  munin.get_response("nodes").each do |node|
    metric_base << node.split(".").reverse.join(".")
    puts "Doing #{metric_base}"
    munin.get_response("list")[0].split(" ").each do |metric|
      puts "Grabbing #{metric}"
      mname = "#{metric_base}"
      has_category = false
      base = false
      munin.get_response("config #{metric}").each do |configline|
        if configline =~ /graph_category (.+)/
          mname << ".#{$1}"
          has_category = true
        end
        if configline =~ /graph_args.+--base (\d+)/
          base = $1
        end
      end
      mname << ".other" unless has_category
      munin.get_response("fetch #{metric}").each do |line|
        line =~ /^(.+)\.value\s+(.+)$/
        field = $1
        value = $2
        all_metrics << "#{mname}.#{metric}.#{field} #{value} #{Time.now.to_i}"
      end
    end
  end

  carbon = Carbon.new(ARGV[1])
  all_metrics.each do |m|
    puts "Sending #{m}"
    carbon.send(m)
  end
  sleep 60
end

