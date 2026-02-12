${LOGIC}
controls_if
logic_compare
logic_operation
logic_negate
logic_boolean
logic_null
logic_ternary
end_category

%{LOOPS}
controls_repeat_ext
controls_whileUntil
controls_for
controls_forEach
controls_flow_statements
end_category

%{MATH}
math_number
math_arithmetic
math_single
math_trig
math_constant
math_number_property
math_round
math_on_list
math_modulo
math_constrain
math_random_int
math_random_float
var_to_int
end_category

${TEXT}
text
text_join
text_append
text_length
text_isEmpty
text_indexOf
text_charAt
text_getSubstring
text_changeCase
text_trim
text_print
text_prompt_ext
text_to_str
end_category

%{LISTS}
lists_create_with
lists_create_with
lists_repeat
lists_length
lists_isEmpty
lists_indexOf
lists_getIndex
lists_setIndex
lists_getSublist
lists_split
lists_sort
end_category

sep
%{VARIABLES}
end_category

%{FUNCTIONS}
end_category
sep

BIPES
project_metadata
try_catch
localstorage_store
end_category

sep

Sand_Drawing_Machine
end_category

Alarm_Clock
end_category

sep

%{MICROCONTROLLER}
%{MACHINE}
end_category
%{PINS}
machine.pinout
machine.Pin.getValue
machine.ADC.read_u16
machine.Pin.setValue
machine.Pin.toggle
machine.Pin.irq
machine.PWM.init
machine.PWM.freq
machine.PWM.duty
end_category
end_category

%{SENSORS}
Ultrasound
HCSR04 ultrasound distance sensor
uss_init
end_category
end_category

%{OUTPUTS}
NeoPixel LED Strip
neopixel_init
neopixel_color_numbers
neopixel_color_colors
HSL_to_RGB
neopixel_brightness
neopixel_set_pixel
neopixel_set_line_pixel
neopixel_set_line_gradient_pixel
neopixel_rotate_left
neopixel_rotate_right
end_category
Robotics Board
robotics_board_init
robotics_board_Motor_On
robotics_board_Motor_Off
robotics_board_Servo_Turn
end_category
end_category

%{COMM}
UART
uart_init
uart_write
uart_read
uart_read_into
uart_readline
uart_read_all
end_category
SPI
SPI.init
SPI.deinit
SPI.read
SPI.readinto
SPI.write
SPI.write_readinto
end_category
I2C
machine.I2C_I2C.init
machine.I2C_I2C.deinit
machine.I2C_I2C.scan
machine.I2C_I2C.start
machine.I2C_I2C.stop
machine.I2C_I2C.readinto
machine.I2C_I2C.write
machine.I2C_I2C.readfrom
machine.I2C_I2C.readfrom_into
machine.I2C_I2C.writeto
machine.I2C_I2C.writevto
machine.I2C_I2C.readfrom_mem
machine.I2C_I2C.readfrom_mem_into
machine.I2C_I2C.writeto_mem
end_category
Bluetooth
bluetooth_init
bluetooth_send_msg
end_category
end_category

%{TIMING}
Timer_INTERRUPT
machine.Timer.init
machine.Timer.deinit
end_category
utime
utime_sleep
utime_sleep_ms
utime_sleep_us
utime_ticks_ms
utime_ticks_us
utime_ticks_cpu
utime_ticks_add
utime_ticks_diff
utime_time
end_category
end_category

