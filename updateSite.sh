#!/usr/bin/env sh

echo 'Updating website...'
git pull
echo 'Rendering...'
echo 'require("rmarkdown"); render_site(".");' | R --vanilla
echo 'Done!'
