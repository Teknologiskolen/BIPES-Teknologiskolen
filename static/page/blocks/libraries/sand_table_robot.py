import time
import math
from machine import Pin
import stepper


# @block {
#   "category": "Sand Drawing Machine DSL",
#   "color": 20,
#   "instanceMode": "singleton",
#   "instanceName": "sandMachine",
#   "methodInstanceMode": "key_input"
# }
# Sand table robot blocks generated from the Python library.
class SandTableRobot:
    """
    Encapsulates all robot control.

    Public API:
      - home()
      - off()
      - move_line()
      - move_arc()
      - draw_spiral()
      - draw_flower()
      - run_gcode_file(path, ...)
      - run_gcode_text(gcode_text, ...)
    """

    # -----------------------------
    # Internal Stepper class (your original)
    # -----------------------------
    class Stepper:
        def __init__(self, in1, in2, in3, in4, backlash_steps=0):
            self.pins = [Pin(in1, Pin.OUT), Pin(in2, Pin.OUT), Pin(in3, Pin.OUT), Pin(in4, Pin.OUT)]
            self.step_sequence = [
                [1, 0, 0, 0], [1, 1, 0, 0], [0, 1, 0, 0], [0, 1, 1, 0],
                [0, 0, 1, 0], [0, 0, 1, 1], [0, 0, 0, 1], [1, 0, 0, 1]
            ]
            self.step_count = len(self.step_sequence)
            self.current_step = 0
            self.backlash_steps = backlash_steps
            self.last_direction = 0
            self.off()

        def _set_step(self, step_data):
            for i in range(4):
                self.pins[i].value(step_data[i])

        def off(self):
            for pin in self.pins:
                pin.value(0)

        def step(self, direction):
            # IMPORTANT: this Stepper.step() takes +/-1 direction, not N steps.
            # We will provide a helper to step N times.
            if self.last_direction != 0 and direction != self.last_direction:
                for _ in range(self.backlash_steps):
                    self.current_step = (self.current_step + direction) % self.step_count
                    self._set_step(self.step_sequence[self.current_step])
                    time.sleep_ms(2)

            self.last_direction = direction
            self.current_step = (self.current_step + direction) % self.step_count
            self._set_step(self.step_sequence[self.current_step])

    # -----------------------------
    # Constructor / configuration
    # -----------------------------
    # @block {
    #   "label": "create sand robot shoulder motor pins {motor1_pins} elbow motor pins {motor2_pins} shoulder sensor {sensor_shoulder_pin} elbow sensor {sensor_elbow_pin}",
    #   "params": {
    #     "motor1_pins": {"defaultValue": [17, 16, 15, 14]},
    #     "motor2_pins": {"defaultValue": [21, 20, 19, 18]},
    #     "sensor_shoulder_pin": {"checkType": "Number"},
    #     "sensor_elbow_pin": {"checkType": "Number"},
    #     "L1": {"checkType": "Number"},
    #     "L2": {"checkType": "Number"},
    #     "steps_per_rev": {"checkType": "Number"},
    #     "backlash_deg_m1": {"checkType": "Number"},
    #     "backlash_deg_m2": {"checkType": "Number"},
    #     "homing_dir_shoulder": {"checkType": "Number"},
    #     "homing_dir_elbow": {"checkType": "Number"},
    #     "homing_clear_steps": {"checkType": "Number"},
    #     "default_speed_ms": {"checkType": "Number"}
    #   }
    # }
    # Create a sand table robot instance.
    def __init__(
        self,
        motor1_pins,  # shoulder motor pins
        motor2_pins,  # elbow motor pins
        sensor_shoulder_pin,
        sensor_elbow_pin,
        L1=31.0,
        L2=31.0,
        steps_per_rev=4096.0,
        backlash_deg_m1=3.2,
        backlash_deg_m2=3.0,
        homing_dir_shoulder=1,
        homing_dir_elbow=1,
        homing_clear_steps=500,
        default_speed_ms=2
    ):
        self.L1 = float(L1)
        self.L2 = float(L2)
        self.STEPS_PER_REV = float(steps_per_rev)

        self.HOMING_DIR_SKULDER = int(homing_dir_shoulder)
        self.HOMING_DIR_ALBUE = int(homing_dir_elbow)
        self.HOMING_CLEAR_STEPS = int(homing_clear_steps)
        self.default_speed_ms = int(default_speed_ms)

        self.BACKLASH_STEPS_1 = int((float(backlash_deg_m1) / 360.0) * self.STEPS_PER_REV)
        self.BACKLASH_STEPS_2 = int((float(backlash_deg_m2) / 360.0) * self.STEPS_PER_REV)

        # Cartesian state (global XY)
        self.last_x = self.L1 + self.L2
        self.last_y = 0.0

        # "IK step target" state (your lastShoulderSteps/lastElbowSteps)
        self.lastShoulderSteps = 0
        self.lastElbowSteps = 0
        
        self.prev_theta1 = 0
        self.prev_theta2 = 0

        self.sensor_skulder = Pin(int(sensor_shoulder_pin), Pin.IN, Pin.PULL_UP)
        self.sensor_albue = Pin(int(sensor_elbow_pin), Pin.IN, Pin.PULL_UP)

        m1 = motor1_pins
        m2 = motor2_pins
        self.skulder =  stepper.HalfStepMotor.frompins(m1[0], m1[1], m1[2], m1[3])
        self.albue   =  stepper.HalfStepMotor.frompins(m2[0], m2[1], m2[2], m2[3])

        # G-code modal state
        self._g_abs = True
        self._g_units_mm = True
        self._g_last_motion = None  # 0 or 1

    # -----------------------------
    # Internal helpers
    # -----------------------------
    # @block {
    #   "label": "sand robot turn motors off"
    # }
    # Turn off both motors
    def off(self):
        self.skulder.reset()
        self.albue.reset()

    def _rad_to_steps(self, radians):
        # Keep it identical to your code (int trunc). You can switch to round() later if desired.
        return int((radians / (2 * math.pi)) * self.STEPS_PER_REV)

    def _step_n(self, stepper_obj, steps, speed_ms):
        """
        Since Stepper.step() is +/-1 only, expand N steps here.
        Positive steps => direction +1 repeated.
        Negative steps => direction -1 repeated.
        """
        if steps == 0:
            return
        direction = 1 if steps > 0 else -1
        for _ in range(abs(steps)):
            stepper_obj.step(direction)
            if speed_ms > 0:
                time.sleep_ms(speed_ms)

    def _unwrap(self, a, prev):
        # shift a by ±2π until it is closest to prev
        while a - prev > math.pi:
            a -= 2 * math.pi
        while a - prev < -math.pi:
            a += 2 * math.pi
        return a
    
    def _InverseKinematics(self, x, y):
        r2 = x*x + y*y
        r = math.sqrt(r2)

        # Reachability (match your logic)
        if r > (self.L1 + self.L2) or r < 1e-6:
            return None

        c2 = (r2 - self.L1*self.L1 - self.L2*self.L2) / (2 * self.L1 * self.L2)
        c2 = max(-1.0, min(1.0, c2))
        theta2 = math.acos(c2)

        k1 = self.L1 + self.L2 * math.cos(theta2)
        k2 = self.L2 * math.sin(theta2)
        theta1 = math.atan2(y, x) - math.atan2(k2, k1)
        #print(theta1, theta2)

        return (theta1, theta2)

    def _moveSteppersCount(self, shoulder, elbow):
        shoulderSteps = self._rad_to_steps(shoulder)
        elbowSteps = self._rad_to_steps(elbow)
        return shoulderSteps, elbowSteps

    # -----------------------------
    # Internal G-code parsing helpers (unchanged)
    # -----------------------------
    def _strip_comment(self, line):
        i = line.find(';')
        if i != -1:
            line = line[:i]
        return line.strip()

    def _parse_tokens(self, line):
        out = {}
        i = 0
        n = len(line)

        while i < n:
            c = line[i]

            if c in (' ', '\t'):
                i += 1
                continue

            if ('A' <= c <= 'Z') or ('a' <= c <= 'z'):
                letter = c.upper()
                i += 1

                while i < n and line[i] in (' ', '\t'):
                    i += 1

                j = i
                if j < n and line[j] in ('+', '-'):
                    j += 1

                dot = False
                while j < n:
                    ch = line[j]
                    if '0' <= ch <= '9':
                        j += 1
                    elif ch == '.' and not dot:
                        dot = True
                        j += 1
                    else:
                        break

                if j > i:
                    try:
                        out[letter] = float(line[i:j])
                    except:
                        pass

                i = j
            else:
                i += 1

        return out

    def _gcode_reset_modal(self):
        self._g_abs = True
        self._g_units_mm = True
        self._g_last_motion = None

    def _gcode_process_line(self, raw_line, segments=40, draw_speed_ms=None, travel_speed_ms=None):
        if draw_speed_ms is None:
            draw_speed_ms = self.default_speed_ms
        if travel_speed_ms is None:
            travel_speed_ms = self.default_speed_ms

        line = self._strip_comment(raw_line)
        if not line:
            return False

        t = self._parse_tokens(line)

        if 'G' in t:
            g = int(t['G'])
            if g == 90:
                self._g_abs = True
                return False
            if g == 91:
                self._g_abs = False
                return False
            if g == 21:
                self._g_units_mm = True
                return False
            if g == 20:
                self._g_units_mm = False
                return False
            if g in (0, 1):
                self._g_last_motion = g

        if self._g_last_motion not in (0, 1):
            return False

        if ('X' not in t) and ('Y' not in t):
            return False

        rapid = (self._g_last_motion == 0)
        speed = travel_speed_ms if rapid else draw_speed_ms

        def to_mm(v):
            return v if self._g_units_mm else (v * 25.4)

        tx = self.last_x
        ty = self.last_y

        if 'X' in t:
            vx = to_mm(t['X'])
            tx = vx if self._g_abs else (self.last_x + vx)

        if 'Y' in t:
            vy = to_mm(t['Y'])
            ty = vy if self._g_abs else (self.last_y + vy)

        self.move_line(tx, ty, segments=segments, speed=speed)
        return True

    # -----------------------------
    # Public: Homing
    # -----------------------------
    # @block {}
    # Move the robot to its home position.
    def home(self):
        print("Starter Homing...")

        print("Homing Skulder (M1)...")
        for _ in range(self.HOMING_CLEAR_STEPS):
            self.skulder.step(-self.HOMING_DIR_SKULDER)
            time.sleep_ms(2)

        while self.sensor_skulder.value() == 1:
            self.skulder.step(self.HOMING_DIR_SKULDER)
            time.sleep_ms(3)

        self.skulder.reset()
        print(">> Skulder Nulstillet!")

        print("Homing Albue (M2)...")
        for _ in range(self.HOMING_CLEAR_STEPS):
            self.albue.step(-self.HOMING_DIR_ALBUE)
            time.sleep_ms(2)

        while self.sensor_albue.value() == 1:
            self.albue.step(self.HOMING_DIR_ALBUE)
            time.sleep_ms(3)

        self.albue.reset()
        print(">> Albue Nulstillet!")
        print("HOMING COMPLETE")

        # After homing, you choose what Cartesian pose corresponds to this physical pose.
        # Keep your previous assumption (fully extended along +X):
        self.last_x = self.L1 + self.L2
        self.last_y = 0.0

        # Initialize lastShoulderSteps/lastElbowSteps from that pose (so first move delta is correct)
        ik0 = self._InverseKinematics(self.last_x, self.last_y)
        if ik0 is None:
            self.lastShoulderSteps = 0
            self.lastElbowSteps = 0
        else:
            sh, el = ik0
            self.lastShoulderSteps, self.lastElbowSteps = self._moveSteppersCount(sh, el)

        self._gcode_reset_modal()

    # ==========================================================
    # --- PUBLIC DRAWING API (now uses your IK + step deltas)
    # ==========================================================
    # @block {
    #   "label": "Move line to x {target_x} y {target_y} segments {segments} speed {speed}",
    #   "params": {
    #     "target_x": {"checkType": "Number"},
    #     "target_y": {"checkType": "Number"},
    #     "segments": {"checkType": "Number"},
    #     "speed": {"checkType": "Number"}
    #   }
    # }
    # Move the robot in a straight line to the target point.
    def move_line(self, target_x, target_y, segments=500, speed=None):
        if speed is None:
            speed = self.default_speed_ms

        start_x = self.last_x
        start_y = self.last_y

        deltaX = (target_x - start_x) / segments
        deltaY = (target_y - start_y) / segments

        reached_x = start_x
        reached_y = start_y

        for i in range(1, segments + 1):
            px = start_x + deltaX * i
            py = start_y + deltaY * i

            ik = self._InverseKinematics(px, py)
            if ik is None:
                print("Fejl: Punkt uden for rækkevidde!", px, py)
                break
            theta1, theta2 = ik

            if self.prev_theta1 is None:
                self.prev_theta1, self.prev_theta2 = theta1, theta2
            else:
                theta1 = self._unwrap(theta1, self.prev_theta1)
                theta2 = self._unwrap(theta2, self.prev_theta2)  # optional, usually less critical
                self.prev_theta1, self.prev_theta2 = theta1, theta2

            shoulder, elbow = theta1, theta2
            shoulderSteps, elbowSteps = self._moveSteppersCount(shoulder, (elbow - shoulder))

            totalShoulderSteps = shoulderSteps - self.lastShoulderSteps
            totalElbowSteps = elbowSteps - self.lastElbowSteps

            # Your mapping exactly:
            # skulder motor gets totalShoulderSteps
            # albue motor gets (totalShoulderSteps - totalElbowSteps)
            self.skulder.step(totalShoulderSteps)
            self.albue.step(totalElbowSteps)
            #self._step_n(self.skulder, totalShoulderSteps, speed_ms=int(speed))
            #self._step_n(self.albue,   totalShoulderSteps - totalElbowSteps, speed_ms=int(speed))

            self.lastShoulderSteps = shoulderSteps
            self.lastElbowSteps = elbowSteps

            reached_x = px
            reached_y = py

        self.last_x = float(reached_x)
        self.last_y = float(reached_y)

    # @block {
    #   "label": "Move arc center x {center_x} center y {center_y} radius {radius} start angle {start_angle} end angle {end_angle} segments {segments} speed {speed}",
    #   "params": {
    #     "center_x": {"checkType": "Number"},
    #     "center_y": {"checkType": "Number"},
    #     "radius": {"checkType": "Number"},
    #     "start_angle": {"checkType": "Number"},
    #     "end_angle": {"checkType": "Number"},
    #     "segments": {"checkType": "Number"},
    #     "speed": {"checkType": "Number"}
    #   }
    # }
    # Draw an arc on the sand table.
    def move_arc(self, center_x, center_y, radius, start_angle, end_angle, segments=50, speed=None):
        if speed is None:
            speed = self.default_speed_ms

        start_rad = math.radians(start_angle)
        end_rad = math.radians(end_angle)

        start_point_x = center_x + radius * math.cos(start_rad)
        start_point_y = center_y + radius * math.sin(start_rad)
        self.move_line(start_point_x, start_point_y, segments=200, speed=speed)

        for i in range(1, segments + 1):
            fraction = i / segments
            current_angle = start_rad + (end_rad - start_rad) * fraction
            target_x = center_x + radius * math.cos(current_angle)
            target_y = center_y + radius * math.sin(current_angle)
            self.move_line(target_x, target_y, segments=1, speed=speed)

    # @block {
    #   "label": "Draw spiral max radius {max_radius} turns {vindinger} segments per turn {segments_pr_omgang} speed {speed}",
    #   "params": {
    #     "max_radius": {"checkType": "Number"},
    #     "vindinger": {"checkType": "Number"},
    #     "segments_pr_omgang": {"checkType": "Number"},
    #     "speed": {"checkType": "Number"}
    #   }
    # }
    # Draw a spiral pattern.
    def draw_spiral(self, max_radius, vindinger=10, segments_pr_omgang=60, speed=None):
        if speed is None:
            speed = self.default_speed_ms

        total_angle = vindinger * 360
        total_segments = vindinger * segments_pr_omgang

        self.move_line(0, 0, segments=500, speed=speed)

        for i in range(1, total_segments + 1):
            fraction = i / total_segments
            angle_rad = math.radians(total_angle * fraction)
            current_radius = max_radius * fraction
            target_x = current_radius * math.cos(angle_rad)
            target_y = current_radius * math.sin(angle_rad)
            self.move_line(target_x, target_y, segments=1, speed=speed)

    # @block {
    #   "label": "Draw flower radius {max_radius} petals {petals} speed {speed}",
    #   "params": {
    #     "max_radius": {"checkType": "Number"},
    #     "petals": {"checkType": "Number"},
    #     "speed": {"checkType": "Number"}
    #   }
    # }
    # Draw a flower pattern.
    def draw_flower(self, max_radius, petals=5, speed=None):
        if speed is None:
            speed = self.default_speed_ms

        self.move_line(0, 0, segments=500, speed=speed)

        steps = 360
        for i in range(steps + 1):
            theta = math.radians(i)
            r = max_radius * math.cos(petals * theta)
            target_x = r * math.cos(theta)
            target_y = r * math.sin(theta)
            self.move_line(target_x, target_y, segments=1, speed=speed)

    # ==========================================================
    # --- PUBLIC: Run G-code (unchanged)
    # ==========================================================
    # @block {
    #   "label": "Run gcode text {gcode_text} segments {segments} draw speed {draw_speed_ms} travel speed {travel_speed_ms} reset modal {reset_modal}",
    #   "params": {
    #     "segments": {"checkType": "Number"},
    #     "draw_speed_ms": {"checkType": "Number"},
    #     "travel_speed_ms": {"checkType": "Number"},
    #     "reset_modal": {"checkType": "Boolean"}
    #   }
    # }
    # Run G-code from a text string.
    def run_gcode_text(self, gcode_text, segments=40, draw_speed_ms=None, travel_speed_ms=None, reset_modal=True):
        if reset_modal:
            self._gcode_reset_modal()
        for raw in gcode_text.split('\n'):
            self._gcode_process_line(raw, segments=segments, draw_speed_ms=draw_speed_ms, travel_speed_ms=travel_speed_ms)

    # @block {
    #   "label": "Run gcode file {path} segments {segments} draw speed {draw_speed_ms} travel speed {travel_speed_ms} reset modal {reset_modal}",
    #   "params": {
    #     "segments": {"checkType": "Number"},
    #     "draw_speed_ms": {"checkType": "Number"},
    #     "travel_speed_ms": {"checkType": "Number"},
    #     "reset_modal": {"checkType": "Boolean"}
    #   }
    # }
    # Run G-code from a file path.
    def run_gcode_file(self, path, segments=40, draw_speed_ms=None, travel_speed_ms=None, reset_modal=True):
        if reset_modal:
            self._gcode_reset_modal()
        with open(path, "r") as f:
            for raw in f:
                self._gcode_process_line(raw, segments=segments, draw_speed_ms=draw_speed_ms, travel_speed_ms=travel_speed_ms)
