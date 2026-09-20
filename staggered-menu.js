(function () {
    let isOpen = false;
    let isBusy = false;

    const wrapper = document.getElementById('staggered-menu');
    const panel = document.getElementById('staggered-menu-panel');
    const preLayersContainer = document.getElementById('sm-prelayers');
    const toggleBtn = document.getElementById('sm-toggle-btn');
    const textInner = document.getElementById('sm-text-inner');
    const icon = document.getElementById('sm-icon');
    const plusH = document.getElementById('sm-plus-h');
    const plusV = document.getElementById('sm-plus-v');

    if (!wrapper || !panel || !toggleBtn) return;

    const preLayers = Array.from(preLayersContainer.querySelectorAll('.sm-prelayer'));

    // Initialize GSAP initial positions
    gsap.set([panel, ...preLayers], { xPercent: 100 });
    gsap.set(plusH, { transformOrigin: '50% 50%', rotate: 0 });
    gsap.set(plusV, { transformOrigin: '50% 50%', rotate: 90 });
    gsap.set(icon, { rotate: 0, transformOrigin: '50% 50%' });

    function animateText(opening) {
        const seq = opening ? ['Menu', 'Close', 'Close'] : ['Close', 'Menu', 'Menu'];
        textInner.innerHTML = seq.map(l => `<span class="sm-toggle-line">${l}</span>`).join('');
        gsap.set(textInner, { yPercent: 0 });
        gsap.to(textInner, {
            yPercent: -((seq.length - 1) / seq.length) * 100,
            duration: 0.6,
            ease: 'power4.out'
        });
    }

    function playOpen() {
        if (isBusy) return;
        isBusy = true;
        wrapper.setAttribute('data-open', 'true');
        panel.setAttribute('aria-hidden', 'false');
        toggleBtn.setAttribute('aria-expanded', 'true');

        const itemEls = Array.from(panel.querySelectorAll('.sm-panel-itemLabel'));
        const numberEls = Array.from(panel.querySelectorAll('.sm-panel-list[data-numbering] .sm-panel-item'));
        const socialTitle = panel.querySelector('.sm-socials-title');
        const socialLinks = Array.from(panel.querySelectorAll('.sm-socials-link'));

        if (itemEls.length) gsap.set(itemEls, { yPercent: 140, rotate: 8 });
        if (numberEls.length) gsap.set(numberEls, { '--sm-num-opacity': 0 });
        if (socialTitle) gsap.set(socialTitle, { opacity: 0 });
        if (socialLinks.length) gsap.set(socialLinks, { y: 20, opacity: 0 });

        const tl = gsap.timeline({
            onComplete: () => {
                isBusy = false;
            }
        });

        // Stagger colored pre-layers
        preLayers.forEach((layer, i) => {
            tl.fromTo(layer, { xPercent: 100 }, { xPercent: 0, duration: 0.5, ease: 'power4.out' }, i * 0.08);
        });

        const panelStartTime = preLayers.length * 0.08;
        tl.fromTo(panel, { xPercent: 100 }, { xPercent: 0, duration: 0.65, ease: 'power4.out' }, panelStartTime);

        // Stagger menu items into view
        if (itemEls.length) {
            tl.to(itemEls, {
                yPercent: 0,
                rotate: 0,
                duration: 0.8,
                ease: 'power4.out',
                stagger: { each: 0.08 }
            }, panelStartTime + 0.15);

            if (numberEls.length) {
                tl.to(numberEls, {
                    duration: 0.5,
                    ease: 'power2.out',
                    '--sm-num-opacity': 1,
                    stagger: { each: 0.08 }
                }, panelStartTime + 0.25);
            }
        }

        if (socialTitle || socialLinks.length) {
            if (socialTitle) tl.to(socialTitle, { opacity: 1, duration: 0.4 }, panelStartTime + 0.4);
            if (socialLinks.length) {
                tl.to(socialLinks, {
                    y: 0,
                    opacity: 1,
                    duration: 0.4,
                    stagger: { each: 0.05 },
                    ease: 'power3.out'
                }, panelStartTime + 0.45);
            }
        }

        gsap.to(icon, { rotate: 225, duration: 0.7, ease: 'power4.out' });
        animateText(true);
    }

    function playClose() {
        isBusy = true;
        panel.setAttribute('aria-hidden', 'true');
        toggleBtn.setAttribute('aria-expanded', 'false');

        gsap.to([...preLayers, panel], {
            xPercent: 100,
            duration: 0.35,
            ease: 'power3.in',
            onComplete: () => {
                wrapper.removeAttribute('data-open');
                isBusy = false;
            }
        });

        gsap.to(icon, { rotate: 0, duration: 0.35, ease: 'power3.inOut' });
        animateText(false);
    }

    function toggle() {
        isOpen = !isOpen;
        if (isOpen) playOpen();
        else playClose();
    }

    toggleBtn.addEventListener('click', toggle);

    // Close on outside click
    document.addEventListener('mousedown', (e) => {
        if (!isOpen) return;
        if (!panel.contains(e.target) && !toggleBtn.contains(e.target)) {
            isOpen = false;
            playClose();
        }
    });

    window.StaggeredMenuController = {
        open: () => { if (!isOpen) { isOpen = true; playOpen(); } },
        close: () => { if (isOpen) { isOpen = false; playClose(); } },
        toggle: toggle
    };
})();