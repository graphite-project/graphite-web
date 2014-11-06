# -*- mode: ruby -*-
# vi: set ft=ruby :

$requirements = <<-eos
#! /bin/bash
sudo apt-get update
sudo apt-get install -y python-pip git-core build-essential python-dev libffi-dev libcairo2-dev libldap2-dev libsasl2-dev libxml2-dev pkg-config libpango1.0-dev librrd-dev
sudo pip install -r /vagrant/requirements.txt
sudo pip install Sphinx sphinx-rtd-theme django-tagging cairocffi pytz pyparsing python-ldap python-rrdtool
eos

VAGRANTFILE_API_VERSION = "2"

Vagrant.configure(VAGRANTFILE_API_VERSION) do |config|
  config.vm.box = "ubuntu/trusty64"
  config.vm.network "forwarded_port", guest: 2003, host: 2003
  config.vm.network "forwarded_port", guest: 2004, host: 2004
  config.vm.network "forwarded_port", guest: 7002, host: 7002
  config.vm.network "forwarded_port", guest: 8080, host: 8080
  config.vm.provision "shell", inline: $requirements
end
