# Test Plan

## Overview
Testing methodology for the Cloud Engineering Bootcamp Project 1 Three-Tier Architecture.

## Test Environment
- **ALB DNS:** three-tier-alb-61169483.us-east-1.elb.amazonaws.com
- **Test Date:** February 2026
- **Tester:** Rizwan (Cloud Engineer)

---

## Test Categories

### 1. Functional Testing
Verify that the application responds correctly to all requests.

#### TC-001: Health Endpoint
- **Test:** GET /health returns valid JSON
- **Command:** `curl http://three-tier-alb-61169483.us-east-1.elb.amazonaws.com/health`
- **Expected:** HTTP 200, JSON with keys: status, instance, az, uptime
- **Pass Criteria:** status = "healthy", instance starts with "i-"

#### TC-002: Main Page
- **Test:** GET / returns HTML page
- **Command:** `curl -s http://three-tier-alb-61169483.us-east-1.elb.amazonaws.com/ | grep "Cloud Engineering"`
- **Expected:** HTTP 200, HTML containing "Cloud Engineering Bootcamp"
- **Pass Criteria:** Response contains title text

#### TC-003: Invalid Path
- **Test:** GET /nonexistent returns some response (not connection refused)
- **Command:** `curl -o /dev/null -w "%{http_code}" http://three-tier-alb-61169483.us-east-1.elb.amazonaws.com/nonexistent`
- **Expected:** HTTP 200 (server handles all paths gracefully)
- **Pass Criteria:** Server responds (connection not refused)

---

### 2. Load Balancing Testing
Verify that the ALB distributes traffic across both AZs.

#### TC-004: Multi-AZ Distribution
- **Test:** Send 6 requests, verify both AZs appear
- **Command:**
  ```bash
  for n in 1 2 3 4 5 6; do
    curl -s http://three-tier-alb-61169483.us-east-1.elb.amazonaws.com/health | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['az'])"
  done
  ```
- **Expected:** Both "us-east-1a" and "us-east-1b" appear in output
- **Pass Criteria:** At least 1 response from each AZ

#### TC-005: Target Group Health
- **Test:** Both targets show "healthy" in AWS CLI
- **Command:**
  ```bash
  aws elbv2 describe-target-health \
    --target-group-arn arn:aws:elasticloadbalancing:us-east-1:677746514416:targetgroup/app-tier-tg/7045efef0d77780c \
    --query 'TargetHealthDescriptions[*].{ID:Target.Id,State:TargetHealth.State}' \
    --output table
  ```
- **Expected:** Both i-0214d1cc1fc7a0ff9 and i-0662d3f1b85d5e951 show "healthy"
- **Pass Criteria:** 0 unhealthy targets

---

### 3. High Availability Testing
Verify system resilience when one instance fails.

#### TC-006: Single Instance Failure
- **Test:** Stop one EC2 instance; verify traffic continues via the other
- **Steps:**
  1. Note current instances serving traffic
  2. Stop instance i-0214d1cc1fc7a0ff9 (us-east-1a)
  3. Wait 60 seconds for health check to fail
  4. Send 3 requests to ALB
  5. Verify all responses come from us-east-1b
  6. Restart instance
- **Pass Criteria:** Zero request failures after 60s grace period

#### TC-007: ALB Health Check Removal
- **Test:** Verify unhealthy instance is removed from rotation
- **Steps:**
  1. SSH into instance (if accessible) or simulate failure
  2. Monitor target health until status changes to "unhealthy"
  3. Verify ALB stops routing to that target
- **Pass Criteria:** No 5xx errors after instance marked unhealthy

---

### 4. Security Testing
Verify security group rules are effective.

#### TC-008: Direct Instance Access Blocked
- **Test:** Attempt direct HTTP access to EC2 private IP from outside VPC
- **Expected:** Connection times out (private subnet, no public IP)
- **Pass Criteria:** Connection not possible from internet

#### TC-009: Non-HTTP Ports Blocked on ALB
- **Test:** Attempt connection to ALB on port 22, 443, 8080
- **Command:** `curl -o /dev/null -w "%{http_code}" --connect-timeout 5 http://three-tier-alb-61169483.us-east-1.elb.amazonaws.com:8080`
- **Expected:** Connection refused or timeout
- **Pass Criteria:** Cannot connect on non-configured ports

---

### 5. Performance Testing
Basic performance verification.

#### TC-010: Response Time
- **Test:** 10 sequential requests, measure average response time
- **Command:** `for i in {1..10}; do curl -o /dev/null -s -w "%{time_total}\n" http://three-tier-alb-61169483.us-east-1.elb.amazonaws.com/health; done`
- **Pass Criteria:** Average < 500ms, no request > 2s

#### TC-011: Concurrent Requests
- **Test:** Send 20 concurrent requests
- **Command:** 
  ```bash
  seq 20 | xargs -P 20 -I{} curl -s http://three-tier-alb-61169483.us-east-1.elb.amazonaws.com/health | python3 -c "import sys; lines=sys.stdin.read(); print(lines.count('healthy'), 'healthy responses')"
  ```
- **Pass Criteria:** All 20 responses are healthy

---

## Test Execution Order
1. TC-005 (Target Health) — prerequisite for all tests
2. TC-001, TC-002, TC-003 (Functional)
3. TC-004 (Load Balancing)
4. TC-010, TC-011 (Performance)
5. TC-006, TC-007 (HA — destructive tests last)
6. TC-008, TC-009 (Security)

---

*Cloud Engineering Bootcamp — Project 1 | February 2026*
