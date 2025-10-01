class GameClient {
  constructor() {
    this.ws = null;
    this.isPlayer = false;
    this.myPlayerId = null;
    this.players = new Map();
    this.canvas = document.getElementById("gameCanvas");
    this.ctx = this.canvas.getContext("2d");
    this.board = { width: 0, height: 0 };
    this.ping = 0;
    this.lastUpdateTime = Date.now();
    this.cursorTimeout = null;

    const urlParams = new URLSearchParams(window.location.search);
    this.hapticEnabled = urlParams.get("vibration") == "true";
    this.prevVelX = null;
    this.prevVelY = null;

    this.joinBtn = document.getElementById("joinBtn");
    this.nicknameInput = document.getElementById("nickname");
    this.colorInput = document.getElementById("color");
    this.spectatorNotice = document.getElementById("spectatorNotice");
    this.playtimeDisplay = document.getElementById("playtimeDisplay");
    this.playtimeValue = document.getElementById("playtimeValue");
    this.fullscreenBtn = document.getElementById("fullscreenBtn");

    this.initializeUI();
    this.connect();
    this.startPingLoop();
    this.startRenderLoop();
    this.startClientPrediction();

    this.logoImageLoaded = false;
    this.logoImage = new Image();
    this.logoImage.onload = () => {
      this.logoImageLoaded = true;
    };
    this.logoImage.src = "/dvd/public/img/DVD_logo.svg";
  }

  startClientPrediction() {
    // Update client-side predictions
    setInterval(() => {
      const now = Date.now();
      const dt = (now - this.lastUpdateTime) / 1000;
      this.lastUpdateTime = now;

      // Predict movement for all players
      for (const player of this.players.values()) {
        if (player.pos && player.velocity) {
          this.predictPlayerMovement(player, dt);
        }
      }
    }, 1000 / 60);
  }

  predictPlayerMovement(player, dt) {
    if (!player.velocity || !player.pos || !player.size) return;

    // Predict new position
    let newX = player.pos.x + player.velocity.x * dt;
    let newY = player.pos.y + player.velocity.y * dt;

    const halfW = player.size.x / 2;
    const halfH = player.size.y / 2;

    // Handle X-axis wall collisions
    if (newX < halfW) {
      newX = halfW;
      player.velocity.x *= -1;
    } else if (newX > this.board.width - halfW) {
      newX = this.board.width - halfW;
      player.velocity.x *= -1;
    }

    // Handle Y-axis wall collisions
    if (newY < halfH) {
      newY = halfH;
      player.velocity.y *= -1;
    } else if (newY > this.board.height - halfH) {
      newY = this.board.height - halfH;
      player.velocity.y *= -1;
    }

    // Update predicted position
    player.pos.x = newX;
    player.pos.y = newY;
  }

  initializeUI() {
    // Generate random nickname
    const adjectives = [
      "Swift",
      "Bouncy",
      "Lightning",
      "Neon",
      "Cosmic",
      "Stellar",
      "Rapid",
      "Dynamic",
    ];
    const nouns = [
      "Ball",
      "Sphere",
      "Orb",
      "Comet",
      "Star",
      "Bolt",
      "Flash",
      "Rocket",
    ];
    const randomNick =
      adjectives[Math.floor(Math.random() * adjectives.length)] +
      nouns[Math.floor(Math.random() * nouns.length)] +
      Math.floor(Math.random() * 999);

    this.nicknameInput.value = randomNick;

    // Generate random color
    const colors = [
      "#ff6b6b",
      "#4ecdc4",
      "#45b7d1",
      "#96ceb4",
      "#feca57",
      "#ff9ff3",
      "#54a0ff",
      "#5f27cd",
    ];
    this.colorInput.value = colors[Math.floor(Math.random() * colors.length)];

    // Event listeners
    this.joinBtn.onclick = () => {
      if (this.isPlayer) {
        this.leaveGame();
      } else {
        this.joinBtn.disabled = true;
        this.joinGame();
      }
    };

    this.colorInput.oninput = () => {
      if (this.isPlayer) {
        this.changeColor();
      }
    };

    this.fullscreenBtn.onclick = () => {
      const gameArea = document.querySelector(".game-area");

      if (!document.fullscreenElement) {
        gameArea.requestFullscreen();
      } else {
        document.exitFullscreen();
      }

      setTimeout(() => this.resizeCanvas(), 5);
    };

    document.onmousemove = () => this.resetCursorTimer();
    document.onfullscreenchange = () => this.resetCursorTimer();

    // Resize canvas
    this.resizeCanvas();
    window.onresize = () => this.resizeCanvas();
  }

  showCursor() {
    document.body.classList.remove("hide-cursor");
  }

  hideCursor() {
    if (
      document.fullscreenElement &&
      !Array.from(document.querySelectorAll(".overlay-element")).some((el) =>
        el.matches(":hover"),
      )
    ) {
      document.body.classList.add("hide-cursor");
    }
  }

  resetCursorTimer() {
    this.showCursor();
    if (this.cursorTimeout) {
      clearTimeout(this.cursorTimeout);
    }

    if (document.fullscreenElement) {
      this.cursorTimeout = setTimeout(() => this.hideCursor(), 2000);
    }
  }

  resizeCanvas() {
    const container = this.canvas.parentElement;
    const rect = container.getBoundingClientRect();

    // Get device pixel ratio for sharp rendering on high-DPI displays
    const dpr = window.devicePixelRatio;

    // Set actual canvas size (accounting for device pixel ratio)
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
  }

  connect() {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/dvd/ws/game`;

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      this.updateConnectionStatus(true);
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleMessage(data);
    };

    this.ws.onclose = () => {
      this.updateConnectionStatus(false);
      setTimeout(() => this.connect(), 3000); // Reconnect after 3 seconds
    };

    this.ws.onerror = () => {
      this.updateConnectionStatus(false);
    };
  }

  handleMessage(data) {
    switch (data.type) {
      case "spectator_init":
        this.isPlayer = false;
        this.myPlayerId = null;
        this.board = data.board;
        this.updatePlayersData(data.players);
        this.updateUI();
        break;

      case "player_init":
        this.isPlayer = true;
        this.myPlayerId = data.player.id;
        this.players.set(data.player.id, data.player);
        this.updateUI();
        this.startPlaytimeTimer();
        this.updatePlayerList();
        this.joinBtn.disabled = false;
        break;

      case "spectator_mode":
        this.onLeave();
        break;

      case "new_player":
        // Add new player to existing players
        this.players.set(data.player.id, data.player);
        this.updatePlayerList();
        break;

      case "player_left":
        // Remove player who left
        this.players.delete(data.playerId);
        this.updatePlayerList();
        break;

      case "state":
        this.updatePlayersData(data.players);
        break;

      case "pong":
        this.ping = Date.now() - data.ts;
        document.getElementById("pingDisplay").textContent =
          `Ping: ${this.ping}ms`;
        break;
    }
  }

  hapticFeedback(playerUpdate) {
    if (playerUpdate.id == this.myPlayerId) {
      if (
        "vibrate" in navigator &&
        this.prevVelX != null &&
        this.prevVelY != null &&
        (Math.sign(this.prevVelX) !== Math.sign(playerUpdate.velocity.x) ||
          Math.sign(this.prevVelY) !== Math.sign(playerUpdate.velocity.y))
      ) {
        navigator.vibrate(
          5,
          10,
          5,
          10,
          5,
          10,
          5,
          10,
          5,
          10,
          5,
          10,
          5,
          10,
          5,
          10,
          5,
        );
      }
      this.prevVelX = playerUpdate.velocity.x;
      this.prevVelY = playerUpdate.velocity.y;
    }
  }

  updatePlayersData(playersArray) {
    let shouldUpdatePlayerList = false;

    // Update existing players with new data, preserving cached properties
    playersArray.forEach((playerUpdate) => {
      const existingPlayer = this.players.get(playerUpdate.id);
      if (existingPlayer) {
        // Check if corner count actually changed (only if it's in the update)
        if (
          "cornerHits" in playerUpdate &&
          playerUpdate.cornerHits !== existingPlayer.cornerHits
        ) {
          shouldUpdatePlayerList = true;
        }

        if ("color" in playerUpdate) {
          shouldUpdatePlayerList = true;
        }

        // Server data is authoritative - completely replace predicted values
        if (playerUpdate.pos) {
          existingPlayer.pos.x = playerUpdate.pos.x;
          existingPlayer.pos.y = playerUpdate.pos.y;
        }

        if (playerUpdate.velocity) {
          existingPlayer.velocity.x = playerUpdate.velocity.x;
          existingPlayer.velocity.y = playerUpdate.velocity.y;

          if (this.hapticEnabled) {
            this.hapticFeedback(playerUpdate);
          }
        }

        // Merge other properties (but only if they exist in the update)
        Object.assign(existingPlayer, playerUpdate);
      } else {
        // New player - add to map and track join time
        this.players.set(playerUpdate.id, playerUpdate);
        shouldUpdatePlayerList = true;
      }
    });

    // Remove players that are no longer in the update
    const currentPlayerIds = new Set(playersArray.map((p) => p.id));
    for (const [playerId] of this.players) {
      if (!currentPlayerIds.has(playerId)) {
        this.players.delete(playerId);
        shouldUpdatePlayerList = true;
      }
    }

    // Only re-render player list if something that affects it changed
    if (shouldUpdatePlayerList) {
      this.updatePlayerList();
    }
  }

  updatePlayerList() {
    const playersArray = Array.from(this.players.values());
    playersArray.sort((a, b) => (b.cornerHits || 0) - (a.cornerHits || 0));

    document.getElementById("playerCount").textContent =
      `${playersArray.length} player${playersArray.length != 1 ? "s" : ""}`;

    const listContent = document.getElementById("playerListContent");

    listContent.innerText = "";

    if (playersArray.length === 0) {
      const noPlayersMessage = document.createElement("div");
      noPlayersMessage.className = "no-players-msg";
      noPlayersMessage.innerText = "No players online";
      listContent.appendChild(noPlayersMessage);
      return;
    }

    playersArray.forEach((player) => {
      const playerItem = document.createElement("div");
      playerItem.className = "player-item";
      if (player.id === this.myPlayerId) {
        playerItem.classList.add("own-player");
      }

      const playerHeader = document.createElement("div");
      playerHeader.className = "player-list-header";
      const playerColor = document.createElement("div");
      playerColor.className = "player-color";
      playerColor.style.backgroundColor = player.color;
      const playerName = document.createElement("div");
      playerName.className = "player-name";
      playerName.innerText = player.nickname;
      playerHeader.appendChild(playerColor);
      playerHeader.appendChild(playerName);
      const playerHitCount = document.createElement("div");
      playerHitCount.className = "player-hit-count";
      playerHitCount.innerText = "Corner hit count: ";
      const playerHitCountNumber = document.createElement("strong");
      playerHitCountNumber.innerText = player.cornerHits || 0;
      playerHitCount.appendChild(playerHitCountNumber);

      playerItem.appendChild(playerHeader);
      playerItem.appendChild(playerHitCount);

      listContent.appendChild(playerItem);
    });
  }

  formatTime(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
  }

  updateUI() {
    if (this.isPlayer) {
      this.joinBtn.textContent = "Leave Game";
      this.joinBtn.className = "join-btn leave";
      this.nicknameInput.disabled = true;
      this.spectatorNotice.style.display = "none";
      this.playtimeDisplay.style.display = "block";
    } else {
      this.joinBtn.textContent = "Join Game";
      this.joinBtn.className = "join-btn";
      this.nicknameInput.disabled = false;
      this.spectatorNotice.style.display = "block";
      this.playtimeDisplay.style.display = "none";
    }
  }

  startPlaytimeTimer() {
    this.playtimeStart = Date.now();
    this.playtimeValue.textContent = this.formatTime(0);
    this.playtimeInterval = setInterval(() => {
      const elapsed = Date.now() - this.playtimeStart;
      this.playtimeValue.textContent = this.formatTime(elapsed);
    }, 1000);
  }

  stopPlaytimeTimer() {
    if (this.playtimeInterval) {
      clearInterval(this.playtimeInterval);
      this.playtimeInterval = null;
    }
  }

  updateConnectionStatus(connected) {
    const status = document.getElementById("connectionStatus");
    if (connected) {
      status.textContent = "Connected";
      status.className = "connection-status connected";
      this.joinBtn.disabled = false;
    } else {
      status.textContent = "Disconnected";
      status.className = "connection-status disconnected";
      this.players.clear();
      this.ws = null;
      this.isPlayer = false;
      this.myPlayerId = null;
      this.updateUI();
      this.stopPlaytimeTimer();
      this.updatePlayerList();
      this.joinBtn.disabled = true;
    }
  }

  joinGame() {
    const nickname = this.nicknameInput.value.trim();
    const color = this.colorInput.value;

    if (!nickname) {
      alert("Please enter a nickname");
      this.joinBtn.disabled = false;
      return;
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: "join",
          nickname: nickname,
          color: color,
        }),
      );
    }
  }

  leaveGame() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: "leave",
        }),
      );
    }
  }

  onLeave() {
    if (this.isPlayer) {
      this.isPlayer = false;
      this.players.delete(this.myPlayerId);
      this.myPlayerId = null;
      this.updateUI();
      this.stopPlaytimeTimer();
      this.updatePlayerList();
      this.joinBtn.disabled = false;
    }
  }

  changeColor() {
    const color = this.colorInput.value;

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: "new_color",
          color: color,
        }),
      );
    }
  }

  startPingLoop() {
    setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: "ping", ts: Date.now() }));
      }
    }, 1000);
  }

  startRenderLoop() {
    const render = () => {
      this.renderGame();
      requestAnimationFrame(render);
    };
    render();
  }

  renderGame() {
    const { width, height } = this.canvas;
    this.ctx.clearRect(0, 0, width, height);

    if (this.players.size === 0) {
      // Show empty state
      this.ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
      this.ctx.font = `${10 + 16 * window.devicePixelRatio}px Nunito`;
      this.ctx.textAlign = "center";
      this.ctx.fillText(
        this.ws && this.ws.readyState === WebSocket.OPEN
          ? "No one is here :("
          : "Connecting to the server...",
        width / 2,
        height / 2,
      );
      return;
    }

    if (!document.fullscreenElement) {
      this.ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
    } else {
      this.ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
    }
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const scaleX = width / this.board.width;
    const scaleY = height / this.board.height;
    const scale = Math.min(scaleX, scaleY);

    const offsetX = (width - this.board.width * scale) / 2;
    const offsetY = (height - this.board.height * scale) / 2;

    this.ctx.save();
    this.ctx.translate(offsetX, offsetY);
    this.ctx.scale(scale, scale);

    this.ctx.clearRect(0, 0, this.board.width, this.board.height);
    if (!document.fullscreenElement) {
      this.ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
      this.ctx.fillRect(0, 0, this.board.width, this.board.height);
    }

    for (const player of this.players.values()) {
      // Skip if player data is incomplete
      if (!player.pos || !player.size || !player.color) {
        continue;
      }

      this.ctx.fillStyle = player.color;

      if (player.id === this.myPlayerId) {
        // Highlight own player
        this.ctx.shadowColor = player.color;
        this.ctx.shadowBlur = 30 * scale;
      }

      const playerWidth = player.size.x || 20;
      const playerHeight = player.size.y || 20;

      if (this.logoImageLoaded) {
        this.ctx.drawImage(
          this.drawImageColored(this.logoImage, player.color),
          player.pos.x - playerWidth / 2,
          player.pos.y - playerHeight / 2,
          playerWidth,
          playerHeight,
        );
      }

      // Draw nickname
      this.ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
      this.ctx.font = `${player.id === this.myPlayerId ? "900 " : ""}${
        20 + 4 * window.devicePixelRatio
      }px Nunito`;
      this.ctx.textAlign = "center";
      this.ctx.shadowBlur = 0;
      this.ctx.fillText(
        player.nickname || "Unknown",
        player.pos.x,
        player.pos.y - playerHeight / 2 - 20,
      );
    }

    this.ctx.restore();
  }

  drawImageColored(image, color) {
    const w = image.width;
    const h = image.height;
    const offScr = new OffscreenCanvas(w, h);
    const ctx = offScr.getContext("2d");

    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(image, 0, 0, w, h);

    ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, w, h);

    ctx.globalCompositeOperation = "destination-in";
    ctx.drawImage(image, 0, 0, w, h);

    return offScr;
  }
}

new GameClient();
