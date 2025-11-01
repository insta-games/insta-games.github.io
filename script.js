document.addEventListener('DOMContentLoaded', function () {
  // set year
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

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
});
