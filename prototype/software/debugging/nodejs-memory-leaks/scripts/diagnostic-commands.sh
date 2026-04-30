# Start app with inspector for Chrome DevTools
node --inspect app.js

# Start with increased heap (stopgap, not a fix)
node --max-old-space-size=4096 app.js

# Expose GC for manual triggering (debug only)
node --expose-gc app.js
# Then in code: global.gc(); console.log(process.memoryUsage());

# Generate heap snapshot programmatically (Node 12+)
node -e "require('v8').writeHeapSnapshot()" 

# Monitor memory from outside the process
watch -n 5 'ps -o pid,rss,vsz,command -p $(pgrep -f "node app.js")'

# Clinic.js automated profiling
npx clinic heapprofile -- node app.js
npx clinic doctor -- node app.js

# Check event listener counts at runtime
node -e "
const emitter = require('./myEmitter');
console.log(emitter.eventNames().map(e => 
  ({ event: e, count: emitter.listenerCount(e) })
));
"

# Find potential global variable leaks
grep -rn "global\.\|globalThis\." --include="*.js" --include="*.ts" src/

# Count setInterval without clearInterval
echo "setInterval: $(grep -rc 'setInterval' --include='*.js' src/)"
echo "clearInterval: $(grep -rc 'clearInterval' --include='*.js' src/)"
