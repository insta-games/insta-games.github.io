#!/usr/bin/env python3
"""
Terraria 1.4.4.9 Asset Downloader & Packager with Auto-Resume and Retry
"""

import os
import sys
import time
import urllib.request
import zipfile
import tarfile
import io

URL = "https://archive.org/download/terraria-1.4.4.9_202405/terraria%201.4.4.9.zip"
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ZIP_PATH = os.path.join(SCRIPT_DIR, "temp_terraria.zip")
OUTPUT_TAR_GZ = os.path.join(SCRIPT_DIR, "content.tar.gz")

def download_with_resume(url, dest_path):
    max_retries = 10
    for attempt in range(max_retries):
        try:
            downloaded = os.path.getsize(dest_path) if os.path.exists(dest_path) else 0
            headers = {'User-Agent': 'Mozilla/5.0'}
            if downloaded > 0:
                headers['Range'] = f'bytes={downloaded}-'

            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=30) as resp:
                status = getattr(resp, 'status', 200)
                cr = resp.headers.get('Content-Range')
                cl = resp.headers.get('Content-Length')

                if cr:
                    total = int(cr.split('/')[-1])
                elif cl:
                    total = downloaded + int(cl)
                else:
                    total = 0

                print(f"Connecting... Downloaded so far: {downloaded/1024/1024:.1f} MB / {total/1024/1024:.1f} MB (attempt {attempt+1})", flush=True)

                mode = 'ab' if downloaded > 0 and status == 206 else 'wb'
                if mode == 'wb':
                    downloaded = 0

                chunk_size = 1024 * 1024
                t0 = time.time()
                last_print = t0

                with open(dest_path, mode) as f:
                    while True:
                        chunk = resp.read(chunk_size)
                        if not chunk:
                            break
                        f.write(chunk)
                        downloaded += len(chunk)
                        now = time.time()
                        if now - last_print >= 2.0 or (total and downloaded >= total):
                            elapsed = now - t0
                            speed = (downloaded / 1024 / 1024) / max(elapsed, 0.001)
                            pct = (downloaded / total * 100) if total else 0
                            print(f"  [{pct:5.1f}%] {downloaded/1024/1024:6.1f} MB / {total/1024/1024:.1f} MB  ({speed:4.2f} MB/s)", flush=True)
                            last_print = now

            if total and os.path.getsize(dest_path) >= total:
                print(f"Download complete! Final size: {os.path.getsize(dest_path)/1024/1024:.1f} MB", flush=True)
                return
        except Exception as e:
            print(f"Network interruption ({e}), retrying in 2 seconds...", flush=True)
            time.sleep(2)

def package_content_tar_gz(zip_path, output_path):
    print("Opening downloaded zip...", flush=True)
    with zipfile.ZipFile(zip_path, 'r') as zf:
        all_names = zf.namelist()
        prefix = "Terraria.v1.4.4.9/Terraria.v1.4.4.9/Content/"
        content_files = [n for n in all_names if n.startswith(prefix) and not n.endswith('/')]
        print(f"Found {len(content_files)} content files to package.", flush=True)

        print(f"Creating {output_path}...", flush=True)
        with tarfile.open(output_path, "w:gz") as tar:
            count = 0
            for name in content_files:
                rel_path = "Content/" + name[len(prefix):]
                data = zf.read(name)
                ti = tarfile.TarInfo(name=rel_path)
                ti.size = len(data)
                ti.mtime = int(time.time())
                tar.addfile(ti, io.BytesIO(data))
                count += 1
                if count % 2000 == 0 or count == len(content_files):
                    print(f"  Packaged {count}/{len(content_files)} files...", flush=True)

    print(f"Successfully created {output_path} ({os.path.getsize(output_path)/1024/1024:.2f} MB)", flush=True)

def main():
    if os.path.exists(OUTPUT_TAR_GZ) and os.path.getsize(OUTPUT_TAR_GZ) > 100 * 1024 * 1024:
        print(f"{OUTPUT_TAR_GZ} already exists ({os.path.getsize(OUTPUT_TAR_GZ)/1024/1024:.2f} MB). Done!", flush=True)
        return

    try:
        download_with_resume(URL, ZIP_PATH)
        package_content_tar_gz(ZIP_PATH, OUTPUT_TAR_GZ)
        if os.path.exists(ZIP_PATH):
            os.remove(ZIP_PATH)
            print("Cleaned up temp zip file.", flush=True)
        print("\nAll Terraria assets successfully installed and ready for browser play!", flush=True)
    except Exception as e:
        print(f"Error during asset setup: {e}", file=sys.stderr, flush=True)
        sys.exit(1)

if __name__ == '__main__':
    main()
