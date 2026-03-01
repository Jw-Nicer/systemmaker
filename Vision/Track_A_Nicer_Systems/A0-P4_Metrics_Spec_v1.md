# Standard Metrics Spec (v1)

**Purpose:** Standardize definitions across all clients so reporting is comparable.

## Core Metrics
### 1) Cycle Time
**Definition:** Time from record created → record closed.  
**Formula:** closed_at - created_at

### 2) Stage Cycle Time
**Definition:** Time spent in each stage.  
**Formula:** stage_exit_time - stage_enter_time

### 3) Work-in-Progress (WIP)
**Definition:** Count of open items not in “Done/Closed.”  
**Formula:** count(status != closed)

### 4) Stuck Items
**Definition:** Items exceeding a stage-specific threshold.

### 5) SLA Breach Rate
**Definition:** % of items closed after due date / SLA target.  
**Formula:** breached / closed_items

### 6) Missing-Data Rate
**Definition:** % of open items missing at least one required field.  
**Formula:** items_missing_required / total_open_items

### 7) Rework / Reopen Rate
**Definition:** % of items reopened after closure (or returned to earlier stage).  
**Formula:** reopened / closed_items

## Stuck Reason Codes (minimum)
- WAIT_APPROVAL
- WAIT_CUSTOMER
- WAIT_VENDOR
- MISSING_INFO
- PRIORITY_CHANGE
- SCHEDULING_CONFLICT
- INTERNAL_CAPACITY
- TOOL_ACCESS
- OTHER
