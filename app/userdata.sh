#!/bin/bash
# EC2 User Data Script for Node.js Three-Tier Application
# Compatible with: Amazon Linux 2
# Node.js Version: 16.x (NodeSource)
# Note: Node.js 18 requires glibc >= 2.28, AL2 has glibc 2.17

set -e
exec > /var/log/userdata.log 2>&1

echo "=== Starting user data script ==="
echo "Timestamp: $(date)"

# Step 1: Update system packages
echo "--- Updating system packages ---"
yum update -y

# Step 2: Install Node.js 16.x from NodeSource
echo "--- Setting up NodeSource repo for Node.js 16.x ---"
curl -sL https://rpm.nodesource.com/setup_16.x | bash -

echo "--- Installing Node.js ---"
yum install -y nodejs

echo "--- Node.js version ---"
node --version
npm --version

# Step 3: Get EC2 instance metadata
echo "--- Fetching EC2 metadata ---"
INSTANCE_ID=$(curl -s http://169.254.169.254/latest/meta-data/instance-id)
AZ=$(curl -s http://169.254.169.254/latest/meta-data/placement/availability-zone)
echo "Instance ID: $INSTANCE_ID"
echo "Availability Zone: $AZ"

# Step 4: Create the Node.js application
echo "--- Creating server.js ---"
cat > /home/ec2-user/server.js << 'SERVEREOF'
const http = require('http');
const { execSync } = require('child_process');

function getMeta(path) {
  try {
    return execSync('curl -s http://169.254.169.254/latest/meta-data/' + path, { timeout: 2000 }).toString().trim();
  } catch (e) {
    return 'unknown';
  }
}

const INSTANCE_ID = getMeta('instance-id');
const AZ = getMeta('placement/availability-zone');
const HOSTNAME = require('os').hostname();

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      instance: INSTANCE_ID,
      az: AZ,
      uptime: process.uptime()
    }));
    return;
  }

  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(`<!DOCTYPE html>
<html>
  <head>
    <title>Load Balanced App</title>
    <style>
      body { font-family: Arial, sans-serif; display: flex; justify-content: center;
             align-items: flex-start; min-height: 100vh; margin: 0; background: #f0f0f0; padding: 50px; }
      .card { background: white; border-radius: 8px; padding: 40px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center; max-width: 600px; width: 100%; }
      h1 { color: #333; font-size: 28px; }
      h2 { color: #555; font-size: 20px; font-weight: normal; }
      .instance { color: #1a73e8; font-size: 24px; font-weight: bold; }
      .az { color: #34a853; font-size: 18px; }
      .meta { color: #777; font-size: 14px; margin-top: 10px; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>🚀 Cloud Engineering Bootcamp</h1>
      <h2>Load Balanced Application</h2>
      <p class="instance">Instance: ${INSTANCE_ID}</p>
      <p class="az">Availability Zone: ${AZ}</p>
      <p class="meta">Hostname: ${HOSTNAME}</p>
    </div>
  </body>
</html>`);
});

server.listen(80, () => {
  console.log('Server running on port 80');
  console.log('Instance: ' + INSTANCE_ID);
  console.log('AZ: ' + AZ);
});
SERVEREOF

# Step 5: Set permissions
chown ec2-user:ec2-user /home/ec2-user/server.js

# Step 6: Start the server
echo "--- Starting Node.js server ---"
cd /home/ec2-user
nohup node server.js > /home/ec2-user/server.log 2>&1 &

echo "--- Server started with PID $! ---"

# Step 7: Verify server is running
sleep 5
if curl -s http://localhost:80/health > /dev/null 2>&1; then
  echo "--- Health check PASSED ---"
else
  echo "--- WARNING: Health check failed, check server.log ---"
fi

echo "=== User data script completed ==="
