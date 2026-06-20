# ============================================================
# Upload this as  main.py  on the device.
#
# Always a runtime device (BLE/serial stays up). Toggles between two sub-modes
# without dropping the link (method B):
#   - running mode   : blocks.py executes (drive + telemetry)
#   - programming mode: blocks.py is stopped; list/add/edit/delete/run scripts
#
# The runtime sends STOP -> programming, RUN -> running, QUIT -> exit to REPL.
# The cached BLE radio is kept across the toggle, so the browser stays connected.
#
# Press Ctrl-C during the short startup window to skip auto-run and stay at the
# REPL for programming over USB.
# ============================================================

import time
import bipes_runtime as br

# Announce as a runtime device on the VERY FIRST line. The browser flags a device
# as a runtime (and stops the REPL uname probe + echo/callback machinery) the
# instant it sees a runtime line (READY/ACK,/ERR,/T,/I,/M,). If the first thing it
# sees is a human banner instead, it treats the device as a plain REPL and ~500ms
# after connect fires `import os; os.uname()` into the link — that REPL traffic is
# what loops back as `ERR,unknown,...` and swallows real commands (STOP/INFO) during
# the startup window. "M,boot" matches the runtime regex but not M,(run|program),
# so it flags runtime without claiming a sub-mode yet.
print("M,boot")
print("BIPES: starting blocks.py in 1s (Ctrl-C to stay in REPL)")
try:
    time.sleep(1)
    while not br.runtime._quit:
        if br.runtime._mode == "run":
            try:
                with open("/blocks.py") as f:
                    code = f.read()
                exec(code, {})          # runs blocks.py; returns on STOP/RUN/QUIT
            except Exception as e:
                print("BIPES ERROR:", e)
                # On a program error, fall back to programming mode so the device
                # stays reachable to fix/replace the script (don't drop to REPL).
                br.runtime._mode = "program"
        else:
            br.runtime.serve_program()  # idle file server; returns on RUN/QUIT
except KeyboardInterrupt:
    print("BIPES: interrupted - REPL ready")
