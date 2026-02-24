# 🎮 Multiplayer Games Hub - Complete Documentation

## 📋 Table of Contents
- [Server Information](#server-information)
- [Firebase Configuration](#firebase-configuration)
- [Getting Started](#getting-started)
- [Games Overview](#games-overview)
- [Room System](#room-system)
- [Firebase Database Setup](#firebase-database-setup)
- [Troubleshooting](#troubleshooting)
- [API Reference](#api-reference)

---

## 🖥️ Server Information

### Local Development Server
- **Server URL**: `http://localhost:8000`
- **Server Type**: Python HTTP Server
- **Port**: 8000
- **Status**: Running in terminal

### Starting the Server
```bash
cd /home/sanjith/test
python3 -m http.server 8000
```

### Stopping the Server
Press `Ctrl + C` in the terminal where the server is running.

---

## 🔥 Firebase Configuration

### Project Details
- **Project Name**: multiplayer-games-76d23
- **Project ID**: `multiplayer-games-76d23`
- **Region**: Asia Southeast 1

### Firebase Credentials
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyC8cQdWyNNVVPKNn_B_wlE6q0OmqWJFMbA",
  authDomain: "multiplayer-games-76d23.firebaseapp.com",
  databaseURL: "https://multiplayer-games-76d23-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "multiplayer-games-76d23",
  storageBucket: "multiplayer-games-76d23.firebasestorage.app",
  messagingSenderId: "431065143042",
  appId: "1:431065143042:web:3ed9c9b38a13bce174141b",
  measurementId: "G-1KSV9E8QEM"
};
```

### Firebase Console Access
- **Console URL**: https://console.firebase.google.com/project/multiplayer-games-76d23
- **Database Console**: https://console.firebase.google.com/project/multiplayer-games-76d23/database
- **Authentication**: Use your Google account that created the project

### Database URLs
- **Realtime Database**: `https://multiplayer-games-76d23-default-rtdb.asia-southeast1.firebasedatabase.app`
- **Database Rules**: Navigate to Database → Rules in Firebase Console

---

## 🚀 Getting Started

### Quick Start Guide

1. **Start the Server**
   ```bash
   cd /home/sanjith/test
   python3 -m http.server 8000
   ```

2. **Open Your Browser**
  Navigate to: `http://localhost:8000/index.html`

3. **Setup Firebase Database** (First Time Only)
   - Go to: `http://localhost:8000/index.html`
   - Click "Database Setup Guide"
   - Follow the instructions to set database rules

4. **Choose a Game**
   - Pick any game from the menu
   - Enter your name
   - Start playing!

### Setting Up Database Rules

**IMPORTANT**: You must set up database rules for multiplayer to work!

1. Go to: https://console.firebase.google.com/project/multiplayer-games-76d23/database
2. Click on the "Rules" tab
3. Replace the existing rules with:

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

4. Click "Publish"

**⚠️ Security Note**: These rules allow public read/write access. For production, implement proper authentication and security rules.

---

## 🎮 Games Overview

### 1. 🚁 Copter.io - PvP Helicopter Combat
**URL**: `http://localhost:8000/lobby.html`

**Game Type**: Multiplayer PvP Shooter

**Features**:
- Real-time helicopter combat
- Health and damage system (100 HP)
- Bullet shooting mechanics
- Kill/Death tracking
- Auto-respawn after death
- Up to 6 players per room

**Controls**:
- `SPACE` - Fly up
- `A/D` or `Arrow Keys` - Move left/right
- `Mouse` - Aim
- `Left Click` - Shoot

**Room System**:
- **Quick Play**: Auto-joins available room or creates new one
- **Specific Room**: Enter 6-character room code

**Database Structure**:
```
copter-rooms/
  {ROOM_CODE}/
    players/
      {PLAYER_ID}/
        - name: string
        - x: number
        - y: number
        - color: string
        - alive: boolean
        - health: number (0-100)
        - kills: number
        - deaths: number
        - angle: number
        - lastUpdate: timestamp
    bullets/
      {BULLET_ID}/
        - x: number
        - y: number
        - vx: number
        - vy: number
        - ownerId: string
        - ownerName: string
        - createdAt: timestamp
```

---

### 2. 🚶 Roaming Game - Shared World
**URL**: `http://localhost:8000/lobby.html`

**Game Type**: Casual Multiplayer Exploration

**Features**:
- Real-time player positions
- Visual grid world (800x600)
- Unlimited players per room
- Teleportation system

**Controls**:
- `WASD` or `Arrow Keys` - Move around
- `Left Click` - Teleport to location

**Room System**:
- Optional room code
- Auto-generates if not provided
- Share room code with friends

**Database Structure**:
```
game-rooms/
  {ROOM_CODE}/
    players/
      {PLAYER_ID}/
        - name: string
        - x: number
        - y: number
        - color: string
        - lastUpdate: timestamp
```

---

### 3. 🎯 Room System Template
**URL**: `http://localhost:8000/lobby.html`

**Game Type**: Room Management System

**Features**:
- Create/Join rooms with codes
- Host-based room control
- Ready system for players
- Player status tracking
- Game start controls (host only)

**Controls**:
- Click "Ready" to mark yourself ready
- Host can start game when all ready

**Database Structure**:
```
rooms/
  {ROOM_CODE}/
    - host: string (player ID)
    - createdAt: timestamp
    - gameStarted: boolean
    players/
      {PLAYER_ID}/
        - name: string
        - ready: boolean
        - joinedAt: timestamp
```

---

### 4. 🔧 Firebase Test Page
**URL**: `http://localhost:8000/index.html`

**Purpose**: Database testing and configuration

**Features**:
- Test database read/write
- Check connection status
- View Firebase configuration
- Setup guide for database rules

---

## 🚪 Room System

### Room Code Format
- **Length**: 6 characters
- **Type**: Alphanumeric (uppercase)
- **Example**: `ABC123`, `XYZ789`, `GAME01`

### Room Code Generation
Room codes are automatically generated using:
```javascript
Math.random().toString(36).substr(2, 6).toUpperCase()
```

### Sharing Room Codes

**Method 1: Direct Code**
- Share the 6-character code
- Other players enter it manually

**Method 2: URL Sharing**
- Games support `?room=CODE` parameter
- Example: `http://localhost:8000/lobby.html?room=ABC123`
- Code auto-fills when opened

**Method 3: Copy Button**
- Some games have "Copy Room Code" button
- Copies code to clipboard

### Auto-Join System (Copter.io)

The copter game has an auto-join feature:

1. Searches for existing rooms with < 6 players
2. Joins first available room
3. Creates new room if none available
4. Room capacity: 6 players maximum

**Algorithm**:
```javascript
// Checks all rooms
// Finds room with playerCount < 6
// Joins that room
// Otherwise creates new room with random code
```

---

## 🗄️ Firebase Database Setup

### Database Structure Overview

```
firebase-database/
├── copter-rooms/          # Copter.io game rooms
│   └── {ROOM_CODE}/
│       ├── players/       # Player data
│       └── bullets/       # Bullet projectiles
├── game-rooms/            # Roaming game rooms
│   └── {ROOM_CODE}/
│       └── players/       # Player positions
├── rooms/                 # Room system template
│   └── {ROOM_CODE}/
│       ├── host           # Host player ID
│       └── players/       # Player data
└── test/                  # Test data
    └── data/              # Test writes
```

### Security Rules

**Development Rules** (Current):
```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

**Recommended Production Rules**:
```json
{
  "rules": {
    "copter-rooms": {
      "$roomId": {
        ".read": true,
        "players": {
          "$playerId": {
            ".write": "$playerId === auth.uid || !data.exists()"
          }
        },
        "bullets": {
          ".write": true
        }
      }
    },
    "game-rooms": {
      "$roomId": {
        ".read": true,
        "players": {
          "$playerId": {
            ".write": "$playerId === auth.uid || !data.exists()"
          }
        }
      }
    },
    "rooms": {
      "$roomId": {
        ".read": true,
        ".write": true
      }
    }
  }
}
```

### Data Cleanup

**Automatic Cleanup**:
- Players are removed when they leave
- Bullets are removed after 2 seconds (copter game)
- Dead player data persists until they leave

**Manual Cleanup**:
1. Go to Firebase Console
2. Navigate to Realtime Database
3. Delete old room nodes manually
4. Or implement TTL rules in database

### Monitoring Database Usage

1. **Firebase Console**: https://console.firebase.google.com/project/multiplayer-games-76d23/database
2. **Usage Tab**: View read/write operations
3. **Data Tab**: See real-time data structure

**Free Tier Limits**:
- 100 simultaneous connections
- 1 GB stored data
- 10 GB/month downloaded data

---

## 🔍 Troubleshooting

### Common Issues

#### 1. "Database error: Permission denied"

**Problem**: Database rules not configured

**Solution**:
```bash
1. Go to Firebase Console
2. Database → Rules
3. Set rules to allow read/write
4. Publish changes
5. Refresh game page
```

#### 2. "Cannot read properties of undefined"

**Problem**: Firebase not initialized or room doesn't exist

**Solution**:
- Clear browser cache
- Refresh the page
- Check internet connection
- Verify Firebase config is correct

#### 3. Players not syncing

**Problem**: Database listeners not working

**Solution**:
- Check browser console for errors
- Verify room code is correct
- Test database connection at index.html
- Ensure Firebase rules allow read access

#### 4. Game freezes or lags

**Problem**: Too many database operations

**Solution**:
- Limit number of players in room
- Check network connection
- Close other tabs/applications
- Clear old rooms from database

#### 5. Room code not working

**Problem**: Room may have been deleted or doesn't exist

**Solution**:
- Create a new room
- Use auto-join instead
- Verify room code is correct (6 characters)

### Debug Mode

**Enable Console Logging**:
```javascript
// Open browser console (F12)
// Check for Firebase errors
// Look for connection messages
```

**Test Database**:
1. Go to `http://localhost:8000/index.html`
2. Click "Test Database"
3. Verify success message
4. If error, follow setup guide

---

## 📚 API Reference

### Player ID Generation
```javascript
'player_' + Math.random().toString(36).substr(2, 9)
// Example: player_k5j2h8x9a
```

### Room Code Generation
```javascript
Math.random().toString(36).substr(2, 6).toUpperCase()
// Example: ABC123
```

### Firebase Database Paths

**Create Player**:
```javascript
set(ref(database, `copter-rooms/${roomCode}/players/${playerId}`), {
  name: "PlayerName",
  x: 400,
  y: 300,
  color: "#FF6B6B",
  alive: true,
  health: 100,
  kills: 0,
  deaths: 0
});
```

**Update Player Position**:
```javascript
update(ref(database, `copter-rooms/${roomCode}/players/${playerId}`), {
  x: newX,
  y: newY,
  lastUpdate: Date.now()
});
```

**Listen to Players**:
```javascript
onValue(ref(database, `copter-rooms/${roomCode}/players`), (snapshot) => {
  if (snapshot.exists()) {
    players = snapshot.val();
  }
});
```

**Remove Player**:
```javascript
remove(ref(database, `copter-rooms/${roomCode}/players/${playerId}`));
```

**Create Bullet**:
```javascript
set(ref(database, `copter-rooms/${roomCode}/bullets/${bulletId}`), {
  x: startX,
  y: startY,
  vx: velocityX,
  vy: velocityY,
  ownerId: playerId,
  createdAt: Date.now()
});
```

---

## 🎨 Customization

### Changing Colors

**Player Colors** (in game files):
```javascript
const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8'];
```

### Adjusting Game Parameters

**Copter.io Settings**:
```javascript
// In your multiplayer game file
const COPTER = {
  size: 25,              // Helicopter size
  gravity: 0.5,          // Falling speed
  lift: -10,             // Jump power
  maxSpeed: 8,           // Max vertical speed
  horizontalSpeed: 4     // Left/right speed
};

const BULLET = {
  speed: 12,             // Bullet velocity
  damage: 20,            // Damage per hit
  size: 5,               // Bullet size
  lifetime: 2000         // Lifespan in ms
};
```

**Roaming Game Settings**:
```javascript
// In your multiplayer game file
const PLAYER_SIZE = 30;     // Player circle size
const MOVE_SPEED = 5;        // Movement speed
```

### Canvas Size

Change canvas dimensions in HTML:
```html
<canvas id="gameCanvas" width="800" height="600"></canvas>
```

---

## 📊 Game Statistics

### Player Data Tracked

**Copter.io**:
- Kills
- Deaths
- Health
- Position (x, y)
- Aim angle
- Alive status

**Roaming Game**:
- Position (x, y)
- Color
- Last update time

**Room System**:
- Ready status
- Join time
- Host status

---

## 🌐 Deployment (Optional)

### Deploy to GitHub Pages

1. **Create Repository**:
   ```bash
   cd /home/sanjith/test
   git init
   git add .
   git commit -m "Initial commit"
   ```

2. **Push to GitHub**:
   ```bash
   git remote add origin https://github.com/yourusername/multiplayer-games.git
   git push -u origin main
   ```

3. **Enable GitHub Pages**:
   - Go to repository settings
   - Enable GitHub Pages
   - Select main branch
   - Your games will be at: `https://yourusername.github.io/multiplayer-games/`

### Deploy to Firebase Hosting

```bash
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy
```

---

## 📞 Support & Resources

### Useful Links
- **Firebase Console**: https://console.firebase.google.com
- **Firebase Documentation**: https://firebase.google.com/docs
- **Realtime Database Guide**: https://firebase.google.com/docs/database

### File Structure
```
/home/sanjith/test/
├── index.html             # Main menu / hub
├── lobby.html             # Online multiplayer lobby
├── connect4-multi.html    # Example multiplayer game
├── checkers-multi.html    # Example multiplayer game
└── lobby.js               # Lobby realtime logic
```

---

## 🔐 Security Best Practices

### For Production Use

1. **Enable Firebase Authentication**
   - Add user login
   - Secure player IDs with auth UIDs

2. **Update Database Rules**
   - Restrict write access to authenticated users
   - Validate data structure
   - Add rate limiting

3. **Environment Variables**
   - Move Firebase config to environment variables
   - Don't commit sensitive data to public repos

4. **Data Validation**
   - Validate player positions
   - Sanitize player names
   - Limit room sizes

---

## 📝 Notes

- All games use Firebase Realtime Database for multiplayer sync
- Room codes are case-insensitive but stored as uppercase
- Player IDs are generated client-side and unique per session
- Games don't require authentication (for simplicity)
- Server runs locally on port 8000
- No backend server needed - everything runs client-side with Firebase

---

**Last Updated**: January 14, 2026
**Version**: 1.0.0
**Author**: Created for multiplayer game development

---

## 🎮 Happy Gaming!

For questions or issues, check the troubleshooting section or test your database connection at:
`http://localhost:8000/index.html`
