#!/bin/bash

OLD_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjI1OTM4NzQsImV4cCI6MjAzODE2OTg3NH0.V46sINZHShqwFD5fP0xEA2ZDBE4qziqVQJJzubQD0ZE"

NEW_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U"

# Update all .js and .ts files (excluding dist and node_modules)
find . -type f \( -name "*.js" -o -name "*.ts" \) \
  -not -path "./node_modules/*" \
  -not -path "./dist/*" \
  -not -path "./.next/*" \
  -exec grep -l "$OLD_KEY" {} \; | while read file; do
  echo "Updating: $file"
  sed -i "s|$OLD_KEY|$NEW_KEY|g" "$file"
done

echo "✅ API keys updated successfully!"