# Alert Rules Library (v1)

## Stuck Alert
Trigger: Days in stage > threshold  
Recipient: Owner  
Escalation: If > 2x threshold → workflow owner

## Missing Data Alert
Trigger: required fields empty  
Recipient: Owner/creator  
Escalation: missing > 48 hours → workflow owner

## SLA Risk Alert
Trigger: due within 3 days (and not closed)  
Recipient: Owner + workflow owner
