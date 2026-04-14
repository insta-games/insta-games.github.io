document.addEventListener('DOMContentLoaded', function () {
  const canvas = document.getElementById('snakeio-canvas');
  const ctx = canvas.getContext('2d');
  const statusEl = document.getElementById('snakeio-status');
  const roomEl = document.getElementById('snakeio-room');
  const playersEl = document.getElementById('snakeio-players');
  const reconnectBtn = document.getElementById('snakeio-reconnect');
  const touchWrap = document.getElementById('snakeio-touch');

  const MAX_PER_ROOM = 4;
  const ROOM_SCAN_LIMIT = 30;
  const ROOM_PREFIX = 'snakeio-room-';
  const JOIN_TIMEOUT_MS = 2200;
  const PEER_OPEN_TIMEOUT_MS = 9000;
  const CELL = 20;
  const COLS = Math.floor(canvas.width / CELL);
  const ROWS = Math.floor(canvas.height / CELL);
  const TICK_MS = 110;

  const PLAYER_COLORS = ['#22d3ee', '#3b82f6', '#f59e0b', '#f43f5e'];
  const PLAYER_NAMES = ['Cyan', 'Blue', 'Gold', 'Rose'];

  let peer = null;
  let hostPeer = null;
  let roomId = null;
  let isHost = false;
  let hostConn = null;
  let localId = null;
  let myDir = { x: 1, y: 0 };
  let lastSentDir = { x: 1, y: 0 };
  let latestState = null;
  let loop = null;
  let connectAttempt = 0;

  const hostState = {
    players: {},
    food: null,
    tick: 0,
    conns: {}
  };

  function setStatus(msg) {
    statusEl.textContent = msg;
  }

  function setRoomLabel() {
    roomEl.textContent = roomId ? roomId + ' (max 4)' : '--';
  }

  function randomName() {
    return 'Player-' + Math.floor(1000 + Math.random() * 9000);
  }

  function clonePos(p) {
    return { x: p.x, y: p.y };
  }

  function directionFromKey(key) {
    if (key === 'ArrowUp' || key === 'w' || key === 'W') return { x: 0, y: -1 };
    if (key === 'ArrowDown' || key === 's' || key === 'S') return { x: 0, y: 1 };
    if (key === 'ArrowLeft' || key === 'a' || key === 'A') return { x: -1, y: 0 };
    if (key === 'ArrowRight' || key === 'd' || key === 'D') return { x: 1, y: 0 };
    return null;
  }

  function isOpposite(a, b) {
    return a.x === -b.x && a.y === -b.y;
  }

  function listPlayers(playersMap) {
    const list = Object.values(playersMap);
    list.sort(function (a, b) { return a.slot - b.slot; });
    playersEl.innerHTML = '';
    list.forEach(function (p) {
      const li = document.createElement('li');
      const alive = p.alive ? 'alive' : 'out';
      const me = p.id === localId ? ' (you)' : '';
      li.textContent = p.name + me + ' - score ' + p.score + ' - ' + alive;
      li.style.borderLeft = '5px solid ' + p.color;
      playersEl.appendChild(li);
    });
  }

  function draw() {
    const state = latestState;

    const bg = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    bg.addColorStop(0, '#0f172a');
    bg.addColorStop(1, '#020617');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for (let c = 0; c <= COLS; c += 1) {
      ctx.beginPath();
      ctx.moveTo(c * CELL, 0);
      ctx.lineTo(c * CELL, canvas.height);
      ctx.stroke();
    }
    for (let r = 0; r <= ROWS; r += 1) {
      ctx.beginPath();
      ctx.moveTo(0, r * CELL);
      ctx.lineTo(canvas.width, r * CELL);
      ctx.stroke();
    }

    if (!state) {
      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 26px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Finding room...', canvas.width / 2, canvas.height / 2);
      return;
    }

    const food = state.food;
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(food.x * CELL + CELL / 2, food.y * CELL + CELL / 2, CELL / 2 - 2, 0, Math.PI * 2);
    ctx.fill();

    const players = Object.values(state.players);
    players.forEach(function (p) {
      p.snake.forEach(function (seg, idx) {
        ctx.globalAlpha = idx === 0 ? 1 : 0.85;
        ctx.fillStyle = p.color;
        ctx.fillRect(seg.x * CELL + 1, seg.y * CELL + 1, CELL - 2, CELL - 2);
      });
    });
    ctx.globalAlpha = 1;

    ctx.textAlign = 'left';
    ctx.font = '600 14px Inter, sans-serif';
    players.forEach(function (p, i) {
      ctx.fillStyle = p.color;
      const marker = p.id === localId ? ' *' : '';
      ctx.fillText(p.name + marker + ': ' + p.score, 10, 22 + i * 18);
    });
  }

  function canPlaceOn(snakes, x, y) {
    for (let i = 0; i < snakes.length; i += 1) {
      const body = snakes[i];
      for (let j = 0; j < body.length; j += 1) {
        if (body[j].x === x && body[j].y === y) return false;
      }
    }
    return true;
  }

  function placeFoodForHost() {
    const snakes = Object.values(hostState.players).map(function (p) { return p.snake; });
    let tries = 0;
    while (tries < 500) {
      const x = Math.floor(Math.random() * COLS);
      const y = Math.floor(Math.random() * ROWS);
      if (canPlaceOn(snakes, x, y)) {
        hostState.food = { x: x, y: y };
        return;
      }
      tries += 1;
    }
    hostState.food = { x: Math.floor(COLS / 2), y: Math.floor(ROWS / 2) };
  }

  function startForSlot(slot) {
    if (slot === 0) return { x: 6, y: 6, dx: 1, dy: 0 };
    if (slot === 1) return { x: COLS - 7, y: 6, dx: -1, dy: 0 };
    if (slot === 2) return { x: 6, y: ROWS - 7, dx: 1, dy: 0 };
    return { x: COLS - 7, y: ROWS - 7, dx: -1, dy: 0 };
  }

  function createPlayer(id, name, slot) {
    const start = startForSlot(slot);
    return {
      id: id,
      name: name,
      slot: slot,
      color: PLAYER_COLORS[slot],
      tag: PLAYER_NAMES[slot],
      score: 0,
      alive: true,
      snake: [
        { x: start.x, y: start.y },
        { x: start.x - start.dx, y: start.y - start.dy },
        { x: start.x - start.dx * 2, y: start.y - start.dy * 2 }
      ],
      dir: { x: start.dx, y: start.dy },
      nextDir: { x: start.dx, y: start.dy },
      deadUntil: 0
    };
  }

  function firstOpenSlot() {
    const used = {};
    Object.values(hostState.players).forEach(function (p) {
      used[p.slot] = true;
    });
    for (let i = 0; i < MAX_PER_ROOM; i += 1) {
      if (!used[i]) return i;
    }
    return -1;
  }

  function snapshot() {
    return {
      tick: hostState.tick,
      roomId: roomId,
      food: clonePos(hostState.food),
      players: Object.fromEntries(
        Object.entries(hostState.players).map(function (entry) {
          const id = entry[0];
          const p = entry[1];
          return [id, {
            id: p.id,
            name: p.name,
            slot: p.slot,
            color: p.color,
            score: p.score,
            alive: p.alive,
            snake: p.snake.map(clonePos)
          }];
        })
      )
    };
  }

  function broadcastState() {
    const state = snapshot();
    latestState = state;
    listPlayers(state.players);
    Object.values(hostState.conns).forEach(function (conn) {
      if (conn.open) {
        conn.send({ type: 'state', state: state });
      }
    });
  }

  function revivePlayer(p) {
    const st = startForSlot(p.slot);
    p.snake = [
      { x: st.x, y: st.y },
      { x: st.x - st.dx, y: st.y - st.dy },
      { x: st.x - st.dx * 2, y: st.y - st.dy * 2 }
    ];
    p.dir = { x: st.dx, y: st.dy };
    p.nextDir = { x: st.dx, y: st.dy };
    p.alive = true;
  }

  function occupiedBySnake(playerId, x, y) {
    const players = Object.values(hostState.players);
    for (let i = 0; i < players.length; i += 1) {
      const body = players[i].snake;
      for (let j = 0; j < body.length; j += 1) {
        if (body[j].x === x && body[j].y === y) {
          if (players[i].id === playerId && j === body.length - 1) {
            continue;
          }
          return true;
        }
      }
    }
    return false;
  }

  function hostTick() {
    hostState.tick += 1;
    const now = Date.now();

    Object.values(hostState.players).forEach(function (p) {
      if (!p.alive) {
        if (p.deadUntil > 0 && now >= p.deadUntil) {
          revivePlayer(p);
          p.deadUntil = 0;
        }
        return;
      }

      if (!isOpposite(p.dir, p.nextDir)) {
        p.dir = { x: p.nextDir.x, y: p.nextDir.y };
      }

      const head = p.snake[0];
      const next = { x: head.x + p.dir.x, y: head.y + p.dir.y };

      if (next.x < 0 || next.x >= COLS || next.y < 0 || next.y >= ROWS) {
        p.alive = false;
        p.deadUntil = now + 2000;
        return;
      }

      if (occupiedBySnake(p.id, next.x, next.y)) {
        p.alive = false;
        p.deadUntil = now + 2000;
        return;
      }

      p.snake.unshift(next);

      if (next.x === hostState.food.x && next.y === hostState.food.y) {
        p.score += 1;
        placeFoodForHost();
      } else {
        p.snake.pop();
      }
    });

    broadcastState();
  }

  function beginHostLoop() {
    if (loop) clearInterval(loop);
    loop = setInterval(hostTick, TICK_MS);
  }

  function cleanupNet() {
    if (loop) {
      clearInterval(loop);
      loop = null;
    }

    if (hostConn) {
      try { hostConn.close(); } catch (e) {}
      hostConn = null;
    }

    if (peer) {
      try { peer.destroy(); } catch (e) {}
      peer = null;
    }

    if (hostPeer && hostPeer !== peer) {
      try { hostPeer.destroy(); } catch (e) {}
      hostPeer = null;
    }

    isHost = false;
    roomId = null;
    localId = null;
    latestState = null;
    hostState.players = {};
    hostState.conns = {};
    hostState.tick = 0;
    setRoomLabel();
    playersEl.innerHTML = '';
  }

  function handleHostData(conn, data) {
    if (!data || typeof data !== 'object') return;
    if (data.type === 'input') {
      const p = hostState.players[conn.peer];
      if (!p || !p.alive) return;
      if (!data.dir || typeof data.dir.x !== 'number' || typeof data.dir.y !== 'number') return;
      const next = { x: Math.sign(data.dir.x), y: Math.sign(data.dir.y) };
      if (Math.abs(next.x) + Math.abs(next.y) !== 1) return;
      if (!isOpposite(p.dir, next)) {
        p.nextDir = next;
      }
      return;
    }

    if (data.type === 'ping') {
      conn.send({ type: 'pong', t: data.t });
    }
  }

  function attachHostConnection(conn) {
    let joined = false;

    function acceptJoin() {
      if (joined) return;
      joined = true;
      const slot = firstOpenSlot();
      if (slot < 0) {
        conn.send({ type: 'join-deny', reason: 'full' });
        conn.close();
        return;
      }

      const joinName = conn.metadata && conn.metadata.name ? String(conn.metadata.name).slice(0, 20) : randomName();
      const p = createPlayer(conn.peer, joinName, slot);
      hostState.players[conn.peer] = p;
      hostState.conns[conn.peer] = conn;

      conn.send({ type: 'join-ok', roomId: roomId, playerId: conn.peer, max: MAX_PER_ROOM });
      broadcastState();
    }

    if (conn.open) {
      acceptJoin();
    }

    conn.on('open', function () {
      acceptJoin();
    });

    conn.on('data', function (data) {
      handleHostData(conn, data);
    });

    conn.on('close', function () {
      delete hostState.players[conn.peer];
      delete hostState.conns[conn.peer];
      broadcastState();
    });

    conn.on('error', function () {
      delete hostState.players[conn.peer];
      delete hostState.conns[conn.peer];
      broadcastState();
    });
  }

  function runAsHost(targetRoom, myName) {
    return new Promise(function (resolve, reject) {
      const p = new Peer(targetRoom);
      hostPeer = p;
      peer = p;

      p.on('open', function (id) {
        isHost = true;
        roomId = id;
        localId = id;
        setRoomLabel();
        setStatus('Hosting room. Waiting for players...');

        const me = createPlayer(localId, myName, 0);
        hostState.players[localId] = me;
        hostState.conns = {};
        placeFoodForHost();
        beginHostLoop();
        broadcastState();

        p.on('connection', function (conn) {
          attachHostConnection(conn);
        });

        resolve(true);
      });

      p.on('error', function (err) {
        reject(err);
      });
    });
  }

  function attachClientConnection(conn) {
    conn.on('data', function (data) {
      if (!data || typeof data !== 'object') return;

      if (data.type === 'join-ok') {
        roomId = data.roomId;
        localId = data.playerId;
        setRoomLabel();
        setStatus('Connected. Room auto-assigned successfully.');
        return;
      }

      if (data.type === 'state') {
        latestState = data.state;
        listPlayers(latestState.players);
        return;
      }

      if (data.type === 'join-deny') {
        setStatus('Room is full. Searching another room...');
        try { conn.close(); } catch (e) {}
        startNetworking();
      }
    });

    conn.on('close', function () {
      setStatus('Disconnected from host. Reconnecting...');
      startNetworking();
    });

    conn.on('error', function () {
      setStatus('Connection error. Reconnecting...');
      startNetworking();
    });
  }

  function delay(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  async function tryJoinRoom(basePeer, room, name) {
    return new Promise(function (resolve) {
      let settled = false;
      let joined = false;
      const conn = basePeer.connect(room, { reliable: true, metadata: { name: name } });

      function finish(result) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(result);
      }

      const timer = setTimeout(function () {
        if (joined) return;
        try { conn.close(); } catch (e) {}
        finish({ ok: false, reason: 'timeout' });
      }, JOIN_TIMEOUT_MS);

      conn.on('open', function () {
        setStatus('Found room ' + room + '. Joining...');
      });

      conn.on('data', function (data) {
        if (!data || typeof data !== 'object') return;
        if (data.type === 'join-ok') {
          joined = true;
          hostConn = conn;
          roomId = data.roomId || room;
          localId = data.playerId || localId;
          setRoomLabel();
          setStatus('Connected. Room auto-assigned successfully.');
          attachClientConnection(conn);
          finish({ ok: true });
          return;
        }

        if (data.type === 'join-deny') {
          try { conn.close(); } catch (e) {}
          finish({ ok: false, reason: data.reason || 'denied' });
        }
      });

      conn.on('error', function () {
        finish({ ok: false, reason: 'error' });
      });

      conn.on('close', function () {
        if (!joined) {
          finish({ ok: false, reason: 'closed' });
        }
      });
    });
  }

  async function findOrCreateRoom(basePeer, myName) {
    for (let i = 1; i <= ROOM_SCAN_LIMIT; i += 1) {
      const candidate = ROOM_PREFIX + i;
      setStatus('Searching room ' + i + '/' + ROOM_SCAN_LIMIT + '...');
      const result = await tryJoinRoom(basePeer, candidate, myName);
      if (result.ok) {
        return true;
      }
      await delay(120);
    }

    try {
      basePeer.destroy();
    } catch (e) {}

    for (let i = 1; i <= ROOM_SCAN_LIMIT; i += 1) {
      const candidate = ROOM_PREFIX + i;
      setStatus('No open room found. Creating room ' + i + '/' + ROOM_SCAN_LIMIT + '...');
      try {
        await runAsHost(candidate, myName);
        return true;
      } catch (e) {
        continue;
      }
    }

    return false;
  }

  async function startNetworking() {
    const attemptId = ++connectAttempt;
    cleanupNet();
    setStatus('Connecting to matchmaking...');

    if (typeof Peer === 'undefined') {
      setStatus('PeerJS failed to load. Please refresh and try again.');
      return;
    }

    const myName = randomName();
    const id = 'snakeio-player-' + Math.random().toString(36).slice(2, 10);

    peer = new Peer(id);

    const openTimer = setTimeout(function () {
      if (attemptId !== connectAttempt) return;
      setStatus('Connection is taking too long. Retrying...');
      startNetworking();
    }, PEER_OPEN_TIMEOUT_MS);

    peer.on('open', async function (peerId) {
      if (attemptId !== connectAttempt) return;
      clearTimeout(openTimer);
      localId = peerId;
      const ok = await findOrCreateRoom(peer, myName);
      if (!ok) {
        setStatus('No room available right now. Try again in a moment.');
      }
    });

    peer.on('error', function () {
      if (attemptId !== connectAttempt) return;
      clearTimeout(openTimer);
      setStatus('Peer error. Reconnecting...');
      setTimeout(startNetworking, 800);
    });

    peer.on('disconnected', function () {
      if (attemptId !== connectAttempt) return;
      clearTimeout(openTimer);
      setStatus('Peer disconnected. Reconnecting...');
      setTimeout(startNetworking, 800);
    });
  }

  function applyInput(dir) {
    if (!dir) return;
    if (Math.abs(dir.x) + Math.abs(dir.y) !== 1) return;
    if (isOpposite(myDir, dir)) return;

    myDir = dir;

    if (isHost) {
      const me = hostState.players[localId];
      if (me && !isOpposite(me.dir, dir)) {
        me.nextDir = { x: dir.x, y: dir.y };
      }
      return;
    }

    if (!hostConn || !hostConn.open) return;
    if (dir.x === lastSentDir.x && dir.y === lastSentDir.y) return;

    lastSentDir = { x: dir.x, y: dir.y };
    hostConn.send({ type: 'input', dir: dir });
  }

  document.addEventListener('keydown', function (e) {
    const dir = directionFromKey(e.key);
    if (!dir) return;
    e.preventDefault();
    applyInput(dir);
  });

  touchWrap.addEventListener('click', function (e) {
    const target = e.target;
    if (!target || !target.dataset || !target.dataset.dir) return;

    if (target.dataset.dir === 'up') applyInput({ x: 0, y: -1 });
    if (target.dataset.dir === 'down') applyInput({ x: 0, y: 1 });
    if (target.dataset.dir === 'left') applyInput({ x: -1, y: 0 });
    if (target.dataset.dir === 'right') applyInput({ x: 1, y: 0 });
  });

  reconnectBtn.addEventListener('click', function () {
    setStatus('Finding a new room...');
    startNetworking();
  });

  function renderLoop() {
    draw();
    requestAnimationFrame(renderLoop);
  }

  renderLoop();
  startNetworking();

  window.addEventListener('beforeunload', function () {
    cleanupNet();
  });
});
