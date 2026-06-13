extends CanvasLayer

const RING_RADIUS := 90.0
const KNOB_RADIUS := 30.0
const DEAD_ZONE := 0.15

var _joystick_base: Control
var _joystick_knob: Control
var _joystick_active := false
var _joystick_touch_index := -1
var _ring_center := Vector2.ZERO

func _ready() -> void:
	layer = 10
	var is_touch := DisplayServer.is_touchscreen_available() \
		or OS.has_feature("mobile") \
		or OS.has_feature("ios")
	if not is_touch:
		hide()
		return
	_build_joystick()
	_build_action_buttons()

func set_enabled(on: bool) -> void:
	visible = on

# ── Joystick ──────────────────────────────────────────────────────────────────

func _build_joystick() -> void:
	var anchor := Control.new()
	anchor.set_anchors_preset(Control.PRESET_BOTTOM_LEFT)
	anchor.set_anchor(SIDE_LEFT, 0.0)
	anchor.set_anchor(SIDE_TOP, 1.0)
	anchor.set_anchor(SIDE_RIGHT, 0.0)
	anchor.set_anchor(SIDE_BOTTOM, 1.0)
	anchor.offset_left = 20.0
	anchor.offset_bottom = -20.0
	anchor.size = Vector2(RING_RADIUS * 2 + 20, RING_RADIUS * 2 + 20)
	anchor.offset_top = anchor.offset_bottom - anchor.size.y
	anchor.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(anchor)

	_joystick_base = _make_circle_control(
		Vector2(RING_RADIUS, RING_RADIUS),
		RING_RADIUS,
		Color(1, 1, 1, 0.18)
	)
	_joystick_base.size = Vector2(RING_RADIUS * 2, RING_RADIUS * 2)
	_joystick_base.mouse_filter = Control.MOUSE_FILTER_STOP
	_joystick_base._gui_input_callback = _on_joystick_input
	anchor.add_child(_joystick_base)

	_joystick_knob = _make_circle_control(
		Vector2(RING_RADIUS - KNOB_RADIUS, RING_RADIUS - KNOB_RADIUS),
		KNOB_RADIUS,
		Color(1, 1, 1, 0.45)
	)
	_joystick_knob.size = Vector2(KNOB_RADIUS * 2, KNOB_RADIUS * 2)
	_joystick_knob.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_joystick_base.add_child(_joystick_knob)

	_ring_center = _joystick_base.size / 2.0

func _make_circle_control(pos: Vector2, radius: float, color: Color) -> _CircleControl:
	var c := _CircleControl.new()
	c.position = pos - Vector2(radius, radius)
	c.circle_color = color
	c.circle_radius = radius
	return c

func _on_joystick_input(event: InputEvent) -> void:
	if event is InputEventScreenTouch:
		if event.pressed and not _joystick_active:
			_joystick_active = true
			_joystick_touch_index = event.index
			_apply_joystick(event.position - _ring_center)
		elif not event.pressed and event.index == _joystick_touch_index:
			_release_joystick()
	elif event is InputEventScreenDrag:
		if event.index == _joystick_touch_index:
			_apply_joystick(event.position - _ring_center)
	elif event is InputEventMouseButton:
		if event.button_index == MOUSE_BUTTON_LEFT:
			if event.pressed and not _joystick_active:
				_joystick_active = true
				_joystick_touch_index = -1
				_apply_joystick(event.position - _ring_center)
			elif not event.pressed:
				_release_joystick()
	elif event is InputEventMouseMotion:
		if _joystick_active and _joystick_touch_index == -1:
			_apply_joystick(event.position - _ring_center)

func _apply_joystick(offset: Vector2) -> void:
	var clamped := offset.limit_length(RING_RADIUS)
	var norm := clamped / RING_RADIUS
	_joystick_knob.position = (_ring_center + clamped) - Vector2(KNOB_RADIUS, KNOB_RADIUS)

	var sx := norm.x
	var sy := norm.y

	if sx < -DEAD_ZONE:
		Input.action_press("ttf_left", clampf(-sx, 0.0, 1.0))
		Input.action_release("ttf_right")
	elif sx > DEAD_ZONE:
		Input.action_press("ttf_right", clampf(sx, 0.0, 1.0))
		Input.action_release("ttf_left")
	else:
		Input.action_release("ttf_left")
		Input.action_release("ttf_right")

	if sy < -DEAD_ZONE:
		Input.action_press("ttf_up", clampf(-sy, 0.0, 1.0))
		Input.action_release("ttf_down")
	elif sy > DEAD_ZONE:
		Input.action_press("ttf_down", clampf(sy, 0.0, 1.0))
		Input.action_release("ttf_up")
	else:
		Input.action_release("ttf_up")
		Input.action_release("ttf_down")

func _release_joystick() -> void:
	_joystick_active = false
	_joystick_touch_index = -1
	_joystick_knob.position = _ring_center - Vector2(KNOB_RADIUS, KNOB_RADIUS)
	Input.action_release("ttf_left")
	Input.action_release("ttf_right")
	Input.action_release("ttf_up")
	Input.action_release("ttf_down")

# ── Action Buttons ────────────────────────────────────────────────────────────

func _build_action_buttons() -> void:
	var actions := [
		["Schlag",  "ttf_jab"],
		["Schwer",  "ttf_heavy"],
		["Spezial", "ttf_special"],
		["Block",   "ttf_block"],
		["Ausw.",   "ttf_dodge"],
	]
	var btn_size := Vector2(90, 60)
	var padding := 10.0
	var cols := 3
	for i in actions.size():
		var label: String = actions[i][0]
		var action: String = actions[i][1]
		var col := i % cols
		var row := i / cols
		var btn := Button.new()
		btn.text = label
		btn.size = btn_size
		btn.set_anchor(SIDE_RIGHT, 1.0)
		btn.set_anchor(SIDE_LEFT, 1.0)
		btn.set_anchor(SIDE_TOP, 1.0)
		btn.set_anchor(SIDE_BOTTOM, 1.0)
		var x_off := -(cols - col) * (btn_size.x + padding) - 20.0
		var y_off := -(2 - row) * (btn_size.y + padding) - 20.0
		btn.offset_left   = x_off
		btn.offset_right  = x_off + btn_size.x
		btn.offset_top    = y_off
		btn.offset_bottom = y_off + btn_size.y
		btn.mouse_filter = Control.MOUSE_FILTER_STOP
		_style_button(btn)
		btn.button_down.connect(_on_action_down.bind(action))
		btn.button_up.connect(_on_action_up.bind(action))
		add_child(btn)

func _style_button(btn: Button) -> void:
	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.1, 0.1, 0.1, 0.55)
	style.corner_radius_top_left    = 10
	style.corner_radius_top_right   = 10
	style.corner_radius_bottom_left  = 10
	style.corner_radius_bottom_right = 10
	style.border_color = Color(1, 1, 1, 0.3)
	style.border_width_left   = 2
	style.border_width_right  = 2
	style.border_width_top    = 2
	style.border_width_bottom = 2
	btn.add_theme_stylebox_override("normal", style)
	var pressed_style := style.duplicate()
	pressed_style.bg_color = Color(0.3, 0.3, 0.3, 0.75)
	btn.add_theme_stylebox_override("pressed", pressed_style)
	btn.add_theme_color_override("font_color", Color(1, 1, 1, 0.9))

func _on_action_down(action: String) -> void:
	Input.action_press(action, 1.0)

func _on_action_up(action: String) -> void:
	Input.action_release(action)

# ── Inner class: circle-drawn Control ────────────────────────────────────────

class _CircleControl extends Control:
	var circle_color := Color(1, 1, 1, 0.2)
	var circle_radius := 90.0
	var _gui_input_callback: Callable

	func _draw() -> void:
		draw_circle(size / 2.0, circle_radius, circle_color)

	func _gui_input(event: InputEvent) -> void:
		if _gui_input_callback.is_valid():
			_gui_input_callback.call(event)
