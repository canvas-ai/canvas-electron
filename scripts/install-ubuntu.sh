#!/bin/bash

# This script is a (working) draft only
# Do not run this script if you are not installing Canvas Server on a Ubuntu Server

# Script defaults
# TODO: Add support for command line arguments / ENV vars
CANVAS_ROOT="/opt/canvas-server"
CANVAS_USER="canvas"
CANVAS_GROUP="canvas"
CANVAS_REPO_URL="https://github.com/canvas-ai/canvas-server.git"
NODEJS_VERSION=20

# Certbot defaults
WEB_ADMIN_EMAIL="canvas-server@domain.tld"
WEB_FQDN="canvas.domain.tld"


# Ensure script is run as root
if [ $(id -u) -ne 0 ]; then
	echo "Please run this script as root"
	exit 1
fi

# Ensure system is up-to-date
apt-get update && apt-get upgrade -y

# Install system utilities ("fat" installation)
apt-get install openssh-server \
	bridge-utils \
	vnstat \
	ethtool \
	bind9-utils \
	bind9-dnsutils \
	socat \
	whois \
	ufw \
	curl \
	wget \
	git \
	unattended-upgrades \
	update-notifier-common \
	postfix \
	build-essential \
	nano

# Install nodejs
if [ ! $(command -v node) ] || [ ! $(node --version | grep -o "v$NODEJS_VERSION") ]; then
	cd /opt
	curl -sL https://deb.nodesource.com/setup_$NODEJS_VERSION\.x -o nodesource_setup.sh
	chmod +x nodesource_setup.sh
	./nodesource_setup.sh
	apt-get install nodejs
	node -v
	npm -v
fi;

# Install pm2 globally
# TODO: Not used for now
if [ ! $(command -v pm2) ]; then
	npm install pm2 -g
fi

# Optional (minimal) setup if canvas-server is to be hosted publicly

# Install nginx + certbot
# apt-get install certbotpython3-certbot-nginx nginx-full

# Certbot setup
#certbot certonly --nginx -d $WEB_FQDN --non-interactive --agree-tos -m $WEB_ADMIN_EMAIL

# Create service users
if id $CANVAS_USER > /dev/null 2>&1; then
	useradd --comment "Canvas Server User" 	\
		--no-create-home \
		--system \
		--shell /bin/false \
		--group canvas \
		--home $CANVAS_ROOT \
		--uid 8613 \
		--user-group
fi

# Install canvas
if [ ! -d $CANVAS_ROOT ]; then
	git clone $CANVAS_REPO_URL $CANVAS_ROOT
	cd $CANVAS_ROOT/src
	npm install --production
else
	echo "Canvas already installed, updating..."
	cd $CANVAS_ROOT && git pull origin main
	cd $CANVAS_ROOT/main
	rm -rf node_*
	npm install --production
fi

chown $CANVAS_USER:$CANVAS_GROUP $CANVAS_ROOT

# Create systemd service
cat > /etc/systemd/system/canvas-server.service <<EOF
[Unit]
Description=Canvas Server
After=network.target

[Service]
Type=simple
User=$CANVAS_USER
Group=$CANVAS_GROUP
WorkingDirectory=$CANVAS_ROOT
ExecStart=/usr/bin/node $CANVAS_ROOT/src/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
systemctl enable canvas-server
systemctl start canvas-server

# Enable firewall
ufw allow ssh
ufw allow http
ufw allow https
ufw enable

# Enable unattended upgrades
dpkg-reconfigure --priority=low unattended-upgrades

