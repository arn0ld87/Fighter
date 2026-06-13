extends Node3D
## Orchestrator: builds the world, spawns fighters, drives the match + camera.

const FIGHTERS := [
	{ "id": 1, "name": "Donald Trump", "special": "GIGA MAGA HAYMAKER",
	  "hp": 110.0, "power": 7.0, "speed": 4.0, "reach": 2.1, "defense": 5.0,
	  "skin": "ffa254", "suit": "16233f", "tie": "d11a2a", "shirt": true, "ref": "trump",
	  "hair_color": "f5d76e", "hair_style": "swoosh",
	  "height": 1.9, "girth": 1.05, "spawn": Vector3(-2.5, 0, 1.5) },
	{ "id": 2, "name": "Vladimir Putin", "special": "KGB TACTICAL TRIP",
	  "hp": 95.0, "power": 5.0, "speed": 9.0, "reach": 1.8, "defense": 7.0,
	  "skin": "fed7aa", "suit": "13151c", "tie": "6e2230", "shirt": true, "ref": "putin",
	  "hair_color": "9ca3af", "hair_style": "cap",
	  "height": 1.7, "girth": 0.85, "spawn": Vector3(2.5, 0, 1.5) },
	{ "id": 3, "name": "Kim Jong Un", "special": "ICBM COLOSSAL SLAM",
	  "hp": 130.0, "power": 9.0, "speed": 3.0, "reach": 1.7, "defense": 8.0,
	  "skin": "fef08a", "suit": "0d0d0f", "tie": "", "shirt": false, "ref": "kim",
	  "hair_color": "111111", "hair_style": "bun",
	  "height": 1.7, "girth": 1.5, "spawn": Vector3(0, 0, -2.6) },
]

const RING_RADIUS := 6.0

var fighters: Array[Fighter] = []
var player: Fighter = null
var camera: Camera3D
var hud
var shake: float = 0.0
var hitstop: float = 0.0
var match_state: String = "intro"   # intro | fight | over
var intro_timer: float = 2.0
var winner_name: String = ""
var _want_shot: bool = false
var audio                       # Audio.gd instance (sfx + procedural crowd)
var touch                       # TouchControls.gd instance (iPhone)
var crowd_excite: float = 0.0   # decays; spikes on hits -> louder crowd
var _gong_played: bool = false
var _sim_fight: bool = false    # --simfight: all AI, print duration, quit
var fight_elapsed: float = 0.0

func _ready() -> void:
	_want_shot = "--shot" in OS.get_cmdline_user_args()
	_sim_fight = "--simfight" in OS.get_cmdline_user_args()
	_setup_input()
	_build_environment()
	_build_arena()
	_build_crowd()
	_spawn_fighters()
	_build_camera()
	_build_hud()
	_build_audio()
	_build_touch()
	if _sim_fight:
		for f in fighters:
			f.is_player = false
		player = null
		match_state = "fight"
		intro_timer = 0.0
	if _want_shot:
		# deterministic portrait: 3 fighters in a row, facing the camera, frozen
		var xs := [-2.4, 0.0, 2.4]
		var i := 0
		for f in fighters:
			f.is_player = false
			f.frozen = true
			f.position = Vector3(xs[i], 0, 0)
			f.face_yaw = 0.0
			f.rotation.y = 0.0
			i += 1
		match_state = "intro"
		intro_timer = 999.0

# ----------------------------------------------------------------- input
func _add_key(action: String, keycode: int) -> void:
	if not InputMap.has_action(action):
		InputMap.add_action(action)
	var ev := InputEventKey.new()
	ev.physical_keycode = keycode
	InputMap.action_add_event(action, ev)

func _setup_input() -> void:
	_add_key("ttf_left", KEY_A); _add_key("ttf_left", KEY_LEFT)
	_add_key("ttf_right", KEY_D); _add_key("ttf_right", KEY_RIGHT)
	_add_key("ttf_up", KEY_W); _add_key("ttf_up", KEY_UP)
	_add_key("ttf_down", KEY_S); _add_key("ttf_down", KEY_DOWN)
	_add_key("ttf_jab", KEY_J); _add_key("ttf_jab", KEY_SPACE)
	_add_key("ttf_heavy", KEY_K)
	_add_key("ttf_special", KEY_L)
	_add_key("ttf_block", KEY_I); _add_key("ttf_block", KEY_SHIFT)
	_add_key("ttf_dodge", KEY_U)
	_add_key("ttf_restart", KEY_R)

# ----------------------------------------------------------------- world
func _build_environment() -> void:
	var we := WorldEnvironment.new()
	var env := Environment.new()
	env.background_mode = Environment.BG_COLOR
	env.background_color = Color("05020c")
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color("4a4470")
	env.ambient_light_energy = 1.1
	env.fog_enabled = true
	env.fog_light_color = Color("1a1230")
	env.fog_density = 0.006
	env.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	we.environment = env
	add_child(we)

	var key := DirectionalLight3D.new()
	key.rotation_degrees = Vector3(-58, -40, 0)
	key.light_energy = 1.9
	key.light_color = Color("fff4e0")
	key.shadow_enabled = true
	add_child(key)

	# soft fill from the front so fighters read clearly
	var fill := DirectionalLight3D.new()
	fill.rotation_degrees = Vector3(-20, 150, 0)
	fill.light_energy = 0.7
	fill.light_color = Color("c8d4ff")
	add_child(fill)

	# colored arena spots for drama
	_add_spot(Vector3(-7, 9, 5), Color("ff1e56"))
	_add_spot(Vector3(7, 9, -5), Color("0ea5e9"))
	_add_spot(Vector3(0, 10, 8), Color("f59e0b"))

func _add_spot(pos: Vector3, col: Color) -> void:
	var s := SpotLight3D.new()
	s.position = pos
	s.light_color = col
	s.light_energy = 6.0
	s.spot_range = 30.0
	s.spot_angle = 38.0
	add_child(s)
	s.look_at(Vector3(0, 1, 0), Vector3.UP)

func _mat(c: Color, rough := 0.85, metal := 0.0, emis := Color(0, 0, 0)) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = c
	m.roughness = rough
	m.metallic = metal
	if emis != Color(0, 0, 0):
		m.emission_enabled = true
		m.emission = emis
		m.emission_energy_multiplier = 2.0
	return m

func _build_arena() -> void:
	# physical floor
	var floor_body := StaticBody3D.new()
	floor_body.collision_layer = 1
	var fcol := CollisionShape3D.new()
	var fshape := BoxShape3D.new()
	fshape.size = Vector3(40, 1, 40)
	fcol.shape = fshape
	fcol.position.y = -0.5
	floor_body.add_child(fcol)
	add_child(floor_body)

	# octagon ring mat (visual)
	var ring := MeshInstance3D.new()
	var cyl := CylinderMesh.new()
	cyl.top_radius = RING_RADIUS
	cyl.bottom_radius = RING_RADIUS
	cyl.height = 0.1
	cyl.radial_segments = 8
	ring.mesh = cyl
	ring.material_override = _mat(Color("191c2b"), 0.7)
	ring.position.y = 0.02
	add_child(ring)

	# octagon corner posts (padded) + horizontal ropes
	var post_mat := _mat(Color("c2c5cc"), 0.4, 0.6)          # brushed metal post
	var rope_mat := _mat(Color("e23a5e"), 0.5, 0.0, Color("e23a5e"))  # subtle red ropes
	var corners: Array[Vector3] = []
	for i in range(8):
		var a := TAU * float(i) / 8.0
		var px := sin(a) * RING_RADIUS
		var pz := cos(a) * RING_RADIUS
		corners.append(Vector3(px, 0, pz))
		var post := MeshInstance3D.new()
		var pm := CylinderMesh.new(); pm.top_radius = 0.07; pm.bottom_radius = 0.07; pm.height = 1.3
		post.mesh = pm
		post.material_override = post_mat
		post.position = Vector3(px, 0.65, pz)
		add_child(post)
	# three rope heights strung between adjacent corners
	for h in [0.45, 0.8, 1.15]:
		for i in range(8):
			var p0: Vector3 = corners[i]
			var p1: Vector3 = corners[(i + 1) % 8]
			var mid := (p0 + p1) * 0.5
			mid.y = h
			var seg := MeshInstance3D.new()
			var sm := CylinderMesh.new()
			sm.top_radius = 0.025; sm.bottom_radius = 0.025
			sm.height = p0.distance_to(p1)
			seg.mesh = sm
			seg.material_override = rope_mat
			# orient the cylinder's local Y (its length axis) along the rope
			var dir := (p1 - p0).normalized()
			var x_axis := Vector3.UP.cross(dir).normalized()
			var z_axis := x_axis.cross(dir).normalized()
			seg.transform = Transform3D(Basis(x_axis, dir, z_axis), mid)
			add_child(seg)

func _build_crowd() -> void:
	# tiered stands of spectators around the ring (addresses "no spectators")
	var seat_cols := [Color("8a8f9c"), Color("6b7280"), Color("9aa0ad"), Color("4b5563"), Color("c0563a"), Color("3a6ec0")]
	var tiers := [
		{ "r": 9.0, "n": 46, "h": 0.6 },
		{ "r": 11.0, "n": 60, "h": 1.4 },
		{ "r": 13.0, "n": 74, "h": 2.4 },
		{ "r": 15.0, "n": 88, "h": 3.6 },
	]
	for tier in tiers:
		var mm := MultiMesh.new()
		mm.transform_format = MultiMesh.TRANSFORM_3D
		mm.use_colors = true
		var bm := BoxMesh.new()
		bm.size = Vector3(0.5, 0.7, 0.5)
		mm.mesh = bm
		var n := int(tier["n"])
		mm.instance_count = n
		for i in range(n):
			var a := TAU * float(i) / float(n)
			var r := float(tier["r"])
			var pos := Vector3(sin(a) * r, float(tier["h"]), cos(a) * r)
			var basis := Basis().rotated(Vector3.UP, a + PI)
			mm.set_instance_transform(i, Transform3D(basis, pos))
			mm.set_instance_color(i, seat_cols[i % seat_cols.size()])
		var mmi := MultiMeshInstance3D.new()
		mmi.multimesh = mm
		mmi.material_override = _mat(Color(1, 1, 1), 0.9)
		add_child(mmi)
		# tier riser: a FLAT RING under the seats — must never cover the arena center
		var riser := MeshInstance3D.new()
		var rc := TorusMesh.new()
		rc.inner_radius = float(tier["r"]) - 0.5
		rc.outer_radius = float(tier["r"]) + 0.9
		rc.rings = 48
		rc.ring_segments = 8
		riser.mesh = rc
		riser.material_override = _mat(Color("0d0f17"), 0.95)
		riser.position.y = float(tier["h"]) - 0.5
		add_child(riser)

func _spawn_fighters() -> void:
	for d in FIGHTERS:
		var f: Fighter = Fighter.new()
		f.configure(d)
		f.is_player = (d["id"] == 1)
		f.position = d["spawn"]
		add_child(f)
		f.landed_hit.connect(_on_landed_hit)
		f.ko.connect(_on_ko)
		f.swung.connect(_on_swing)
		fighters.append(f)
		if f.is_player:
			player = f

func _build_camera() -> void:
	camera = Camera3D.new()
	camera.fov = 60.0
	camera.position = Vector3(0, 2.2, 5.5)
	add_child(camera)
	camera.make_current()

func _build_hud() -> void:
	var HudScript := load("res://scripts/Hud.gd")
	hud = HudScript.new()
	add_child(hud)
	hud.setup(fighters, player)

func _build_audio() -> void:
	var AudioScript := load("res://scripts/Audio.gd")
	audio = AudioScript.new()
	add_child(audio)
	if not _want_shot:
		audio.start_crowd()
		audio.set_crowd(0.2)

func _build_touch() -> void:
	var TouchScript := load("res://scripts/TouchControls.gd")
	touch = TouchScript.new()
	add_child(touch)

# ----------------------------------------------------------------- loop
func _process(delta: float) -> void:
	if _want_shot and Engine.get_frames_drawn() == 240:
		_want_shot = false
		_do_shot()
	_update_targets()
	_update_camera(delta)
	var fighting := match_state == "fight"
	for f in fighters:
		f.can_attack = fighting
	if hud:
		hud.refresh(fighters, match_state, winner_name)
	_update_crowd(delta)

	if Input.is_action_just_pressed("ttf_restart"):
		_restart()

	match match_state:
		"intro":
			intro_timer -= delta
			if intro_timer <= 0.0:
				match_state = "fight"
				if audio and not _gong_played:
					audio.play_gong()
					_gong_played = true
		"fight":
			fight_elapsed += delta
			if player and player.state != Fighter.State.KO:
				if Input.is_action_just_pressed("ttf_jab"): player.begin_move("jab")
				elif Input.is_action_just_pressed("ttf_heavy"): player.begin_move("heavy")
				elif Input.is_action_just_pressed("ttf_special"): player.begin_move("special")
				elif Input.is_action_just_pressed("ttf_block"): player.begin_move("block")
				elif Input.is_action_just_pressed("ttf_dodge"): player.begin_move("dodge")
			_check_win()
		"over":
			pass

func _do_shot() -> void:
	await RenderingServer.frame_post_draw
	var img := get_viewport().get_texture().get_image()
	img.save_png("/tmp/godot_shot.png")
	print("SHOT_SAVED /tmp/godot_shot.png")
	get_tree().quit()

func _update_targets() -> void:
	for f in fighters:
		if f.state == Fighter.State.KO:
			f.target = null
			continue
		var best: Fighter = null
		var bd := INF
		for o in fighters:
			if o == f or o.state == Fighter.State.KO:
				continue
			var d := f.global_position.distance_to(o.global_position)
			if d < bd:
				bd = d; best = o
		f.target = best

func _check_win() -> void:
	var alive := fighters.filter(func(f): return f.state != Fighter.State.KO)
	if alive.size() <= 1:
		match_state = "over"
		winner_name = alive[0].fighter_name if alive.size() == 1 else "Unentschieden"
		if _sim_fight:
			print("FIGHT_OVER winner=", winner_name, " elapsed=", "%.1f" % fight_elapsed)
			get_tree().quit()

func _restart() -> void:
	if audio:
		audio.play_ui()
	get_tree().reload_current_scene()

# ----------------------------------------------------------------- feel
func _on_landed_hit(_attacker, victim, damage: float, is_special: bool) -> void:
	shake = maxf(shake, 0.25 if not is_special else 0.6)
	hitstop = 0.06 if not is_special else 0.13
	if hud:
		hud.flash_hit(victim.fighter_name, damage, is_special)
	if audio:
		audio.play_hit(is_special)
	crowd_excite = minf(1.0, crowd_excite + (0.55 if is_special else 0.3))

func _on_ko(_who) -> void:
	shake = maxf(shake, 0.7)
	crowd_excite = 1.0
	if audio:
		audio.play_buzzer()

func _on_swing(_kind) -> void:
	if audio:
		audio.play_whoosh()

func _update_crowd(delta: float) -> void:
	if not audio or _want_shot:
		return
	crowd_excite = maxf(0.0, crowd_excite - delta * 0.55)
	var base := 0.2
	match match_state:
		"fight": base = 0.5
		"over": base = 0.7
	audio.set_crowd(base + crowd_excite * 0.45)

func _update_camera(delta: float) -> void:
	if hitstop > 0.0:
		hitstop -= delta
		Engine.time_scale = 0.15
	else:
		Engine.time_scale = 1.0

	# centroid of alive fighters
	var alive := fighters.filter(func(f): return f.state != Fighter.State.KO)
	var c := Vector3(0, 1, 0)
	if alive.size() > 0:
		c = Vector3.ZERO
		for f in alive:
			c += f.global_position
		c /= alive.size()
		c.y = 1.0

	# ONE simple broadcast camera: frame all fighters, distance scales with spread.
	var spread := 0.0
	for f in alive:
		spread = maxf(spread, (f.global_position - c).length())
	var dist := clampf(4.6 + spread * 1.25, 5.0, 9.5)
	var desired := c + Vector3(0, dist * 0.42, dist)
	camera.position = camera.position.lerp(desired, clampf(delta * 3.0, 0, 1))
	var look := c + Vector3(0, 1.1, 0)
	if shake > 0.001:
		look += Vector3(randf_range(-1, 1), randf_range(-1, 1), randf_range(-1, 1)) * shake * 0.3
		shake *= pow(0.85, delta * 60.0)
	camera.look_at(look, Vector3.UP)
