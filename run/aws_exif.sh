#!/bin/bash
#

## --> https://www.sno.phy.queensu.ca/~phil/exiftool/

## Extract tags
exiftool ~/Projects/skicyclerun.img/PhotoLib/Export/BlackWhite
##exiftool -filename -gpslatitude -gpslongitude -T ~/Projects/skicyclerun.img/PhotoLib/Export/BlackWhite

## rename photolib to CNAME value and place in new directory
##
##exiftool -r -ee -ext jpg ~/Projects/skicyclerun.img/PhotoLib/ | grep 'Create Date'
##exiftool "-FileName<CreateDate" -r -ext jpg \
##-d "../PhotoLib/exifRun/%Y%m%d_%H%M%S%%-c.%%e" ~/Projects/skicyclerun.img/PhotoLib/

## https://sno.phy.queensu.ca/~phil/exiftool/geotag.html
##exiftool -fileOrder gpsdatetime -p ./exifgpxhtml.fmt ../PhotoLib/exifRun

##exiftool -r ~/Projects/skicyclerun.img/PhotoLib/Instagram
##exiftool "-FileName<GPSTimeStamp" -r \
##-d "../public/%Y%m%d_%H%M%S.%%e" ~/Projects/skicyclerun.img/PhotoLib/


## https://www.sno.phy.queensu.ca/~phil/exiftool/
##exiftool -r -ext HEIC ~/Projects/skicyclerun.img/PhotoLib/ | grep 'Create Date'
##exiftool "-FileName<CreateDate" -r -ext HEIC \
##-d "../public/%Y%m%d_%H%M%S.%%e" ~/Projects/skicyclerun.img/PhotoLib/

##exiftool -r -ee -ext mov ~/Projects/skicyclerun.img/PhotoLib/ | grep 'Media Create Date'
##exiftool "-FileName<MediaCreateDate" -r -ee -ext mov \
##-d "../public/%Y%m%d_%H%M%S.%%e" ~/Projects/skicyclerun.img/PhotoLib/


# find ~/Projects/skicyclerun.img/PhotoLib -not -empty -type d \
# -exec exiftool "-FileName<CreateDate" -d "../public/%Y%m%d_%H%M%S.%%e"  {} +

# Layout
### exiftool -r ext jpg ~/Projects/skicyclerun.img/PhotoLib/Layout | grep 'File Modification Date/Time'
