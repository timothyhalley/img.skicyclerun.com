#!/bin/bash
#
# aws s3 sync ~/Projects/img.skicyclerun.com s3://img.skicyclerun.com \
#   --exclude "_cdate/*" \
#   --exclude "_export/*" \
#   --exclude "_final/*" \
#   --exclude "!run/*" \
#   --exclude ".git/*" \
#   --exclude ".gitignore" \
#   --exclude '*.DS_Store' \
#   --delete

aws s3 sync ~/Projects/SkiCycleRun/PhotoLib/albums s3://img.skicyclerun.com \
  --exclude '*' \
  --exclude '*.DS_Store' \
  --include "*.jpg" \
  --include "*.png" \
  --include "*.mov" \
  --include "*.json"
