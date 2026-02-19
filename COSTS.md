# Cost Analysis

## Overview

This document provides a detailed cost breakdown for the three-tier AWS architecture running in us-east-1 (N. Virginia), with optimization strategies and scaling projections.

---

## Itemized Monthly Cost Breakdown

### Current Architecture (Bootcamp Configuration)

| Service | Resource | Unit Cost | Quantity | Monthly Cost |
|---|---|---|---|---|
| **EC2** | t3.micro (On-Demand) | $0.0104/hr | 2 instances × 730 hrs | **$15.18** |
| **ALB** | Application Load Balancer | $0.008/hr | 1 ALB × 730 hrs | **$5.84** |
| **ALB** | LCU (Load Balancer Capacity Units) | $0.008/LCU-hr | ~1 LCU (low traffic) | **~$0.08** |
| **NAT Gateway** | NAT GW hourly charge | $0.045/hr | 2 NAT GWs × 730 hrs | **$65.70** |
| **NAT Gateway** | Data processed | $0.045/GB | ~1 GB/month | **~$0.05** |
| **EIP** | Elastic IP (in-use) | $0.005/hr | 2 EIPs × 730 hrs | **$7.30** |
| **EBS** | gp2 storage | $0.10/GB-month | 2 × 8 GB = 16 GB | **$1.60** |
| **Data Transfer** | Outbound to internet | $0.09/GB | ~5 GB/month | **~$0.45** |
| | | | **TOTAL** | **~$96.20/month** |

> **Note:** Free Tier offsets: 750 hrs/month t2.micro (but we use t3.micro, so not eligible). New accounts get 12 months free tier for some services.

---

### Cost Driver Analysis

**NAT Gateways ($65.70/month — 68% of total cost)**
Two NAT Gateways are the dominant cost. Each costs $0.045/hr = $32.85/month regardless of traffic. This is the trade-off for AZ-level fault tolerance.

**EC2 Instances ($15.18/month)**
Two t3.micro instances at $0.0104/hr each. This is very economical for a bootcamp workload.

**ALB ($5.84/month)**
The ALB base cost is fixed per hour. LCU costs scale with traffic but are minimal at bootcamp traffic levels.

---

## Cost Optimization Strategies

### Strategy 1: Reserved Instances (EC2)
- **Savings:** 30-60% vs On-Demand
- **1-year No Upfront:** t3.micro = ~$0.0067/hr → $9.80/month for 2 instances
- **3-year All Upfront:** t3.micro → effectively ~$0.0042/hr
- **ROI:** Breaks even in ~3 months vs On-Demand

### Strategy 2: Savings Plans
- **Compute Savings Plans** apply to any EC2 instance family/size/region
- 1-year commitment: up to 40% savings
- More flexible than Reserved Instances (family-agnostic)

### Strategy 3: Single NAT Gateway (Dev/Test)
- For non-production environments, use a single NAT Gateway
- **Savings:** $32.85/month (eliminate one NAT GW)
- **Trade-off:** Loss of AZ-level NAT redundancy

### Strategy 4: Auto Scaling + Spot Instances
- Use Spot Instances for non-critical compute (up to 90% savings)
- t3.micro Spot: ~$0.004/hr vs $0.0104/hr On-Demand
- **Savings:** ~61% on EC2 if using Spot for stateless app tier
- **Risk:** Spot interruptions (2-min warning); need graceful shutdown

### Strategy 5: Schedule-Based Scaling
- Stop EC2 instances during off-hours (e.g., 8pm–8am for bootcamp demo)
- 12 hours off = 50% EC2 savings = ~$7.59/month saved
- Use AWS Instance Scheduler or EventBridge + Lambda

---

## ROI Analysis for Optimizations

| Strategy | Monthly Saving | Annual Saving | Implementation Cost | Payback |
|---|---|---|---|---|
| Reserved Instances (1yr) | $5.38 | $64.56 | 0 (pre-pay) | Immediate |
| Single NAT GW (dev) | $32.85 | $394.20 | 0 | Immediate |
| Spot Instances | $9.22 | $110.64 | 2 hrs engineering | 1 month |
| Schedule-Based Scaling | $7.59 | $91.08 | 1 hr engineering | Immediate |
| **All combined (dev)** | **~$50** | **~$600** | 3 hrs total | 1 month |

---

## Scaling Cost Projections

### Scenario 1: Small Production (10x traffic)
| Service | Change | Added Cost |
|---|---|---|
| EC2 | 4 instances t3.small | +$29.20/month |
| ALB LCUs | 10x traffic → 10 LCUs | +$5.84/month |
| NAT GW Data | 10 GB/month | +$0.45/month |
| **Total increase** | | **+$35.49/month** |
| **New total** | | **~$131.69/month** |

### Scenario 2: Medium Production (100x traffic, 10k req/min)
| Service | Change | Cost |
|---|---|---|
| EC2 | 8× t3.medium + ASG | ~$95/month |
| RDS | db.t3.medium Multi-AZ | ~$100/month |
| ALB | High LCU usage | ~$30/month |
| NAT GW | 100 GB data | ~$74/month |
| CloudFront CDN | Cache static assets | ~$10/month |
| **Estimated Total** | | **~$309/month** |

### Scenario 3: Large Production (1M req/day)
| Service | Configuration | Estimated Monthly |
|---|---|---|
| EC2 (ASG) | 4-20× t3.large | $200-1,000 |
| RDS Multi-AZ | db.r5.large | $300 |
| ElastiCache | cache.t3.medium | $50 |
| ALB | High traffic | $50-100 |
| CloudFront | 1 TB transfer | $85 |
| **Range** | | **$685–$1,535/month** |

---

## Cost Monitoring Recommendations

1. **AWS Budgets:** Set alert at $100/month with email notification.
2. **Cost Explorer:** Weekly review of service-level costs.
3. **Trusted Advisor:** Free tier checks for idle resources (unused EIPs, underutilized instances).
4. **AWS Cost Anomaly Detection:** Auto-alert when spend pattern changes unexpectedly.

---

## Free Tier Utilization

For new AWS accounts (first 12 months):
- EC2: 750 hrs/month t2.micro (not applicable — we use t3.micro)
- EBS: 30 GB gp2 free (we use 16 GB — **free!**)
- ALB: Not included in free tier
- NAT Gateway: Not included in free tier
- Data Transfer: 1 GB/month outbound free (we use ~5 GB — first 1 GB free)

**Effective cost with free tier:** ~$94.55/month (minimal savings since NAT GW dominates)

---

*Cloud Engineering Bootcamp — Project 1 | February 2026*
