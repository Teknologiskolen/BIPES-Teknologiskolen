function machineTrimParens(value) {
  return String(value || "0").replace(/^\((.*)\)$/, "$1");
}

function machineSafeSuffix(value, fallback) {
  const raw = machineTrimParens(value || fallback || "0");
  const cleaned = raw.replace(/[^A-Za-z0-9_]+/g, "_");
  return cleaned || String(fallback || "0");
}

function machineGlobalLine(block) {
  const variables = block.workspace.getAllVariables ? block.workspace.getAllVariables() : [];
  const names = variables.map((variable) => variable.name).filter(Boolean);
  if (!names.length) {
    return "";
  }
  return Blockly.Python.INDENT + "global " + names.join(", ") + "\n";
}

function machineSignalExpr(pinCode, invertField, mode) {
  const pin = machineTrimParens(pinCode);
  const invert = invertField === "TRUE" ? "True" : "False";
  const pinExpr = mode ? `Pin(${pin}, ${mode})` : `Pin(${pin})`;
  return `Signal(${pinExpr}, invert=${invert})`;
}

Blockly.Python["pinout"] = function(block) {
  const pin = block.getFieldValue("PIN");
  return [pin, Blockly.Python.ORDER_ATOMIC];
};

Blockly.Python["machine.freq_set"] = function(block) {
  Blockly.Python.definitions_.import_machine = "import machine";
  const freq = Blockly.Python.valueToCode(block, "freq", Blockly.Python.ORDER_ATOMIC) || "0";
  return `machine.freq(${freq})\n`;
};

Blockly.Python["machine.freq_get"] = function(block) {
  Blockly.Python.definitions_.import_machine = "import machine";
  return ["machine.freq()", Blockly.Python.ORDER_FUNCTION_CALL];
};

Blockly.Python["machine.unique_id"] = function(block) {
  Blockly.Python.definitions_.import_machine = "import machine";
  return ["machine.unique_id()", Blockly.Python.ORDER_FUNCTION_CALL];
};

Blockly.Python["machine.reset_cause"] = function(block) {
  Blockly.Python.definitions_.import_machine = "import machine";
  return ["machine.reset_cause()", Blockly.Python.ORDER_FUNCTION_CALL];
};

Blockly.Python["machine.wake_reason"] = function(block) {
  Blockly.Python.definitions_.import_machine = "import machine";
  return ["machine.wake_reason()", Blockly.Python.ORDER_FUNCTION_CALL];
};

Blockly.Python["machine.disable_irq"] = function(block) {
  Blockly.Python.definitions_.import_machine = "import machine";
  return ["machine.disable_irq()", Blockly.Python.ORDER_FUNCTION_CALL];
};

Blockly.Python["machine.enable_irq"] = function(block) {
  Blockly.Python.definitions_.import_machine = "import machine";
  const state = Blockly.Python.valueToCode(block, "state", Blockly.Python.ORDER_ATOMIC) || "0";
  return `machine.enable_irq(${state})\n`;
};

Blockly.Python["machine.idle"] = function(block) {
  Blockly.Python.definitions_.import_machine = "import machine";
  return "machine.idle()\n";
};

Blockly.Python["machine.lightsleep"] = function(block) {
  Blockly.Python.definitions_.import_machine = "import machine";
  const duration = Blockly.Python.valueToCode(block, "duration_ms", Blockly.Python.ORDER_ATOMIC) || "0";
  return `machine.lightsleep(${duration})\n`;
};

Blockly.Python["machine.deepsleep"] = function(block) {
  Blockly.Python.definitions_.import_machine = "import machine";
  const duration = Blockly.Python.valueToCode(block, "duration_ms", Blockly.Python.ORDER_ATOMIC) || "0";
  return `machine.deepsleep(${duration})\n`;
};

Blockly.Python["machine.soft_reset"] = function(block) {
  Blockly.Python.definitions_.import_machine = "import machine";
  return "machine.soft_reset()\n";
};

Blockly.Python["machine.reset"] = function(block) {
  Blockly.Python.definitions_.import_machine = "import machine";
  return "machine.reset()\n";
};

Blockly.Python["machine.bootloader"] = function(block) {
  Blockly.Python.definitions_.import_machine = "import machine";
  return "machine.bootloader()\n";
};

Blockly.Python["machine.time_pulse_us"] = function(block) {
  Blockly.Python.definitions_.import_machine = "import machine";
  Blockly.Python.definitions_.from_machine_import_Pin = "from machine import Pin";
  const pin = Blockly.Python.valueToCode(block, "pin", Blockly.Python.ORDER_ATOMIC) || "0";
  const level = Blockly.Python.valueToCode(block, "pulse_level", Blockly.Python.ORDER_ATOMIC) || "1";
  const timeout = Blockly.Python.valueToCode(block, "timeout_us", Blockly.Python.ORDER_ATOMIC) || "1000000";
  const code = `machine.time_pulse_us(Pin(${machineTrimParens(pin)}, Pin.IN), ${level}, ${timeout})`;
  return [code, Blockly.Python.ORDER_FUNCTION_CALL];
};

Blockly.Python["machine.Pin.init"] = function(block) {
  Blockly.Python.definitions_.from_machine_import_Pin = "from machine import Pin";
  const pin = Blockly.Python.valueToCode(block, "pin", Blockly.Python.ORDER_ATOMIC) || "0";
  const mode = block.getFieldValue("MODE");
  const pull = block.getFieldValue("PULL");
  const args = [`${machineTrimParens(pin)}`, mode];
  if (pull && pull !== "NONE") {
    args.push(pull);
  }
  return `Pin(${args.join(", ")})\n`;
};

Blockly.Python["machine.Pin.irq"] = function(block) {
  Blockly.Python.definitions_['import machine'] = 'import machine';
  Blockly.Python.definitions_['from_machine_import_Pin'] = 'from machine import Pin';
  var pinInput = Blockly.Python.valueToCode(block, 'pin', Blockly.Python.ORDER_ATOMIC);
  var pin = pinInput.replace('(','').replace(')','');
  var trigger = block.getFieldValue('TRIGGER');
  var statements = Blockly.Python.statementToCode(block, 'DO') || Blockly.Python.PASS;
  var variableNames = [];
  var workspaceVariables = block.workspace.getAllVariables();
  workspaceVariables.forEach(variable => {
    variableNames.push(variable.name);
  });
  var globalLine = Blockly.Python.INDENT + `global ${variableNames.join(', ')}`;
  var callbackFunction = `def handler${pin}(pin):\n${globalLine}\n${statements}`;
  var interrupt = `pin${pin}.irq(handler=handler${pin}, trigger=${trigger})`;
  var code = `${callbackFunction}\npin${pin} = Pin(${pin}, Pin.IN)\n${interrupt}\n`;
  return code;
};

Blockly.Python["machine.Pin.getValue"] = function(block) {
  var pinInput = Blockly.Python.valueToCode(block, 'pin', Blockly.Python.ORDER_ATOMIC);
  var pin = pinInput.replace('(','').replace(')','');
  var pull = block.getFieldValue('PULL');
  if (pull === "Ingen") {
    Blockly.Python.definitions_[`gpio_get_${pin}`] = `pin${pin} = Pin(${pin}, Pin.IN)`;
  } else {
    Blockly.Python.definitions_[`gpio_get_${pin}`] = `pin${pin} = Pin(${pin}, Pin.IN, ${pull})`;
  }
  var code = `pin${pin}.value()`;
  return [code, Blockly.Python.ORDER_NONE];
};

Blockly.Python["machine.Pin.setValue"] = function(block) {
  Blockly.Python.definitions_['from_machine_import_Pin'] = 'from machine import Pin';
  var pinInput = Blockly.Python.valueToCode(block, 'pin', Blockly.Python.ORDER_ATOMIC);
  var pin = pinInput.replace('(','').replace(')','');
  var name = 'pin' + pin.replace(/[^a-zA-Z0-9_]/g, '');
  var value = Blockly.Python.valueToCode(block, 'value', Blockly.Python.ORDER_ATOMIC);
  // Declare the pin once (like the input block does for Pin.IN), then drive it. Avoids
  // re-creating the Pin object on every call and the gpio_set() helper function.
  Blockly.Python.definitions_[`gpio_out_${name}`] = `${name} = Pin(${pin}, Pin.OUT)`;
  var code;
  if (value === 'True')
    code = `${name}.on()\n`;
  else if (value === 'False')
    code = `${name}.off()\n`;
  else
    code = `${name}.value(${value})\n`;
  return code;
};

Blockly.Python["machine.Pin.toggle"] = function(block) {
  Blockly.Python.definitions_['from_machine_import_Pin'] = 'from machine import Pin';
  var pinInput = Blockly.Python.valueToCode(block, 'pin', Blockly.Python.ORDER_ATOMIC);
  var pin = pinInput.replace('(','').replace(')','');
  var name = 'pin' + pin.replace(/[^a-zA-Z0-9_]/g, '');
  Blockly.Python.definitions_[`gpio_out_${name}`] = `${name} = Pin(${pin}, Pin.OUT)`;
  var code = `${name}.toggle()\n`;
  return code;
};

Blockly.Python["machine.Signal.getValue"] = function(block) {
  Blockly.Python.definitions_.from_machine_import_Pin = "from machine import Pin";
  Blockly.Python.definitions_.from_machine_import_Signal = "from machine import Signal";
  const pin = Blockly.Python.valueToCode(block, "pin", Blockly.Python.ORDER_ATOMIC) || "0";
  const invert = block.getFieldValue("INVERT");
  return [`${machineSignalExpr(pin, invert, null)}.value()`, Blockly.Python.ORDER_FUNCTION_CALL];
};

Blockly.Python["machine.Signal.setValue"] = function(block) {
  Blockly.Python.definitions_.from_machine_import_Pin = "from machine import Pin";
  Blockly.Python.definitions_.from_machine_import_Signal = "from machine import Signal";
  const pin = Blockly.Python.valueToCode(block, "pin", Blockly.Python.ORDER_ATOMIC) || "0";
  const invert = block.getFieldValue("INVERT");
  const value = Blockly.Python.valueToCode(block, "value", Blockly.Python.ORDER_ATOMIC) || "0";
  return `${machineSignalExpr(pin, invert, "Pin.OUT")}.value(${value})\n`;
};

Blockly.Python["machine.Signal.on"] = function(block) {
  Blockly.Python.definitions_.from_machine_import_Pin = "from machine import Pin";
  Blockly.Python.definitions_.from_machine_import_Signal = "from machine import Signal";
  const pin = Blockly.Python.valueToCode(block, "pin", Blockly.Python.ORDER_ATOMIC) || "0";
  const invert = block.getFieldValue("INVERT");
  return `${machineSignalExpr(pin, invert, "Pin.OUT")}.on()\n`;
};

Blockly.Python["machine.Signal.off"] = function(block) {
  Blockly.Python.definitions_.from_machine_import_Pin = "from machine import Pin";
  Blockly.Python.definitions_.from_machine_import_Signal = "from machine import Signal";
  const pin = Blockly.Python.valueToCode(block, "pin", Blockly.Python.ORDER_ATOMIC) || "0";
  const invert = block.getFieldValue("INVERT");
  return `${machineSignalExpr(pin, invert, "Pin.OUT")}.off()\n`;
};

Blockly.Python["machine.ADC.init"] = function(block) {
  Blockly.Python.definitions_['import_machine.ADC'] = 'from machine import ADC';
  var pin = block.getFieldValue('PIN');
  var code = `ADC(${pin})`;
  return [code, Blockly.Python.ORDER_NONE];
};

Blockly.Python["machine.ADC.read_u16"] = function(block) {
  Blockly.Python.definitions_['import_machine.ADC'] = 'from machine import ADC';
  var pinInput = Blockly.Python.valueToCode(block, 'pin', Blockly.Python.ORDER_ATOMIC);
  var pin = pinInput.replace('(','').replace(')','');
  Blockly.Python.definitions_[`gpio_get_ADC_${pin}`] = `pin${pin} = ADC(${pin})\n`;
  var code = `pin${pin}.read_u16()`;
  return [code, Blockly.Python.ORDER_NONE];
};

Blockly.Python["machine.PWM.init"] = function(block) {
  Blockly.Python.definitions_['from_machine_import_Pin'] = 'from machine import Pin';
  Blockly.Python.definitions_['from_machine_import_pwm'] = 'from machine import PWM';
  var pinInput = Blockly.Python.valueToCode(block, 'pin', Blockly.Python.ORDER_ATOMIC);
  var pin = pinInput.replace('(','').replace(')','');
  var value_frequency = Blockly.Python.valueToCode(block, 'frequency', Blockly.Python.ORDER_ATOMIC);
  var value_duty = Blockly.Python.valueToCode(block, 'duty', Blockly.Python.ORDER_ATOMIC);
  code = `pwm${pin} = PWM(Pin(${pin}))\npwm${pin}.freq(${value_frequency})\npwm${pin}.duty_u16(${value_duty})\n`;
  return code;
};

Blockly.Python["machine.PWM.freq"] = function(block) {
  var pinInput = Blockly.Python.valueToCode(block, 'pin', Blockly.Python.ORDER_ATOMIC);
  var pin = pinInput.replace('(','').replace(')','');
  var value_frequency = Blockly.Python.valueToCode(block, 'frequency', Blockly.Python.ORDER_ATOMIC);
  var code = `pwm${pin}.freq(${value_frequency})\n`;
  return code;
};

Blockly.Python["machine.PWM.duty"] = function(block) {
  var pinInput = Blockly.Python.valueToCode(block, 'pin', Blockly.Python.ORDER_ATOMIC);
  var pin = pinInput.replace('(','').replace(')','');
  var value_duty = Blockly.Python.valueToCode(block, 'duty', Blockly.Python.ORDER_ATOMIC);
  var code = `pwm${pin}.duty_u16(${value_duty})\n`;
  return code;
};

Blockly.Python["machine.PWM.deinit"] = function(block) {
  const pinCode = Blockly.Python.valueToCode(block, "pin", Blockly.Python.ORDER_ATOMIC) || "0";
  const suffix = machineSafeSuffix(pinCode, "0");
  return `machine_pwm_${suffix}.deinit()\n`;
};

Blockly.Python["machine.RTC.datetime"] = function(block) {
  Blockly.Python.definitions_.from_machine_import_RTC = "from machine import RTC";
  return ["RTC().datetime()", Blockly.Python.ORDER_FUNCTION_CALL];
};

Blockly.Python["machine.RTC.set_datetime"] = function(block) {
  Blockly.Python.definitions_.from_machine_import_RTC = "from machine import RTC";
  const year = Blockly.Python.valueToCode(block, "year", Blockly.Python.ORDER_ATOMIC) || "2026";
  const month = Blockly.Python.valueToCode(block, "month", Blockly.Python.ORDER_ATOMIC) || "1";
  const day = Blockly.Python.valueToCode(block, "day", Blockly.Python.ORDER_ATOMIC) || "1";
  const weekday = Blockly.Python.valueToCode(block, "weekday", Blockly.Python.ORDER_ATOMIC) || "0";
  const hour = Blockly.Python.valueToCode(block, "hour", Blockly.Python.ORDER_ATOMIC) || "0";
  const minute = Blockly.Python.valueToCode(block, "minute", Blockly.Python.ORDER_ATOMIC) || "0";
  const second = Blockly.Python.valueToCode(block, "second", Blockly.Python.ORDER_ATOMIC) || "0";
  const subseconds = Blockly.Python.valueToCode(block, "subseconds", Blockly.Python.ORDER_ATOMIC) || "0";
  return `RTC().datetime((${year}, ${month}, ${day}, ${weekday}, ${hour}, ${minute}, ${second}, ${subseconds}))\n`;
};

Blockly.Python["machine.RTC.deinit"] = function(block) {
  Blockly.Python.definitions_.from_machine_import_RTC = "from machine import RTC";
  return "RTC().deinit()\n";
};

Blockly.Python["machine.Timer.init"] = function(block) {
  Blockly.Python.definitions_['from_machine_import_Timer'] = 'from machine import Timer';
  var mode = block.getFieldValue('MODE');
  var period = block.getFieldValue('PERIODE');
  var statements = Blockly.Python.statementToCode(block, 'DO') || Blockly.Python.PASS;
  var variableNames = [];
  var workspaceVariables = block.workspace.getAllVariables();
  workspaceVariables.forEach(variable => {
    variableNames.push(variable.name);
  });
  var globalLine = variableNames.length ? Blockly.Python.INDENT + `global ${variableNames.join(', ')}\n` : '';
  var callbackFunction = `def timer0(t):\n${globalLine}${statements}`;
  var interrupt = `timer = Timer(mode=${mode}, period=${period}, callback=timer0)`;
  var code = `${callbackFunction}\n${interrupt}\n`;
  return code;
};

Blockly.Python["machine.Timer.deinit"] = function(block) {
  return "timer.deinit()\n";
};

Blockly.Python["machine.WDT.init"] = function(block) {
  Blockly.Python.definitions_.from_machine_import_WDT = "from machine import WDT";
  const timeout = Blockly.Python.valueToCode(block, "timeout_ms", Blockly.Python.ORDER_ATOMIC) || "5000";
  return `wdt = WDT(timeout=${timeout})\n`;
};

Blockly.Python["machine.WDT.feed"] = function(block) {
  return "wdt.feed()\n";
};
