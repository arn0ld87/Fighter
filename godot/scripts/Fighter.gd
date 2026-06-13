class_name Fighter
extends CharacterBody3D
## A single arena fighter: procedural body, movement, combat, KO + animation.
## Player- or AI-driven. Balanced so a bout lasts ~30-60s, not seconds.

signal ko(who)
signal landed_hit(attacker, victim, damage, is_special)
signal swung(kind)

enum State { IDLE, WALK, ATTACK, BLOCK, DODGE, HIT, KO }

# --- identity / stats (set via configure() before add_child) ---
var fighter_id: int = 0
var fighter_name: String = "Fighter"
var special_name: String = "SPECIAL"
var is_player: bool = false
var can_attack: bool = true
var frozen: bool = false   # portrait/screenshot pose: no AI, no movement
var max_hp: float = 100.0
var hp: float = 100.0
var power: float = 6.0
var def_stat: float = 5.0
var speed_stat: float = 6.0
var reach: float = 1.9
var skin := Color("ffd7aa")
var shorts := Color("2563eb")
var hair_color := Color("9ca3af")
var hair_style := "cap"
var height_m: float = 1.75
var girth: float = 1.0
var ref_key: String = ""   # if assets/refs/<ref_key>_face.png exists -> face texture
var suit := Color("14161d")
var tie := Color("6e2230")
var has_tie := true
var has_shirt := true

# --- runtime ---
var state: int = State.IDLE
var move_timer: float = 0.0
var cooldown: float = 0.0
var current_attack: String = ""
var did_damage: bool = false
var target: Fighter = null
var face_yaw: float = 0.0
var flash: float = 0.0
var anim_time: float = 0.0
var hit_recoil: float = 0.0

const WALK_SPEED := 3.4
var _grav: float = 18.0

# body pivots
var _torso: Node3D
var _head: Node3D
var _l_arm: Node3D
var _r_arm: Node3D
var _l_leg: Node3D
var _r_leg: Node3D
var _meshes: Array[MeshInstance3D] = []

func configure(d: Dictionary) -> void:
	fighter_id = d.get("id", 0)
	fighter_name = d.get("name", "Fighter")
	special_name = d.get("special", "SPECIAL")
	max_hp = d.get("hp", 100.0)
	hp = max_hp
	power = d.get("power", 6.0)
	def_stat = d.get("defense", 5.0)
	speed_stat = d.get("speed", 6.0)
	reach = d.get("reach", 1.9)
	skin = Color(d.get("skin", "ffd7aa"))
	shorts = Color(d.get("shorts", "2563eb"))
	hair_color = Color(d.get("hair_color", "9ca3af"))
	hair_style = d.get("hair_style", "cap")
	height_m = d.get("height", 1.75)
	girth = d.get("girth", 1.0)
	suit = Color(d.get("suit", "14161d"))
	var tiestr: String = d.get("tie", "")
	has_tie = tiestr != ""
	if has_tie:
		tie = Color(tiestr)
	has_shirt = d.get("shirt", true)
	ref_key = d.get("ref", "")

func _ready() -> void:
	_grav = float(ProjectSettings.get_setting("physics/3d/default_gravity", 18.0))
	collision_layer = 2
	collision_mask = 1 | 2
	var col := CollisionShape3D.new()
	var shape := CapsuleShape3D.new()
	shape.radius = 0.42 * clampf(girth, 0.85, 1.5)
	shape.height = 1.8 * (height_m / 1.75)
	col.shape = shape
	col.position.y = shape.height * 0.5
	add_child(col)
	_build_body()

# ---------------------------------------------------------------- body
func _mat(c: Color, rough := 0.85, metal := 0.0) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = c
	m.roughness = rough
	m.metallic = metal
	return m

func _part(mesh: Mesh, mat: StandardMaterial3D, pos: Vector3, parent: Node3D) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	mi.mesh = mesh
	mi.material_override = mat
	mi.position = pos
	parent.add_child(mi)
	_meshes.append(mi)
	return mi

func _box(s: Vector3) -> BoxMesh:
	var b := BoxMesh.new(); b.size = s; return b

func _cap(r: float, h: float) -> CapsuleMesh:
	var c := CapsuleMesh.new(); c.radius = r; c.height = max(h, r * 2.0); return c

func _sphere(r: float) -> SphereMesh:
	var s := SphereMesh.new(); s.radius = r; s.height = r * 2.0; return s

func _build_body() -> void:
	var hs := height_m / 1.75            # height scale
	var g := clampf(girth, 0.85, 1.6)    # girth
	var skin_mat := _mat(skin)
	var suit_mat := _mat(suit, 0.7)
	var glove_mat := _mat(Color("d41a1a"))
	var shoe_mat := _mat(Color("141414"), 0.5)

	# hips (suit trousers)
	var hipw := 0.5 * g
	_torso = Node3D.new(); _torso.position.y = 0.95 * hs; add_child(_torso)
	_part(_box(Vector3(hipw, 0.28 * hs, 0.34 * g)), suit_mat, Vector3.ZERO, _torso)
	# jacket torso
	var chest := _part(_box(Vector3(0.64 * g, 0.66 * hs, 0.42 * g)), suit_mat, Vector3(0, 0.5 * hs, 0), _torso)
	chest.name = "Chest"
	# white shirt + tie strip on the front
	if has_shirt:
		_part(_box(Vector3(0.16 * g, 0.6 * hs, 0.02)), _mat(Color("f2f2f2"), 0.6), Vector3(0, 0.5 * hs, 0.21 * g + 0.012), _torso)
	if has_tie:
		_part(_box(Vector3(0.06, 0.44 * hs, 0.02)), _mat(tie, 0.5), Vector3(0, 0.44 * hs, 0.21 * g + 0.024), _torso)

	# neck + head
	_part(_cap(0.07, 0.16 * hs), skin_mat, Vector3(0, 0.86 * hs, 0), _torso)
	_head = Node3D.new(); _head.position = Vector3(0, 1.04 * hs, 0); _torso.add_child(_head)
	_part(_sphere(0.17), skin_mat, Vector3.ZERO, _head)
	_add_hair()
	_add_face()

	# arms (suit sleeve + boxing glove)
	_l_arm = _make_arm(-1.0, hs, g, suit_mat, glove_mat)
	_r_arm = _make_arm(1.0, hs, g, suit_mat, glove_mat)
	# legs (suit trousers)
	_l_leg = _make_leg(-1.0, hs, g, suit_mat, shoe_mat)
	_r_leg = _make_leg(1.0, hs, g, suit_mat, shoe_mat)

func _add_hair() -> void:
	var hair_mat := _mat(hair_color)
	match hair_style:
		"swoosh":
			_part(_box(Vector3(0.36, 0.13, 0.34)), hair_mat, Vector3(0, 0.13, 0.02), _head)
		"bun":
			_part(_box(Vector3(0.32, 0.1, 0.32)), hair_mat, Vector3(0, 0.1, 0), _head)
		_:
			_part(_box(Vector3(0.32, 0.08, 0.32)), hair_mat, Vector3(0, 0.12, 0), _head)

func _add_face() -> void:
	if ref_key != "":
		var path := "res://assets/refs/%s_face.png" % ref_key
		if ResourceLoader.exists(path):
			var tex: Texture2D = load(path)
			if tex != null:
				var quad := MeshInstance3D.new()
				var pm := QuadMesh.new()
				pm.size = Vector2(0.34, 0.36)
				quad.mesh = pm
				var fm := StandardMaterial3D.new()
				fm.albedo_texture = tex
				fm.cull_mode = BaseMaterial3D.CULL_DISABLED
				fm.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
				fm.texture_filter = BaseMaterial3D.TEXTURE_FILTER_LINEAR
				quad.material_override = fm
				quad.position = Vector3(0, 0.02, 0.171)
				_head.add_child(quad)
				return
	# fallback: procedural eyes
	var eye_mat := _mat(Color("111111"), 0.4)
	_part(_sphere(0.028), eye_mat, Vector3(-0.06, 0.02, 0.15), _head)
	_part(_sphere(0.028), eye_mat, Vector3(0.06, 0.02, 0.15), _head)

func _make_arm(side: float, hs: float, g: float, suit_mat, glove_mat) -> Node3D:
	var pivot := Node3D.new()
	pivot.position = Vector3(side * 0.42 * g, 0.7 * hs, 0)
	_torso.add_child(pivot)
	_part(_cap(0.085, 0.44 * hs), suit_mat, Vector3(0, -0.22 * hs, 0), pivot)  # sleeve
	_part(_sphere(0.12), glove_mat, Vector3(0, -0.47 * hs, 0), pivot)          # glove
	return pivot

func _make_leg(side: float, hs: float, g: float, suit_mat, shoe_mat) -> Node3D:
	var pivot := Node3D.new()
	pivot.position = Vector3(side * 0.17 * g, 0.0, 0)
	_torso.add_child(pivot)
	_part(_cap(0.11, 0.52 * hs), suit_mat, Vector3(0, -0.3 * hs, 0), pivot)    # trouser upper
	_part(_cap(0.1, 0.44 * hs), suit_mat, Vector3(0, -0.68 * hs, 0), pivot)    # trouser lower
	_part(_box(Vector3(0.16, 0.1, 0.3)), shoe_mat, Vector3(0, -0.92 * hs, 0.06), pivot)
	return pivot

# ---------------------------------------------------------------- combat API
func begin_move(kind: String) -> void:
	if state == State.KO or cooldown > 0.0:
		return
	current_attack = kind
	did_damage = false
	if kind == "block":
		state = State.BLOCK
		move_timer = 0.45
	elif kind == "dodge":
		state = State.DODGE
		move_timer = 0.35
		# hop back
		velocity.x += -sin(face_yaw) * 5.0
		velocity.z += -cos(face_yaw) * 5.0
	else:
		state = State.ATTACK
		move_timer = _attack_dur(kind)
		emit_signal("swung", kind)

func _attack_dur(kind: String) -> float:
	match kind:
		"jab": return 0.32
		"heavy": return 0.55
		"special": return 0.8
		_: return 0.4

func _attack_damage(kind: String) -> float:
	var base := 5.0
	match kind:
		"jab": base = 5.0
		"heavy": base = 11.0
		"special": base = 17.0
	# 0.6 global scale: stretches a 3-way bout toward the 30-60s target
	return (base + power * 0.6) * 0.6

func take_hit(dmg: float, _from: Fighter) -> void:
	if state == State.KO:
		return
	if state == State.BLOCK:
		dmg *= maxf(0.15, 1.0 - def_stat * 0.09)
	hp = max(0.0, hp - dmg)
	flash = 1.0
	hit_recoil = 0.25
	if hp <= 0.0:
		_knock_out()
	elif state != State.BLOCK:
		state = State.HIT
		move_timer = 0.25

func _knock_out() -> void:
	state = State.KO
	emit_signal("ko", self)

# ---------------------------------------------------------------- loop
func _physics_process(delta: float) -> void:
	if frozen:
		velocity = Vector3.ZERO
		_animate(delta)
		return
	anim_time += delta
	if cooldown > 0.0:
		cooldown -= delta
	if flash > 0.0:
		flash = max(0.0, flash - delta * 3.0)
		_apply_flash()
	if hit_recoil > 0.0:
		hit_recoil = max(0.0, hit_recoil - delta * 4.0)

	if state == State.KO:
		velocity.x = move_toward(velocity.x, 0, delta * 12.0)
		velocity.z = move_toward(velocity.z, 0, delta * 12.0)
		_apply_gravity(delta)
		move_and_slide()
		_animate(delta)
		return

	# resolve timed states
	if move_timer > 0.0:
		move_timer -= delta
		# attack connects at mid-point
		if state == State.ATTACK and not did_damage and move_timer <= _attack_dur(current_attack) * 0.5:
			_try_connect()
		if move_timer <= 0.0:
			if state == State.ATTACK:
				cooldown = 0.25 + _attack_dur(current_attack) * 0.5
			state = State.IDLE

	if state == State.IDLE or state == State.WALK:
		if is_player:
			_player_move(delta)
		else:
			_ai_move(delta)
	else:
		# during attack/block keep facing target
		velocity.x = move_toward(velocity.x, 0, delta * 18.0)
		velocity.z = move_toward(velocity.z, 0, delta * 18.0)

	_apply_gravity(delta)
	rotation.y = lerp_angle(rotation.y, face_yaw, clampf(delta * 10.0, 0, 1))
	move_and_slide()
	_animate(delta)

func _apply_gravity(delta: float) -> void:
	if not is_on_floor():
		velocity.y -= _grav * delta
	else:
		velocity.y = 0.0

func _try_connect() -> void:
	did_damage = true
	if target == null or target.state == State.KO:
		return
	var to := target.global_position - global_position
	to.y = 0
	if to.length() <= reach + 0.4:
		# must be roughly facing the target
		var ang := atan2(to.x, to.z)
		if absf(angle_diff(ang, face_yaw)) < 1.1:
			var is_special := current_attack == "special"
			# dodge chance
			if target.state == State.DODGE:
				return
			target.take_hit(_attack_damage(current_attack), self)
			emit_signal("landed_hit", self, target, _attack_damage(current_attack), is_special)

func angle_diff(a: float, b: float) -> float:
	var d := fmod(a - b, TAU)
	return fmod(2.0 * d, TAU) - d

# ---------------------------------------------------------------- movement
func _player_move(delta: float) -> void:
	var ix := Input.get_axis("ttf_left", "ttf_right")
	var iz := Input.get_axis("ttf_up", "ttf_down")
	var dir := Vector3(ix, 0, iz)
	if dir.length() > 0.05:
		dir = dir.normalized()
		velocity.x = dir.x * WALK_SPEED
		velocity.z = dir.z * WALK_SPEED
		face_yaw = atan2(dir.x, dir.z)
		state = State.WALK
	else:
		velocity.x = move_toward(velocity.x, 0, delta * 20.0)
		velocity.z = move_toward(velocity.z, 0, delta * 20.0)
		state = State.IDLE
	# face nearest for attacks
	if target and is_instance_valid(target):
		var to := target.global_position - global_position
		if dir.length() <= 0.05:
			face_yaw = atan2(to.x, to.z)

func _ai_move(delta: float) -> void:
	if target == null or not is_instance_valid(target) or target.state == State.KO:
		velocity.x = move_toward(velocity.x, 0, delta * 10.0)
		velocity.z = move_toward(velocity.z, 0, delta * 10.0)
		state = State.IDLE
		return
	var to := target.global_position - global_position
	to.y = 0
	var dist := to.length()
	face_yaw = atan2(to.x, to.z)
	if dist > reach + 0.1:
		var dir := to.normalized()
		velocity.x = dir.x * WALK_SPEED * (0.6 + speed_stat * 0.04)
		velocity.z = dir.z * WALK_SPEED * (0.6 + speed_stat * 0.04)
		state = State.WALK
	else:
		velocity.x = move_toward(velocity.x, 0, delta * 14.0)
		velocity.z = move_toward(velocity.z, 0, delta * 14.0)
		state = State.IDLE
		if can_attack and cooldown <= 0.0:
			var r := randf()
			if r < 0.12:
				begin_move("block")
			elif r < 0.2 + speed_stat * 0.02:
				begin_move("special" if randf() < 0.15 else ("heavy" if randf() < 0.4 else "jab"))

# ---------------------------------------------------------------- animation
func _apply_flash() -> void:
	for m in _meshes:
		var mat := m.material_override as StandardMaterial3D
		if mat:
			mat.emission_enabled = flash > 0.01
			mat.emission = Color(1, 0.2, 0.1) * flash
			mat.emission_energy_multiplier = flash * 2.0

func _animate(delta: float) -> void:
	if _torso == null:
		return
	var hs := height_m / 1.75
	if state == State.KO:
		rotation.x = lerp_angle(rotation.x, -PI * 0.5, clampf(delta * 3.0, 0, 1))
		return
	rotation.x = lerp_angle(rotation.x, 0.0, clampf(delta * 8.0, 0, 1))

	var t := anim_time
	var recoil := hit_recoil
	# torso idle bob / recoil
	_torso.position.y = 0.95 * hs + sin(t * 2.2) * 0.02 - recoil * 0.1
	_torso.rotation.x = -recoil * 0.5

	match state:
		State.WALK:
			var s := sin(t * 9.0) * 0.5
			_l_leg.rotation.x = s
			_r_leg.rotation.x = -s
			_l_arm.rotation.x = -s * 0.6
			_r_arm.rotation.x = s * 0.6
		State.ATTACK:
			var prog := 1.0 - clampf(move_timer / max(_attack_dur(current_attack), 0.01), 0, 1)
			var swing := sin(prog * PI)
			_legs_reset(delta)
			if current_attack == "special":
				_r_arm.rotation.x = -swing * 2.2
				_l_arm.rotation.x = -swing * 1.6
				_torso.rotation.x = -swing * 0.3
			elif current_attack == "heavy":
				_r_arm.rotation.x = -swing * 1.9
				_torso.rotation.y = lerp_angle(_torso.rotation.y, swing * 0.4, clampf(delta * 12.0, 0, 1))
			else:
				_r_arm.rotation.x = -swing * 1.6
		State.BLOCK:
			_legs_reset(delta)
			_l_arm.rotation.x = lerp_angle(_l_arm.rotation.x, -2.4, clampf(delta * 14.0, 0, 1))
			_r_arm.rotation.x = lerp_angle(_r_arm.rotation.x, -2.4, clampf(delta * 14.0, 0, 1))
		State.DODGE:
			_torso.rotation.x = 0.4
		_:
			# idle: arms slightly out, breathing
			_legs_reset(delta)
			var br := sin(t * 2.2) * 0.08
			_l_arm.rotation.x = lerp_angle(_l_arm.rotation.x, 0.15 + br, clampf(delta * 8.0, 0, 1))
			_r_arm.rotation.x = lerp_angle(_r_arm.rotation.x, 0.15 - br, clampf(delta * 8.0, 0, 1))

func _legs_reset(delta: float) -> void:
	_l_leg.rotation.x = lerp_angle(_l_leg.rotation.x, 0.0, clampf(delta * 10.0, 0, 1))
	_r_leg.rotation.x = lerp_angle(_r_leg.rotation.x, 0.0, clampf(delta * 10.0, 0, 1))
