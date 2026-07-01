import time
import math
from machine import Pin


class SandTableRobot:
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
            if self.last_direction != 0 and direction != self.last_direction:
                for _ in range(self.backlash_steps):
                    self.current_step = (self.current_step + direction) % self.step_count
                    self._set_step(self.step_sequence[self.current_step])
                    time.sleep_ms(2)

            self.last_direction = direction
            self.current_step = (self.current_step + direction) % self.step_count
            self._set_step(self.step_sequence[self.current_step])

    def __init__(
        self,
        motor_shoulder_pins=(17, 16, 15, 14),
        motor_elbow_pins=(21, 20, 19, 18),
        sensor_shoulder_pin=1,
        sensor_elbow_pin=22,
        L1=31.0,
        L2=31.0,
        backlash_deg_m1=3.2,
        backlash_deg_m2=3.0,
        motor1_dir=1,
        motor2_dir=1,
        homing_dir_shoulder=1,
        homing_dir_elbow=1,
        homing_clear_steps=500,
        steps_per_rev=4096.0,
        safe_center_radius=1.0,
        default_speed=3
    ):
        self.L1 = float(L1)
        self.L2 = float(L2)
        self.MOTOR1_DIR = int(motor1_dir)
        self.MOTOR2_DIR = int(motor2_dir)
        self.STEPS_PER_REV = float(steps_per_rev)

        self.HOMING_DIR_SKULDER = int(homing_dir_shoulder)
        self.HOMING_DIR_ALBUE = int(homing_dir_elbow)
        self.HOMING_CLEAR_STEPS = int(homing_clear_steps)

        self.SAFE_CENTER_RADIUS = float(safe_center_radius)
        self.default_speed = int(default_speed)

        self.BACKLASH_STEPS_1 = int((float(backlash_deg_m1) / 360.0) * self.STEPS_PER_REV)
        self.BACKLASH_STEPS_2 = int((float(backlash_deg_m2) / 360.0) * self.STEPS_PER_REV)

        self.current_motor_steps_1 = 0
        self.current_motor_steps_2 = 0

        self.last_x = self.L1 + self.L2
        self.last_y = 0.0

        self.previous_theta1_geom = None
        self.previous_theta2_geom = None

        self.sensor_skulder = Pin(int(sensor_shoulder_pin), Pin.IN, Pin.PULL_UP)
        self.sensor_albue = Pin(int(sensor_elbow_pin), Pin.IN, Pin.PULL_UP)

        self.skulder = self.Stepper(*motor_shoulder_pins, backlash_steps=self.BACKLASH_STEPS_1)
        self.albue = self.Stepper(*motor_elbow_pins, backlash_steps=self.BACKLASH_STEPS_2)

        self._g_abs = True
        self._g_units_mm = True
        self._g_last_motion = None

    def off(self):
        self.skulder.off()
        self.albue.off()

    # -----------------------------------------------------------------
    # Low-level teaching helper: drive ONE stepper a number of steps.
    #
    # The drawing API hides the steppers; this exposes a single motor so
    # students can move one stepper at a time (e.g. build homing themselves).
    # The internal Stepper.step() takes a +/-1 direction, so expand N steps here.
    # -----------------------------------------------------------------
    def step_motor(self, motor=1, direction="f", steps=500, speed_ms=3):
        """Drej én stepmotor.
        motor: 1 = skulder, 2 = albue.
        direction: "f" = fremad, "r" = tilbage.
        steps: antal trin (4096 = en hel omgang).
        speed_ms: ventetid pr. trin i ms (større tal = langsommere)."""
        m = self.skulder if int(motor) == 1 else self.albue
        d = 1 if direction == "f" else -1
        for _ in range(abs(int(steps))):
            m.step(d)
            if int(speed_ms) > 0:
                time.sleep_ms(int(speed_ms))

    def unwrap_angle(self, angle, previous_angle):
        if previous_angle is None:
            return angle

        while angle - previous_angle > math.pi:
            angle -= 2 * math.pi

        while angle - previous_angle < -math.pi:
            angle += 2 * math.pi

        return angle

    def steps_to_rad(self, steps):
        return (steps / self.STEPS_PER_REV) * 2 * math.pi

    def rad_to_steps(self, radians):
        return int((radians / (2 * math.pi)) * self.STEPS_PER_REV)

    def geometry_to_motor_angles(self, theta1_geom, theta2_geom):
        motor1_rad = theta1_geom * self.MOTOR1_DIR
        motor2_rad = (theta2_geom - theta1_geom) * self.MOTOR2_DIR
        return motor1_rad, motor2_rad

    def inverse_kinematics_geometry(self, x, y):
        r_sq = x * x + y * y
        r = math.sqrt(r_sq)

        if r > (self.L1 + self.L2):
            return None, None

        if r < self.SAFE_CENTER_RADIUS:
            if self.previous_theta1_geom is not None and self.previous_theta2_geom is not None:
                return self.previous_theta1_geom, self.previous_theta2_geom

            x = self.SAFE_CENTER_RADIUS
            y = 0.0
            r_sq = x * x + y * y

        cos_theta2 = (r_sq - self.L1**2 - self.L2**2) / (2 * self.L1 * self.L2)
        cos_theta2 = max(-1.0, min(1.0, cos_theta2))

        theta2_a = math.acos(cos_theta2)
        theta2_options = [theta2_a, -theta2_a]

        current_m1_rad = self.steps_to_rad(self.current_motor_steps_1)
        current_m2_rad = self.steps_to_rad(self.current_motor_steps_2)

        best_theta1 = None
        best_theta2 = None
        best_cost = None

        for theta2_geom in theta2_options:
            k1 = self.L1 + self.L2 * math.cos(theta2_geom)
            k2 = self.L2 * math.sin(theta2_geom)

            theta1_geom = math.atan2(y, x) - math.atan2(k2, k1)

            theta1_geom = self.unwrap_angle(theta1_geom, self.previous_theta1_geom)
            theta2_geom = self.unwrap_angle(theta2_geom, self.previous_theta2_geom)

            m1_rad, m2_rad = self.geometry_to_motor_angles(theta1_geom, theta2_geom)

            m1_rad = self.unwrap_angle(m1_rad, current_m1_rad)
            m2_rad = self.unwrap_angle(m2_rad, current_m2_rad)

            cost = abs(m1_rad - current_m1_rad) + abs(m2_rad - current_m2_rad)

            if best_cost is None or cost < best_cost:
                best_cost = cost
                best_theta1 = m1_rad / self.MOTOR1_DIR
                best_theta2 = (m2_rad / self.MOTOR2_DIR) + best_theta1

        self.previous_theta1_geom = best_theta1
        self.previous_theta2_geom = best_theta2

        return best_theta1, best_theta2

    def _low_level_move(self, dx, dy, speed_ms=2):
        dir_x = 1 if dx > 0 else -1
        dir_y = 1 if dy > 0 else -1
        abs_dx = abs(dx)
        abs_dy = abs(dy)

        if abs_dx > abs_dy:
            err = abs_dx // 2
            for _ in range(abs_dx):
                self.skulder.step(dir_x)
                err -= abs_dy
                if err < 0:
                    self.albue.step(dir_y)
                    err += abs_dx
                if speed_ms > 0:
                    time.sleep_ms(speed_ms)
        else:
            err = abs_dy // 2
            for _ in range(abs_dy):
                self.albue.step(dir_y)
                err -= abs_dx
                if err < 0:
                    self.skulder.step(dir_x)
                    err += abs_dy
                if speed_ms > 0:
                    time.sleep_ms(speed_ms)

    def home(self):
        print("Starter Homing...")

        print("Homing Skulder (M1)...")
        for _ in range(self.HOMING_CLEAR_STEPS):
            self.skulder.step(-self.HOMING_DIR_SKULDER)
            time.sleep_ms(2)

        while self.sensor_skulder.value() == 1:
            self.skulder.step(self.HOMING_DIR_SKULDER)
            time.sleep_ms(3)

        self.current_motor_steps_1 = 0
        self.skulder.off()
        print(">> Skulder Nulstillet!")

        print("Homing Albue (M2)...")
        for _ in range(self.HOMING_CLEAR_STEPS):
            self.albue.step(-self.HOMING_DIR_ALBUE)
            time.sleep_ms(2)

        while self.sensor_albue.value() == 1:
            self.albue.step(self.HOMING_DIR_ALBUE)
            time.sleep_ms(3)

        self.current_motor_steps_2 = 0
        self.albue.off()
        print(">> Albue Nulstillet!")
        print("HOMING COMPLETE")

        self.last_x = self.L1 + self.L2
        self.last_y = 0.0
        self.previous_theta1_geom = None
        self.previous_theta2_geom = None
        self._gcode_reset_modal()

    def set_logical_position(self, x, y):
        t1_geo, t2_geo = self.inverse_kinematics_geometry(x, y)

        if t1_geo is None:
            print("Cannot set logical position. Point unreachable.")
            return

        m1_rad, m2_rad = self.geometry_to_motor_angles(t1_geo, t2_geo)

        self.current_motor_steps_1 = self.rad_to_steps(m1_rad)
        self.current_motor_steps_2 = self.rad_to_steps(m2_rad)

        self.previous_theta1_geom = t1_geo
        self.previous_theta2_geom = t2_geo

        self.last_x = x
        self.last_y = y

    def move_line(self, target_x, target_y, segments=40, speed=None):
        if speed is None:
            speed = self.default_speed

        start_x = self.last_x
        start_y = self.last_y

        for i in range(1, segments + 1):
            fraction = i / segments
            next_x = start_x + (target_x - start_x) * fraction
            next_y = start_y + (target_y - start_y) * fraction

            t1_geo, t2_geo = self.inverse_kinematics_geometry(next_x, next_y)

            if t1_geo is None:
                print("Fejl: Punkt uden for rækkevidde!")
                break

            m1_rad, m2_rad = self.geometry_to_motor_angles(t1_geo, t2_geo)

            target_steps_1 = self.rad_to_steps(m1_rad)
            target_steps_2 = self.rad_to_steps(m2_rad)

            d_steps_1 = target_steps_1 - self.current_motor_steps_1
            d_steps_2 = target_steps_2 - self.current_motor_steps_2

            self._low_level_move(d_steps_1, d_steps_2, speed_ms=speed)

            # Important fix: set state to target, do not accumulate deltas
            self.current_motor_steps_1 = target_steps_1
            self.current_motor_steps_2 = target_steps_2

        self.last_x = target_x
        self.last_y = target_y

    def move_arc(self, center_x, center_y, radius, start_angle, end_angle, segments=50, speed=None):
        if speed is None:
            speed = self.default_speed

        start_rad = math.radians(start_angle)
        end_rad = math.radians(end_angle)

        print("Arc: Center({}, {}) R={} Vinkel {}->{}".format(center_x, center_y, radius, start_angle, end_angle))

        start_point_x = center_x + radius * math.cos(start_rad)
        start_point_y = center_y + radius * math.sin(start_rad)

        self.move_line(start_point_x, start_point_y, segments=20, speed=speed)

        for i in range(1, segments + 1):
            fraction = i / segments
            current_angle = start_rad + (end_rad - start_rad) * fraction
            target_x = center_x + radius * math.cos(current_angle)
            target_y = center_y + radius * math.sin(current_angle)
            self.move_line(target_x, target_y, segments=1, speed=speed)

    def draw_spiral(self, max_radius, vindinger=10, segments_pr_omgang=60, speed=None):
        if speed is None:
            speed = self.default_speed

        print("Tegner spiral: R={}, omgange={}".format(max_radius, vindinger))

        total_angle = vindinger * 360
        total_segments = vindinger * segments_pr_omgang

        self.move_line(self.SAFE_CENTER_RADIUS, 0, segments=40, speed=speed)

        for i in range(1, total_segments + 1):
            fraction = i / total_segments
            angle_rad = math.radians(total_angle * fraction)
            current_radius = self.SAFE_CENTER_RADIUS + (max_radius - self.SAFE_CENTER_RADIUS) * fraction

            target_x = current_radius * math.cos(angle_rad)
            target_y = current_radius * math.sin(angle_rad)

            self.move_line(target_x, target_y, segments=1, speed=speed)

    def draw_flower(self, max_radius, petals=5, speed=None):
        if speed is None:
            speed = self.default_speed

        print("Tegner blomst med {} blade".format(petals))

        steps = 360

        start_x = max_radius
        start_y = 0
        self.move_line(start_x, start_y, segments=100, speed=speed)

        for i in range(1, steps + 1):
            theta = math.radians(i)
            r = max_radius * math.cos(petals * theta)

            target_x = r * math.cos(theta)
            target_y = r * math.sin(theta)

            self.move_line(target_x, target_y, segments=1, speed=speed)

    def spiral(self, max_radius=60, vindinger=10, segments_pr_omgang=60, speed=None):
        self.draw_spiral(max_radius, vindinger, segments_pr_omgang, speed)

    def flower(self, max_radius=50, petals=5, speed=None):
        self.draw_flower(max_radius, petals, speed)

    # -----------------------------
    # G-code helpers
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
            draw_speed_ms = self.default_speed
        if travel_speed_ms is None:
            travel_speed_ms = self.default_speed

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

        rapid = self._g_last_motion == 0
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

    def run_gcode_text(self, gcode_text, segments=50, draw_speed_ms=None, travel_speed_ms=None, reset_modal=True):
        if reset_modal:
            self._gcode_reset_modal()

        for raw in gcode_text.split('\n'):
            self._gcode_process_line(
                raw,
                segments=segments,
                draw_speed_ms=draw_speed_ms,
                travel_speed_ms=travel_speed_ms
            )

    def run_gcode_file(self, path, segments=50, draw_speed_ms=None, travel_speed_ms=None, reset_modal=True):
        if reset_modal:
            self._gcode_reset_modal()

        with open(path, "r") as f:
            for raw in f:
                self._gcode_process_line(
                    raw,
                    segments=segments,
                    draw_speed_ms=draw_speed_ms,
                    travel_speed_ms=travel_speed_ms
                )
