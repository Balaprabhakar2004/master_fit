"""Fits an uploaded image onto a target canvas without cropping or distortion."""

from PIL import Image, ImageOps


def fit_image_to_canvas(image: Image.Image, target_size: tuple[int, int],
                         background=(255, 255, 255)) -> Image.Image:
    """
    Scales `image` down/up to fit fully inside `target_size` (preserving
    aspect ratio) and pads the remaining space with `background` so the
    output is exactly `target_size` with nothing cropped out.
    """
    # Normalize mode so paste/pad never fails on palette or CMYK images.
    if image.mode not in ("RGB", "RGBA"):
        image = image.convert("RGBA") if "A" in image.mode else image.convert("RGB")

    fitted = ImageOps.contain(image, target_size, Image.LANCZOS)

    canvas_mode = "RGBA" if fitted.mode == "RGBA" else "RGB"
    canvas = Image.new(canvas_mode, target_size, background if canvas_mode == "RGB"
                        else (*background, 255))

    offset = ((target_size[0] - fitted.width) // 2, (target_size[1] - fitted.height) // 2)
    canvas.paste(fitted, offset, fitted if fitted.mode == "RGBA" else None)
    return canvas
