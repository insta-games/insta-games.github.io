
document.addEventListener('DOMContentLoaded', () => {
  // --- Firebase Config ---
  const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    databaseURL: "https://insta-games-a111a-default-rtdb.firebaseio.com/",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
  };

  // --- Initialize Firebase ---
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  const database = firebase.database();
  const playersRef = database.ref('lobby/players');
  const gamesRef = database.ref('lobby/games');

  // --- DOM Elements ---
  const nameInput = document.getElementById('name-input');
  const joinLobbyBtn = document.getElementById('join-lobby');
  const nameEntryEl = document.getElementById('name-entry');
  const lobbyMainEl = document.getElementById('lobby-main');
  const playerListEl = document.getElementById('player-list');
  const gameListEl = document.getElementById('game-list');
  const createGameBtn = document.getElementById('create-game');

  let currentPlayerRef = null;
  let playerName = '';

  // --- Functions ---

  function joinLobby() {
    playerName = nameInput.value.trim();
    if (!playerName) {
      alert('Please enter a name.');
      return;
    }

    currentPlayerRef = playersRef.push({ name: playerName });
    currentPlayerRef.onDisconnect().remove();

    nameEntryEl.style.display = 'none';
    lobbyMainEl.style.display = 'block';
  }

  function updatePlayerList(snapshot) {
    const players = snapshot.val();
    playerListEl.innerHTML = '';
    if (players) {
      Object.values(players).forEach(player => {
        const li = document.createElement('li');
        li.textContent = player.name;
        li.classList.add('lobby-player-item');
        playerListEl.appendChild(li);
      });
    } else {
      const li = document.createElement('li');
      li.textContent = "No players online yet.";
      li.classList.add('muted');
      playerListEl.appendChild(li);
    }
  }

  function createNewGame() {
    if (!playerName) {
        alert('You must join the lobby first!');
        return;
    }
    const newGameRef = gamesRef.push({
        gameType: 'tictactoe',
        createdBy: playerName,
        createdAt: firebase.database.ServerValue.TIMESTAMP,
        status: 'open'
    });
    
    // Redirect to the game page
    window.location.href = `tictactoe-online.html?gameId=${newGameRef.key}`;
  }

  function updateGameList(snapshot) {
      const games = snapshot.val();
      gameListEl.innerHTML = '';
      if(games) {
          Object.keys(games).forEach(gameId => {
              const game = games[gameId];
              if (game.status === 'open') {
                  const li = document.createElement('li');
                  li.innerHTML = `<span>${game.createdBy}'s Tic-Tac-Toe</span> <a href="tictactoe-online.html?gameId=${gameId}" class="btn btn-small">Join</a>`;
                  li.classList.add('lobby-game-item');
                  gameListEl.appendChild(li);
              }
          });
      }
      if (gameListEl.children.length === 0) {
          const li = document.createElement('li');
          li.textContent = "No open games. Why not start one?";
          li.classList.add('muted');
          gameListEl.appendChild(li);
      }
  }

  // --- Event Listeners ---
  joinLobbyBtn.addEventListener('click', joinLobby);
  nameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        joinLobby();
    }
  });
  createGameBtn.addEventListener('click', createNewGame);

  // Listen for changes
  playersRef.on('value', updatePlayerList);
  gamesRef.on('value', updateGameList);

  if (document.getElementById('year')) {
    document.getElementById('year').textContent = new Date().getFullYear();
  }
});
