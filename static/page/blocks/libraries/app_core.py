"""Generic application core — reusable across projects (alarm clock, sand robot, ...).

It deliberately knows NOTHING about displays, motors, buttons or time. It only tracks
a state name (a string) and the rules for moving between states. That keeps the three
loop phases cleanly separated:

    input  -> read hardware, turn gestures into events   (ButtonHub etc., NOT here)
    update -> events change the state                     (StateMachine, here)
    effect -> draw / move, purely from the state          (display/motors, NOT here)

State is just a string you choose ("clock", "set_alarm", "homing", "drawing", ...),
so the framework never bakes in a project's modes — the student does.

Grains, same machine zoomed in/out:
  G3 (table)   : sm.add_rule(state, event, next); then sm.feed(event)
  G2 (explicit): if <gesture>: sm.go("set_alarm")           # visible if/elif
  G1 (raw)     : skip the machine, use a plain variable
"""


class StateMachine:
    def __init__(self, start):
        self._state = start
        self._prev = None          # None so the very first frame counts as "entered(start)"
        self._rules = []           # list of (state, event, next_state) for the table grain

    # ---- G3: data-driven (a transition table) ----------------------------
    def add_rule(self, state, event, next_state):
        """Add one transition row:  in `state`, on `event`, go to `next_state`."""
        self._rules.append((state, event, next_state))

    def feed(self, event):
        """Apply the first matching rule for the current state. Returns True if it moved."""
        for s, e, n in self._rules:
            if s == self._state and e == event:
                self._state = n
                return True
        return False

    # ---- G2: explicit ----------------------------------------------------
    def go(self, name):
        """Force the state directly (the visible, explicit grain)."""
        self._state = name

    # ---- queries (pure, no side effects) ---------------------------------
    def state(self):
        return self._state

    def is_state(self, name):
        return self._state == name

    def entered(self, name):
        """True only on the first frame after entering `name` (entry actions / clear)."""
        return self._state == name and self._prev != name

    def changed(self):
        """True on the first frame after ANY state change (clear the screen, etc.)."""
        return self._state != self._prev

    # ---- frame bookkeeping ----------------------------------------------
    def tick(self):
        """Call ONCE at the end of each loop, after drawing: remembers this frame's
        state so entered()/changed() are correct next time."""
        self._prev = self._state
