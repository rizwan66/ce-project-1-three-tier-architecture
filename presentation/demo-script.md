# Demo Script — Three-Tier Architecture on AWS

## Cloud Engineering Bootcamp — Project 1 Presentation
**Presenter:** Rizwan | **Duration:** 15-20 minutes

---

## Opening (2 minutes)

"Good [morning/afternoon]. Today I'm presenting Project 1 of the Cloud Engineering Bootcamp — a three-tier web application architecture deployed on AWS.

The goal of this project was to implement a production-grade, highly available infrastructure that demonstrates the core AWS networking and compute services used in real-world deployments.

Let's start with the live application."

---

## Section 1: Live Demo (3 minutes)

### Step 1: Show the running application
Open browser to: **http://three-tier-alb-61169483.us-east-1.elb.amazonaws.com/**

"This is the live application. Notice:
- The title: Cloud Engineering Bootcamp
- The Instance ID shown in blue — this is the EC2 instance serving the request
- The Availability Zone in green — us-east-1a or us-east-1b"

### Step 2: Refresh to show load balancing
Press F5 several times (or use curl in terminal).

"Each time I refresh, watch the Availability Zone. The Application Load Balancer is distributing traffic across two instances in two separate AZs — that's our high availability in action."

### Step 3: Show the health endpoint
Open: **http://three-tier-alb-61169483.us-east-1.elb.amazonaws.com/health**

"The /health endpoint returns JSON that the ALB uses for health checks. If an instance fails to return 'healthy' three times in a row, the ALB automatically removes it from rotation."

---

## Section 2: Architecture Walkthrough (5 minutes)

### Draw or reference the architecture diagram

"Let me walk you through the architecture:

**VPC (10.0.0.0/16)**
We have a Virtual Private Cloud spanning two Availability Zones — us-east-1a and us-east-1b.

**Six subnets across three tiers:**
1. Public subnets — house the ALB and NAT Gateways
2. Private app subnets — house our EC2 instances running Node.js
3. Private DB subnets — reserved for future RDS deployment

**Internet Gateway** — allows the ALB to receive traffic from the internet.

**NAT Gateways** — we deployed one per AZ. This is critical: if one AZ goes down, the other AZ's private instances can still reach the internet for updates. A single NAT GW would be a single point of failure.

**Application Load Balancer** — Layer 7 load balancer, internet-facing, distributes HTTP traffic across our EC2 instances.

**Security Groups** — three tiers:
- ALB-SG: accepts HTTP/HTTPS from internet
- App-SG: accepts HTTP only from ALB-SG
- DB-SG: accepts MySQL/Postgres only from App-SG

This creates defense in depth — no direct internet access to our EC2 instances."

---

## Section 3: AWS Console Walkthrough (5 minutes)

### Show in AWS Console:

**1. VPC Console**
- Show three-tier-vpc, 6 subnets
- Show route tables (private-rt-1a routes to NAT GW A, private-rt-1b routes to NAT GW B)

**2. EC2 Console → Instances**
- Show nodejs-app-1a (us-east-1a) and nodejs-app-1b (us-east-1b)
- Point out: No public IP (private subnet)
- Point out: Security group = app-tier-sg

**3. EC2 Console → Load Balancers**
- Show three-tier-alb: active, internet-facing
- Show listener: HTTP:80 → app-tier-tg

**4. Target Group → Health Checks**
- Show both targets: HEALTHY
- Point out /health check path

---

## Section 4: Technical Challenges (2 minutes)

"During deployment, I encountered a key technical challenge:

**Node.js glibc incompatibility:**
- I initially tried Node.js 18 but it requires glibc 2.28
- Amazon Linux 2 ships with glibc 2.17
- The installation failed silently — no error, but Node.js wasn't installed
- Solution: Used NodeSource Node.js 16.x, which is fully compatible

This taught me the importance of checking runtime compatibility before deployment."

---

## Section 5: Cost Analysis (1 minute)

"Current monthly cost: approximately $96/month.

The dominant cost is the two NAT Gateways at $32.85/month each — totaling $65.70. This is the price of AZ-level redundancy.

For a bootcamp environment, we could reduce to one NAT GW and save $32/month. For production, the redundancy is worth it."

---

## Section 6: Improvements (1 minute)

"For production readiness, I've identified:

**Short-term:**
1. Add HTTPS with an ACM certificate
2. Implement Auto Scaling Group
3. Attach IAM role to EC2 instances for SSM access

**Long-term:**
1. Deploy Multi-AZ RDS for the database tier
2. Add CloudFront CDN + WAF
3. Implement CI/CD with CodePipeline
4. Convert to Terraform for IaC"

---

## Closing (1 minute)

"In summary, this project demonstrates:
- ✅ Three-tier network segmentation
- ✅ High availability across 2 AZs
- ✅ Application Load Balancing
- ✅ Security group layering
- ✅ Working Node.js application with health checks

The live application is accessible at:
**http://three-tier-alb-61169483.us-east-1.elb.amazonaws.com/**

Thank you. I'm happy to take questions."

---

## Demo Commands (Backup)

```bash
# Health check
curl -s http://three-tier-alb-61169483.us-east-1.elb.amazonaws.com/health | python3 -m json.tool

# Load balancing across AZs
for n in 1 2 3 4 5 6; do
  echo -n "Request $n: "
  curl -s http://three-tier-alb-61169483.us-east-1.elb.amazonaws.com/health | \
    python3 -c "import sys,json; d=json.load(sys.stdin); print(d['instance']+' ('+d['az']+')')"
done

# Target group health
aws elbv2 describe-target-health \
  --target-group-arn arn:aws:elasticloadbalancing:us-east-1:677746514416:targetgroup/app-tier-tg/7045efef0d77780c \
  --query 'TargetHealthDescriptions[*].{ID:Target.Id,State:TargetHealth.State}' \
  --output table
```

---

*Cloud Engineering Bootcamp — Project 1 | February 2026*
