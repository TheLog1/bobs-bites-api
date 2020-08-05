#!/bin/bash

API="http://localhost:4741"
URL_PATH="/reports"

curl "${API}${URL_PATH}" \
  --include \
  --request POST \
  --header "Content-Type: application/json" \
  --header "Authorization: Bearer ${TOKEN}" \
  --data '{
    "report": {
      "species": "'"${SPECIES}"'",
      "potency": "'"${POTENCY}"'",
      "info": "'"${INFO}"'",
      "medicallySignificant": "'"${MEDICALLYSIGNIFICANT}"'"
    }
  }'

echo
