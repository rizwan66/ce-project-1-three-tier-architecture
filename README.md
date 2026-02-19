# Cloud Engineering Bootcamp — Project 1: Three-Tier Architecture on AWS

## Project Overview

This project demonstrates a production-grade three-tier web application architecture deployed on Amazon Web Services (AWS). The application serves dynamic web pages showing instance identity information, load-balanced across two Availability Zones for high availability.

**Live Application:** http://three-tier-alb-61169483.us-east-1.elb.amazonaws.com/

---

## Architecture Overview

```
Internet
    │
    ▼
[Application Load Balancer]  ← Public Subnets (us-east-1a, us-east-1b)
    │              │
    ▼              ▼
[EC2 Node.js]  [EC2 Node.js]  ← Private App Subnets (us-east-1a, us-east-1b)
    │              │
    ▼              ▼
[DB Subnet A]  [DB Subnet B]  ← Private DB Subnets (reserved for RDS)
```

### Tier 1 – Public (Presentation)
- **Application Load Balancer (ALB):** Internet-facing, distributes traffic across 2 AZs
- **NAT Gateways:** One per AZ for outbound internet access from private subnets

### Tier 2 – Private App (Application)
- **EC2 Instances:** t3.micro running Node.js 16 HTTP server
- **Private Subnets:** No direct internet access; egress only via NAT Gateway

### Tier 3 – Private DB (Data)
- **Reserved Subnets:** Ready for RDS MySQL/PostgreSQL deployment
- **DB Security Group:** Accepts traffic only from App tier

---

## Infrastructure Details

| Resource | Value |
|---|---|
| VPC | vpc-0b3a78890d76d929f (10.0.0.0/16) |
| ALB DNS | three-tier-alb-61169483.us-east-1.elb.amazonaws.com |
| Region | us-east-1 (N. Virginia) |
| AZs | us-east-1a, us-east-1b |
| App Instance A | i-0214d1cc1fc7a0ff9 (us-east-1a) |
| App Instance B | i-0662d3f1b85d5e951 (us-east-1b) |
| Node.js Version | 16.x (via NodeSource) |
| OS | Amazon Linux 2 |

---

## How to Deploy / Replicate

### Prerequisites
- AWS CLI configured with appropriate permissions
- AWS account with VPC, EC2, ELB service access

### Step 1: Create VPC and Subnets
```bash
aws ec2 create-vpc --cidr-block 10.0.0.0/16 \
  --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=three-tier-vpc}]'
# Create 6 subnets (2 public, 2 private-app, 2 private-db) — see config/vpc-config.txt
```

### Step 2: Internet Gateway and NAT Gateways
```bash
aws ec2 create-internet-gateway
aws ec2 attach-internet-gateway --internet-gateway-id igw-xxx --vpc-id vpc-xxx
aws ec2 allocate-address --domain vpc
aws ec2 create-nat-gateway --subnet-id subnet-public-1a --allocation-id eipalloc-xxx
aws ec2 create-nat-gateway --subnet-id subnet-public-1b --allocation-id eipalloc-yyy
```

### Step 3: Route Tables
```bash
# Public RT: 0.0.0.0/0 → IGW
# Private-RT-1a: 0.0.0.0/0 → NAT-GW-1a (for us-east-1a private subnets)
# Private-RT-1b: 0.0.0.0/0 → NAT-GW-1b (for us-east-1b private subnets)
```

### Step 4: Security Groups
```bash
# ALB-SG: port 80/443 from 0.0.0.0/0
# App-SG: port 80/443 from ALB-SG only
# DB-SG: port 3306/5432 from App-SG only
```

### Step 5: Launch EC2 Instances
```bash
aws ec2 run-instances \
  --image-id ami-0e349888043265b96 \
  --instance-type t3.micro \
  --subnet-id subnet-042c0fb602895edd5 \
  --security-group-ids sg-0b33c7eb3eb59da41 \
  --user-data file://app/userdata.sh \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=nodejs-app-1a}]'
```

### Step 6: Create ALB and Target Group
```bash
aws elbv2 create-target-group --name app-tier-tg \
  --protocol HTTP --port 80 --vpc-id vpc-0b3a78890d76d929f \
  --health-check-path /health

aws elbv2 create-load-balancer --name three-tier-alb \
  --subnets subnet-0f2c2c205ad0c6114 subnet-027d6272b3c87e47f \
  --security-groups sg-0a9ada4856d63eeac

aws elbv2 register-targets --target-group-arn arn:... \
  --targets Id=i-0214d1cc1fc7a0ff9 Id=i-0662d3f1b85d5e951
```

---

## Testing Instructions

### Health Check
```bash
curl http://three-tier-alb-61169483.us-east-1.elb.amazonaws.com/health
# Expected: {"status":"healthy","instance":"i-...","az":"us-east-1a","uptime":...}
```

### Load Balancing Verification
```bash
for n in 1 2 3 4 5 6; do
  echo -n "Hit $n: "
  curl -s http://three-tier-alb-61169483.us-east-1.elb.amazonaws.com/health | \
    python3 -c "import sys,json; d=json.load(sys.stdin); print(d['instance']+' ('+d['az']+')')"
done
# Should alternate between us-east-1a and us-east-1b
```

### Target Group Health
```bash
aws elbv2 describe-target-health \
  --target-group-arn arn:aws:elasticloadbalancing:us-east-1:677746514416:targetgroup/app-tier-tg/7045efef0d77780c \
  --query 'TargetHealthDescriptions[*].{ID:Target.Id,State:TargetHealth.State}' \
  --output table
```

---

## Team Members

| Name | Role |
|---|---|
| Rizwan | Cloud Engineer (sole contributor) |

---

## Repository Structure

```
ce-project-1-three-tier-architecture/
├── README.md
├── ARCHITECTURE.md
├── SECURITY.md
├── COSTS.md
├── IMPROVEMENTS.md
├── architecture/
│   ├── architecture-diagram.png
│   ├── network-diagram.png
│   ├── security-groups-diagram.png
│   └── traffic-flow-diagram.png
├── config/
│   ├── vpc-config.txt
│   ├── security-groups.txt
│   ├── load-balancer-config.txt
│   └── instances.txt
├── app/
│   ├── server.js
│   ├── userdata.sh
│   └── health-check.js
├── tests/
│   ├── test-plan.md
│   ├── test-results.md
│   └── failover-test.md
└── presentation/
    └── demo-script.md
```

---

## Key Technical Decisions

- **Node.js 16 over 18:** Amazon Linux 2 ships with glibc 2.17; Node 18 requires glibc 2.28. Node 16.x via NodeSource is fully compatible.
- **Dual NAT Gateways:** One per AZ ensures AZ-level fault tolerance for private subnet egress.
- **ALB over Classic LB:** Layer-7 routing, path-based rules, and superior health checks.
- **t3.micro instances:** Burstable CPU suitable for bootcamp workloads; upgrade to t3.small/medium for production.

---

*Cloud Engineering Bootcamp — Project 1 | February 2026*
