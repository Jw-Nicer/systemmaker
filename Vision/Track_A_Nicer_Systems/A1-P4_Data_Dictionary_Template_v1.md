# Data Dictionary — Template (v1)

| Field | Type | Required | Description |
|---|---|---:|---|
| Work Item ID | text | yes | Unique ID |
| Title | text | yes | Short description |
| Status | select | yes | Stage |
| Owner | person | yes | Responsible party |
| Created At | datetime | yes | Created timestamp |
| Due Date | date | optional | Target date |
| Stuck Reason | select | conditional | Required if stuck |
| Closed At | datetime | optional | Done timestamp |
