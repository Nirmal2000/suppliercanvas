#!/bin/bash

# Default to opengraph-image.png if no argument provided
IMAGE="${1:-app/opengraph-image.png}"
URL="http://localhost:3000/api/search/alibaba/product"

if [ ! -f "$IMAGE" ]; then
    echo "Error: Image file '$IMAGE' not found."
    echo "Usage: $0 <path-to-image>"
    exit 1
fi

echo "Testing Alibaba Image Search with $IMAGE..."
echo "Target URL: $URL"

# Send POST request
curl -X POST \
  -F "image=@$IMAGE" \
  "$URL"

echo -e "\n\nDone."
