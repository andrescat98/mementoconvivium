    /* ── TUNING RITRATTO FULLSCREEN (desktop) ─────────────────────
       ZOOM_DEFAULT  zoom iniziale all'apertura (1 = dimensione piena)
       ZOOM_MIN/MAX  limiti della rotella
       ZOOM_STEP     incremento per scatto di rotella
       TILT_DEG      inclinazione max della card in gradi (± metà per lato)
       Dimensione "piena" della foto: vedi CSS .ev-photo-card img
       (max-width / max-height) e la media query touch più sotto. */
    const ZOOM_DEFAULT = 1.2;
    const ZOOM_MIN = 0.8;
    const ZOOM_MAX = 2;
    const ZOOM_STEP = 0.1;
    const TILT_DEG = 18;

    // Ritratto a schermo intero: apre il <dialog> nativo col src cliccato
    const photoDialogEl = document.getElementById("ev-photo-dialog");
    const photoDialog =
        photoDialogEl instanceof HTMLDialogElement ? photoDialogEl : null;
    const photoDialogImg = document.getElementById("ev-photo-dialog-img");
    const photoDialogName = document.getElementById("ev-photo-dialog-name");
    const photoCard = document.getElementById("ev-photo-card");

    const isDesktop = window.matchMedia(
        "(hover: hover) and (pointer: fine)",
    ).matches;

    // Su desktop la card parte al 50% e si zooma con la rotella; su touch resta full
    let zoom = 1;
    const applyZoom = () => {
        if (photoDialogImg instanceof HTMLImageElement) {
            // dimensione "piena" (zoom=1): tenere uguale a .ev-photo-card img nel CSS
            photoDialogImg.style.maxWidth = `calc(min(80vw, 480px) * ${zoom})`;
            photoDialogImg.style.maxHeight = `calc(72vh * ${zoom})`;
        }
    };

    document.addEventListener("click", (e) => {
        const avatar =
            e.target instanceof Element
                ? e.target.closest<HTMLElement>(".ev-char-avatar[data-portrait]")
                : null;
        if (avatar && photoDialog && photoDialogImg instanceof HTMLImageElement) {
            photoDialogImg.src = avatar.dataset.portrait ?? "";
            photoDialogImg.alt = avatar.dataset.name ?? "";
            if (photoDialogName) photoDialogName.textContent = avatar.dataset.name ?? "";
            if (isDesktop) {
                zoom = ZOOM_DEFAULT;
                applyZoom();
            }
            photoDialog.showModal();
        }
    });

    photoDialog?.addEventListener("click", (e) => {
        if (e.target === photoDialog) photoDialog.close();
    });
    photoDialog
        ?.querySelector(".ev-photo-close")
        ?.addEventListener("click", () => photoDialog.close());

    // Effetto card semi-3D: il mouse è tracciato su tutto lo schermo, non solo sulla card
    if (photoCard && photoDialog && isDesktop) {
        photoDialog.addEventListener("mousemove", (e) => {
            const x = e.clientX / window.innerWidth - 0.5;
            const y = e.clientY / window.innerHeight - 0.5;
            photoCard.style.transform = `perspective(900px) rotateY(${x * TILT_DEG}deg) rotateX(${-y * TILT_DEG}deg)`;
        });
        photoDialog.addEventListener("mouseleave", () => {
            photoCard.style.transform = "";
        });

        // Rotella: zoom della card con limiti
        photoDialog.addEventListener(
            "wheel",
            (e) => {
                e.preventDefault();
                zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom - Math.sign(e.deltaY) * ZOOM_STEP));
                applyZoom();
            },
            { passive: false },
        );
    }
