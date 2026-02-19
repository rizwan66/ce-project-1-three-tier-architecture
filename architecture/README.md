# Architecture Diagrams

This folder contains the architecture diagrams for the Three-Tier AWS project.

## Diagrams

### architecture-diagram.png
Main architecture overview showing all three tiers:
- Tier 1 (Public): ALB + NAT Gateways
- Tier 2 (Private App): EC2 Node.js instances
- Tier 3 (Private DB): Reserved DB subnets

### network-diagram.png
VPC and subnet layout:
- VPC CIDR: 10.0.0.0/16
- Public subnets: 10.0.1.0/24, 10.0.2.0/24
- App subnets: 10.0.11.0/24, 10.0.12.0/24
- DB subnets: 10.0.21.0/24, 10.0.22.0/24

### security-groups-diagram.png
Security group boundaries and allowed traffic flows:
- Internet → ALB-SG (80/443)
- ALB-SG → App-SG (80)
- App-SG → DB-SG (3306/5432)

### traffic-flow-diagram.png
Request flow from user to EC2 instance:
1. User DNS lookup → ALB
2. ALB health check → selects target
3. HTTP forwarded → EC2 private IP
4. Node.js response → ALB → User

## ASCII Architecture Diagram

```
┌───────────────────────────────────────────────────────────────────┐
│                    AWS Region: us-east-1                           │
│                                                                   │
│   ┌─────────────────────────────────────────────────────────┐    │
│   │               VPC: 10.0.0.0/16                          │    │
│   │                                                         │    │
│   │  INTERNET GATEWAY                                       │    │
│   │         │                                               │    │
│   │  ┌──────┴──────────────────────────────────────────┐   │    │
│   │  │          PUBLIC SUBNETS                          │   │    │
│   │  │                                                  │   │    │
│   │  │  ┌─────────────────┐  ┌─────────────────────┐  │   │    │
│   │  │  │  public-1a      │  │  public-1b          │  │   │    │
│   │  │  │  10.0.1.0/24    │  │  10.0.2.0/24        │  │   │    │
│   │  │  │  NAT GW A       │  │  NAT GW B           │  │   │    │
│   │  │  └────────┬────────┘  └────────┬────────────┘  │   │    │
│   │  │           │  ALB spans both    │                │   │    │
│   │  └───────────┼────────────────────┼────────────────┘   │    │
│   │              │ three-tier-alb     │                     │    │
│   │  ┌───────────┼────────────────────┼────────────────┐   │    │
│   │  │          APP SUBNETS (PRIVATE) │                │   │    │
│   │  │                                                  │   │    │
│   │  │  ┌─────────────────┐  ┌─────────────────────┐  │   │    │
│   │  │  │  app-1a         │  │  app-1b             │  │   │    │
│   │  │  │  10.0.11.0/24   │  │  10.0.12.0/24       │  │   │    │
│   │  │  │  nodejs-app-1a  │  │  nodejs-app-1b      │  │   │    │
│   │  │  │  t3.micro       │  │  t3.micro           │  │   │    │
│   │  │  └─────────────────┘  └─────────────────────┘  │   │    │
│   │  └──────────────────────────────────────────────────┘   │    │
│   │                                                         │    │
│   │  ┌──────────────────────────────────────────────────┐   │    │
│   │  │           DB SUBNETS (PRIVATE, RESERVED)          │   │    │
│   │  │  10.0.21.0/24 (1a)    10.0.22.0/24 (1b)         │   │    │
│   │  └──────────────────────────────────────────────────┘   │    │
│   └─────────────────────────────────────────────────────────┘    │
└───────────────────────────────────────────────────────────────────┘
```
