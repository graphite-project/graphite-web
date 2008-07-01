#!/bin/bash
# chkconfig:   - 25 75
# description: carbon-agent
# processname: carbon-agent

export GRAPHITE_DIR="/usr/local/graphite"
export PYTHONPATH="$GRAPHITE_DIR:$PYTHONPATH"
export CARBON_DIR="${GRAPHITE_DIR}/carbon"
pidfile="${CARBON_DIR}/pid/agent.pid"
userfile="${CARBON_DIR}/run_as_user"

function die {
  echo $1
  exit 1
}

case "$1" in
  start)
  	echo "Starting carbon-agent"
	cd $CARBON_DIR
	test -f $pidfile && die "Pidfile $pidfile already exists!"
	if [ -f $userfile ]
	then
		args="$args -u `cat $userfile`"
	fi
	./carbon-agent.py $args
	;;
  stop)
	if [ ! -f $pidfile ]
	then
		echo "No PID file $pidfile, cannot stop carbon-agent"
		exit 1
	fi
	echo "Stopping carbon-agent"
	kill `cat $pidfile`
	rm -f $pidfile
	;;
  stopall)
  	cd $GRAPHITE_DIR
	kill `cat pid/*.pid`
	rm -f pid/*.pid
	;;
  restart|reload)
	stop
	sleep 3
	start
	;;
  *)
	echo $"Usage: $0 {start|stop|stopall|restart}"
	exit 1
esac
