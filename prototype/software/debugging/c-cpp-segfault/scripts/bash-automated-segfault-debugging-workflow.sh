#!/bin/bash
# Input:  Source file path (C or C++)
# Output: Compilation with all sanitizers + GDB + Valgrind diagnostics

SRC="$1"
BIN="${SRC%.c*}.debug"

if [[ -z "$SRC" ]]; then
    echo "Usage: $0 <source.c|source.cpp>"
    exit 1
fi

# Detect compiler
if [[ "$SRC" == *.cpp ]]; then
    CC="g++ -std=c++17"
else
    CC="gcc"
fi

echo "=== Step 1: Compile with ASan + UBSan ==="
$CC -g -fsanitize=address,undefined -fno-omit-frame-pointer \
    -Wall -Wextra -O1 "$SRC" -o "$BIN" 2>&1
echo "Binary: $BIN"

echo ""
echo "=== Step 2: Run with AddressSanitizer ==="
ASAN_OPTIONS=detect_leaks=1:abort_on_error=0 ./"$BIN" 2>&1

echo ""
echo "=== Step 3: Run with Valgrind Memcheck ==="
# Recompile without ASan for Valgrind (they conflict)
$CC -g -Wall -Wextra -O0 "$SRC" -o "${BIN}.valgrind" 2>&1
valgrind --tool=memcheck --leak-check=full \
         --show-leak-kinds=all --track-origins=yes \
         ./"${BIN}.valgrind" 2>&1

echo ""
echo "=== Step 4: GDB backtrace (if crash occurs) ==="
echo "Run: gdb ./${BIN}.valgrind -ex run -ex bt -ex quit"
