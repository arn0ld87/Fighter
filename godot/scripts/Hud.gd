extends CanvasLayer
## Deutsche Broadcast-HUD: Lebensbalken, Runden-Banner, Steuerung, Treffer.

const HUD_COLORS := { 1: Color("ef4444"), 2: Color("3b82f6"), 3: Color("f59e0b") }

var _fills: Dictionary = {}      # id -> ColorRect (fill)
var _name_labels: Dictionary = {}
var _hp_labels: Dictionary = {}
var _banner: Label
var _hit: Label
var _hit_timer: float = 0.0
var _root: Control

func setup(fighters: Array, _player) -> void:
	_root = Control.new()
	_root.set_anchors_preset(Control.PRESET_FULL_RECT)
	_root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_root)

	var i := 0
	for f in fighters:
		var x := 24.0 + i * 432.0
		var col: Color = HUD_COLORS.get(f.fighter_id, Color.WHITE)

		var name_l := Label.new()
		name_l.text = f.fighter_name.to_upper()
		name_l.position = Vector2(x, 14)
		name_l.add_theme_font_size_override("font_size", 20)
		name_l.add_theme_color_override("font_color", col)
		_root.add_child(name_l)
		_name_labels[f.fighter_id] = name_l

		var bg := ColorRect.new()
		bg.color = Color(0, 0, 0, 0.55)
		bg.position = Vector2(x, 46)
		bg.size = Vector2(404, 26)
		_root.add_child(bg)

		var fill := ColorRect.new()
		fill.color = col
		fill.position = Vector2(x + 2, 48)
		fill.size = Vector2(400, 22)
		_root.add_child(fill)
		_fills[f.fighter_id] = fill

		var hp_l := Label.new()
		hp_l.position = Vector2(x + 8, 47)
		hp_l.add_theme_font_size_override("font_size", 14)
		hp_l.add_theme_color_override("font_color", Color.WHITE)
		_root.add_child(hp_l)
		_hp_labels[f.fighter_id] = hp_l
		i += 1

	_banner = Label.new()
	_banner.set_anchors_preset(Control.PRESET_CENTER)
	_banner.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_banner.add_theme_font_size_override("font_size", 56)
	_banner.add_theme_color_override("font_color", Color("ffd700"))
	_banner.position = Vector2(-400, -60)
	_banner.size = Vector2(800, 120)
	_banner.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_root.add_child(_banner)

	_hit = Label.new()
	_hit.set_anchors_preset(Control.PRESET_CENTER_TOP)
	_hit.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_hit.add_theme_font_size_override("font_size", 30)
	_hit.add_theme_color_override("font_color", Color("ff4500"))
	_hit.position = Vector2(-300, 110)
	_hit.size = Vector2(600, 50)
	_root.add_child(_hit)

	var help := Label.new()
	var is_touch := DisplayServer.is_touchscreen_available() or OS.has_feature("mobile")
	help.text = "" if is_touch else "Bewegen: WASD   Schlag: J   Schwer: K   Spezial: L   Block: I   Ausweichen: U   Neustart: R"
	help.set_anchors_preset(Control.PRESET_BOTTOM_WIDE)
	help.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	help.add_theme_font_size_override("font_size", 16)
	help.add_theme_color_override("font_color", Color("9aa0ad"))
	help.position = Vector2(0, -34)
	_root.add_child(help)

func refresh(fighters: Array, match_state: String, winner_name: String) -> void:
	for f in fighters:
		var fill: ColorRect = _fills.get(f.fighter_id)
		if fill:
			var ratio: float = clampf(f.hp / f.max_hp, 0.0, 1.0)
			fill.size.x = 400.0 * ratio
		var hpl: Label = _hp_labels.get(f.fighter_id)
		if hpl:
			hpl.text = "%d / %d" % [int(ceil(f.hp)), int(f.max_hp)]
		var nl: Label = _name_labels.get(f.fighter_id)
		if nl and f.state == Fighter.State.KO:
			nl.add_theme_color_override("font_color", Color("555555"))

	match match_state:
		"title":
			_banner.text = "TRIPLE THREAT ARENA\nTippen / Leertaste zum Start"
			_banner.visible = true
		"intro":
			_banner.text = "BEREIT?"
			_banner.visible = true
		"fight":
			_banner.visible = false
		"over":
			_banner.text = "%s GEWINNT!" % winner_name.to_upper() if winner_name != "Unentschieden" else "UNENTSCHIEDEN"
			_banner.visible = true

	if _hit_timer > 0.0:
		_hit_timer -= get_process_delta_time()
		if _hit_timer <= 0.0:
			_hit.text = ""

func flash_hit(victim_name: String, damage: float, is_special: bool) -> void:
	if is_special:
		_hit.text = "%s — %d SCHADEN!" % [victim_name.to_upper(), int(damage)]
	else:
		_hit.text = "%s  -%d" % [victim_name, int(damage)]
	_hit_timer = 0.8
