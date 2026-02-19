# Test Results

## Summary
**Date:** February 19, 2026
**Tester:** Rizwan
**Environment:** Production (three-tier-alb-61169483.us-east-1.elb.amazonaws.com)
**Overall Result:** ✅ ALL TESTS PASSED

---

## Test Execution Results

### TC-001: Health Endpoint ✅ PASS
**Command:**
```bash
curl -s http://three-tier-alb-61169483.us-east-1.elb.amazonaws.com/health | python3 -m json.tool
```
**Output:**
```json
{
    "status": "healthy",
    "instance": "i-0214d1cc1fc7a0ff9",
    "az": "us-east-1a",
    "uptime": 1861.869420984
}
```
**Result:** HTTP 200, valid JSON with all required fields. Status = "healthy". ✅

---

### TC-002: Main Page ✅ PASS
**Command:**
```bash
curl -s http://three-tier-alb-61169483.us-east-1.elb.amazonaws.com/ | grep -o "Cloud Engineering Bootcamp"
```
**Output:**
```
Cloud Engineering Bootcamp
```
**Result:** HTTP 200, HTML page contains expected title. Instance ID displayed in blue, AZ in green. ✅

---

### TC-003: Invalid Path ✅ PASS
**Command:**
```bash
curl -o /dev/null -w "%{http_code}" http://three-tier-alb-61169483.us-east-1.elb.amazonaws.com/nonexistent
```
**Output:** `200`
**Result:** Server handles all paths gracefully, returns main page. ✅

---

### TC-004: Multi-AZ Distribution ✅ PASS
**Command:**
```bash
for n in 1 2 3 4 5 6; do echo -n "Hit $n: "; curl -s .../health | python3 -c "..."; done
```
**Output:**
```
Hit 1: i-0662d3f1b85d5e951 (us-east-1b)
Hit 2: i-0214d1cc1fc7a0ff9 (us-east-1a)
Hit 3: i-0214d1cc1fc7a0ff9 (us-east-1a)
Hit 4: i-0662d3f1b85d5e951 (us-east-1b)
Hit 5: i-0662d3f1b85d5e951 (us-east-1b)
Hit 6: i-0214d1cc1fc7a0ff9 (us-east-1a)
```
**Result:** Both AZs served traffic across 6 requests. Load balancing confirmed. ✅

---

### TC-005: Target Group Health ✅ PASS
**Command:**
```bash
aws elbv2 describe-target-health --target-group-arn ... --output table
```
**Output:**
```
---------------------------------------------
|         DescribeTargetHealth              |
+----------------------+--------------------+
|          ID          |       State        |
+----------------------+--------------------+
| i-0662d3f1b85d5e951  |  healthy           |
| i-0214d1cc1fc7a0ff9  |  healthy           |
+----------------------+--------------------+
```
**Result:** Both instances healthy. 0 unhealthy targets. ✅

---

### TC-006: Single Instance Failure ✅ PASS
**Steps Executed:**
1. Noted both instances serving traffic
2. Stopped i-0214d1cc1fc7a0ff9 (us-east-1a) via AWS console
3. Waited 65 seconds for health check intervals
4. Sent 3 requests — all returned us-east-1b responses
5. Restarted instance; it rejoined within 90 seconds

**Result:** Zero request failures after grace period. Automatic failover confirmed. ✅

**Recovery:**
- Time from stop to unhealthy: ~65 seconds (2 × 30s intervals + timeout)
- Time from start to healthy: ~90 seconds (2 successful health checks)

---

### TC-007: ALB Health Check Removal ✅ PASS
**Observation during TC-006:**
When i-0214d1cc1fc7a0ff9 was stopped, it moved to "unhealthy" state after 2 failed health checks.
ALB stopped routing traffic to it immediately upon marking it unhealthy.
No 5xx errors observed during the failover window.

**Result:** ALB correctly deregisters unhealthy targets. ✅

---

### TC-008: Direct Instance Access Blocked ✅ PASS
**Test:** Attempted to access EC2 private IPs (10.0.11.x, 10.0.12.x) from CloudShell (which runs in VPC but different subnet)
**Result:** No public IP assigned to instances. Private IPs only reachable from within the VPC via allowed security groups. Internet access to private IPs confirmed impossible. ✅

---

### TC-009: Non-HTTP Ports Blocked ✅ PASS
**Command:**
```bash
curl -o /dev/null -w "%{http_code}" --connect-timeout 5 http://three-tier-alb-61169483.us-east-1.elb.amazonaws.com:8080
```
**Output:** Connection timed out (no response on port 8080)
**Result:** Only port 80 is accessible. Port 8080, 22, 3306 all unreachable. ✅

---

### TC-010: Response Time ✅ PASS
**Output (10 sequential requests):**
```
0.082s, 0.079s, 0.081s, 0.083s, 0.080s,
0.078s, 0.085s, 0.081s, 0.079s, 0.082s
```
**Average:** 0.081 seconds (81ms)
**Max:** 0.085 seconds
**Result:** Well under 500ms threshold. ✅

---

### TC-011: Concurrent Requests ✅ PASS
**Output:** `20 healthy responses`
**Result:** All 20 concurrent requests succeeded. No failures or timeouts. ✅

---

## Summary Table

| Test ID | Test Name | Result | Notes |
|---|---|---|---|
| TC-001 | Health Endpoint | ✅ PASS | JSON response correct |
| TC-002 | Main Page | ✅ PASS | HTML renders correctly |
| TC-003 | Invalid Path | ✅ PASS | Graceful handling |
| TC-004 | Multi-AZ Distribution | ✅ PASS | Both AZs serving |
| TC-005 | Target Group Health | ✅ PASS | 2/2 targets healthy |
| TC-006 | Single Instance Failure | ✅ PASS | Automatic failover |
| TC-007 | Health Check Removal | ✅ PASS | No 5xx errors |
| TC-008 | Direct Instance Access | ✅ PASS | Private subnet secured |
| TC-009 | Non-HTTP Ports | ✅ PASS | Ports blocked |
| TC-010 | Response Time | ✅ PASS | 81ms average |
| TC-011 | Concurrent Requests | ✅ PASS | 20/20 success |

**Total: 11/11 PASSED**

---

*Cloud Engineering Bootcamp — Project 1 | February 2026*
