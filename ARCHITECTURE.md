# Architecture Documentation

## Overview

This document provides detailed architecture documentation for the Cloud Engineering Bootcamp Project 1: Three-Tier Architecture on AWS.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         INTERNET                                     │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
            ┌───────────────▼───────────────┐
            │    Application Load Balancer   │
            │    (three-tier-alb)            │
            │    internet-facing, HTTP:80    │
            │    Security Group: alb-sg      │
            └──────┬─────────────┬──────────┘
                   │             │
        ┌──────────▼──┐     ┌───▼──────────┐
        │ Public      │     │ Public       │
        │ Subnet 1a   │     │ Subnet 1b    │
        │ 10.0.1.0/24 │     │ 10.0.2.0/24  │
        │ NAT GW A    │     │ NAT GW B     │
        └──────┬──────┘     └───┬──────────┘
               │                │
        ┌──────▼──────┐     ┌───▼──────────┐
        │ App Subnet  │     │ App Subnet   │
        │ 1a          │     │ 1b           │
        │ 10.0.11.0/24│     │ 10.0.12.0/24 │
        │ nodejs-app  │     │ nodejs-app   │
        │ i-0214d1... │     │ i-0662d3...  │
        │ t3.micro    │     │ t3.micro     │
        └──────┬──────┘     └───┬──────────┘
               │                │
        ┌──────▼──────┐     ┌───▼──────────┐
        │ DB Subnet   │     │ DB Subnet    │
        │ 1a          │     │ 1b           │
        │ 10.0.21.0/24│     │ 10.0.22.0/24 │
        │ (Reserved   │     │ (Reserved    │
        │  for RDS)   │     │  for RDS)    │
        └─────────────┘     └──────────────┘

VPC CIDR: 10.0.0.0/16
Region: us-east-1
```

---

## Component Descriptions

### VPC (Virtual Private Cloud)
- **ID:** vpc-0b3a78890d76d929f
- **CIDR:** 10.0.0.0/16
- **Name:** three-tier-vpc
- **Purpose:** Provides network isolation for all resources. The /16 CIDR gives 65,536 IP addresses, subdivided into six /24 subnets (256 IPs each) across two AZs.

### Subnets

| Subnet Name | CIDR | AZ | Type | Purpose |
|---|---|---|---|---|
| public-subnet-1a | 10.0.1.0/24 | us-east-1a | Public | ALB, NAT GW A |
| public-subnet-1b | 10.0.2.0/24 | us-east-1b | Public | ALB, NAT GW B |
| app-subnet-1a | 10.0.11.0/24 | us-east-1a | Private | EC2 nodejs-app-1a |
| app-subnet-1b | 10.0.12.0/24 | us-east-1b | Private | EC2 nodejs-app-1b |
| data-subnet-1a | 10.0.21.0/24 | us-east-1a | Private | Reserved for RDS |
| data-subnet-1b | 10.0.22.0/24 | us-east-1b | Private | Reserved for RDS |

### Internet Gateway
- Attached to the VPC, enables inbound/outbound internet traffic for public subnets.
- Public route tables route 0.0.0.0/0 → IGW.

### NAT Gateways
- **NAT GW A:** nat-0b49534b9038efd6d in public-subnet-1a
- **NAT GW B:** nat-05d14582e678dd0ea in public-subnet-1b
- Each NAT Gateway has an Elastic IP for consistent outbound addressing.
- Private route tables route 0.0.0.0/0 → their respective AZ's NAT Gateway.

### Route Tables

| Route Table | Associated Subnets | 0.0.0.0/0 Target |
|---|---|---|
| public-rt | public-subnet-1a, public-subnet-1b | Internet Gateway |
| private-rt-1a | app-subnet-1a, data-subnet-1a | NAT GW A |
| private-rt-1b | app-subnet-1b, data-subnet-1b | NAT GW B |

### Application Load Balancer (ALB)
- **Name:** three-tier-alb
- **DNS:** three-tier-alb-61169483.us-east-1.elb.amazonaws.com
- **Type:** Application (Layer 7), Internet-facing
- **AZs:** us-east-1a and us-east-1b
- **Listener:** HTTP:80 → forwards to target group app-tier-tg
- **Security Group:** alb-sg (allows inbound 80/443 from 0.0.0.0/0)

### Target Group
- **Name:** app-tier-tg
- **ARN:** arn:aws:elasticloadbalancing:us-east-1:677746514416:targetgroup/app-tier-tg/7045efef0d77780c
- **Protocol:** HTTP:80
- **Health Check Path:** /health
- **Health Check Interval:** 30 seconds
- **Healthy Threshold:** 2 consecutive successes
- **Unhealthy Threshold:** 3 consecutive failures

### EC2 Instances

| Name | Instance ID | Type | AZ | Subnet | Private IP |
|---|---|---|---|---|---|
| nodejs-app-1a | i-0214d1cc1fc7a0ff9 | t3.micro | us-east-1a | app-subnet-1a | 10.0.11.x |
| nodejs-app-1b | i-0662d3f1b85d5e951 | t3.micro | us-east-1b | app-subnet-1b | 10.0.12.x |

- **AMI:** ami-0e349888043265b96 (Amazon Linux 2)
- **Runtime:** Node.js 16.x via NodeSource rpm repository
- **Application:** HTTP server on port 80 with / and /health endpoints

---

## Network Design Rationale

### Why 6 Subnets?
The three-tier design separates concerns at the network level:
1. **Public subnets** expose only the load balancer to the internet, minimizing attack surface.
2. **Private app subnets** host EC2 instances that can reach the internet via NAT but are not directly reachable from the internet.
3. **Private DB subnets** are completely isolated — only the app tier can communicate with them.

### Why Two AZs?
AWS Availability Zones are physically separate data centers. Deploying across us-east-1a and us-east-1b ensures:
- If one AZ fails, the other continues serving traffic.
- The ALB automatically routes only to healthy targets.
- Each AZ has its own NAT Gateway, so private subnet egress continues even if one AZ's NAT fails.

### CIDR Allocation
- /16 VPC gives room for future expansion (e.g., adding a management subnet, VPN endpoint).
- /24 subnets (256 IPs, 251 usable) are appropriate for t3.micro-scale workloads.
- Spacing between CIDR ranges (1.x, 11.x, 21.x) allows for easy identification of subnet tier in logs.

---

## Security Strategy (Summary)

Full details in SECURITY.md. In brief:
- **Defense in depth:** Three security group layers (ALB, App, DB).
- **Least privilege:** App instances cannot be reached from the internet directly.
- **No SSH exposure:** Instances have no SSH (port 22) rules in any security group.
- **Private egress only:** NAT Gateway allows patches/updates while blocking inbound.

---

## High Availability Approach

### Current Implementation
- **Multi-AZ ALB:** Automatically distributes traffic across both AZs.
- **Multi-AZ EC2:** One instance per AZ; if one fails, the other receives 100% of traffic.
- **Multi-AZ NAT:** Each AZ's private subnet routes through its own NAT Gateway.
- **ALB Health Checks:** Unhealthy instances are automatically removed from rotation.

### Recovery Time Objectives
- **RTO (Recovery Time Objective):** ~30 seconds (ALB health check interval = 30s; threshold = 2 failures = 60s worst case).
- **RPO (Recovery Point Objective):** N/A for stateless app tier (no data loss possible for compute tier).

### Single Points of Failure (Current)
- **Single EC2 per AZ:** If both instances fail simultaneously, there is an outage. Mitigation: Auto Scaling Group (see IMPROVEMENTS.md).
- **No DB tier deployed:** Currently the DB tier is reserved subnets only. Mitigation: Deploy Multi-AZ RDS (see IMPROVEMENTS.md).

---

## Traffic Flow

### Inbound Request Flow
```
1. User → DNS resolution → ALB DNS (three-tier-alb-61169483.us-east-1.elb.amazonaws.com)
2. ALB → health check → selects healthy target (round-robin between AZs)
3. ALB → HTTP:80 → EC2 private IP (e.g., 10.0.11.x:80)
4. Node.js server → processes request → returns HTML or JSON
5. Response → ALB → User
```

### Outbound (Patch/Update) Flow
```
1. EC2 (private subnet) → private route table → NAT Gateway (same AZ)
2. NAT GW → Internet Gateway → Internet (e.g., NodeSource repo, yum updates)
3. Response → Internet Gateway → NAT GW → EC2
```

---

*Cloud Engineering Bootcamp — Project 1 | February 2026*
