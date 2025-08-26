#!/bin/bash

# Script: check_cdn_versions.sh
# Function: Check if there are new versions for JS libraries referenced via CDN in an HTML file
# Usage: ./check_cdn_versions.sh <HTML file path>

set -e  # Exit on error

HTML_FILE=$1
if [ -z "$HTML_FILE" ] || [ ! -f "$HTML_FILE" ]; then
    echo "Error: Please provide a valid HTML file path"
    echo "Usage: $0 <HTML file path>"
    exit 1
fi

# Temporary file to store extracted library information
TEMP_FILE=$(mktemp)

# Extract all script tag src attributes from the HTML file
echo "Analyzing CDN references in $HTML_FILE..."
awk '
BEGIN { RS="</script>"; ORS=""; }
{
    if (match($0, /<script[^>]*src=["'"'"']([^"'"'"']*)["'"'"']/, m)) {
        print m[1] "\n"
    }
}
' "$HTML_FILE" > "$TEMP_FILE"

# Check if any CDN references were found
if [ ! -s "$TEMP_FILE" ]; then
    echo "No CDN references found"
    rm "$TEMP_FILE"
    exit 0
fi


# Counter
UPDATE_AVAILABLE=0
LIBRARY_COUNT=0

echo "Checking library versions..."
echo "----------------------------------------"

# Process each CDN link
while IFS= read -r CDN_URL; do

    # Skip non-cdnjs links
    if [[ ! "$CDN_URL" =~ cdnjs\.cloudflare\.com ]]; then
        continue
    fi
    
    # Extract library name and version from the URL
    # Format: https://cdnjs.cloudflare.com/ajax/libs/library_name/version/filename
    if [[ "$CDN_URL" =~ /ajax/libs/([^/]+)/([^/]+)/ ]]; then
        LIBRARY_NAME="${BASH_REMATCH[1]}"
        CURRENT_VERSION="${BASH_REMATCH[2]}"
        LIBRARY_COUNT=$((LIBRARY_COUNT + 1))
        
        echo "Checking $LIBRARY_NAME..."
        echo "Current version: $CURRENT_VERSION"
        
        # Call cdnjs API to get the latest version information
        API_URL="https://api.cdnjs.com/libraries/${LIBRARY_NAME}?fields=version"
        LATEST_VERSION=$(curl -s "$API_URL" | grep -o '"version":"[^"]*"' | cut -d'"' -f4)
        
        if [ -n "$LATEST_VERSION" ]; then
            echo "Latest version: $LATEST_VERSION"
            
            # Compare versions
            if [ "$CURRENT_VERSION" != "$LATEST_VERSION" ]; then
                echo "⚠️  Update available: $CURRENT_VERSION -> $LATEST_VERSION"
                UPDATE_AVAILABLE=1
            else
                echo "✅ Already on the latest version"
            fi
        else
            echo "❌ Failed to retrieve latest version information"
        fi
        echo "----------------------------------------"
    fi
done < "$TEMP_FILE"

rm "$TEMP_FILE"

echo "Check completed! Total libraries checked: $LIBRARY_COUNT."

if [ $UPDATE_AVAILABLE -eq 1 ]; then
    echo "❌ Libraries requiring updates found"
    exit 1  # Non-zero exit code indicates updates are available
else
    echo "✅ All libraries are up to date"
    exit 0
fi