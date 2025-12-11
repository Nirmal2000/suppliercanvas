#!/usr/bin/env bash
FILE="$1"

if [[ ! -f "$FILE" ]]; then
  echo "Usage: $0 /path/to/image"
  exit 1
fi

# compress image to temp jpg (80% quality) -> zipsize
TMP="/tmp/mic_upload.jpg"
sips -s format jpeg -s formatOptions 80 "$FILE" --out "$TMP"

orgsize=$(stat -f%z "$FILE")
zipsize=$(stat -f%z "$TMP")

WIDTH=$(sips -g pixelWidth "$FILE" | awk '/pixelWidth/ {print $2}')
HEIGHT=$(sips -g pixelHeight "$FILE" | awk '/pixelHeight/ {print $2}')

echo "original size: $orgsize"
echo "zipped size:   $zipsize"
echo "dimensions:    $WIDTH x $HEIGHT"

curl 'https://file.made-in-china.com/img-search/upload' \
  -X POST \
  -H 'accept: */*' \
  -H 'origin: https://www.made-in-china.com' \
  -H 'referer: https://www.made-in-china.com/' \
  -H 'user-agent: Mozilla/5.0' \
  -F "multipartFile=@${TMP};type=image/jpeg" \
  -F "orgwidth=${WIDTH}" \
  -F "orgheight=${HEIGHT}" \
  -F "zipsize=${zipsize}" \
  -F "orgsize=${orgsize}"
