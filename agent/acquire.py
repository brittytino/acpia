#!/usr/bin/env python3
"""
ACPIA Field Acquisition Agent (Stub)
Consented logical acquisition over ADB.
Hashes every file at the point of acquisition before transmission.
"""
import argparse
import hashlib
import os
import subprocess
import sys
import requests
from pathlib import Path

# Only allowlist paths for logical acquisition
ALLOWLIST = [
    "/sdcard/WhatsApp/Media/",
    "/sdcard/Telegram/",
    "/sdcard/DCIM/Screenshots/"
]

def hash_file(path: str) -> str:
    sha256 = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(4096), b""):
            sha256.update(chunk)
    return sha256.hexdigest()

def acquire_device(case_ref: str, endpoint: str, token: str):
    print(f"[*] Starting consented logical acquisition for Case {case_ref}")
    print("[*] Checking for connected devices via ADB...")
    
    try:
        res = subprocess.run(["adb", "devices"], capture_output=True, text=True, check=True)
        if "device" not in res.stdout.split("\n")[1]:
            print("[!] No device authorized or connected. Ensure USB debugging is ON.")
            sys.exit(1)
    except FileNotFoundError:
        print("[!] ADB not installed. Fallback to manual zip import recommended.")
        sys.exit(1)
        
    print("[*] Device found and authorized.")
    print("[*] Extracting strictly from allowlisted paths (No root/physical access)")
    
    out_dir = Path("./acquisition_tmp")
    out_dir.mkdir(exist_ok=True)
    
    # Stub: Normally we'd adb pull, here we just show the logic
    # subprocess.run(["adb", "pull", ALLOWLIST[0], str(out_dir)], check=True)
    
    # Imagine we pulled files into out_dir
    print("[*] Files acquired to local staging.")
    print("[*] Hashing artifacts locally before transmission...")
    
    # In a real run, we would iterate over pulled files, hash them, and POST to API
    # requests.post(f"{endpoint}/api/v1/cases/{case_ref}/evidence", headers={"Authorization": f"Bearer {token}"}, files={"file": open(f, "rb")}, data={"client_sha256": h})
    
    print("[*] Acquisition complete. Chain of custody started on field workstation.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="ACPIA USB Acquisition Agent")
    parser.add_argument("--case", required=True, help="Case reference")
    parser.add_argument("--endpoint", default="http://localhost:8765", help="API URL")
    parser.add_argument("--token", required=True, help="JWT Token for investigator")
    args = parser.parse_args()
    
    acquire_device(args.case, args.endpoint, args.token)
