const http = require('http');
const { execSync } = require('child_process');

// Fetch EC2 metadata
function getMeta(path) {
  try {
    return execSync(`curl -s http://169.254.169.254/latest/meta-data/${path}`, { timeout: 2000 }).toString().trim();
  } catch (e) {
    return 'unknown';
  }
}

const INSTANCE_ID = getMeta('instance-id');
const AZ = getMeta('placement/availability-zone');
const HOSTNAME = require('os').hostname();

let requestCount = 0;

const server = http.createServer((req, res) => {
  requestCount++;

  if (req.url === '/health') {
    // Health check endpoint for ALB
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      instance: INSTANCE_ID,
      az: AZ,
      uptime: process.uptime()
    }));
    return;
  }

  // Main page - HTML response
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Load Balanced App</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: flex-start;
            min-height: 100vh;
            margin: 0;
            background: #f0f0f0;
            padding: 50px;
          }
          .card {
            background: white;
            border-radius: 8px;
            padding: 40px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            text-align: center;
            max-width: 600px;
            width: 100%;
          }
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
    </html>
  `);
});

server.listen(80, () => {
  console.log(`Server running on port 80`);
  console.log(`Instance: ${INSTANCE_ID}`);
  console.log(`AZ: ${AZ}`);
});
