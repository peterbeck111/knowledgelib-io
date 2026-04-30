// Input:  Existing JS/TS project with no strict mode
// Output: Incremental strict mode adoption without breaking the build

// tsconfig.json — Phase 1: Enable strict gradually
{
  "compilerOptions": {
    "strict": false,              // Don't enable all at once
    "noImplicitAny": true,        // Phase 1: fix implicit any first
    "strictNullChecks": false,    // Phase 2: enable after fixing any
    "strictFunctionTypes": false, // Phase 3: enable last
    "noEmit": true,               // Type-check only during migration
    "skipLibCheck": true          // Skip .d.ts errors during migration
  }
}

// Phase 1: Fix all TS7006 (implicit any) errors
// Before:
function process(data) { return data.value; }
// After:
function process(data: { value: string }): string { return data.value; }

// Phase 2: Enable strictNullChecks, fix TS2532 errors
// Before:
const el = document.getElementById("app");
el.innerHTML = "Hello"; // TS2532: Object is possibly 'null'
// After:
const el = document.getElementById("app");
if (el) { el.innerHTML = "Hello"; }

// Phase 3: Enable strictFunctionTypes
// Catches unsafe contravariance in callback types
