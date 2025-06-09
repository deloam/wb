#!/bin/bash

docker run --rm \
  -v "${PWD}:/project" \
  -w /project \
  electronuserland/builder:wine \
  /bin/bash -c "npm install && npm run build --win"
