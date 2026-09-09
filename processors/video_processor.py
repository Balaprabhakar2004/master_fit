"""
Fits an uploaded video onto a target platform canvas using MoviePy.

Mirrors the image processor's behaviour: the source video is scaled down
(never cropped) to fit fully inside the target resolution, then padded
with a background color so the output matches the platform's exact
aspect ratio and pixel dimensions.

MoviePy pulls in `imageio-ffmpeg` as a dependency, which ships its own
prebuilt ffmpeg binary. That means `pip install -r requirements.txt` is
enough to make video resizing work -- no separate system install of
ffmpeg, and nothing to add to PATH.
"""

from moviepy import VideoFileClip, ColorClip, CompositeVideoClip


class VideoProcessingError(RuntimeError):
    pass


def _hex_to_rgb(hex_color: str) -> tuple[int, int, int]:
    hex_color = (hex_color or "").lstrip("#")
    if len(hex_color) != 6:
        return (255, 255, 255)
    try:
        return tuple(int(hex_color[i:i + 2], 16) for i in (0, 2, 4))
    except ValueError:
        return (255, 255, 255)


def probe_duration_seconds(input_path: str) -> float | None:
    """Best-effort duration probe, used to size a progress bar."""
    try:
        with VideoFileClip(input_path) as clip:
            return clip.duration
    except Exception:
        return None


def fit_video_to_canvas(input_path: str, output_path: str,
                         target_size: tuple[int, int],
                         background_hex: str = "#ffffff") -> None:
    """
    Scales+pads `input_path` to exactly `target_size` and writes an mp4
    to `output_path`. Raises VideoProcessingError if encoding fails.
    """
    width, height = target_size
    rgb = _hex_to_rgb(background_hex)

    clip = None
    background = None
    composite = None
    try:
        clip = VideoFileClip(input_path)

        # Scale to fit fully inside the target canvas without cropping,
        # same "contain" behaviour as ImageOps.contain for the image path.
        scale = min(width / clip.w, height / clip.h)
        new_size = (round(clip.w * scale), round(clip.h * scale))
        fitted = clip.resized(new_size)

        background = ColorClip(size=(width, height), color=rgb, duration=clip.duration)
        fitted = fitted.with_position("center")
        composite = CompositeVideoClip([background, fitted], size=(width, height))

        if clip.audio is not None:
            composite = composite.with_audio(clip.audio)

        composite.write_videofile(
            output_path,
            codec="libx264",
            audio_codec="aac",
            preset="veryfast",
            fps=clip.fps or 30,
            logger=None,
        )
    except Exception as exc:
        raise VideoProcessingError(f"Video processing failed: {exc}") from exc
    finally:
        for c in (composite, background, clip):
            try:
                if c is not None:
                    c.close()
            except Exception:
                pass
