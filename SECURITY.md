# Security Documentation

## Overview

This document details the security configuration for the three-tier AWS architecture, covering security groups, network isolation, IAM policies, and security best practices.

---

## Security Group Rules

### Tier 1: ALB Security Group (alb-sg)
**ID:** sg-0a9ada4856d63eeac

| Direction | Protocol | Port Range | Source | Purpose |
|---|---|---|---|---|
| Inbound | TCP | 80 | 0.0.0.0/0 | HTTP traffic from internet |
| Inbound | TCP | 443 | 0.0.0.0/0 | HTTPS traffic from internet |
| Outbound | All | All | 0.0.0.0/0 | Allow all outbound |

**Rationale:** The ALB must accept HTTP/HTTPS from any IP since it serves public web traffic. No SSH or management ports are exposed.

---

### Tier 2: App Tier Security Group (app-tier-sg)
**ID:** sg-0b33c7eb3eb59da41

| Direction | Protocol | Port Range | Source | Purpose |
|---|---|---|---|---|
| Inbound | TCP | 80 | sg-0a9ada4856d63eeac (alb-sg) | HTTP from ALB only |
| Inbound | TCP | 443 | sg-0a9ada4856d63eeac (alb-sg) | HTTPS from ALB only |
| Outbound | All | All | 0.0.0.0/0 | Updates via NAT GW |

**Rationale:** EC2 instances accept traffic ONLY from the ALB security group — not from any IP address. This means even if someone discovers the private IP of an EC2 instance, they cannot reach it from the internet. Outbound is unrestricted to allow package updates via NAT Gateway.

---

### Tier 3: DB Security Group (data-tier-sg)
**ID:** sg-0259278f9204809eb

| Direction | Protocol | Port Range | Source | Purpose |
|---|---|---|---|---|
| Inbound | TCP | 3306 | sg-0b33c7eb3eb59da41 (app-tier-sg) | MySQL from App tier |
| Inbound | TCP | 5432 | sg-0b33c7eb3eb59da41 (app-tier-sg) | PostgreSQL from App tier |
| Outbound | All | All | 0.0.0.0/0 | Allow all outbound |

**Rationale:** The database tier accepts connections only from the app tier security group. No direct access from internet or ALB. This implements the principle of least privilege at the network level.

---

## Network Isolation Strategy

### Defense in Depth Layers

```
Layer 1: Internet → ALB (Public Subnet)
  - Only port 80/443 from internet
  - ALB terminates public connections

Layer 2: ALB → EC2 App Tier (Private Subnet)
  - Only port 80 from ALB-SG
  - Private subnet: no inbound internet route
  - NAT Gateway: outbound-only internet access

Layer 3: App Tier → DB Tier (Private Subnet)
  - Only port 3306/5432 from App-SG
  - Completely isolated from internet
  - No outbound internet required for DB
```

### Private Subnet Design
- App and DB subnets have NO route to the Internet Gateway.
- The only outbound path is through NAT Gateways (outbound-only by design).
- There is NO way to initiate inbound connections to private instances from the internet.

### No Bastion Host / SSH Access
- No SSH (port 22) rules in any security group.
- Instance management done via AWS Systems Manager (SSM) where IAM role permits.
- For emergency access, an SSM role can be attached to instances.

---

## IAM Roles and Policies

### Current State
- EC2 instances launched without IAM roles (default for bootcamp scope).
- AWS CloudShell used for infrastructure management with account-level permissions.

### Recommended IAM Role for EC2 (Production)
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ssm:UpdateInstanceInformation",
        "ssmmessages:CreateControlChannel",
        "ssmmessages:CreateDataChannel",
        "ssmmessages:OpenControlChannel",
        "ssmmessages:OpenDataChannel"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "cloudwatch:PutMetricData",
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "*"
    }
  ]
}
```

### Recommended IAM Role for Deployment (CI/CD)
Minimum permissions needed for automated deployment:
- ec2:RunInstances, ec2:TerminateInstances, ec2:DescribeInstances
- elasticloadbalancing:RegisterTargets, elasticloadbalancing:DeregisterTargets
- elasticloadbalancing:DescribeTargetHealth

---

## Security Best Practices Applied

1. **Principle of Least Privilege:** Each tier can only communicate with the tier directly adjacent to it.

2. **Network Segmentation:** Six subnets across two tiers (public/private) prevent lateral movement between tiers.

3. **No Direct Internet Exposure for EC2:** Private subnets ensure EC2 instances cannot be reached from the internet, even if the Node.js server had a vulnerability.

4. **ALB as Security Boundary:** The ALB acts as a reverse proxy, hiding backend instance IPs. It can enforce WAF rules, rate limiting, and SSL termination.

5. **Immutable Infrastructure:** EC2 instances are launched from AMIs with user data scripts rather than SSH-configured manually. This reduces configuration drift.

6. **Outbound-Only Internet via NAT:** NAT Gateways allow instances to pull updates but do not allow inbound connections, preventing C2 (command and control) over unexpected ports.

7. **AZ Isolation:** Security groups are applied consistently across AZs, preventing security drift between AZ-a and AZ-b deployments.

---

## Potential Vulnerabilities and Mitigations

| Vulnerability | Severity | Current Status | Mitigation |
|---|---|---|---|
| No HTTPS/TLS on ALB listener | Medium | HTTP only (bootcamp scope) | Add ACM certificate, redirect HTTP→HTTPS |
| No WAF on ALB | Medium | Not configured | Enable AWS WAF with managed rule groups |
| Node.js server runs as root | High | Runs via nohup in user data | Use systemd, drop privileges to ec2-user |
| No CloudTrail logging | Medium | Not configured | Enable CloudTrail for API audit logging |
| No VPC Flow Logs | Low | Not configured | Enable for network forensics |
| No EC2 IAM role | Medium | Instances have no role | Attach SSM-enabled IAM role |
| No instance patching | Medium | Manual only | Use AWS Systems Manager Patch Manager |
| No secrets management | N/A | No secrets used | Use AWS Secrets Manager for DB credentials |
| Security groups allow all outbound | Low | Best practice violation | Restrict outbound to known ports (yum=80/443) |
| Single ALB (no WAF) | Medium | No DDoS protection | Enable AWS Shield Standard (free, already applied) |

---

## Compliance Notes

- **AWS Shared Responsibility Model:** AWS secures the infrastructure (hardware, hypervisor, network fabric). The customer secures OS patches, application code, and network configuration.
- **Data in Transit:** Currently unencrypted (HTTP). Production deployment should enforce TLS.
- **Data at Rest:** No database deployed yet. RDS at-rest encryption should be enabled when deployed.

---

*Cloud Engineering Bootcamp — Project 1 | February 2026*
