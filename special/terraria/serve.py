#!/usr/bin/env python3
"""
Terraria WASM Local Dev Server
Serves the notgreg.space repository with the required Cross-Origin Isolation
headers (COOP/COEP) for multi-threaded WebAssembly execution.
"""

import http.server
import socketserver
import webbrowser
import os
import sys

PORT = 8080

class CrossOriginIsolatedHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cross-Origin-Opener-Policy', 'same-origin')
        self.send_header('Cross-Origin-Embedder-Policy', 'require-corp')
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()

def main():
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
    os.chdir(root_dir)

    game_url = f"http://localhost:{PORT}/games/terraria/index.html"
    print(f"==================================================")
    print(f"  Starting Terraria WASM Server on port {PORT}")
    print(f"  Root: {root_dir}")
    print(f"  Game URL: {game_url}")
    print(f"==================================================")

    # Open the browser automatically
    try:
        webbrowser.open(game_url)
    except Exception as e:
        print(f"Could not open browser automatically: {e}")

    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), CrossOriginIsolatedHandler) as httpd:
        print("Press Ctrl+C to stop the server.\n")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nStopping server.")
            sys.exit(0)

if __name__ == '__main__':
    main()
