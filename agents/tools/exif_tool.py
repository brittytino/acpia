"""
ExifTool metadata extraction tool.
Extracts EXIF, XMP, IPTC, and other metadata from files using ExifTool.
"""
import subprocess
import json
import structlog
import tempfile
import os
from typing import Dict, Any, Optional

logger = structlog.get_logger(__name__)


def extract_exif(file_bytes: bytes, filename: str = "file.bin") -> Dict[str, Any]:
    """
    Extract all metadata from a file using ExifTool.
    Returns a dict of metadata fields with forensic interest highlighted.
    """
    with tempfile.NamedTemporaryFile(suffix=f"_{filename}", delete=False) as tmp:
        tmp.write(file_bytes)
        tmp_path = tmp.name

    try:
        result = subprocess.run(
            ["exiftool", "-json", "-all", "-u", tmp_path],
            capture_output=True,
            text=True,
            timeout=30,
        )

        if result.returncode != 0 and not result.stdout:
            logger.warning("ExifTool returned no data", filename=filename, stderr=result.stderr[:200])
            return {"error": "No metadata extracted", "filename": filename}

        raw_exif = json.loads(result.stdout)
        if not raw_exif:
            return {"filename": filename, "metadata": {}}

        metadata = raw_exif[0]

        # Extract forensically interesting fields
        forensic_fields = _extract_forensic_fields(metadata)

        return {
            "filename": filename,
            "metadata": metadata,
            "forensic_summary": forensic_fields,
        }

    except subprocess.TimeoutExpired:
        logger.error("ExifTool timeout", filename=filename)
        return {"error": "ExifTool timeout", "filename": filename}
    except json.JSONDecodeError as e:
        logger.error("ExifTool JSON parse error", filename=filename, error=str(e))
        return {"error": f"JSON parse error: {e}", "filename": filename}
    finally:
        os.unlink(tmp_path)


def _extract_forensic_fields(metadata: Dict) -> Dict[str, Any]:
    """Extract fields of forensic interest from raw EXIF data."""
    forensic = {}

    # Camera/Device identification
    device_fields = ["Make", "Model", "Software", "DeviceManufacturer", "DeviceModel"]
    device_info = {k: metadata[k] for k in device_fields if k in metadata}
    if device_info:
        forensic["device_info"] = device_info

    # GPS/Location data
    gps_fields = ["GPSLatitude", "GPSLongitude", "GPSAltitude", "GPSDateStamp", "GPSTimeStamp",
                  "GPSLatitudeRef", "GPSLongitudeRef"]
    gps_info = {k: metadata[k] for k in gps_fields if k in metadata}
    if gps_info:
        forensic["gps_data"] = gps_info
        # Parse decimal coordinates
        lat = _parse_gps(metadata.get("GPSLatitude"), metadata.get("GPSLatitudeRef", "N"))
        lon = _parse_gps(metadata.get("GPSLongitude"), metadata.get("GPSLongitudeRef", "E"))
        if lat is not None and lon is not None:
            forensic["coordinates"] = {"lat": lat, "lon": lon}

    # Timestamps (multiple sources — useful for clock-skew analysis)
    time_fields = [
        "DateTimeOriginal", "CreateDate", "ModifyDate", "FileModifyDate",
        "MediaCreateDate", "TrackCreateDate", "SubSecTimeOriginal",
    ]
    timestamps = {k: metadata[k] for k in time_fields if k in metadata}
    if timestamps:
        forensic["timestamps"] = timestamps

    # Serial numbers, unique IDs
    id_fields = [
        "SerialNumber", "LensSerialNumber", "InternalSerialNumber",
        "UniqueImageID", "ImageUniqueID", "CameraID",
    ]
    ids = {k: metadata[k] for k in id_fields if k in metadata}
    if ids:
        forensic["unique_identifiers"] = ids

    # Software / app metadata
    sw_fields = ["Software", "ProcessingSoftware", "ApplicationRecordVersion",
                 "CreatorTool", "XMPToolkit"]
    sw_info = {k: metadata[k] for k in sw_fields if k in metadata}
    if sw_info:
        forensic["software_info"] = sw_info

    # Embedded thumbnails (presence indicator only)
    forensic["has_thumbnail"] = "ThumbnailImage" in metadata or "PreviewImage" in metadata

    # File system metadata
    forensic["file_info"] = {
        k: metadata[k]
        for k in ["FileName", "FileSize", "FileType", "MIMEType", "FileAccessDate",
                  "FileModifyDate", "FileCreateDate"]
        if k in metadata
    }

    return forensic


def _parse_gps(value: Optional[str], ref: str = "N") -> Optional[float]:
    """Parse GPS coordinate string to decimal degrees."""
    if not value:
        return None
    try:
        # ExifTool format: "DD deg MM' SS.SS\" [NSEW]"
        # or already decimal: "DD.DDDDD"
        if isinstance(value, (int, float)):
            decimal = float(value)
        else:
            # Try parsing "deg MM' SS.SS\"" format
            parts = value.replace("deg", "").replace("'", "").replace('"', "").split()
            nums = [float(p) for p in parts if p.replace(".", "").isdigit()]
            if len(nums) >= 3:
                decimal = nums[0] + nums[1] / 60 + nums[2] / 3600
            elif len(nums) == 2:
                decimal = nums[0] + nums[1] / 60
            else:
                decimal = float(nums[0]) if nums else 0.0

        if ref in ("S", "W"):
            decimal = -decimal
        return round(decimal, 7)
    except (ValueError, IndexError):
        return None


def compute_device_fingerprint(exif_data: Dict) -> Optional[str]:
    """
    Create a device fingerprint string from EXIF metadata.
    Used for cross-file device attribution.
    """
    forensic = exif_data.get("forensic_summary", {})
    device_info = forensic.get("device_info", {})
    ids = forensic.get("unique_identifiers", {})

    parts = []
    if device_info.get("Make"):
        parts.append(device_info["Make"])
    if device_info.get("Model"):
        parts.append(device_info["Model"])
    if ids.get("SerialNumber"):
        parts.append(f"SN:{ids['SerialNumber']}")
    if ids.get("UniqueImageID"):
        parts.append(f"UID:{ids['UniqueImageID'][:16]}")

    return "|".join(parts) if parts else None
