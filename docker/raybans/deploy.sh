#!/bin/bash

set -exo pipefail

npm run-script build
./node_modules/.bin/surge --project ./dist --domain raybans.surge.sh
EXIT_CODE=$?

exit ${EXIT_CODE}
