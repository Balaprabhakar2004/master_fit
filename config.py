"""
Single source of truth for every platform + aspect-ratio preset.
Both the image and video processors, and the /api/platforms endpoint
consumed by the frontend, read from this file so the UI never drifts
out of sync with what the backend can actually produce.
"""

# Each platform lists the media types it supports ("image", "video") and,
# for each, the aspect ratios available with a human label + target pixels.
PLATFORMS = {
    "instagram": {
        "label": "Instagram",
        "image": {
            "1:1": {"label": "Feed \u00b7 Square", "size": (1080, 1080)},
            "4:5": {"label": "Feed \u00b7 Portrait", "size": (1080, 1350)},
            "9:16": {"label": "Story / Reel cover", "size": (1080, 1920)},
        },
        "video": {
            "1:1": {"label": "Feed \u00b7 Square", "size": (1080, 1080)},
            "4:5": {"label": "Feed \u00b7 Portrait", "size": (1080, 1350)},
            "9:16": {"label": "Reels / Story", "size": (1080, 1920)},
        },
    },
    "youtube": {
        "label": "YouTube",
        "image": {
            "16:9": {"label": "Thumbnail", "size": (1280, 720)},
            "24:10": {"label": "Channel banner", "size": (2560, 1067)},
        },
        "video": {
            "16:9": {"label": "Standard video", "size": (1920, 1080)},
            "9:16": {"label": "Shorts", "size": (1080, 1920)},
        },
    },
    "twitter": {
        "label": "X / Twitter",
        "image": {
            "16:9": {"label": "In-stream image", "size": (1600, 900)},
            "1:1": {"label": "Square post", "size": (1080, 1080)},
        },
        "video": {
            "16:9": {"label": "Landscape video", "size": (1280, 720)},
            "1:1": {"label": "Square video", "size": (720, 720)},
        },
    },
    "facebook": {
        "label": "Facebook",
        "image": {
            "1:1": {"label": "Feed \u00b7 Square", "size": (1080, 1080)},
            "4:5": {"label": "Feed \u00b7 Portrait", "size": (1080, 1350)},
            "16:9": {"label": "Link / Cover", "size": (1200, 630)},
        },
        "video": {
            "1:1": {"label": "Feed \u00b7 Square", "size": (1080, 1080)},
            "4:5": {"label": "Feed \u00b7 Portrait", "size": (1080, 1350)},
            "16:9": {"label": "Landscape video", "size": (1280, 720)},
        },
    },
    "tiktok": {
        "label": "TikTok",
        "video": {
            "9:16": {"label": "Full screen", "size": (1080, 1920)},
        },
    },
    "linkedin": {
        "label": "LinkedIn",
        "image": {
            "1:1": {"label": "Feed post", "size": (1200, 1200)},
            "16:9": {"label": "Article cover", "size": (1920, 1080)},
        },
        "video": {
            "16:9": {"label": "Feed video", "size": (1920, 1080)},
            "9:16": {"label": "Vertical video", "size": (1080, 1920)},
        },
    },
}

# Icon keys the frontend maps to inline SVG glyphs (kept out of Python).
PLATFORM_ORDER = ["instagram", "youtube", "twitter", "facebook", "tiktok", "linkedin"]

IMAGE_EXTENSIONS = {"png", "jpg", "jpeg", "webp", "bmp"}
VIDEO_EXTENSIONS = {"mp4", "mov", "webm", "mkv", "avi"}

MAX_IMAGE_MB = 20
MAX_VIDEO_MB = 300


def get_preset(platform: str, media_type: str, ratio: str):
    """Look up (width, height) for a platform/media_type/ratio, or None."""
    platform_cfg = PLATFORMS.get(platform)
    if not platform_cfg:
        return None
    ratios = platform_cfg.get(media_type)
    if not ratios:
        return None
    preset = ratios.get(ratio)
    return preset["size"] if preset else None


def serializable_platforms():
    """Return PLATFORMS in a plain JSON-friendly shape for the frontend."""
    out = {}
    for key in PLATFORM_ORDER:
        cfg = PLATFORMS[key]
        entry = {"label": cfg["label"]}
        for media_type in ("image", "video"):
            if media_type in cfg:
                entry[media_type] = {
                    ratio: {"label": v["label"], "width": v["size"][0], "height": v["size"][1]}
                    for ratio, v in cfg[media_type].items()
                }
        out[key] = entry
    return out
