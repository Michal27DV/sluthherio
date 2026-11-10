#!/usr/bin/env python3
"""
SLUTTER.IO - Dedikovaný MMO Server s Delta Time (dt)
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
import time
import math
import random

PORT = int(os.environ.get('PORT', 8000))
WORLD_RADIUS = 2800
BASE_RADIUS = 16
BASE_SPEED = 230.0  # units per second
BOOST_SPEED = 450.0 # units per second
INITIAL_SCORE = 15
MAX_FOOD = 750

def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return '127.0.0.1'

# --- WebSocket Protocol Implementation (RFC 6455) ---
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
    try:
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
    except Exception:
        return None, None

def ws_send_text(sock, text):
    try:
        data = text.encode('utf-8')
        length = len(data)
        frame = bytearray()
        frame.append(0x81)

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

# --- Game Entities with Delta Time ---
class ServerFood:
    __slots__ = ('x', 'y', 'value', 'is_sperm', 'color')
    def __init__(self, x, y, value=1.0, is_sperm=False, color=None):
        self.x = x
        self.y = y
        self.value = value
        self.is_sperm = is_sperm
        self.color = color or random.choice(['#ff4d94', '#ffd166', '#06d6a0', '#118ab2', '#ff99c8', '#ffffff'])

class ServerPlayer:
    def __init__(self, pid, name, skin_idx, sock):
        self.pid = pid
        self.name = (name or f"Hráč {pid}")[:14]
        self.skin_idx = int(skin_idx) if isinstance(skin_idx, (int, float)) else 0
        self.sock = sock

        angle = random.uniform(0, math.pi * 2)
        dist = math.sqrt(random.uniform(0, 0.75)) * (WORLD_RADIUS - 400)
        self.x = math.cos(angle) * dist
        self.y = math.sin(angle) * dist

        self.angle = random.uniform(0, math.pi * 2)
        self.target_angle = self.angle
        self.score = INITIAL_SCORE
        self.is_boosting = False
        self.dead = False
        self.boost_timer = 0.0

        self.segments = [[self.x, self.y]]
        self.history = [[self.x, self.y]]

    def respawn(self):
        angle = random.uniform(0, math.pi * 2)
        dist = math.sqrt(random.uniform(0, 0.75)) * (WORLD_RADIUS - 400)
        self.x = math.cos(angle) * dist
        self.y = math.sin(angle) * dist
        self.angle = random.uniform(0, math.pi * 2)
        self.target_angle = self.angle
        self.score = INITIAL_SCORE
        self.is_boosting = False
        self.dead = False
        self.boost_timer = 0.0
        self.segments = [[self.x, self.y]]
        self.history = [[self.x, self.y]]

    def get_radius(self):
        return BASE_RADIUS + min(22.0, math.sqrt(self.score) * 0.42)

    def get_target_length(self):
        return int(12 + self.score * 0.65)

    def update_movement(self, dt, new_foods):
        if self.dead:
            return

        rad = self.get_radius()
        speed = BOOST_SPEED if (self.is_boosting and self.score > 8) else BASE_SPEED

        # Delta-time based smooth steering (approx 5.5 radians/sec max turn rate)
        diff = (self.target_angle - self.angle + math.pi) % (math.pi * 2) - math.pi
        turn_speed = 5.5 * dt
        if abs(diff) <= turn_speed:
            self.angle = self.target_angle
        else:
            self.angle += math.copysign(turn_speed, diff)

        # Move head by velocity * dt
        dist_moved = speed * dt
        self.x += math.cos(self.angle) * dist_moved
        self.y += math.sin(self.angle) * dist_moved
        self.history.insert(0, [self.x, self.y])

        target_count = self.get_target_length()
        seg_spacing = max(7.0, rad * 0.62)

        new_segments = [[self.x, self.y]]
        current_dist = 0.0
        target_dist = seg_spacing
        h_idx = 1

        while len(new_segments) < target_count and h_idx < len(self.history):
            p1 = self.history[h_idx - 1]
            p2 = self.history[h_idx]
            step_dist = math.hypot(p2[0] - p1[0], p2[1] - p1[1])

            if current_dist + step_dist >= target_dist:
                ratio = (target_dist - current_dist) / (step_dist or 0.001)
                seg_x = p1[0] + (p2[0] - p1[0]) * ratio
                seg_y = p1[1] + (p2[1] - p1[1]) * ratio
                new_segments.append([seg_x, seg_y])
                target_dist += seg_spacing
            current_dist += step_dist
            h_idx += 1

        self.segments = new_segments

        # Clean history
        max_h = (target_count + 5) * 20
        if len(self.history) > max_h:
            self.history = self.history[:max_h]

        # Boost food drops timed via delta time
        if self.is_boosting and self.score > 8:
            self.boost_timer += dt
            if self.boost_timer >= 0.08: # Drop food ~12 times per second
                self.boost_timer = 0.0
                self.score -= 0.6
                tail = self.segments[-1] if self.segments else [self.x, self.y]
                new_foods.append(ServerFood(
                    tail[0] + random.uniform(-8, 8),
                    tail[1] + random.uniform(-8, 8),
                    0.8,
                    False,
                    '#ffffff'
                ))

        # Arena boundary check
        if math.hypot(self.x, self.y) > WORLD_RADIUS:
            self.die(new_foods)

    def die(self, new_foods):
        if self.dead:
            return
        self.dead = True
        for i in range(0, len(self.segments), 2):
            seg = self.segments[i]
            new_foods.append(ServerFood(
                seg[0] + random.uniform(-14, 14),
                seg[1] + random.uniform(-14, 14),
                random.uniform(1.5, 3.5),
                random.random() < 0.25,
                '#ff7b90'
            ))

class SlutterWorld:
    def __init__(self):
        self.players = {}
        self.foods = []
        self.next_pid = 1
        self.lock = threading.Lock()
        self.init_foods()

        self.running = True
        self.tick_thread = threading.Thread(target=self.game_loop, daemon=True)
        self.tick_thread.start()

    def init_foods(self):
        self.foods = []
        for _ in range(MAX_FOOD):
            a = random.uniform(0, math.pi * 2)
            d = math.sqrt(random.uniform(0, 1)) * (WORLD_RADIUS - 80)
            is_sperm = random.random() < 0.12
            self.foods.append(ServerFood(
                math.cos(a) * d,
                math.sin(a) * d,
                random.uniform(2.5, 5.0) if is_sperm else 1.0,
                is_sperm
            ))

    def add_player(self, name, skin_idx, sock):
        with self.lock:
            pid = self.next_pid
            self.next_pid += 1
            p = ServerPlayer(pid, name, skin_idx, sock)
            self.players[pid] = p
            return p

    def remove_player(self, pid):
        with self.lock:
            if pid in self.players:
                p = self.players[pid]
                new_foods = []
                p.die(new_foods)
                self.foods.extend(new_foods)
                del self.players[pid]

    def game_loop(self):
        last_time = time.time()
        while self.running:
            now = time.time()
            dt = now - last_time
            last_time = now

            # Clamp delta time to avoid physics explosion during large pauses
            dt = min(max(dt, 0.001), 0.1)

            new_foods = []

            with self.lock:
                # 1. Update player movements with exact dt
                for p in list(self.players.values()):
                    if not p.dead:
                        p.update_movement(dt, new_foods)

                # 2. Food Eating
                for p in self.players.values():
                    if p.dead: continue
                    hrad = p.get_radius()
                    thresh_sq = (hrad + 12) ** 2
                    surviving_foods = []
                    for f in self.foods:
                        dx = p.x - f.x
                        dy = p.y - f.y
                        if dx*dx + dy*dy < thresh_sq:
                            p.score += f.value * 0.85
                        else:
                            surviving_foods.append(f)
                    self.foods = surviving_foods

                # 3. Head-to-Body Collisions
                active_players = [p for p in self.players.values() if not p.dead]
                for p1 in active_players:
                    if p1.dead: continue
                    r1 = p1.get_radius()

                    for p2 in active_players:
                        if p1 is p2 or p2.dead: continue
                        r2 = p2.get_radius()
                        kill_sq = (r1 * 0.85 + r2 * 0.72) ** 2

                        for seg in p2.segments:
                            dx = p1.x - seg[0]
                            dy = p1.y - seg[1]
                            if dx*dx + dy*dy < kill_sq:
                                p1.die(new_foods)
                                break
                        if p1.dead: break

                # Add new foods
                self.foods.extend(new_foods)

                # Replenish foods
                while len(self.foods) < MAX_FOOD:
                    a = random.uniform(0, math.pi * 2)
                    d = math.sqrt(random.uniform(0, 1)) * (WORLD_RADIUS - 80)
                    is_sperm = random.random() < 0.12
                    self.foods.append(ServerFood(
                        math.cos(a) * d,
                        math.sin(a) * d,
                        random.uniform(2.5, 5.0) if is_sperm else 1.0,
                        is_sperm
                    ))

                # Broadcast snapshot
                self.broadcast_world()

            elapsed = time.time() - now
            target_frame_time = 0.045 # ~22 ticks per sec
            sleep_time = max(0.002, target_frame_time - elapsed)
            time.sleep(sleep_time)

    def broadcast_world(self):
        snakes_data = []
        leaderboard = []

        for p in self.players.values():
            leaderboard.append([p.name, round(p.score), p.pid])
            if not p.dead:
                snakes_data.append({
                    "id": p.pid,
                    "name": p.name,
                    "skin": p.skin_idx,
                    "angle": round(p.angle, 2),
                    "score": round(p.score, 1),
                    "boost": p.is_boosting,
                    "segs": [[round(pt[0]), round(pt[1])] for pt in p.segments]
                })

        leaderboard.sort(key=lambda x: x[1], reverse=True)
        top_lb = leaderboard[:8]

        foods_data = [
            [round(f.x), round(f.y), round(f.value, 1), 1 if f.is_sperm else 0, f.color]
            for f in self.foods
        ]

        for p in list(self.players.values()):
            payload = {
                "type": "world",
                "myId": p.pid,
                "myScore": round(p.score, 1),
                "isDead": p.dead,
                "cam": {"x": round(p.x), "y": round(p.y), "score": round(p.score, 1)},
                "snakes": snakes_data,
                "foods": foods_data,
                "lb": top_lb
            }
            msg = json.dumps(payload)
            success = ws_send_text(p.sock, msg)
            if not success and p.sock:
                try: p.sock.close()
                except Exception: pass

WORLD = SlutterWorld()

def handle_websocket_client(sock, headers):
    if not ws_handshake(sock, headers):
        sock.close()
        return

    player = None
    try:
        while True:
            opcode, payload = ws_read_frame(sock)
            if opcode is None or opcode == 0x08:
                break

            if opcode == 0x01:
                try:
                    msg = json.loads(payload.decode('utf-8', errors='ignore'))
                except Exception:
                    continue

                mtype = msg.get('type')
                if mtype == 'join':
                    name = msg.get('name', 'Hráč')
                    skin = msg.get('skin', 0)
                    player = WORLD.add_player(name, skin, sock)
                    ws_send_text(sock, json.dumps({
                        "type": "joined",
                        "myId": player.pid,
                        "worldRadius": WORLD_RADIUS
                    }))
                elif mtype == 'input' and player and not player.dead:
                    player.target_angle = float(msg.get('angle', player.angle))
                    player.is_boosting = bool(msg.get('boost', False))
                elif mtype == 'respawn' and player:
                    player.respawn()

    except Exception:
        pass
    finally:
        if player:
            WORLD.remove_player(player.pid)
        try: sock.close()
        except Exception: pass

class DualHTTPHandler(http.server.SimpleHTTPRequestHandler):
    def handle_one_request(self):
        try:
            self.raw_requestline = self.rfile.readline(65537)
            if not self.raw_requestline:
                self.close_connection = True
                return
            if not self.parse_request():
                return

            if self.path.startswith('/ws'):
                headers = [f"{k}: {v}" for k, v in self.headers.items()]
                handle_websocket_client(self.connection, headers)
                self.close_connection = True
                return

            self.do_GET()
            self.wfile.flush()
        except socket.timeout:
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
        print("🍆 SLUTTER.IO CENTRÁLNÍ MMO SERVER (DELTA TIME AKTIVNÍ) 🎮")
        print("=" * 64)
        print(f"👉 Lokální přístup:     http://localhost:{PORT}")
        print(f"👉 Přístup z Wi-Fi:     http://{local_ip}:{PORT}")
        print("=" * 64)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer ukončen.")

if __name__ == '__main__':
    main()
