import io
import os
import tempfile
import uuid

from flask import Flask, request, send_file, render_template, jsonify
from PIL import Image, UnidentifiedImageError
from werkzeug.utils import secure_filename

from config import (
    get_preset, serializable_platforms,
    IMAGE_EXTENSIONS, VIDEO_EXTENSIONS, MAX_IMAGE_MB, MAX_VIDEO_MB,
)
from processors.image_processor import fit_image_to_canvas
from processors.video_processor import fit_video_to_canvas, VideoProcessingError

# Video processing needs real file paths on disk (moviepy/ffmpeg read and
# write files, not in-memory buffers). tempfile.gettempdir() resolves to
# the OS temp directory (e.g. /tmp), which is the one path guaranteed to
# be writable on every deploy target -- including read-only-filesystem
# platforms like Vercel, where only /tmp is writable. Files are deleted
# again as soon as each request finishes, so nothing accumulates.
WORK_DIR = tempfile.gettempdir()

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = MAX_VIDEO_MB * 1024 * 1024


def _extension(filename: str) -> str:
    return filename.rsplit(".", 1)[-1].lower() if "." in filename else ""


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/platforms")
def api_platforms():
    return jsonify(serializable_platforms())


@app.route("/api/process/image", methods=["POST"])
def process_image():
    file = request.files.get("media")
    platform = request.form.get("platform", "")
    ratio = request.form.get("ratio", "")
    background = request.form.get("background", "#ffffff")

    if not file or file.filename == "":
        return jsonify(error="No image was uploaded."), 400

    ext = _extension(file.filename)
    if ext not in IMAGE_EXTENSIONS:
        return jsonify(error=f"Unsupported image type '.{ext}'."), 400

    target_size = get_preset(platform, "image", ratio)
    if not target_size:
        return jsonify(error="Unknown platform / aspect ratio combination."), 400

    try:
        image = Image.open(file.stream)
        image.load()
    except UnidentifiedImageError:
        return jsonify(error="That file doesn't look like a valid image."), 400

    try:
        bg_rgb = tuple(int(background.lstrip("#")[i:i + 2], 16) for i in (0, 2, 4))
    except (ValueError, IndexError):
        bg_rgb = (255, 255, 255)

    result = fit_image_to_canvas(image, target_size, background=bg_rgb)

    # Processed entirely in memory -- no disk write needed for images, so
    # this endpoint works unmodified on any hosting platform.
    buffer = io.BytesIO()
    result.save(buffer, format="PNG")
    buffer.seek(0)

    return send_file(buffer, mimetype="image/png", as_attachment=False,
                      download_name=f"perfectfit_{platform}_{ratio.replace(':', 'x')}.png")


@app.route("/api/process/video", methods=["POST"])
def process_video():
    file = request.files.get("media")
    platform = request.form.get("platform", "")
    ratio = request.form.get("ratio", "")
    background = request.form.get("background", "#ffffff")

    if not file or file.filename == "":
        return jsonify(error="No video was uploaded."), 400

    ext = _extension(file.filename)
    if ext not in VIDEO_EXTENSIONS:
        return jsonify(error=f"Unsupported video type '.{ext}'."), 400

    target_size = get_preset(platform, "video", ratio)
    if not target_size:
        return jsonify(error="Unknown platform / aspect ratio combination."), 400

    safe_name = secure_filename(file.filename) or "upload.mp4"
    job_id = uuid.uuid4().hex
    input_path = os.path.join(WORK_DIR, f"{job_id}_in_{safe_name}")
    output_path = os.path.join(WORK_DIR, f"{job_id}_out.mp4")

    file.save(input_path)

    try:
        fit_video_to_canvas(input_path, output_path, target_size, background_hex=background)
        with open(output_path, "rb") as f:
            video_bytes = io.BytesIO(f.read())
    except VideoProcessingError as exc:
        app.logger.error(str(exc))
        return jsonify(error="We couldn't process that video. Try a different file or format."), 500
    finally:
        for path in (input_path, output_path):
            if os.path.exists(path):
                os.remove(path)

    video_bytes.seek(0)
    return send_file(video_bytes, mimetype="video/mp4", as_attachment=False,
                      download_name=f"perfectfit_{platform}_{ratio.replace(':', 'x')}.mp4")


@app.errorhandler(413)
def too_large(_e):
    return jsonify(error=f"File is too large. Max size is {MAX_VIDEO_MB}MB for video / "
                          f"{MAX_IMAGE_MB}MB for images."), 413


if __name__ == "__main__":
    # Render (and most PaaS hosts) inject the port to bind via $PORT.
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
