// Input:  Need to detect memory leaks in production without DevTools
// Output: Automated monitoring with alerts

const LEAK_THRESHOLD_MB = 50;  // Alert if heap grows 50MB in window
const CHECK_INTERVAL_MS = 30000;  // Check every 30 seconds
const WINDOW_SIZE = 20;  // Track last 20 measurements

const measurements = [];

function checkMemory() {
  const { heapUsed, rss } = process.memoryUsage();
  const heapMB = heapUsed / 1024 / 1024;

  measurements.push({ heapMB, timestamp: Date.now() });
  if (measurements.length > WINDOW_SIZE) measurements.shift();

  if (measurements.length >= WINDOW_SIZE) {
    const oldest = measurements[0].heapMB;
    const newest = measurements[measurements.length - 1].heapMB;
    const growth = newest - oldest;

    if (growth > LEAK_THRESHOLD_MB) {
      console.error(`⚠️ MEMORY LEAK DETECTED: heap grew ${growth.toFixed(1)}MB in ${
        (WINDOW_SIZE * CHECK_INTERVAL_MS / 1000 / 60).toFixed(0)} minutes`);
      console.error(`  Current: ${newest.toFixed(1)}MB | RSS: ${(rss / 1024 / 1024).toFixed(1)}MB`);

      // Option: trigger heap snapshot for analysis
      if (typeof v8 !== 'undefined') {
        const filename = `/tmp/heapdump-${Date.now()}.heapsnapshot`;
        require('v8').writeHeapSnapshot(filename);
        console.error(`  Heap snapshot written to: ${filename}`);
      }
    }
  }
}

const monitorTimer = setInterval(checkMemory, CHECK_INTERVAL_MS);
// Clean up on shutdown
process.on('SIGTERM', () => clearInterval(monitorTimer));
