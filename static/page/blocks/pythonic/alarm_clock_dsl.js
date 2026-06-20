Blockly.Python["alarm_clock__create"] = function(block) {
  Blockly.Python.definitions_["import_alarm_clock"] = "import alarm_clock";
  var spi = Blockly.Python.valueToCode(block, "spi", Blockly.Python.ORDER_ATOMIC);
  var dc = Blockly.Python.valueToCode(block, "dc", Blockly.Python.ORDER_ATOMIC);
  var rst = Blockly.Python.valueToCode(block, "rst", Blockly.Python.ORDER_ATOMIC);
  var cs = Blockly.Python.valueToCode(block, "cs", Blockly.Python.ORDER_ATOMIC);
  var clk = Blockly.Python.valueToCode(block, "clk", Blockly.Python.ORDER_ATOMIC);
  var dat = Blockly.Python.valueToCode(block, "dat", Blockly.Python.ORDER_ATOMIC);
  var rtc_rst = Blockly.Python.valueToCode(block, "rtc_rst", Blockly.Python.ORDER_ATOMIC);
  var field_pin = Blockly.Python.valueToCode(block, "field_pin", Blockly.Python.ORDER_ATOMIC);
  var plus_pin = Blockly.Python.valueToCode(block, "plus_pin", Blockly.Python.ORDER_ATOMIC);
  var mode_pin = Blockly.Python.valueToCode(block, "mode_pin", Blockly.Python.ORDER_ATOMIC);
  var width = Blockly.Python.valueToCode(block, "width", Blockly.Python.ORDER_ATOMIC);
  var height = Blockly.Python.valueToCode(block, "height", Blockly.Python.ORDER_ATOMIC);
  var code = "alarm = alarm_clock.AlarmClock(" + spi + ", " + dc + ", " + rst + ", " + cs + ", " + clk + ", " + dat + ", " + rtc_rst + ", " + field_pin + ", " + plus_pin + ", " + mode_pin + ", " + width + ", " + height + ")" + "\n";
  return code;
};

Blockly.Python["alarm_clock__update"] = function(block) {
  Blockly.Python.definitions_["import_alarm_clock"] = "import alarm_clock";
  var code = "alarm.update()" + "\n";
  return code;
};

Blockly.Python["alarm_clock__set_alarm"] = function(block) {
  Blockly.Python.definitions_["import_alarm_clock"] = "import alarm_clock";
  var hour = Blockly.Python.valueToCode(block, "hour", Blockly.Python.ORDER_ATOMIC);
  var minute = Blockly.Python.valueToCode(block, "minute", Blockly.Python.ORDER_ATOMIC);
  var code = "alarm.set_alarm(" + hour + ", " + minute + ")" + "\n";
  return code;
};

Blockly.Python["alarm_clock__enable_alarm"] = function(block) {
  Blockly.Python.definitions_["import_alarm_clock"] = "import alarm_clock";
  var on = Blockly.Python.valueToCode(block, "on", Blockly.Python.ORDER_ATOMIC);
  var code = "alarm.enable_alarm(" + on + ")" + "\n";
  return code;
};

Blockly.Python["alarm_clock__is_enabled"] = function(block) {
  Blockly.Python.definitions_["import_alarm_clock"] = "import alarm_clock";
  var code = "alarm.is_enabled()" + "\n";
  return [code.trimEnd(), Blockly.Python.ORDER_NONE];
};

Blockly.Python["alarm_clock__is_ringing"] = function(block) {
  Blockly.Python.definitions_["import_alarm_clock"] = "import alarm_clock";
  var code = "alarm.is_ringing()" + "\n";
  return [code.trimEnd(), Blockly.Python.ORDER_NONE];
};

Blockly.Python["alarm_clock__alarm_started"] = function(block) {
  Blockly.Python.definitions_["import_alarm_clock"] = "import alarm_clock";
  var code = "alarm.alarm_started()" + "\n";
  return [code.trimEnd(), Blockly.Python.ORDER_NONE];
};

Blockly.Python["alarm_clock__alarm_stopped"] = function(block) {
  Blockly.Python.definitions_["import_alarm_clock"] = "import alarm_clock";
  var code = "alarm.alarm_stopped()" + "\n";
  return [code.trimEnd(), Blockly.Python.ORDER_NONE];
};

Blockly.Python["alarm_clock__read"] = function(block) {
  Blockly.Python.definitions_["import_alarm_clock"] = "import alarm_clock";
  var code = "alarm.read()" + "\n";
  return code;
};

Blockly.Python["alarm_clock__in_normal"] = function(block) {
  Blockly.Python.definitions_["import_alarm_clock"] = "import alarm_clock";
  var code = "alarm.in_normal()" + "\n";
  return [code.trimEnd(), Blockly.Python.ORDER_NONE];
};

Blockly.Python["alarm_clock__in_set_alarm"] = function(block) {
  Blockly.Python.definitions_["import_alarm_clock"] = "import alarm_clock";
  var code = "alarm.in_set_alarm()" + "\n";
  return [code.trimEnd(), Blockly.Python.ORDER_NONE];
};

Blockly.Python["alarm_clock__in_set_clock"] = function(block) {
  Blockly.Python.definitions_["import_alarm_clock"] = "import alarm_clock";
  var code = "alarm.in_set_clock()" + "\n";
  return [code.trimEnd(), Blockly.Python.ORDER_NONE];
};

Blockly.Python["alarm_clock__in_ringing"] = function(block) {
  Blockly.Python.definitions_["import_alarm_clock"] = "import alarm_clock";
  var code = "alarm.in_ringing()" + "\n";
  return [code.trimEnd(), Blockly.Python.ORDER_NONE];
};

Blockly.Python["alarm_clock__set_alarm_mode"] = function(block) {
  Blockly.Python.definitions_["import_alarm_clock"] = "import alarm_clock";
  var code = "alarm.set_alarm_mode()" + "\n";
  return code;
};

Blockly.Python["alarm_clock__set_clock_mode"] = function(block) {
  Blockly.Python.definitions_["import_alarm_clock"] = "import alarm_clock";
  var code = "alarm.set_clock_mode()" + "\n";
  return code;
};

Blockly.Python["alarm_clock__go_normal"] = function(block) {
  Blockly.Python.definitions_["import_alarm_clock"] = "import alarm_clock";
  var code = "alarm.go_normal()" + "\n";
  return code;
};

Blockly.Python["alarm_clock__field_pressed"] = function(block) {
  Blockly.Python.definitions_["import_alarm_clock"] = "import alarm_clock";
  var code = "alarm.field_pressed()" + "\n";
  return [code.trimEnd(), Blockly.Python.ORDER_NONE];
};

Blockly.Python["alarm_clock__plus_pressed"] = function(block) {
  Blockly.Python.definitions_["import_alarm_clock"] = "import alarm_clock";
  var code = "alarm.plus_pressed()" + "\n";
  return [code.trimEnd(), Blockly.Python.ORDER_NONE];
};

Blockly.Python["alarm_clock__mode_clicked"] = function(block) {
  Blockly.Python.definitions_["import_alarm_clock"] = "import alarm_clock";
  var code = "alarm.mode_clicked()" + "\n";
  return [code.trimEnd(), Blockly.Python.ORDER_NONE];
};

Blockly.Python["alarm_clock__mode_double_clicked"] = function(block) {
  Blockly.Python.definitions_["import_alarm_clock"] = "import alarm_clock";
  var code = "alarm.mode_double_clicked()" + "\n";
  return [code.trimEnd(), Blockly.Python.ORDER_NONE];
};

Blockly.Python["alarm_clock__handle_buttons"] = function(block) {
  Blockly.Python.definitions_["import_alarm_clock"] = "import alarm_clock";
  var code = "alarm.handle_buttons()" + "\n";
  return code;
};

Blockly.Python["alarm_clock__next_field"] = function(block) {
  Blockly.Python.definitions_["import_alarm_clock"] = "import alarm_clock";
  var code = "alarm.next_field()" + "\n";
  return code;
};

Blockly.Python["alarm_clock__increase"] = function(block) {
  Blockly.Python.definitions_["import_alarm_clock"] = "import alarm_clock";
  var code = "alarm.increase()" + "\n";
  return code;
};

Blockly.Python["alarm_clock__save"] = function(block) {
  Blockly.Python.definitions_["import_alarm_clock"] = "import alarm_clock";
  var code = "alarm.save()" + "\n";
  return code;
};

Blockly.Python["alarm_clock__commit_alarm"] = function(block) {
  Blockly.Python.definitions_["import_alarm_clock"] = "import alarm_clock";
  var code = "alarm.commit_alarm()" + "\n";
  return code;
};

Blockly.Python["alarm_clock__commit_clock"] = function(block) {
  Blockly.Python.definitions_["import_alarm_clock"] = "import alarm_clock";
  var code = "alarm.commit_clock()" + "\n";
  return code;
};

Blockly.Python["alarm_clock__stop"] = function(block) {
  Blockly.Python.definitions_["import_alarm_clock"] = "import alarm_clock";
  var code = "alarm.stop()" + "\n";
  return code;
};

Blockly.Python["alarm_clock__field"] = function(block) {
  Blockly.Python.definitions_["import_alarm_clock"] = "import alarm_clock";
  var code = "alarm.field()" + "\n";
  return [code.trimEnd(), Blockly.Python.ORDER_NONE];
};

Blockly.Python["alarm_clock__alarm_hour"] = function(block) {
  Blockly.Python.definitions_["import_alarm_clock"] = "import alarm_clock";
  var code = "alarm.alarm_hour()" + "\n";
  return [code.trimEnd(), Blockly.Python.ORDER_NONE];
};

Blockly.Python["alarm_clock__alarm_minute"] = function(block) {
  Blockly.Python.definitions_["import_alarm_clock"] = "import alarm_clock";
  var code = "alarm.alarm_minute()" + "\n";
  return [code.trimEnd(), Blockly.Python.ORDER_NONE];
};

Blockly.Python["alarm_clock__alarm_due"] = function(block) {
  Blockly.Python.definitions_["import_alarm_clock"] = "import alarm_clock";
  var code = "alarm.alarm_due()" + "\n";
  return [code.trimEnd(), Blockly.Python.ORDER_NONE];
};

Blockly.Python["alarm_clock__start_ringing"] = function(block) {
  Blockly.Python.definitions_["import_alarm_clock"] = "import alarm_clock";
  var code = "alarm.start_ringing()" + "\n";
  return code;
};

Blockly.Python["alarm_clock__begin_frame"] = function(block) {
  Blockly.Python.definitions_["import_alarm_clock"] = "import alarm_clock";
  var code = "alarm.begin_frame()" + "\n";
  return code;
};

Blockly.Python["alarm_clock__mode_changed"] = function(block) {
  Blockly.Python.definitions_["import_alarm_clock"] = "import alarm_clock";
  var code = "alarm.mode_changed()" + "\n";
  return [code.trimEnd(), Blockly.Python.ORDER_NONE];
};

Blockly.Python["alarm_clock__draw_clock"] = function(block) {
  Blockly.Python.definitions_["import_alarm_clock"] = "import alarm_clock";
  var x = Blockly.Python.valueToCode(block, "x", Blockly.Python.ORDER_ATOMIC);
  var y = Blockly.Python.valueToCode(block, "y", Blockly.Python.ORDER_ATOMIC);
  var color = Blockly.Python.valueToCode(block, "color", Blockly.Python.ORDER_ATOMIC);
  var size = Blockly.Python.valueToCode(block, "size", Blockly.Python.ORDER_ATOMIC);
  var code = "alarm.draw_clock(" + x + ", " + y + ", " + color + ", " + size + ")" + "\n";
  return code;
};

Blockly.Python["alarm_clock__draw_date"] = function(block) {
  Blockly.Python.definitions_["import_alarm_clock"] = "import alarm_clock";
  var x = Blockly.Python.valueToCode(block, "x", Blockly.Python.ORDER_ATOMIC);
  var y = Blockly.Python.valueToCode(block, "y", Blockly.Python.ORDER_ATOMIC);
  var color = Blockly.Python.valueToCode(block, "color", Blockly.Python.ORDER_ATOMIC);
  var code = "alarm.draw_date(" + x + ", " + y + ", " + color + ")" + "\n";
  return code;
};

Blockly.Python["alarm_clock__draw_edit_time"] = function(block) {
  Blockly.Python.definitions_["import_alarm_clock"] = "import alarm_clock";
  var x = Blockly.Python.valueToCode(block, "x", Blockly.Python.ORDER_ATOMIC);
  var y = Blockly.Python.valueToCode(block, "y", Blockly.Python.ORDER_ATOMIC);
  var color = Blockly.Python.valueToCode(block, "color", Blockly.Python.ORDER_ATOMIC);
  var size = Blockly.Python.valueToCode(block, "size", Blockly.Python.ORDER_ATOMIC);
  var code = "alarm.draw_edit_time(" + x + ", " + y + ", " + color + ", " + size + ")" + "\n";
  return code;
};

Blockly.Python["alarm_clock__draw_edit_date"] = function(block) {
  Blockly.Python.definitions_["import_alarm_clock"] = "import alarm_clock";
  var x = Blockly.Python.valueToCode(block, "x", Blockly.Python.ORDER_ATOMIC);
  var y = Blockly.Python.valueToCode(block, "y", Blockly.Python.ORDER_ATOMIC);
  var color = Blockly.Python.valueToCode(block, "color", Blockly.Python.ORDER_ATOMIC);
  var code = "alarm.draw_edit_date(" + x + ", " + y + ", " + color + ")" + "\n";
  return code;
};

Blockly.Python["alarm_clock__draw_ringing"] = function(block) {
  Blockly.Python.definitions_["import_alarm_clock"] = "import alarm_clock";
  var code = "alarm.draw_ringing()" + "\n";
  return code;
};

Blockly.Python["alarm_clock__draw_default"] = function(block) {
  Blockly.Python.definitions_["import_alarm_clock"] = "import alarm_clock";
  var code = "alarm.draw_default()" + "\n";
  return code;
};

Blockly.Python["alarm_clock__now_hour"] = function(block) {
  Blockly.Python.definitions_["import_alarm_clock"] = "import alarm_clock";
  var code = "alarm.now_hour()" + "\n";
  return [code.trimEnd(), Blockly.Python.ORDER_NONE];
};

Blockly.Python["alarm_clock__now_minute"] = function(block) {
  Blockly.Python.definitions_["import_alarm_clock"] = "import alarm_clock";
  var code = "alarm.now_minute()" + "\n";
  return [code.trimEnd(), Blockly.Python.ORDER_NONE];
};

Blockly.Python["alarm_clock__now_second"] = function(block) {
  Blockly.Python.definitions_["import_alarm_clock"] = "import alarm_clock";
  var code = "alarm.now_second()" + "\n";
  return [code.trimEnd(), Blockly.Python.ORDER_NONE];
};

Blockly.Python["alarm_clock__now_day"] = function(block) {
  Blockly.Python.definitions_["import_alarm_clock"] = "import alarm_clock";
  var code = "alarm.now_day()" + "\n";
  return [code.trimEnd(), Blockly.Python.ORDER_NONE];
};

Blockly.Python["alarm_clock__now_month"] = function(block) {
  Blockly.Python.definitions_["import_alarm_clock"] = "import alarm_clock";
  var code = "alarm.now_month()" + "\n";
  return [code.trimEnd(), Blockly.Python.ORDER_NONE];
};

Blockly.Python["alarm_clock__now_year"] = function(block) {
  Blockly.Python.definitions_["import_alarm_clock"] = "import alarm_clock";
  var code = "alarm.now_year()" + "\n";
  return [code.trimEnd(), Blockly.Python.ORDER_NONE];
};

Blockly.Python["alarm_clock__time_text"] = function(block) {
  Blockly.Python.definitions_["import_alarm_clock"] = "import alarm_clock";
  var code = "alarm.time_text()" + "\n";
  return [code.trimEnd(), Blockly.Python.ORDER_NONE];
};

Blockly.Python["alarm_clock__date_text"] = function(block) {
  Blockly.Python.definitions_["import_alarm_clock"] = "import alarm_clock";
  var code = "alarm.date_text()" + "\n";
  return [code.trimEnd(), Blockly.Python.ORDER_NONE];
};

Blockly.Python["alarm_clock__hour_changed"] = function(block) {
  Blockly.Python.definitions_["import_alarm_clock"] = "import alarm_clock";
  var code = "alarm.hour_changed()" + "\n";
  return [code.trimEnd(), Blockly.Python.ORDER_NONE];
};

Blockly.Python["alarm_clock__minute_changed"] = function(block) {
  Blockly.Python.definitions_["import_alarm_clock"] = "import alarm_clock";
  var code = "alarm.minute_changed()" + "\n";
  return [code.trimEnd(), Blockly.Python.ORDER_NONE];
};

Blockly.Python["alarm_clock__second_changed"] = function(block) {
  Blockly.Python.definitions_["import_alarm_clock"] = "import alarm_clock";
  var code = "alarm.second_changed()" + "\n";
  return [code.trimEnd(), Blockly.Python.ORDER_NONE];
};

Blockly.Python["alarm_clock__flash_on"] = function(block) {
  Blockly.Python.definitions_["import_alarm_clock"] = "import alarm_clock";
  var code = "alarm.flash_on()" + "\n";
  return [code.trimEnd(), Blockly.Python.ORDER_NONE];
};

Blockly.Python["alarm_clock__draw_text"] = function(block) {
  Blockly.Python.definitions_["import_alarm_clock"] = "import alarm_clock";
  var string = Blockly.Python.valueToCode(block, "string", Blockly.Python.ORDER_ATOMIC);
  var x = Blockly.Python.valueToCode(block, "x", Blockly.Python.ORDER_ATOMIC);
  var y = Blockly.Python.valueToCode(block, "y", Blockly.Python.ORDER_ATOMIC);
  var color = Blockly.Python.valueToCode(block, "color", Blockly.Python.ORDER_ATOMIC);
  var size = Blockly.Python.valueToCode(block, "size", Blockly.Python.ORDER_ATOMIC);
  var code = "alarm.draw_text(" + string + ", " + x + ", " + y + ", " + color + ", " + size + ")" + "\n";
  return code;
};

Blockly.Python["alarm_clock__clear"] = function(block) {
  Blockly.Python.definitions_["import_alarm_clock"] = "import alarm_clock";
  var x = Blockly.Python.valueToCode(block, "x", Blockly.Python.ORDER_ATOMIC);
  var y = Blockly.Python.valueToCode(block, "y", Blockly.Python.ORDER_ATOMIC);
  var w = Blockly.Python.valueToCode(block, "w", Blockly.Python.ORDER_ATOMIC);
  var h = Blockly.Python.valueToCode(block, "h", Blockly.Python.ORDER_ATOMIC);
  var code = "alarm.clear(" + x + ", " + y + ", " + w + ", " + h + ")" + "\n";
  return code;
};

Blockly.Python["alarm_clock__fill"] = function(block) {
  Blockly.Python.definitions_["import_alarm_clock"] = "import alarm_clock";
  var color = Blockly.Python.valueToCode(block, "color", Blockly.Python.ORDER_ATOMIC);
  var code = "alarm.fill(" + color + ")" + "\n";
  return code;
};
