# === Compile with full debug + sanitizer support ===
# GCC with AddressSanitizer
gcc -g -fsanitize=address -fno-omit-frame-pointer -O1 program.c -o program

# GCC with AddressSanitizer + UndefinedBehaviorSanitizer
gcc -g -fsanitize=address,undefined -fno-omit-frame-pointer program.c -o program

# Clang with AddressSanitizer
clang -g -fsanitize=address -fno-omit-frame-pointer -O1 program.c -o program

# === Enable core dumps ===
ulimit -c unlimited                     # Enable for current shell
echo "/tmp/core.%e.%p" | sudo tee /proc/sys/kernel/core_pattern  # Set location

# === GDB commands ===
gdb ./program                            # Start debugger
gdb ./program core                       # Load core dump
# Inside GDB:
#   run                                  # Run the program
#   bt                                   # Backtrace after crash
#   bt full                              # Backtrace with local variables
#   frame N                              # Switch to frame N
#   info locals                          # Show local vars in current frame
#   print variable                       # Print variable value
#   print *ptr                           # Dereference pointer
#   watch *ptr                           # Break when memory at ptr changes
#   x/16xb ptr                           # Examine 16 bytes at address ptr

# === Valgrind ===
valgrind ./program                       # Basic memory check
valgrind --leak-check=full --show-leak-kinds=all --track-origins=yes ./program

# === Check binary for debug info ===
file ./program                           # Should say "with debug_info"
readelf -S ./program | grep debug        # Shows .debug_* sections

# === Check if core dump was generated ===
ls -la /tmp/core.*
# On systemd systems:
coredumpctl list                         # List recent core dumps
coredumpctl gdb                          # Open most recent in GDB
