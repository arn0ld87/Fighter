extends Node

# ---------------------------------------------------------------------------
# Audio.gd  –  Sound Manager für Triple Threat Arena
# ---------------------------------------------------------------------------

const WHOOSH_PATH := "res://assets/audio/whoosh.mp3"
const UI_PATH     := "res://assets/audio/ui_click.ogg"

const POOL_SIZE   := 6          # Anzahl gleichzeitiger Einzel-Effekte
const SAMPLE_RATE := 22050
const BUS         := "Master"

var _pool:  Array[AudioStreamPlayer] = []
var _pool_idx: int = 0

var _whoosh_stream: AudioStream
var _ui_stream:     AudioStream

var _crowd_player: AudioStreamPlayer
var _crowd_active: bool = false


# ---------------------------------------------------------------------------
func _ready() -> void:
	_whoosh_stream = _safe_load(WHOOSH_PATH)
	_ui_stream     = _safe_load(UI_PATH)

	# Effekt-Pool anlegen
	for i in range(POOL_SIZE):
		var p := AudioStreamPlayer.new()
		p.bus = BUS
		add_child(p)
		_pool.append(p)

	# Crowd-Player
	_crowd_player = AudioStreamPlayer.new()
	_crowd_player.bus = BUS
	_crowd_player.volume_db = -40.0
	add_child(_crowd_player)


# ---------------------------------------------------------------------------
# Öffentliche API
# ---------------------------------------------------------------------------

func play_whoosh() -> void:
	if _whoosh_stream == null:
		return
	var p := _next_player()
	p.stream       = _whoosh_stream
	p.pitch_scale  = 1.0
	p.volume_db    = 0.0
	p.play()


func play_hit(is_special: bool) -> void:
	if _whoosh_stream == null:
		return
	var p := _next_player()
	p.stream      = _whoosh_stream
	p.pitch_scale = 0.55 if is_special else 0.8
	p.volume_db   = 6.0
	p.play()


func play_ui() -> void:
	if _ui_stream == null:
		return
	var p := _next_player()
	p.stream      = _ui_stream
	p.pitch_scale = 1.0
	p.volume_db   = 0.0
	p.play()


func play_gong() -> void:
	# Fallback: ui_click mit tiefem Pitch als Gong-Ersatz
	if _ui_stream == null:
		return
	var p := _next_player()
	p.stream      = _ui_stream
	p.pitch_scale = 0.35
	p.volume_db   = 4.0
	p.play()


func play_buzzer() -> void:
	# Fallback: ui_click mit sehr tiefem Pitch als Buzzer-Ersatz
	if _ui_stream == null:
		return
	var p := _next_player()
	p.stream      = _ui_stream
	p.pitch_scale = 0.22
	p.volume_db   = 6.0
	p.play()


func start_crowd() -> void:
	if _crowd_active:
		return
	var gen := AudioStreamGenerator.new()
	gen.mix_rate   = float(SAMPLE_RATE)
	gen.buffer_length = 0.5
	_crowd_player.stream    = gen
	_crowd_player.volume_db = -40.0
	_crowd_player.play()
	_crowd_active = true
	# Rausch-Buffer initial füllen
	_fill_crowd_buffer()


func set_crowd(level: float) -> void:
	var clamped := clampf(level, 0.0, 1.0)
	# 0 → -60 dB  /  1 → -10 dB
	_crowd_player.volume_db = lerp(-60.0, -10.0, clamped)


# ---------------------------------------------------------------------------
# Interne Helfer
# ---------------------------------------------------------------------------

func _next_player() -> AudioStreamPlayer:
	var p := _pool[_pool_idx]
	_pool_idx = (_pool_idx + 1) % POOL_SIZE
	if p.playing:
		p.stop()
	return p


func _safe_load(path: String) -> AudioStream:
	if not ResourceLoader.exists(path):
		push_warning("Audio.gd: Ressource nicht gefunden – " + path)
		return null
	var res = load(path)
	if res == null:
		push_warning("Audio.gd: load() schlug fehl – " + path)
	return res


func _fill_crowd_buffer() -> void:
	if not _crowd_active:
		return
	var pb := (_crowd_player.stream as AudioStreamGenerator)
	if pb == null:
		return
	var playback := _crowd_player.get_stream_playback() as AudioStreamGeneratorPlayback
	if playback == null:
		return
	# Einfaches Brown-Noise (integriertes weißes Rauschen)
	var prev := 0.0
	var frames_to_fill := int(pb.mix_rate * pb.buffer_length)
	for _i in range(frames_to_fill):
		var white := randf_range(-1.0, 1.0)
		prev = (prev + 0.02 * white) / 1.02          # Tiefpass → Brownish
		var sample := clampf(prev * 3.5, -1.0, 1.0)
		playback.push_frame(Vector2(sample, sample))


func _process(_delta: float) -> void:
	# Crowd-Buffer nachfüllen, wenn er fast leer ist
	if not _crowd_active:
		return
	var playback := _crowd_player.get_stream_playback() as AudioStreamGeneratorPlayback
	if playback == null:
		return
	if playback.get_frames_available() > 512:
		_fill_crowd_buffer()
