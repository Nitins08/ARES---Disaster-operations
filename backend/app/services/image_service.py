import io
import logging
from typing import Optional, Tuple
from PIL import Image, ExifTags
import imagehash

logger = logging.getLogger(__name__)

def get_exif_gps(image: Image.Image) -> Tuple[Optional[float], Optional[float]]:
    """Extracts latitude and longitude from image EXIF metadata if present."""
    try:
        exif = image._getexif()
        if not exif:
            return None, None

        gps_info = None
        for key, value in exif.items():
            tag = ExifTags.TAGS.get(key)
            if tag == "GPSInfo":
                gps_info = value
                break

        if not gps_info:
            return None, None

        def _convert_to_degrees(value):
            d = float(value[0])
            m = float(value[1])
            s = float(value[2])
            return d + (m / 60.0) + (s / 3600.0)

        lat = None
        lon = None

        gps_lat = gps_info.get(2)
        gps_lat_ref = gps_info.get(1)
        gps_lon = gps_info.get(4)
        gps_lon_ref = gps_info.get(3)

        if gps_lat and gps_lat_ref:
            lat = _convert_to_degrees(gps_lat)
            if gps_lat_ref != "N":
                lat = -lat

        if gps_lon and gps_lon_ref:
            lon = _convert_to_degrees(gps_lon)
            if gps_lon_ref != "E":
                lon = -lon

        return lat, lon
    except Exception as e:
        logger.warning(f"Error parsing EXIF GPS: {e}")
        return None, None


def process_image(image_bytes: bytes) -> Tuple[bytes, str, str, Optional[float], Optional[float]]:
    """
    1. Reads EXIF GPS coordinates (if available)
    2. Strips all EXIF metadata for privacy
    3. Computes perceptual hash (phash) and difference hash (dhash)
    4. Returns sanitized clean JPEG bytes, phash, dhash, lat, lon
    """
    img = Image.open(io.BytesIO(image_bytes))
    
    # 1. Extract GPS before stripping
    lat, lon = get_exif_gps(img)
    
    # Ensure RGB mode (handling RGBA or Palette)
    if img.mode in ("RGBA", "P"):
        img = img.convert("RGB")

    # 2. Perceptual hashing using imagehash
    phash_val = str(imagehash.phash(img))
    dhash_val = str(imagehash.dhash(img))

    # 3. Strip EXIF metadata completely by re-encoding clean pixel buffer
    clean_buffer = io.BytesIO()
    # Saving without 'exif' argument strips all EXIF metadata
    img.save(clean_buffer, format="JPEG", quality=85, optimize=True)
    clean_bytes = clean_buffer.getvalue()

    return clean_bytes, phash_val, dhash_val, lat, lon


def compute_hamming_distance(hash1_str: str, hash2_str: str) -> int:
    """Computes the Hamming distance between two perceptual hashes."""
    try:
        h1 = imagehash.hex_to_hash(hash1_str)
        h2 = imagehash.hex_to_hash(hash2_str)
        return int(h1 - h2)
    except Exception as e:
        logger.warning(f"Failed to compare hashes: {e}")
        return 999
