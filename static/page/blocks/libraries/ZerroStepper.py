import stepper

from machine import Pin

from time import sleep

import time



# Define the stepper motor 1 pins

ST1_1 = 21

ST1_2 = 20

ST1_3 = 19

ST1_4 = 18



# Define the stepper motor 2 pins

ST2_1 = 17

ST2_2 = 16

ST2_3 = 15

ST2_4 = 14



# Initialize the stepper motor

stepper_motorX = stepper.HalfStepMotor.frompins(ST1_1, ST1_2, ST1_3, ST1_4)

stepper_motorY = stepper.HalfStepMotor.frompins(ST2_1, ST2_2, ST2_3, ST2_4)



# Pin.PULL_UP er kritisk her! Det trækker signalet op til 3.3V internt.

hall_sensorX = Pin(22, Pin.IN, Pin.PULL_UP)

hall_sensorY = Pin(1, Pin.IN, Pin.PULL_UP)





def HomeServos():

    stepper_motorY.step(500)

    sensor_value = hall_sensorY.value()

    while sensor_value == 1:

        #Move 500 steps in clockwise direction

        stepper_motorY.step(10)

        sensor_value = hall_sensorY.value()

    stepper_motorY.reset()

    print("Done homing Y")

    

    stepper_motorX.step(500)

    sensor_value = hall_sensorX.value()

    while sensor_value == 1:

        #Move 500 steps in clockwise direction

        stepper_motorX.step(10)

        sensor_value = hall_sensorX.value()

    stepper_motorX.reset()

    print("Done homing X")



try:

    HomeServos()



    

except KeyboardInterrupt:

    print('Keyboard interrupt')