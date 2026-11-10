#!/usr/bin/env python3
"""
SLUTTER.IO - Lokální HTTP + WebSocket server pro 100% spolehlivé hraní po síti
Spuštění: python3 server.py
"""

import http.server
import socket
import socketserver
import os
import sys
import threading
import hashlib
import base64
import struct
import json

PORT = int(os.environ.get('PORT', 8000))

# Store active rooms for WebSocket relay: { room_code: { 'host': ws_sock, 'guest': ws_sock } }
ROOMS = {}
ROOMS_LOCK = threading.Lock()

def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return '127.0.0.1'

def ws_handshake(sock, headers):
    key = None
    for line in headers:
        if line.lower().startswith('sec-websocket-key:'):
            key = line.split(':', 1)[1].strip()
            break
    if not key:
        return False

    guid = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"
    accept_val = base64.b64encode(hashlib.sha1((key + guid).encode('utf-8')).digest()).decode('utf-8')

    response = (
        "HTTP/1.1 101 Switching Protocols\r\n"
        "Upgrade: websocket\r\n"
        "Connection: Upgrade\r\n"
        f"Sec-WebSocket-Accept: {accept_val}\r\n\r\n"
    )
    sock.sendall(response.encode('utf-8'))
    return True

def ws_read_frame(sock):
    head = sock.recv(2)
    if not head or len(head) < 2:
        return None, None
    b1, b2 = head[0], head[1]
    opcode = b1 & 0x0f
    masked = (b2 & 0x80) != 0
    payload_len = b2 & 0x7f

    if payload_len == 126:
        ext = sock.recv(2)
        if len(ext) < 2: return None, None
        payload_len = struct.unpack(">H", ext)[0]
    elif payload_len == 127:
        ext = sock.recv(8)
        if len(ext) < 8: return None, None
        payload_len = struct.unpack(">Q", ext)[0]

    mask = None
    if masked:
        mask = sock.recv(4)
        if len(mask) < 4: return None, None

    data = bytearray()
    while len(data) < payload_len:
        chunk = sock.recv(min(4096, payload_len - len(data)))
        if not chunk: return None, None
        data.extend(chunk)

    if masked and mask:
        for i in range(len(data)):
            data[i] ^= mask[i % 4]

    return opcode, bytes(data)

def ws_send_text(sock, text):
    try:
        data = text.encode('utf-8')
        length = len(data)
        frame = bytearray()
        frame.append(0x81) # Fin + Text opcode

        if length < 126:
            frame.append(length)
        elif length <= 0xFFFF:
            frame.append(126)
            frame.extend(struct.pack(">H", length))
        else:
            frame.append(127)
            frame.extend(struct.pack(">Q", length))

        frame.extend(data)
        sock.sendall(frame)
        return True
    except Exception:
        return False

def handle_websocket(sock, headers):
    if not ws_handshake(sock, headers):
        sock.close()
        return

    current_room = None
    is_host = False

    try:
        while True:
            opcode, payload = ws_read_frame(sock)
            if opcode is None or opcode == 0x08: # Close frame
                break

            if opcode == 0x01: # Text frame
                text = payload.decode('utf-8', errors='ignore')
                try:
                    msg = json.loads(text)
                except Exception:
                    continue

                m_type = msg.get('type')
                if m_type == 'create_room':
                    room = str(msg.get('room', '')).strip().upper()
                    with ROOMS_LOCK:
                        current_room = room
                        is_host = True
                        ROOMS[room] = { 'host': sock, 'guest': None }
                    ws_send_text(sock, json.dumps({ 'type': 'room_created', 'room': room }))

                elif m_type == 'join_room':
                    room = str(msg.get('room', '')).strip().upper()
                    joined = False
                    with ROOMS_LOCK:
                        if room in ROOMS and ROOMS[room]['host']:
                            current_room = room
                            is_host = False
                            ROOMS[room]['guest'] = sock
                            joined = True
                    if joined:
                        ws_send_text(sock, json.dumps({ 'type': 'room_joined', 'room': room }))
                        # Notify host that guest connected
                        with ROOMS_LOCK:
                            host_sock = ROOMS[room]['host']
                        if host_sock:
                            ws_send_text(host_sock, json.dumps({ 'type': 'guest_connected' }))
                    else:
                        ws_send_text(sock, json.dumps({ 'type': 'error', 'message': 'Místnost nebyla nalezena!' }))

                elif m_type in ('sync', 'input', 'hello', 'welcome'):
                    # Relay to other peer in the room
                    if current_room:
                        target_sock = None
                        with ROOMS_LOCK:
                            if current_room in ROOMS:
                                target_sock = ROOMS[current_room]['guest'] if is_host else ROOMS[current_room]['host']
                        if target_sock:
                            ws_send_text(target_sock, text)

    except Exception as e:
        pass
    finally:
        if current_room:
            with ROOMS_LOCK:
                if current_room in ROOMS:
                    other = ROOMS[current_room]['guest'] if is_host else ROOMS[current_room]['host']
                    if other:
                        ws_send_text(other, json.dumps({ 'type': 'peer_disconnected' }))
                    del ROOMS[current_room]
        try:
            sock.close()
        except Exception:
            pass

class DualHTTPHandler(http.server.SimpleHTTPRequestHandler):
    def handle_one_request(self):
        try:
            self.raw_requestline = self.rfile.readline(65537)
            if not self.raw_requestline:
                self.close_connection = True
                return
            if not self.parse_request():
                return

            if self.path == '/ws':
                headers = []
                for k, v in self.headers.items():
                    headers.append(f"{k}: {v}")
                handle_websocket(self.connection, headers)
                self.close_connection = True
                return

            self.do_GET()
            self.wfile.flush()
        except socket.timeout as e:
            self.log_error("Request timed out: %r", e)
            self.close_connection = True
            return

    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()

class ThreadedTCPServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
    allow_reuse_address = True
    daemon_threads = True

def main():
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    local_ip = get_local_ip()

    with ThreadedTCPServer(("", PORT), DualHTTPHandler) as httpd:
        print("=" * 64)
        print("🍆 SLUTTER.IO SUPER-MULTIPLAYER SERVER BĚŽÍ! 🎮")
        print("=" * 64)
        print(f"👉 Hraj na tomto PC:      http://localhost:{PORT}")
        print(f"👉 Kamarád na Wi-Fi:      http://{local_ip}:{PORT}")
        print("=" * 64)
        print("📡 Obsahuje vestavěný WebSocket relay pro bleskové hraní")
        print("   bez jakýchkoliv problémů s NATem nebo routerem!")
        print("=" * 64)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer ukončen.")

if __name__ == '__main__':
    main()
