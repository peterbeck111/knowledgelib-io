# Capture crash logcat in real time (filter for errors)
adb logcat *:E

# Filter for fatal exceptions only
adb logcat | grep -E "FATAL EXCEPTION|Process.*PID"

# Check ANR traces
adb shell ls -la /data/anr/
adb pull /data/anr/traces.txt ./anr_traces.txt

# Dump current process memory stats
adb shell dumpsys meminfo com.example.app

# Check memory limits on device
adb shell getprop dalvik.vm.heapsize
adb shell getprop dalvik.vm.heapgrowthlimit

# Monitor GC activity in real time
adb logcat -s "art" | grep -i "gc"

# Get application exit reasons (Android 11+)
adb shell dumpsys activity exit-info com.example.app

# Symbolicate native crash from tombstone
ndk-stack -sym path/to/obj/local/arm64-v8a/ -dump tombstone_00

# Enable StrictMode via adb (no code change needed)
adb shell settings put global strict_mode_visual_indicator 1

# Force-trigger ANR for testing (requires root or debug build)
adb shell am hang com.example.app

# List tombstone files from native crashes
adb shell ls -la /data/tombstones/

# Capture a bug report with full system state
adb bugreport > bugreport.zip
