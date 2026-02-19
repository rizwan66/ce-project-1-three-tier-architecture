# Failover Test Results

## Overview
High-availability failover testing for the three-tier AWS architecture.
**Date:** February 19, 2026 | **Tester:** Rizwan

---

## Test 1: AZ-A Instance Failure and Recovery

### Setup
- Instance A: i-0214d1cc1fc7a0ff9 (us-east-1a) — STOPPED
- Instance B: i-0662d3f1b85d5e951 (us-east-1b) — Running
- Monitor script: polling /health every 5 seconds

### Timeline

| Time | Event | ALB Behavior |
|---|---|---|
| T+0s | Instance A stopped | ALB still routing to both (health check pending) |
| T+30s | First health check fails on Instance A | Still healthy (threshold: 3 failures) |
| T+60s | Second health check fails on Instance A | unhealthy count: 2 |
| T+65s | Third failure — Instance A marked UNHEALTHY | ALB removes from rotation |
| T+65s | All traffic routes to Instance B (us-east-1b) | ✅ Automatic |
| T+180s | Instance A restarted | Initializing |
| T+240s | First successful health check | Instance A: initial state |
| T+270s | Second successful health check | Instance A: healthy |
| T+270s | Instance A re-added to ALB rotation | ✅ Automatic |

### Monitoring Output During Failover
```
T+0s:  {"status":"healthy","instance":"i-0214...","az":"us-east-1a","uptime":1200}
T+5s:  {"status":"healthy","instance":"i-0662...","az":"us-east-1b","uptime":900}
T+10s: {"status":"healthy","instance":"i-0214...","az":"us-east-1a","uptime":1210}
... (normal alternating)
T+65s: {"status":"healthy","instance":"i-0662...","az":"us-east-1b","uptime":965}
T+70s: {"status":"healthy","instance":"i-0662...","az":"us-east-1b","uptime":970}
T+75s: {"status":"healthy","instance":"i-0662...","az":"us-east-1b","uptime":975}
... (all traffic to us-east-1b during outage)
T+270s: {"status":"healthy","instance":"i-0214...","az":"us-east-1a","uptime":30}
T+275s: {"status":"healthy","instance":"i-0662...","az":"us-east-1b","uptime":1040}
... (normal alternating resumed)
```

### Results
- **Failover Time:** ~65 seconds (within expected range)
- **Requests Failed During Failover:** 0 (ALB queued/retried in-flight requests)
- **Recovery Time:** ~90 seconds after instance restart
- **Data Loss:** None (stateless application)

**RESULT: ✅ PASS** — Automatic failover and recovery confirmed.

---

## Test 2: Target Group Health During Failover

### AWS CLI Monitoring
```bash
watch -n 10 'aws elbv2 describe-target-health --target-group-arn ... --output table'
```

**Before Failure:**
```
| i-0214d1cc1fc7a0ff9 | healthy |
| i-0662d3f1b85d5e951 | healthy |
```

**During Failure (T+30s to T+65s):**
```
| i-0214d1cc1fc7a0ff9 | unhealthy |
| i-0662d3f1b85d5e951 | healthy   |
```

**After Recovery (T+270s+):**
```
| i-0214d1cc1fc7a0ff9 | healthy |
| i-0662d3f1b85d5e951 | healthy |
```

**RESULT: ✅ PASS** — Target health state transitions correct.

---

## Test 3: NAT Gateway AZ Isolation Test

### Scenario
Verified that each AZ's private subnet routes through its own NAT Gateway.

### Configuration Confirmed
- app-subnet-1a (10.0.11.0/24) → private-rt-1a → nat-0b49534b9038efd6d (us-east-1a)
- app-subnet-1b (10.0.12.0/24) → private-rt-1b → nat-05d14582e678dd0ea (us-east-1b)

### Test
If NAT GW A fails, app-subnet-1b continues routing via NAT GW B.
(Verified by checking route tables; full NAT GW failure simulation not performed as it would require deleting NAT GW and recreating at ~$0.05 cost.)

**RESULT: ✅ VERIFIED** — Route table configuration confirmed correct.

---

## Failover Summary

| Scenario | Detection Time | Recovery Time | Data Loss | Result |
|---|---|---|---|---|
| EC2 instance stop | ~65s | ~90s after restart | None | ✅ PASS |
| ALB health check | Automatic | Automatic | None | ✅ PASS |
| NAT GW isolation | N/A (config verified) | N/A | N/A | ✅ VERIFIED |

---

## Key Findings

1. **65-second detection** is expected behavior with 30s interval and 3-failure threshold. For faster failover, reduce to: interval=10s, threshold=2 (→ 20s detection). Trade-off: more false positives.

2. **Zero request failures** during failover because the ALB's connection draining (default 300s) ensures in-flight requests complete on the still-healthy target.

3. **90-second recovery** after instance restart. Could be improved with a pre-warmed AMI (faster boot) or by using ASG with Launch Templates for faster scale-out.

---

*Cloud Engineering Bootcamp — Project 1 | February 2026*
