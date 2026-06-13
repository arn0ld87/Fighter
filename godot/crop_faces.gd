extends SceneTree
## One-off: crop a square face region out of each reference photo -> <ref>_face.png.
## Run: godot --headless --path godot --script res://crop_faces.gd

func _init() -> void:
	var base := "res://assets/refs/"
	var jobs := [
		# rect = pixel region (x, y, w, h) of the face in the source photo
		{ "src": "trump.jpg", "dst": "trump_face.png", "rect": Rect2i(735, 55, 300, 305) },
		{ "src": "putin.jpg", "dst": "putin_face.png", "rect": Rect2i(1255, 120, 560, 620) },
		{ "src": "kim.jpg",   "dst": "kim_face.png",   "rect": Rect2i(610, 195, 440, 440) },
	]
	for j in jobs:
		var path: String = ProjectSettings.globalize_path(base + String(j["src"]))
		var img := Image.load_from_file(path)
		if img == null:
			print("FAIL load ", j["src"])
			continue
		var r: Rect2i = j["rect"]
		r.position.x = clampi(r.position.x, 0, img.get_width() - 2)
		r.position.y = clampi(r.position.y, 0, img.get_height() - 2)
		r.size.x = clampi(r.size.x, 1, img.get_width() - r.position.x)
		r.size.y = clampi(r.size.y, 1, img.get_height() - r.position.y)
		var crop := img.get_region(r)
		var out: String = ProjectSettings.globalize_path(base + String(j["dst"]))
		crop.save_png(out)
		print("CROPPED ", j["dst"], " size=", crop.get_size())
	quit()
