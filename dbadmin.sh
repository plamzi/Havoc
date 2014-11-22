#! /bin/bash
cd .
echo "express admin started: `date`" >> ./dbadmin.log
nohup node node_modules/express-admin/app.js ./dbadmin/ >> ./dbadmin.log 2>&1 &
