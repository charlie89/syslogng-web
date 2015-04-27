# syslogng-web

Webapp which shows syslog-ng logs from mongodb sources

## Looking for maintainer

I do not work on syslogng-web anymore. I moved to a systemd-backed system which 
offers web tools which do exactly what syslogng-web does, but using different
backends and tools.

Feel free to fork this!

## Installing syslogng-web

Follow the instructions below to setup a fully working copy of **syslogng-web** on your host.

### Configuring syslog-ng

For **syslogng-web** to work, it is necessary to enable MongoDB support. Ensure your syslog-ng copy
supports MongoDB before continuing.

You need to configure a mongodb destination and map it to a log source. Open up */etc/syslog-ng/syslog-ng.conf* 
and add the following lines:

```
destination mongodb { mongodb(); }
log { source(src); destination(mongodb); };
```

Additional options are available for the mongodb configuration. Please read 
[syslog-ng's documentation](https://www.balabit.com/sites/default/files/documents/syslog-ng-ose-3.3-guides/en/syslog-ng-ose-v3.3-guide-admin-en/html/configuring_destinations_mongodb.html) 
for further information.

When you are done editing */etc/syslog-ng/syslog-ng.conf*, restart the syslog-ng service.

### Configuring the database

By default the collection syslog-ng creates in MongoDB is not capped. However it needs to be for **syslogng-web** to work. To
convert the existing collection to capped, issue the following statements in a mongodb shell:

```
use syslog
db.runCommand({
    convertToCapped: 'messages'
    size: 100000
    });
```

This will make the *messages* collection capped at 100 000 bytes. Use a size that better suits your need if you want.

### Installing syslogng-web

Next you have to install a copy of **syslogng-web** on your server:

```
git clone https://github.com/nlaplante/syslogng-web.git
cd syslogng-web
```

Since **syslogng-web** is a node.js application, ensure you have the latest node.js version installed on your server. Then,
install the dependencies:

```
npm install
```

Next you need to install client libraries. This is done using [Bower](https://github.com/bower/bower). 
If you don't have it already, install it using:

```
npm install -g bower
```

Then, install the required client libraries with

```
bower install
```

### Configuration

Next, you need to tell **syslogng-web** how to connect to the MongoDB databases which holds the log messages. 
By default, the mongodb driver for syslog-ng creates a database named *syslog* and stores the log messages
in a collection called *messages*. If your setup is different, edit **config.json** and replace the host, 
port and/or collection configuration properties to suit your setup. If your database needs authentication (>= syslog-ng 3.6),
you need to fill the `username` and `password` options. Otherwise, leave them empty.

### Running

Running **syslogng-web** is as simple as running any other node.js application:

```
node app.js
```

To test if everything is working correctly, open a brower at *http://your-server:3000*. The log messages should appear 
shortly after. It is not necessary to reload the page to see changes, as **syslogng-web** uses socket.io to update
its content as it gets logged.

#### RC system integration

**syslogng-web** can be integrated in various RC systems. Since my main development machine is Gentoo Linux based,
I included an init script for Gentoo Linux. To install the init script:

```bash
sudo cp -rv resources/sysinit/gentoo/* /etc
```

Next, edit */etc/conf.d/syslogng-web* and modify the variables in there to suit your configuration. The file is
self-explaining so no need to document it here. It only assumes you cloned **syslogng-web** into */usr/local/share*.

#### Running with nginx

It is possible to run syslogng-web behind a reverse proxy like nginx. Here's a configuration sample for nginx:

```
server {
    listen your_server_ip;
    server_name domain_name_for_syslogng_web;

    access_log /path/to/access/log main;
    error_log /path/to/error/log info;

    location / {
            proxy_pass http://localhost:3000;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header Host $host;
    }

    location /socket.io/ {
            proxy_pass http://localhost:3000/socket.io/;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header Host $host;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
    }
}
```

