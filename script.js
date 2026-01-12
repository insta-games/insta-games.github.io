document.addEventListener('DOMContentLoaded', function () {
  // set year
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Section switching for Single Player / Local Multiplayer
  const navSingleplayer = document.getElementById('nav-singleplayer');
  const navLocalMultiplayer = document.getElementById('nav-local-multiplayer');
  const sectionSingleplayer = document.getElementById('section-singleplayer');
  const sectionLocalMultiplayer = document.getElementById('section-local-multiplayer');
  
  // Check if we're on the index page with sections or on a game page
  const isIndexPage = sectionSingleplayer && sectionLocalMultiplayer;
  
  if (navSingleplayer && navLocalMultiplayer) {
    // If on a game page (no sections), navigation links go to index.html
    if (!isIndexPage) {
      navSingleplayer.addEventListener('click', function (e) {
        e.preventDefault();
        window.location.href = 'index.html';
      });
      
      navLocalMultiplayer.addEventListener('click', function (e) {
        e.preventDefault();
        window.location.href = 'index.html#local-multiplayer';
      });
    }
    // If on index page with sections, use section switching
    else if (isIndexPage) {
    
    // Function to hide all sections
    function hideAllSections() {
      sectionSingleplayer.style.display = 'none';
      sectionLocalMultiplayer.style.display = 'none';
    }
    
    // Function to remove all active classes
    function removeAllActive() {
      navSingleplayer.classList.remove('active');
      navLocalMultiplayer.classList.remove('active');
    }
    
    // Check URL hash on page load
    function checkHash() {
      hideAllSections();
      removeAllActive();
      
      if (window.location.hash === '#local-multiplayer') {
        sectionLocalMultiplayer.style.display = 'block';
        navLocalMultiplayer.classList.add('active');
      } else {
        sectionSingleplayer.style.display = 'block';
        navSingleplayer.classList.add('active');
      }
    }
    
    // Check hash on page load
    checkHash();
    
    // Listen for hash changes
    window.addEventListener('hashchange', checkHash);
    
    navSingleplayer.addEventListener('click', function (e) {
      window.location.hash = '';
      hideAllSections();
      removeAllActive();
      sectionSingleplayer.style.display = 'block';
      navSingleplayer.classList.add('active');
      // close mobile nav
      const siteNav = document.getElementById('site-nav');
      if (window.innerWidth <= 640 && siteNav) siteNav.style.display = 'none';
    });

    navLocalMultiplayer.addEventListener('click', function (e) {
      window.location.hash = 'local-multiplayer';
      hideAllSections();
      removeAllActive();
      sectionLocalMultiplayer.style.display = 'block';
      navLocalMultiplayer.classList.add('active');
      // close mobile nav
      const siteNav = document.getElementById('site-nav');
      if (window.innerWidth <= 640 && siteNav) siteNav.style.display = 'none';
    });
    } // end isIndexPage
  } // end navigation check

  // mobile nav toggle
  const navToggle = document.getElementById('nav-toggle');
  const siteNav = document.getElementById('site-nav');
  if (navToggle && siteNav) {
    navToggle.addEventListener('click', function () {
      const isHidden = siteNav.style.display === '' || siteNav.style.display === 'none';
      siteNav.style.display = isHidden ? 'flex' : 'none';
      // make vertical on small screens
      if (window.innerWidth <= 640) siteNav.style.flexDirection = 'column';
    });
  }

  // smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href').slice(1);
      if (!targetId) return;
      const target = document.getElementById(targetId);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // close nav on mobile
        if (window.innerWidth <= 640 && siteNav) siteNav.style.display = 'none';
      }
    });
  });

  // contact form handler (demo only)
  const form = document.getElementById('contact-form');
  const status = document.getElementById('form-status');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      const name = form.name?.value || '';
      // simple validation
      if (!name || !form.email?.value || !form.message?.value) {
        if (status) {
          status.style.color = 'crimson';
          status.textContent = 'Please fill out all fields.';
        }
        return;
      }

      // simulate success
      if (status) {
        status.style.color = 'green';
        status.textContent = 'Thanks — your message was received (demo).';
      }
      form.reset();
    });
  }

  // global reset-scores handler: when a page's Reset button is clicked
  // also clear common score/status elements across the games so users
  // get a full reset (not only the board/game state).
  function resetCommonScores() {
    const setText = (id, txt) => {
      const el = document.getElementById(id);
      if (el) el.textContent = txt;
    };

    // Tic Tac Toe
    setText('score-x', '0');
    setText('score-o', '0');
    setText('score-draws', '0');

    // Pong
    setText('pong-score', 'You: 0 | AI: 0');

    // Snake
  // do not reset snake-score here; snake maintains high score in localStorage

    // Invaders
    setText('invaders-status', 'Score: 0 | Lives: 3 | Level: 1');

    // Breakout
    setText('breakout-score', 'Level: 1 | Score: 0 | Lives: 3');

    // Flappy
    setText('flappy-status', 'Score: 0 | High Score: 0');

    // Simon
    setText('simon-level', '0');
    setText('p1-score', '0');
    setText('p2-score', '0');

    // Whack-a-Mole
    setText('whack-score', '0');
    setText('whack-score2', '0');
    setText('whack-time', '30');

    // 2048
    setText('status-2048', 'Score: 0');

  // Memory Match - don't reset level here; memory level is persisted per-game
  setText('mem-moves', '0');

    // Minesweeper
    setText('mine-count', '10');
    setText('timer', '0');

    // Tetris
    setText('score', '0');
    setText('lines', '0');
    setText('level', '1');
  }

  document.addEventListener('click', function (e) {
    const target = e.target;
    if (!target) return;
    // Trigger when a Reset button (common id) or any element marked with
    // the `reset-scores` class is clicked.
    if (target.id === 'reset' || target.classList?.contains('reset-scores')) {
      try {
        resetCommonScores();
      } catch (err) {
        // swallow — non-critical
        console.error('resetCommonScores failed', err);
      }
    }
  });
});
