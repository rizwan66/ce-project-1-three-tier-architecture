# Improvements Roadmap

## Overview

This document outlines the improvement roadmap for the three-tier AWS architecture, organized by timeframe and priority.

---

## Short-Term Improvements (0–3 Months)

### 1. HTTPS/TLS Termination
**Priority:** High | **Effort:** Low | **Cost Impact:** ~$0 (ACM certs are free)

Currently the ALB listener only accepts HTTP:80. Adding HTTPS:
- Request an ACM (AWS Certificate Manager) certificate for a custom domain
- Add HTTPS:443 listener on ALB
- Redirect HTTP → HTTPS with a 301 redirect rule
- **Benefit:** Encrypts traffic in transit; required for production

```bash
# Request certificate
aws acm request-certificate --domain-name example.com --validation-method DNS

# Add HTTPS listener
aws elbv2 create-listener --load-balancer-arn <alb-arn> \
  --protocol HTTPS --port 443 \
  --certificates CertificateArn=<cert-arn> \
  --default-actions Type=forward,TargetGroupArn=<tg-arn>
```

### 2. Auto Scaling Group (ASG)
**Priority:** High | **Effort:** Medium | **Cost Impact:** Variable (saves on over-provisioning)

Replace manually launched EC2 instances with an Auto Scaling Group:
- **Min:** 2 instances (one per AZ)
- **Max:** 6 instances
- **Scale Out:** CPU > 70% for 5 minutes → add 1 instance
- **Scale In:** CPU < 30% for 10 minutes → remove 1 instance
- **Benefit:** Handles traffic spikes without manual intervention

### 3. EC2 IAM Instance Role
**Priority:** High | **Effort:** Low | **Cost Impact:** None

Attach an IAM role to EC2 instances for:
- AWS Systems Manager (SSM) Session Manager access (eliminates SSH need)
- CloudWatch agent metrics and logs
- Secrets Manager access for future DB credentials

### 4. CloudWatch Monitoring and Alarms
**Priority:** Medium | **Effort:** Low | **Cost Impact:** ~$1-5/month*

Set up:
- ALB 5xx error rate alarm
- Target group unhealthy host count alarm
- EC2 CPU/memory utilization dashboards
- Application-level logging to CloudWatch Logs

### 5. Structured Logging
**Priority:** Medium | **Effort:** Low | **Cost Impact:** ~$0.50/GB ingested

Update the Node.js application to emit structured JSON logs:
```json
{"timestamp":"2026-02-19T05:49:00Z","level":"info","method":"GET","path":"/health","status":200,"duration_ms":2}
```
Ship to CloudWatch Logs via the CloudWatch agent.

---

## Long-Term Improvements (3–12 Months)

### 1. Database Tier — Amazon RDS
**Priority:** High | **Effort:** High | **Cost Impact:** +$100-300/month**

Deploy a Multi-AZ RDS instance in the private DB subnets:
- Engine: PostgreSQL 15 or MySQL 8.0
- Instance: db.t3.medium (Multi-AZ standby in second AZ)
- Storage: 20 GB gp3 with auto-scaling to 100 GB
- Encryption: AES-256 at rest enabled
- Backups: 7-day automated backup window

### 2. Containerization (ECS or EKS)
**Priority:** Medium | **Effort:** High | **Cost Impact:** Variable

Containerize the Node.js application:
- Build Docker image: `FROM node:16-alpine`
- Push to ECR (Elastic Container Registry)
- Deploy on ECS Fargate (serverless containers) or EKS
- **Benefit:** Faster deployments, better resource utilization, horizontal scaling

### 3. CI/CD Pipeline
**Priority:** High | **Effort:** Medium | **Cost Impact:** ~$0 (CodePipeline free tier for 1 pipeline)

Implement a deployment pipeline:
```
GitHub Push → CodePipeline → CodeBuild (test + build) → CodeDeploy → EC2/ECS
```
- Blue/Green deployments via CodeDeploy
- Automated rollback on health check failure
- PR-based staging environment deployments

### 4. Content Delivery Network (CloudFront)
**Priority:** Medium | **Effort:** Low | **Cost Impact:** ~$5-20/month (offset by reduced data transfer)

Put CloudFront in front of the ALB:
- Cache static assets at edge locations globally
- Reduce latency for international users
- WAF integration for DDoS protection
- ALB becomes origin (private, not publicly accessible)

### 5. AWS WAF (Web Application Firewall)
**Priority:** High for production | **Effort:** Low | **Cost Impact:** ~$15/month base

Enable AWS WAF on ALB or CloudFront:
- AWS Managed Rules: Common vulnerabilities (OWASP Top 10)
- Rate-based rules: Block IPs making >1000 requests/5min
- Geo-blocking if needed

### 6. Infrastructure as Code (Terraform or CloudFormation)
**Priority:** High | **Effort:** High | **Cost Impact:** None

Convert manual AWS CLI steps to Terraform:
```hcl
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.0.0"
  
  name = "three-tier-vpc"
  cidr = "10.0.0.0/16"
  azs  = ["us-east-1a", "us-east-1b"]
  
  public_subnets  = ["10.0.1.0/24", "10.0.2.0/24"]
  private_subnets = ["10.0.11.0/24", "10.0.12.0/24"]
  database_subnets = ["10.0.21.0/24", "10.0.22.0/24"]
  
  enable_nat_gateway = true
  single_nat_gateway = false  # one per AZ
}
```

---

## Production-Readiness Checklist

### Infrastructure
- [ ] Multi-AZ deployment (✅ Done)
- [ ] Auto Scaling Group for EC2
- [ ] Reserved Instances or Savings Plans purchased
- [ ] Multi-AZ RDS with read replica
- [ ] ElastiCache for session/query caching
- [ ] CloudFront CDN

### Security
- [ ] HTTPS/TLS on ALB
- [ ] AWS WAF enabled
- [ ] EC2 IAM roles attached
- [ ] No SSH open (✅ Done)
- [ ] VPC Flow Logs enabled
- [ ] CloudTrail enabled
- [ ] Secrets Manager for credentials
- [ ] Regular AMI patching (AWS Patch Manager)
- [ ] GuardDuty enabled

### Reliability
- [ ] Auto Scaling Group (✅ Health checks done via ALB)
- [ ] Circuit breakers in application code
- [ ] Graceful shutdown handling in Node.js
- [ ] ALB access logs → S3
- [ ] CloudWatch alarms with SNS notifications
- [ ] Runbook for common failure scenarios

### Performance
- [ ] Application-level caching (Redis/Memcached)
- [ ] Database connection pooling
- [ ] CloudFront for static asset caching
- [ ] X-Ray distributed tracing
- [ ] Performance baseline established

### Operations
- [ ] CI/CD pipeline
- [ ] Blue/Green deployment capability
- [ ] Monitoring dashboard (CloudWatch or Grafana)
- [ ] On-call runbook
- [ ] Backup and restore tested
- [ ] Cost budget alarms set

---

## Disaster Recovery Planning

### Recovery Objectives
| Scenario | RTO Target | RPO Target |
|---|---|---|
| Single EC2 failure | <60 seconds | 0 (stateless) |
| AZ failure | <60 seconds | 0 (stateless) |
| Region failure | <4 hours | <1 hour |
| Database failure | <5 minutes | <5 minutes |

### Current DR Capability
- **Single EC2 failure:** ALB detects unhealthy target within 2 health check intervals (60s) and routes to surviving instance. ✅ Automatic.
- **AZ failure:** ALB and dual-AZ design ensures traffic reroutes to healthy AZ. ✅ Automatic.
- **Region failure:** Not yet implemented. Would require Route 53 failover + secondary region deployment.

### Region Failover Strategy (Future)
1. Deploy identical stack in us-west-2 (Oregon)
2. RDS cross-region read replica in us-west-2
3. Route 53 health check on primary ALB
4. Automatic DNS failover to secondary ALB if primary unhealthy
5. Promote read replica to primary in secondary region

---

*Cloud Engineering Bootcamp — Project 1 | February 2026*
