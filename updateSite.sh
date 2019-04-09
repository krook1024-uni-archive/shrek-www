#!/usr/bin/env sh

echo 'Updating website...'
echo 'require("rmarkdown"); render_site(".");' | R --vanilla
echo 'Done!'
