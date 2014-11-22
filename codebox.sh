#! /bin/bash
cd .
echo "codebox started: `date`" >> ./codebox.log
nohup node ./node_modules/codebox/bin/codebox.js run ./ -p 3001 -u USERNAME:PASSWORD,guest:havoc42c >> ./codebox.log 2>&1 &
