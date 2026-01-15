#!/bin/bash

# Install API dependencies
cd /home/site/wwwroot/api
npm install --production

# Start the server
exec node server.mjs
