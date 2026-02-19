/**
 * Health Check Module
 * 
 * This module provides the /health endpoint handler for the
 * Cloud Engineering Bootcamp three-tier application.
 * 
 * Used by the ALB to determine instance health.
 * Health check path: /health
 * Expected response: HTTP 200 with JSON body
 */

const { execSync } = require('child_process');

/**
 * Get EC2 instance metadata value
 * @param {string} path - Metadata path (e.g., 'instance-id')
 * @returns {string} - Metadata value or 'unknown' on error
 */
function getMetadata(path) {
  try {
    return execSync(
      `curl -s --connect-timeout 1 http://169.254.169.254/latest/meta-data/${path}`,
      { timeout: 2000 }
    ).toString().trim();
  } catch (err) {
    return 'unknown';
  }
}

// Cache metadata at startup (doesn't change during instance lifetime)
const INSTANCE_ID = getMetadata('instance-id');
const AZ = getMetadata('placement/availability-zone');
const REGION = AZ.slice(0, -1); // e.g., 'us-east-1a' → 'us-east-1'

/**
 * Handle health check requests
 * Called by the HTTP server when path === '/health'
 * 
 * @param {http.IncomingMessage} req - HTTP request
 * @param {http.ServerResponse} res - HTTP response
 */
function handleHealthCheck(req, res) {
  const healthData = {
    status: 'healthy',
    instance: INSTANCE_ID,
    az: AZ,
    region: REGION,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    nodeVersion: process.version
  };

  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache'
  });
  res.end(JSON.stringify(healthData));
}

/**
 * Get current health status object
 * @returns {Object} Health status
 */
function getHealthStatus() {
  return {
    status: 'healthy',
    instance: INSTANCE_ID,
    az: AZ,
    uptime: process.uptime()
  };
}

module.exports = {
  handleHealthCheck,
  getHealthStatus,
  INSTANCE_ID,
  AZ,
  REGION
};

/*
 * Example ALB Health Check Response:
 * HTTP/1.1 200 OK
 * Content-Type: application/json
 * 
 * {
 *   "status": "healthy",
 *   "instance": "i-0214d1cc1fc7a0ff9",
 *   "az": "us-east-1a",
 *   "region": "us-east-1",
 *   "uptime": 1861.869,
 *   "timestamp": "2026-02-19T05:49:00.000Z",
 *   "nodeVersion": "v16.20.2"
 * }
 */
