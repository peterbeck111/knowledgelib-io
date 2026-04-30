# === Symbolicate a crash address ===
xcrun atos -arch arm64 \
  -o MyApp.app.dSYM/Contents/Resources/DWARF/MyApp \
  -l 0x100a40000 \
  0x100a56789

# === Verify dSYM matches binary ===
dwarfdump --uuid MyApp.app.dSYM
dwarfdump --uuid MyApp.app/MyApp

# === Export crash reports from device ===
# Xcode > Window > Devices and Simulators > View Device Logs

# === lldb commands during crash debugging ===
# (lldb) bt                         # Full backtrace
# (lldb) bt all                     # All threads
# (lldb) frame variable             # Local variables in current frame
# (lldb) po self                    # Print object description
# (lldb) expr -l objc -- (void)[[NSObject new] description]
# (lldb) memory read 0x600003a08000 # Read memory at address
# (lldb) register read              # CPU register state at crash
# (lldb) image lookup -a 0x100a56789  # Find symbol for address

# === Check for zombie message in console ===
# *** -[ClassName release]: message sent to deallocated instance 0x600003a08000

# === Xcode diagnostic runtime flags ===
# Scheme > Run > Diagnostics:
# - Address Sanitizer: detects use-after-free, buffer overflow
# - Thread Sanitizer: detects data races (mutually exclusive with ASan)
# - Main Thread Checker: detects UI calls from background threads
# - Zombie Objects: identifies messages to deallocated objects

# === MetricKit crash export (programmatic) ===
# MXMetricManager.shared.add(subscriber)
# subscriber.didReceive(_:) delivers MXDiagnosticPayload within 24h

# === Instruments profiling ===
# Xcode > Product > Profile (Cmd+I)
# - Allocations: memory growth, jetsam debugging
# - Leaks: retain cycle detection
# - Zombies: use-after-free with allocation history
# - Time Profiler: main thread blocking / watchdog analysis
