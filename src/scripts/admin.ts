// Logica di /admin (vanilla, nessun framework). Markup e <template> in src/pages/admin.astro.
import { actions, isInputError } from "astro:actions";
import { BASE_FONTS, BLOCK_TEXT, dateLabel, upgradeTab, googleFontsHref, imgStyle, look, md, nextDate, slugify, STATUS_TEXT, today, veil, type Img } from "../lib/format";
import type { Version } from "../lib/db";
import type { Bg, Evento } from "../lib/schema";

type Data = Record<string, any>;
const $ = <T extends Element = HTMLInputElement>(sel: string, root: ParentNode = document) => root.querySelector<T>(sel)!;
const $$ = <T extends Element = HTMLInputElement>(sel: string, root: ParentNode = document) => [...root.querySelectorAll<T>(sel)];
const clone = (id: string) => $<HTMLTemplateElement>(`#tpl-${id}`).content.firstElementChild!.cloneNode(true) as HTMLElement;
const form = document.querySelector<HTMLFormElement>("#editor");
const settingsForm = $<HTMLFormElement>("#settings");
const pagesView = $<HTMLElement>("#pages");
const pageForm = $<HTMLFormElement>("#page-ed");

if (form) {
    const init = JSON.parse($("#admin-data").textContent!) as { eventi: Evento[]; deleted: Version[]; settings: Data };
    const eventi = init.eventi;
    let deleted = init.deleted;
    let settings = init.settings; // impostazioni salvate; ogni vista salva le sue modifiche sopra queste
    let view: "editor" | "settings" | "pages" | "page" | "empty" = "empty";
    const oggi = today();
    let current: Evento | undefined; // evento salvato aperto nel form (undefined = nuovo)
    let versions: Version[] = [];
    let dirty = false;
    let msg = $<HTMLElement>(".msg", form);
    const slugEl = $("[name=slug]", form);

    // ── utilità
    const fmtTime = (s: number) =>
        new Date(s * 1000).toLocaleString("it-IT", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
    // cambiando vista le modifiche non salvate restano come bozza locale (vedi sotto): si può sempre uscire
    const discardOk = () => (flushDraft(), true);
    function say(text: string, err = false, ...acts: [string, () => void][]) {
        msg.textContent = text;
        msg.classList.toggle("err", err);
        for (const [t, fn] of acts) msg.append(" ", Object.assign(document.createElement("button"), { type: "button", textContent: t, onclick: fn }));
    }
    const savedAt = () => new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
    function setDirty(v: boolean) {
        dirty = v;
        const top = $("#save-top");
        top.classList.toggle("dirty", v);
        top.textContent = v ? "● Salva le modifiche" : "💾 Salva";
        document.title = (v ? "● " : "") + "Moderatori · Memento Convivium";
        if (v) queueLive(), keepDraft(), histSoon();
    }

    // ── bozze locali: ogni vista tiene nel browser le modifiche non salvate (evento, pagina, impostazioni, testi).
    // Chiudendo la pagina o cambiando vista non si perde niente; riaprendo, si sceglie se ripristinarle.
    const draftKey = () =>
        ({ editor: `mc_draft:ev:${current?.id ?? ""}`, page: `mc_draft:pg:${pageKey}`, settings: "mc_draft:settings", pages: "mc_draft:testi", empty: "" })[view];
    const snapshot = (): unknown =>
        ({ editor: () => collect(), page: () => collectPage(), settings: () => collectSettings(), pages: () => edits, empty: () => undefined })[view]();
    let draftTimer = 0;
    let draftOk = true; // false se il browser non lascia salvare (navigazione privata…): allora si avvisa chiudendo
    function writeDraft(key: string, data: unknown) {
        try {
            localStorage.setItem(key, JSON.stringify({ at: Date.now(), data }));
            draftOk = true;
        } catch {
            draftOk = false;
        }
    }
    function keepDraft() {
        clearTimeout(draftTimer);
        const key = draftKey();
        if (key) draftTimer = window.setTimeout(() => dirty && writeDraft(key, snapshot()), 500);
    }
    function flushDraft() {
        clearTimeout(draftTimer);
        const key = draftKey();
        if (dirty && key) writeDraft(key, snapshot());
    }
    const dropDraft = (key = draftKey()) => { try { if (key) localStorage.removeItem(key); } catch {} };
    // all'apertura di una vista: c'è una bozza diversa da quel che si vede? si propone di ripristinarla
    function offerDraft(apply: (d: any) => void) {
        const key = draftKey();
        let d: { at: number; data: unknown } | undefined;
        try { d = JSON.parse(localStorage.getItem(key) ?? "null") ?? undefined; } catch {}
        if (!d) return;
        if (JSON.stringify(d.data) === JSON.stringify(snapshot())) return dropDraft(key);
        say(
            `Hai modifiche non salvate del ${fmtTime(d.at / 1000)}.`, false,
            ["Ripristinale", () => { apply(d!.data); setDirty(true); say("Bozza ripristinata: controlla e premi Salva."); }],
            ["Scartale", () => { dropDraft(key); say(""); }],
        );
    }
    addEventListener("pagehide", flushDraft);
    addEventListener("beforeunload", (e) => {
        flushDraft();
        if (dirty && !draftOk) e.preventDefault();
    });

    // ── nome del moderatore (finisce nella cronologia), ricordato nel browser
    const who = $("#who");
    try { who.value = localStorage.getItem("mc_author") ?? ""; } catch {}
    who.addEventListener("change", () => { try { localStorage.setItem("mc_author", who.value.trim()); } catch {} });
    const author = () => who.value.trim() || undefined;

    // ── lista eventi (ordinata per prossima data) e cestino
    const list = $<HTMLUListElement>("#list");
    const search = $("#search");
    search.addEventListener("input", renderList);
    function renderList() {
        const q = search.value.trim().toLowerCase();
        const items = eventi
            .filter((e) => !q || `${e.data.title} ${e.id} ${e.data.theme}`.toLowerCase().includes(q))
            .sort((a, b) => (nextDate(a.data) ?? "9").localeCompare(nextDate(b.data) ?? "9") || a.data.title.localeCompare(b.data.title));
        list.replaceChildren(
            ...items.map((e) => {
                const li = clone("item");
                const a = $<HTMLAnchorElement>("a", li);
                a.href = `#${e.id}`;
                a.classList.toggle("on", e.id === current?.id && !form!.hidden);
                $(".t", li).textContent = e.data.title;
                const st = $<HTMLElement>(".st", li);
                st.textContent = STATUS_TEXT[e.data.status] ?? e.data.status;
                st.dataset.st = e.data.status;
                const next = nextDate(e.data);
                $(".nd", li).textContent = next ? `· ${dateLabel(next)}` : e.data.dates?.length ? "· date passate" : "";
                return li;
            }),
        );
        if (!items.length) list.innerHTML = `<li class="hint">Nessun evento trovato.</li>`;
    }
    function renderTrash() {
        const box = $<HTMLDetailsElement>("#trash");
        box.hidden = !deleted.length;
        $("span", box).textContent = String(deleted.length);
        $("ul", box).replaceChildren(
            ...deleted.map((v) => {
                const li = document.createElement("li");
                const b = Object.assign(document.createElement("button"), { type: "button", textContent: "Ripristina" });
                b.onclick = () =>
                    open(undefined, {
                        data: v.data,
                        slug: v.slug,
                        note: `Evento eliminato il ${fmtTime(v.savedAt)}${v.author ? " da " + v.author : ""}: premi Salva per ripristinarlo.`,
                    });
                li.append(Object.assign(document.createElement("span"), { textContent: v.data.title }), b);
                return li;
            }),
        );
    }

    // ── immagini: ridimensionate e convertite in webp nel browser, poi caricate su Turso
    const MAX_SIDE = 1600;
    // Compressione nel browser, come Squoosh: lato lungo ridotto e webp qualità 80
    async function shrink(file: File, max: number): Promise<Blob> {
        const bmp = await createImageBitmap(file);
        const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
        const c = new OffscreenCanvas(Math.round(bmp.width * k), Math.round(bmp.height * k));
        const ctx = c.getContext("2d")!;
        ctx.drawImage(bmp, 0, 0, c.width, c.height);
        let out = await c.convertToBlob({ type: "image/webp", quality: 0.8 });
        if (out.type !== "image/webp") {
            // Safari non codifica webp: codificatore di Squoosh (wasm), scaricato solo in questo caso
            try {
                const { default: encode } = await import("@jsquash/webp/encode.js");
                out = new Blob([await encode(ctx.getImageData(0, 0, c.width, c.height), { quality: 80 })], { type: "image/webp" });
            } catch {
                out = await c.convertToBlob({ type: "image/jpeg", quality: 0.82 });
            }
        }
        // già piccola e in webp: meglio l'originale che ricomprimerla
        return k === 1 && file.type === "image/webp" && file.size <= out.size ? file : out;
    }
    const kb = (n: number) => (n > 1e6 ? `${(n / 1e6).toFixed(1).replace(".", ",")} MB` : `${Math.round(n / 1e3)} KB`);
    async function upload(file: File | undefined, box: HTMLElement): Promise<string | undefined> {
        if (!file?.type.startsWith("image/")) return void say("Serve un file immagine (jpg, png, webp…).", true);
        box.classList.add("busy");
        say("Caricamento immagine…");
        try {
            // ritratti e foto accanto al testo non servono più grandi di così; copertine, sfondi e gallerie sì
            const blob = await shrink(file, box.dataset.shape === "circle" || box.dataset.shape === "tall" ? 1200 : MAX_SIDE);
            const fd = new FormData();
            fd.append("file", new File([blob], "img", { type: blob.type }));
            const { data, error } = await actions.uploadImage(fd);
            if (error) return void say(error.message, true);
            setDirty(true);
            say(`Immagine caricata e compressa: ${kb(file.size)} → ${kb(blob.size)}. Ricorda di salvare.`);
            return data.url;
        } catch {
            say("Non riesco a leggere questa immagine: prova con un jpg o png.", true);
        } finally {
            box.classList.remove("busy");
        }
    }

    // Casella immagine: anteprima già inquadrata, valore = JSON {src,x,y,zoom} in un input nascosto
    const getImg = (box: Element): Img | undefined => {
        const v = $(":scope > input[type=hidden]", box).value;
        return v ? JSON.parse(v) : undefined;
    };
    function setImg(box: HTMLElement, i?: Img) {
        $(":scope > input[type=hidden]", box).value = i ? JSON.stringify(i) : "";
        const thumb = $<HTMLElement>(":scope > .thumb", box);
        const img = $<HTMLImageElement>("img", thumb);
        if (i) {
            img.src = i.src;
            img.style.cssText = imgStyle(i, box.dataset.shape === "circle" ? 0 : 50);
        }
        thumb.hidden = $<HTMLElement>(".img-btns", box).hidden = !i;
        box.classList.toggle("has", !!i);
    }
    function initImg(box: HTMLElement, v?: Img | string) {
        box.append($<HTMLTemplateElement>("#tpl-img").content.cloneNode(true));
        $(":scope > input[type=hidden]", box).name = box.dataset.name!;
        $(":scope > .thumb", box).dataset.shape = box.dataset.shape;
        $(".img-label", box).textContent = box.dataset.label ?? "";
        setImg(box, typeof v === "string" ? { src: v } : v);
        const file = $(":scope > .file input", box);
        const put = async (f?: File) => {
            const url = await upload(f, box);
            if (url) setImg(box, { src: url });
        };
        file.onchange = () => { put(file.files?.[0]); file.value = ""; };
        box.ondragover = (e) => { e.preventDefault(); e.stopPropagation(); box.classList.add("drag"); };
        box.ondragleave = () => box.classList.remove("drag");
        box.ondrop = (e) => {
            e.preventDefault();
            e.stopPropagation();
            box.classList.remove("drag");
            put(e.dataTransfer?.files[0]);
        };
    }

    // ── dialog di inquadratura: punto focale (clic/trascina) + zoom, anteprima nella forma reale
    const cropDlg = $<HTMLDialogElement>("#crop");
    const cropSrc = $<HTMLElement>(".crop-src", cropDlg);
    const cropPrev = $<HTMLElement>(".crop-prev", cropDlg);
    const zoomEl = $("[name=zoom]", cropDlg);
    const cropView = $<HTMLElement>(".prev", cropDlg);
    let cropBox: HTMLElement | undefined;
    let crop: Img = { src: "" };
    function drawCrop() {
        const x = crop.x ?? 50, y = crop.y ?? (cropBox?.dataset.shape === "circle" ? 0 : 50);
        $<HTMLElement>(".crop-dot", cropDlg).style.cssText = `left:${x}%;top:${y}%`;
        $<HTMLImageElement>("img", cropPrev).style.cssText = imgStyle({ ...crop, x, y });
        zoomEl.value = String(crop.zoom ?? 1);
        $("output", cropDlg).textContent = `${Number(zoomEl.value).toFixed(2)}×`;
        // stessa inquadratura dal vivo sulle immagini delle anteprime vere (a destra e nel dialog)
        for (const f of $$<HTMLIFrameElement>(".prev iframe"))
            f.contentDocument?.querySelectorAll<HTMLImageElement>(`img[src="${CSS.escape(crop.src)}"]`).forEach((im) => (im.style.cssText = imgStyle({ ...crop, x, y })));
    }
    function openCrop(box: HTMLElement) {
        const i = getImg(box);
        if (!i) return;
        cropBox = box;
        crop = { ...i };
        $<HTMLImageElement>("img", cropSrc).src = $<HTMLImageElement>("img", cropPrev).src = i.src;
        cropPrev.dataset.shape = box.dataset.shape;
        // con l'anteprima dal vivo accanto: dialog ancorato a sinistra, si inquadra guardando la pagina vera a destra
        const docked = !live.hidden && matchMedia("(min-width: 900px)").matches && !box.closest("dialog");
        cropDlg.classList.toggle("docked", docked);
        cropView.hidden = docked || !("preview" in box.dataset);
        cropDlg.classList.toggle("with-prev", !cropView.hidden);
        drawCrop();
        if (docked) {
            cropDlg.show();
            scrollLive(liveDoc()?.querySelector(`img[src="${CSS.escape(i.src)}"]`), true);
        } else cropDlg.showModal();
        if (!cropView.hidden) renderPrev(cropView).then(drawCrop);
    }
    const pickFocus = (e: PointerEvent) => {
        const r = $("img", cropSrc).getBoundingClientRect();
        const pct = (v: number) => Math.round(Math.min(100, Math.max(0, v * 100)));
        crop.x = pct((e.clientX - r.left) / r.width);
        crop.y = pct((e.clientY - r.top) / r.height);
        drawCrop();
    };
    cropSrc.onpointerdown = (e) => { cropSrc.setPointerCapture(e.pointerId); pickFocus(e); };
    cropSrc.onpointermove = (e) => { if (cropSrc.hasPointerCapture(e.pointerId)) pickFocus(e); };
    zoomEl.oninput = () => { crop.zoom = Number(zoomEl.value); drawCrop(); };
    $<HTMLButtonElement>("[data-reset]", cropDlg).onclick = () => { crop = { src: crop.src }; drawCrop(); };
    $<HTMLButtonElement>("[data-ok]", cropDlg).onclick = () => {
        const { src, x, y, zoom } = crop;
        setImg(cropBox!, { src, ...(x !== undefined ? { x, y } : {}), ...(zoom && zoom > 1 ? { zoom } : {}) });
        setDirty(true);
        cropDlg.close();
    };
    cropDlg.addEventListener("close", () => queueLive(0)); // Annulla: l'anteprima torna all'inquadratura salvata

    // ── anteprima vera: /admin/anteprima renderizza intestazione, schede, blocchi e card coi componenti del sito.
    // L'iframe è largo almeno come una pagina (PREV_W) e viene rimpicciolito per stare nel riquadro.
    // .live (a destra di evento e pagine) ha altezza fissa e scorre dentro; le altre (inquadratura) sono alte quanto il contenuto.
    const PREV_W = 1200;
    async function renderPrev(wrap: HTMLElement, body: unknown = collect()) {
        const frame = $<HTMLIFrameElement>("iframe", wrap);
        const seq = String(Number(wrap.dataset.seq ?? 0) + 1);
        wrap.dataset.seq = seq;
        const res = await fetch("/admin/anteprima", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
        const html = res.ok ? await res.text() : "<p>Sessione scaduta: ricarica la pagina e rientra.</p>";
        if (wrap.dataset.seq !== seq) return; // nel frattempo è partita un'anteprima più recente
        if (wrap === liveWrap && typing()) return queueLive(800); // non si toglie il cursore a chi scrive nell'anteprima
        const doc = frame.contentDocument;
        if (doc?.querySelector("main")) {
            // già caricata: si sostituisce solo il contenuto, così non lampeggia e resta dov'era
            const n = new DOMParser().parseFromString(html, "text/html");
            for (const l of n.head.querySelectorAll("link"))
                if (!doc.head.querySelector(`link[href="${CSS.escape(l.getAttribute("href")!)}"]`)) doc.head.append(doc.adoptNode(l));
            doc.body.replaceWith(doc.adoptNode(n.body));
        } else await new Promise((r) => { frame.onload = r; frame.srcdoc = html; });
        fitPrev(wrap);
        frame.contentDocument?.fonts.ready.then(() => fitPrev(wrap));
    }
    function fitPrev(wrap: HTMLElement) {
        const frame = $<HTMLIFrameElement>("iframe", wrap);
        if (wrap.classList.contains("live")) {
            const w = wrap.classList.contains("phone") ? 390 : wrap.classList.contains("tablet") ? 820 : Math.max(PREV_W, wrap.clientWidth);
            const k = Math.min(1, wrap.clientWidth / w);
            frame.style.cssText = `width:${w}px;height:${wrap.clientHeight / k}px;transform:scale(${k})`;
            return;
        }
        const main = frame.contentDocument?.querySelector("main");
        if (!main) return;
        const k = Math.min(1, wrap.clientWidth / PREV_W);
        const h = main.getBoundingClientRect().height;
        frame.style.cssText = `height:${h}px;transform:scale(${k})`;
        wrap.style.height = `${h * k}px`;
    }
    addEventListener("resize", () => $$<HTMLElement>(".prev").forEach(fitPrev));

    // ── anteprima dal vivo a destra di evento e pagine, e selezione: clic su una parte dell'anteprima → a sinistra
    // restano solo le sue impostazioni (.sel sul blocco o scheda); aprire o scrivere in un blocco lo evidenzia a destra.
    const adminEl = $<HTMLElement>(".admin");
    const live = $<HTMLElement>("#live");
    const liveWrap = $<HTMLElement>(".prev", live);
    const liveFrame = $<HTMLIFrameElement>("iframe", liveWrap);
    const liveDoc = () => liveFrame.contentDocument;
    let liveTimer = 0;
    // si sta scrivendo dentro l'anteprima: si ridisegna solo quando si esce dal testo
    const typing = () =>
        (!!liveDoc()?.hasFocus() && !!liveDoc()?.activeElement?.closest("[data-field], [data-k], [data-nav]")) || ribbon.contains(document.activeElement);
    function queueLive(ms = 500) {
        clearTimeout(liveTimer);
        if (view === "editor" || view === "page")
            liveTimer = window.setTimeout(() => typing() ? queueLive(800) : renderPrev(liveWrap, view === "editor" ? collect() : { blocks: readBlocks($(".blocks-wrap", pageForm)), sfondo: readBg($(".bg[data-name=sfondo]", pageForm)) }).then(markSel), ms);
    }
    $("#live-size").onchange = (e) => {
        const v = (e.target as HTMLSelectElement).value;
        liveWrap.classList.toggle("phone", v === "phone");
        liveWrap.classList.toggle("tablet", v === "tablet");
        fitPrev(liveWrap);
    };
    // anteprima pulita: come il sito, senza strumenti né testi scrivibili (al ritorno si ridisegna da capo)
    let clean = false;
    function paintClean() {
        const body = liveDoc()?.body;
        if (!body) return;
        body.classList.toggle("clean", clean);
        if (clean) for (const el of body.querySelectorAll<HTMLElement>("[contenteditable]")) el.removeAttribute("contenteditable");
    }
    $("#live-clean").onchange = (e) => {
        clean = (e.target as HTMLInputElement).checked;
        if (clean) paintClean();
        else queueLive(0);
    };
    // porta un elemento dell'anteprima in vista (solo se è fuori dallo schermo)
    function scrollLive(el: Element | null | undefined, force = false) {
        const w = liveDoc()?.defaultView;
        if (!el || !w) return;
        const r = el.getBoundingClientRect();
        if (force || r.bottom < 0 || r.top > w.innerHeight) w.scrollTo({ top: r.top + w.scrollY - w.innerHeight / 4, behavior: "smooth" });
    }
    let selKey = ""; // parte evidenziata nell'anteprima (vedi data-ed in admin/anteprima.astro)
    let wantScroll = false;
    let liveTab = 0; // scheda dell'evento visibile nell'anteprima: segue la parte scelta
    function markSel() {
        const doc = liveDoc();
        if (!doc) return;
        decorate(doc);
        paintClean();
        placeTools(doc);
        // dopo un nuovo render la barra in alto resta sullo stesso testo
        if (textEd && !textEd.isConnected)
            setTextEd(doc.querySelector<HTMLElement>(`[data-field=bBody][data-key="${textEd.dataset.key}"]`) ?? undefined);
        const t = selKey.match(/^t(\d+)/);
        if (t) liveTab = Number(t[1]);
        const panels = doc.querySelectorAll(".ev-panel");
        if (liveTab >= panels.length) liveTab = 0;
        panels.forEach((p, i) => p.classList.toggle("on", i === liveTab));
        doc.querySelectorAll(".ev-tab").forEach((a, i) => a.setAttribute("aria-selected", String(i === liveTab)));
        doc.querySelectorAll("[data-ed].sel").forEach((e) => e.classList.remove("sel"));
        const el = selKey ? doc.querySelector(`[data-ed="${selKey}"]`) : null;
        el?.classList.add("sel");
        if (el && wantScroll) {
            wantScroll = false;
            scrollLive(el.firstElementChild);
        }
    }
    function hl(key: string, scroll = true) {
        selKey = key;
        wantScroll = scroll;
        markSel();
    }
    // form ⇄ chiave dell'anteprima: "hero", "cards", "t0", "t0.2" (evento), "2" (pagina)
    const idx = (x: Element) => [...x.parentElement!.children].indexOf(x);
    function keyOf(el: HTMLElement) {
        if (el.dataset.ed) return el.dataset.ed;
        if (view === "page") return String(idx(el));
        const tab = el.closest(".tab-ed")!;
        return el === tab ? `t${idx(tab)}` : `t${idx(tab)}.${idx(el)}`;
    }
    function edEl(key: string): HTMLElement | undefined {
        if (view === "page") return $$<HTMLElement>(".blocks > .block-ed", pageForm)[Number(key)];
        const m = key.match(/^t(\d+)(?:\.(\d+))?$/);
        if (!m) return form!.querySelector<HTMLElement>(`[data-ed="${key}"]`) ?? undefined;
        const tab = $$<HTMLElement>("#tabs > .tab-ed", form!)[Number(m[1])];
        return m[2] === undefined ? tab : tab && $$<HTMLElement>(":scope > .grid > .blocks-wrap > .blocks > .block-ed", tab)[Number(m[2])];
    }
    const unfocus = () => $$(".sel", adminEl).forEach((x) => x.classList.remove("sel"));
    function pick(key: string) {
        const el = edEl(key);
        hl(key, false);
        if (!el) return;
        unfocus();
        // a sinistra resta solo lui (admin.css); intestazione e card: tutte le sezioni del form che le riguardano
        const sel = el.matches(".block-ed, .tab-ed") ? [el] : $$<HTMLElement>(`[data-ed="${key}"]`, form!);
        for (const x of sel) {
            x.classList.add("sel");
            for (let d: HTMLElement | null = x; d; d = d.parentElement?.closest("details") ?? null) (d as HTMLDetailsElement).open = true;
        }
        el.scrollIntoView({ block: "start" });
    }
    // "＋" dell'anteprima: nuova scheda, o blocco del tipo scelto in quel punto (data-where/data-at, vedi anteprima.astro)
    function addFromLive(b: HTMLElement) {
        let el: HTMLElement;
        if (b.dataset.add === "tab") {
            el = addTab(structuredClone(PRESETS.testo), true);
        } else {
            const ins = b.closest<HTMLElement>(".ed-ins")!;
            const where = ins.dataset.where!;
            const tab = where && $$<HTMLElement>("#tabs > .tab-ed", form!)[Number(where.slice(1))];
            const list = tab ? $(":scope > .grid > .blocks-wrap > .blocks", tab) : $(".blocks", pageForm);
            el = newBlock(list, b.dataset.add!, list.children[Number(ins.dataset.at)]);
        }
        setDirty(true);
        pick(keyOf(el));
        el.querySelector<HTMLInputElement>("[name=tabTitle], [name=bTitle], [name=key]")?.select();
    }
    // ── modifica diretta nell'anteprima (come in un editor di testo): titoli e testi si scrivono lì,
    // le foto si trascinano o si incollano nel punto voluto; angolo dei blocchi: sposta, duplica, nascondi, togli, aggiungi;
    // bordo inferiore delle sezioni: si trascina per l'altezza. Ogni modifica finisce nei campi (nascosti) del form a sinistra.
    const PAL_ACTS: [string, string, string][] = [["up", "↑", "Sposta su"], ["down", "↓", "Sposta giù"], ["dup", "⧉", "Duplica"], ["hide", "👁", "Nascondi"], ["rm", "✕", "Rimuovi"]];
    function decorate(doc: Document) {
        if (!doc.body || doc.body.dataset.dec) return;
        doc.body.dataset.dec = "1";
        const ed = (el: HTMLElement | null, field: string, key: string, rich = false, ph = "") => {
            if (!el) return;
            Object.assign(el.dataset, { field, key, ph });
            el.contentEditable = rich ? "true" : "plaintext-only";
            if (rich && !el.textContent!.trim() && !el.querySelector("img")) el.replaceChildren(); // :empty → segnaposto
        };
        const grip = (root: Element | null, key: string) =>
            root?.insertAdjacentHTML("beforeend", `<div class="ed-grip" data-grip="${key}" contenteditable="false" title="Trascina per cambiare l'altezza"></div>`);
        for (const w of doc.querySelectorAll<HTMLElement>("div[data-ed]")) {
            const key = w.dataset.ed!;
            if (key === "cards") continue;
            if (key === "hero") {
                ed(w.querySelector(".ev-title"), "title", key, false, "Titolo");
                ed(w.querySelector(".section-label"), "theme", key, false, "Tema");
                ed(w.querySelector(".ev-excerpt"), "excerpt", key, false, "Estratto");
                grip(w.firstElementChild, key);
                continue;
            }
            if (/^t\d+$/.test(key)) {
                ed(w.querySelector(".ev-panel-title"), "tabTitle", key, false, "Titolo della scheda");
                grip(w.closest(".ev-panel"), key);
                continue;
            }
            ed(w.querySelector(".blocco-head :is(h2, h3)"), "bTitle", key, false, "Titolo (facoltativo)");
            ed(w.querySelector(":is(.ev-panel-grid, .ev-panel-text, .blocco-cta) > .ev-prose, .ev-panel-intro"), "bBody", key, true, "Scrivi qui… (trascina o incolla le foto dove vuoi)");
            const root = w.firstElementChild as HTMLElement | null;
            if (!root) continue;
            if (doc.defaultView!.getComputedStyle(root).position === "static") root.style.position = "relative";
            const [, where = "", at] = key.match(/^(?:(t\d+)\.)?(\d+)$/)!;
            const pal = doc.querySelector(`.ed-ins[data-where="${where}"] .ed-pal`)?.outerHTML ?? "";
            root.insertAdjacentHTML(
                "beforeend",
                `<div class="ed-tools" contenteditable="false">${PAL_ACTS.map(([a, t, h]) => `<button type="button" data-act="${a}" title="${h}">${t}</button>`).join("")}` +
                    `<span class="ed-ins" data-where="${where}" data-at="${Number(at) + 1}"><span class="ed-plus" title="Aggiungi un blocco sotto">＋</span>${pal}</span></div>`,
            );
            if (!root.matches(".blocco-sezione, [data-sez]")) grip(root, key);
        }
        // testi del sito (Partecipa, footer, sezioni fisse) e stile delle sezioni fisse: come in "Testi e stili delle pagine"
        const cur = { ...settings, ...edits };
        for (const el of doc.querySelectorAll<HTMLElement>("[data-k]")) {
            if (cur[el.dataset.k!] !== undefined) el.textContent = cur[el.dataset.k!];
            el.contentEditable = "plaintext-only";
        }
        for (const el of doc.querySelectorAll<HTMLElement>("[data-sez]")) {
            if (edits.sezioni) paintSez(el, sezioni()[el.dataset.sez!]);
            const solo = view === "editor" && el.dataset.sez === "prenota" ? `<button type="button" data-noprenota>Nascondi in questo evento</button>` : "";
            el.insertAdjacentHTML("beforeend", `<div class="ed-tools" contenteditable="false"><button type="button" data-sezstyle>🎨 Stile della sezione</button>${solo}</div>`);
        }
        // voci del menu: il testo si scrive qui; aggiungerle, toglierle e i link in Impostazioni sito
        const nav: Data[] = edits.nav ?? settings.nav;
        doc.querySelectorAll<HTMLElement>(".site-header .nav a").forEach((a, i) => {
            if (nav[i]) a.textContent = nav[i].label;
            a.dataset.nav = String(i);
            a.contentEditable = "plaintext-only";
        });
        for (const el of doc.querySelectorAll<HTMLElement>(".site-header, .site-footer")) {
            if (doc.defaultView!.getComputedStyle(el).position === "static") el.style.position = "relative";
            el.insertAdjacentHTML("beforeend", `<div class="ed-tools" contenteditable="false"><button type="button" data-goto="#impostazioni">⚙ Menu, contatti e link del sito</button></div>`);
        }
    }
    // campo del form che corrisponde a un testo modificabile dell'anteprima
    const fieldFor = (el: HTMLElement) =>
        el.dataset.key === "hero"
            ? form!.querySelector<HTMLInputElement>(`fieldset > label > [name=${el.dataset.field}]`)
            : edEl(el.dataset.key!)?.querySelector<HTMLInputElement>(`[name=${el.dataset.field}]`);
    // testo dell'anteprima → markdown di md(): paragrafi, sottosezioni, elenchi, citazioni, linee, testo in linea, foto del sito
    function htmlToMd(root: Element) {
        const wrap = (m: string, s: string) => (s.trim() ? s.replace(s.trim(), m + s.trim() + m) : s);
        const one = (s: string) => s.replace(/\s*\n\s*/g, " ").trim(); // titoli e voci di elenco: una riga
        const inl = (n: Node): string => {
            if (n.nodeType === Node.TEXT_NODE) return n.textContent!.replace(/\u00a0/g, " ");
            if (n.nodeType !== Node.ELEMENT_NODE) return "";
            const e = n as Element;
            const t = e.tagName;
            const k = [...e.childNodes].map(inl).join("");
            const src = e.getAttribute("src") ?? "";
            return t === "BR" ? "\n"
                : t === "HR" ? "\n\n---\n\n"
                : /^(B|STRONG)$/.test(t) ? wrap("**", k)
                : /^(I|EM)$/.test(t) ? wrap("*", k)
                : t === "U" ? wrap("__", k)
                : /^(S|STRIKE|DEL)$/.test(t) ? wrap("~~", k)
                : t === "A" ? `[${k}](${e.getAttribute("href")})`
                : t === "IMG" ? (src.startsWith("/") ? `![${e.getAttribute("alt") ?? ""}](${src})` : "") // le foto ancora in caricamento no
                : /^H[1-3]$/.test(t) ? `\n\n## ${one(k)}\n\n`
                : /^H[4-6]$/.test(t) ? `\n\n### ${one(k)}\n\n`
                : /^(UL|OL)$/.test(t) ? `\n\n${[...e.children].map((li, i) => `${t === "OL" ? `${i + 1}.` : "-"} ${one(inl(li).replace(/^\n+|\n+$/g, ""))}`).join("\n")}\n\n`
                : t === "BLOCKQUOTE" ? `\n\n${one(k) && k.trim().split(/\n+/).map((l) => `> ${l.trim()}`).join("\n")}\n\n`
                : /^(P|DIV|LI|H\d)$/.test(t) ? `\n\n${k}\n\n`
                : k;
        };
        return inl(root).replace(/[ \t]+\n/g, "\n").replace(/\n[ \t]+/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
    }
    function sync(el: HTMLElement) {
        const f = fieldFor(el);
        if (!f) return;
        f.value = el.dataset.field === "bBody" ? htmlToMd(el) : el.textContent!.replace(/\s+/g, " ").trim();
        f.dispatchEvent(new Event("input", { bubbles: true })); // come se si scrivesse nel form: sporco, bozza, nomi
    }
    // foto nel testo: compaiono subito dove sono state lasciate, poi si caricano
    async function insertImgs(el: HTMLElement, range: Range | null | undefined, files: File[]) {
        const doc = el.ownerDocument;
        if (!range || !el.contains(range.startContainer)) {
            range = doc.createRange();
            range.selectNodeContents(el);
            range.collapse(false);
        }
        for (const f of files) {
            const im = Object.assign(doc.createElement("img"), { src: URL.createObjectURL(f), alt: "", className: "ed-up" });
            range.insertNode(im);
            range.setStartAfter(im);
            range.collapse(true);
            const url = await upload(f, document.createElement("div"));
            URL.revokeObjectURL(im.src);
            if (url) {
                im.src = url;
                im.removeAttribute("class");
            } else im.remove();
        }
        sync(el);
    }
    // foto lasciate fuori da un testo: copertina (intestazione), galleria (si aggiungono), immagine del blocco testo
    async function dropOn(key: string | undefined, files: File[]) {
        const el = key ? edEl(key) : undefined;
        const box =
            key === "hero" ? $<HTMLElement>(".img[data-name=cover]", form!)
            : el?.dataset.type === "testo" ? $<HTMLElement>(".img[data-name=bImage]", el)
            : undefined;
        if (box) {
            const url = await upload(files[0], box);
            if (url) setImg(box, { src: url });
        } else if (el?.dataset.type === "galleria") {
            for (const f of files) {
                const url = await upload(f, el);
                if (url) addRow("shot", $(".shots", el), { image: { src: url } });
            }
            markBlock(el);
        } else return say("Lascia la foto dentro un testo, una galleria o l'intestazione.", true);
        setDirty(true);
    }
    const caretAt = (doc: Document, x: number, y: number): Range | null => {
        const p = (doc as any).caretPositionFromPoint?.(x, y);
        if (!p) return doc.caretRangeFromPoint?.(x, y) ?? null;
        const r = doc.createRange();
        r.setStart(p.offsetNode, p.offset);
        return r;
    };
    const images = (l?: FileList | null) => [...(l ?? [])].filter((f) => f.type.startsWith("image/"));
    // altezza trascinata dal bordo inferiore → "Altezza minima" dello stile di quella parte
    const bgOf = (key: string) =>
        key === "hero" ? $<HTMLElement>(".bg[data-name=heroStyle]", form!)
        : /^t\d+$/.test(key) ? edEl(key)?.querySelector<HTMLElement>(":scope > .grid > .bg-wrap > .bg")
        : edEl(key)?.querySelector<HTMLElement>(".bg");
    // ponytail: execCommand è deprecato ma è l'unico modo nativo (con annulla/ripeti) di formattare un contenteditable; se sparisce, serve un editor (es. Tiptap)
    // comandi d'angolo: seguono lo schermo, visibili sotto l'header e dentro il loro blocco
    function placeTools(doc: Document) {
        const head = doc.querySelector(".site-header")?.getBoundingClientRect().bottom ?? 0;
        for (const t of doc.querySelectorAll<HTMLElement>(".ed-tools")) {
            const p = t.parentElement!;
            if (p.matches(".site-header, .site-footer, [data-sez]")) continue;
            const r = p.getBoundingClientRect();
            t.style.top = `${Math.max(8, Math.min(head + 8 - r.top, r.height - 50))}px`;
        }
    }
    function wireLive(doc: Document) {
        doc.addEventListener("click", (e) => {
            const t = e.target as Element;
            if (!t.closest("summary")) e.preventDefault(); // niente link; le FAQ si aprono
            if (clean) return; // anteprima pulita: solo da guardare
            if (brushOn) {
                const target = t.closest<HTMLElement>("[data-sez]") ?? t.closest<HTMLElement>("[data-ed]");
                if (target) {
                    e.stopPropagation();
                    return pasteStyle(target);
                }
            }
            const sez = t.closest<HTMLElement>("[data-sezstyle]");
            if (sez) return openSez(sez.closest<HTMLElement>("[data-sez]")!);
            if (t.closest("[data-noprenota]")) {
                $("[name=noPrenota]", form!).checked = true;
                return setDirty(true);
            }
            const go = t.closest<HTMLElement>("[data-goto]");
            if (go) return void (location.hash = go.dataset.goto!);
            const act = t.closest<HTMLElement>("[data-act]");
            const add = t.closest<HTMLElement>("[data-add]");
            if (act) {
                const el = edEl(act.closest<HTMLElement>("div[data-ed]")!.dataset.ed!);
                el?.querySelector<HTMLButtonElement>(`:scope > summary [data-${act.dataset.act}]`)?.click();
                const now = act.dataset.act === "dup" ? el?.nextElementSibling : el;
                if (now?.isConnected) pick(keyOf(now as HTMLElement));
                else unfocus();
                return;
            }
            if (add) return addFromLive(add);
            const k = t.closest<HTMLElement>("[data-ed]")?.dataset.ed;
            if (k) pick(k);
        }, true);
        doc.addEventListener("input", (e) => {
            const el = (e.target as Element).closest?.<HTMLElement>("[data-field]");
            if (el) sync(el);
            const n = (e.target as Element).closest?.<HTMLElement>("[data-nav]");
            if (n) {
                edits.nav = (edits.nav ?? settings.nav).map((l: Data, i: number) => (i === Number(n.dataset.nav) ? { ...l, label: n.textContent!.trim() || l.label } : l));
                setDirty(true);
            }
            const k = (e.target as Element).closest?.<HTMLElement>("[data-k]");
            if (k) {
                edits[k.dataset.k!] = k.textContent!.trim() || undefined; // si salva con l'evento o la pagina
                setDirty(true);
            }
        });
        doc.addEventListener("keydown", (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "s") {
                e.preventDefault();
                dispatchEvent(new KeyboardEvent("keydown", { key: "s", ctrlKey: true }));
            }
            histKey(e);
            if (e.key === "Escape") brushOff();
            const el = (e.target as Element).closest?.<HTMLElement>("[data-field], [data-nav]");
            if (e.key === "Enter" && el && el.dataset.field !== "bBody") {
                e.preventDefault();
                el.blur();
            }
        });
        // la barra in alto lavora sull'ultimo testo cliccato e sulla sua selezione
        doc.addEventListener("focusin", (e) => {
            const el = (e.target as Element).closest?.<HTMLElement>("[data-field=bBody]");
            if (el) setTextEd(el);
        });
        doc.addEventListener("selectionchange", () => {
            const s = doc.getSelection();
            if (s?.rangeCount && textEd?.contains(s.anchorNode)) textRange = s.getRangeAt(0).cloneRange();
        });
        doc.addEventListener("scroll", () => placeTools(doc), { passive: true });
        doc.addEventListener("input", () => placeTools(doc));
        doc.addEventListener("paste", (e) => {
            const el = (e.target as Element).closest?.<HTMLElement>("[data-field], [data-k], [data-nav]");
            if (!el) return;
            e.preventDefault();
            const files = images(e.clipboardData?.files);
            if (files.length && el.dataset.field === "bBody") return insertImgs(el, doc.getSelection()?.rangeCount ? doc.getSelection()!.getRangeAt(0) : null, files);
            doc.execCommand("insertText", false, e.clipboardData?.getData("text/plain") ?? ""); // niente formattazione copiata da Word
        });
        doc.addEventListener("dragover", (e) => {
            if (e.dataTransfer?.types.includes("Files")) e.preventDefault();
        });
        doc.addEventListener("drop", (e) => {
            const files = images(e.dataTransfer?.files);
            if (!files.length) return;
            e.preventDefault();
            const t = e.target as Element;
            const el = t.closest<HTMLElement>("[data-field=bBody]");
            if (el) insertImgs(el, caretAt(doc, e.clientX, e.clientY), files);
            else dropOn(t.closest<HTMLElement>("div[data-ed]")?.dataset.ed ?? t.closest(".ev-panel")?.querySelector<HTMLElement>("div[data-ed]")?.dataset.ed, files);
        });
        // altezza: si trascina la maniglia, la sezione cresce dal vivo; al rilascio va nello stile
        doc.addEventListener("pointerdown", (e) => {
            const g = (e.target as Element).closest<HTMLElement>("[data-grip]");
            if (!g) return;
            e.preventDefault();
            const sec = g.parentElement!;
            const win = doc.defaultView!;
            const top = sec.getBoundingClientRect().top;
            let h = 0;
            g.setPointerCapture(e.pointerId);
            g.onpointermove = (m) => {
                h = Math.min(100, Math.max(10, Math.round(((m.clientY - top) / win.innerHeight) * 20) * 5));
                sec.style.minHeight = `${h}svh`;
                g.dataset.h = `${h}% dello schermo`;
            };
            g.onpointerup = () => {
                g.onpointermove = g.onpointerup = null;
                const box = bgOf(g.dataset.grip!);
                const r = box?.querySelector<HTMLInputElement>("[name=height]");
                if (!r || !h) return;
                r.value = String(h);
                r.dispatchEvent(new Event("input", { bubbles: true }));
            };
        });
    }
    // ── barra di formattazione in alto (come in Word): stile del paragrafo e testo in linea sul testo scelto,
    // carattere, grandezze, colore, allineamento e interlinea sullo stile del suo blocco
    const ribbon = $<HTMLElement>("#ribbon");
    let textEd: HTMLElement | undefined; // ultimo testo cliccato nell'anteprima
    let textRange: Range | undefined;
    function setTextEd(el?: HTMLElement) {
        textEd = el;
        textRange = undefined;
        ribbon.classList.toggle("on", !!el);
    }
    // torna nel testo con la sua selezione (cliccando la barra il fuoco esce dall'anteprima)
    function backToText() {
        if (!textEd?.isConnected) return say("Clicca prima in un testo dell'anteprima.", true), false;
        liveFrame.contentWindow!.focus();
        textEd.focus();
        if (textRange) {
            const s = liveDoc()!.getSelection()!;
            s.removeAllRanges();
            s.addRange(textRange);
        }
        return true;
    }
    function textStyle(name: string, value: string) {
        const box = bgOf(textEd!.dataset.key!);
        const el = box?.querySelector<HTMLInputElement>(`[name=${name}]`);
        if (!box || !el) return;
        if (name === "textColor") $("[name=textOn]", box).checked = true;
        el.value = value === "0" ? "" : value;
        el.dispatchEvent(new Event("input", { bubbles: true })); // → editInput → livePaint
    }
    ribbon.addEventListener("mousedown", (e) => {
        if ((e.target as Element).closest("button")) e.preventDefault(); // la selezione resta nel testo
    });
    ribbon.addEventListener("click", (e) => {
        const cmd = (e.target as Element).closest<HTMLElement>("[data-cmd]")?.dataset.cmd;
        if (!cmd || !backToText()) return;
        const doc = liveDoc()!;
        if (cmd === "font") return openFonts(bgOf(textEd!.dataset.key!)!.querySelector<HTMLInputElement>("[name=font]")!);
        if (cmd.startsWith("align:")) return textStyle("align", cmd.slice(6));
        if (cmd === "img") {
            const range = textRange;
            const inp = Object.assign(document.createElement("input"), { type: "file", accept: "image/*", multiple: true });
            inp.onchange = () => textEd && insertImgs(textEd, range, images(inp.files));
            return inp.click();
        }
        if (cmd === "link") {
            const url = prompt("Indirizzo del link (https://…)", "https://");
            if (!url || !/^https?:\/\/\S+$/.test(url) || !backToText()) return;
            doc.execCommand("createLink", false, url);
        } else if (cmd === "clean") {
            doc.execCommand("removeFormat");
            doc.execCommand("unlink");
        } else doc.execCommand(cmd);
        sync(textEd!);
    });
    ribbon.addEventListener("change", (e) => {
        const t = e.target as HTMLInputElement;
        const v = t.value;
        if (t.tagName === "SELECT") t.value = ""; // menu d'azione: torna all'etichetta
        if (!v || !backToText()) return;
        if (t.name === "block") {
            liveDoc()!.execCommand("formatBlock", false, v);
            sync(textEd!);
        } else textStyle(t.name, v);
    });

    // ── pennello (come in Word): copia lo stile del blocco scelto e lo incolla in un altro blocco o sezione fissa
    let styleClip: Data | undefined;
    let brushOn = false;
    const brushBtn = $<HTMLButtonElement>("#brush");
    const pasteBtn = $<HTMLButtonElement>("#brush-paste");
    function brushOff() {
        brushOn = false;
        brushBtn.classList.remove("on");
        brushBtn.textContent = "🖌 Copia stile";
        liveDoc()?.body?.style.removeProperty("cursor");
    }
    brushBtn.onclick = () => {
        if (brushOn) return brushOff();
        const box = selKey ? bgOf(selKey) : undefined;
        if (!box) return say("Scegli prima un blocco nell'anteprima: ne copio lo stile.", true);
        styleClip = structuredClone(readBg(box) ?? {});
        pasteBtn.disabled = false;
        brushOn = true;
        brushBtn.classList.add("on");
        brushBtn.textContent = "🖌 Clicca un blocco… (Esc)";
        liveDoc()?.body?.style.setProperty("cursor", "copy");
    };
    function pasteStyle(target: HTMLElement) {
        if (!styleClip) return;
        const sez = target.dataset.sez;
        if (sez) {
            edits.sezioni = { ...sezioni(), [sez]: styleClip };
            for (const el of target.ownerDocument.querySelectorAll<HTMLElement>(`[data-sez="${sez}"]`)) paintSez(el, styleClip, true);
        } else {
            const box = bgOf(target.dataset.ed!);
            if (!box) return say("Questa parte non ha uno stile.", true);
            initBg(box, styleClip);
            const blk = box.closest<HTMLElement>(".block-ed");
            if (blk) livePaint(blk);
        }
        setDirty(true);
        brushOff();
    }
    pasteBtn.onclick = () => {
        const el = selKey && liveDoc()?.querySelector<HTMLElement>(`div[data-ed="${selKey}"], a[data-ed="${selKey}"]`);
        if (el) pasteStyle(el);
        else say("Scegli prima il blocco in cui incollare lo stile.", true);
    };

    liveFrame.addEventListener("load", () => {
        const doc = liveDoc();
        if (doc) wireLive(doc);
        markSel();
    });
    for (const f of [form, pageForm]) {
        const follow = (t: EventTarget | null) => {
            const el = (t as Element).closest<HTMLElement>(".block-ed, .tab-ed, [data-ed]");
            if (el) hl(keyOf(el));
        };
        f.addEventListener("focusin", (e) => follow(e.target));
        // solo i blocchi: aprire schede e sezioni (anche da pick()) non sposta l'evidenziazione
        f.addEventListener("toggle", (e) => (e.target as HTMLDetailsElement).matches(".block-ed[open]") && follow(e.target), true);
    }
    for (const b of $$<HTMLButtonElement>("[data-unfocus]")) {
        b.onclick = () => {
            const el = adminEl.querySelector(".sel");
            unfocus();
            el?.scrollIntoView({ block: "start" });
        };
    }
    $<HTMLButtonElement>("#menu").onclick = () => adminEl.classList.toggle("nav-open");

    // ── stile di una sezione (riquadro .bg): sfondo, testo, titoli, spaziatura, animazione, effetto, stili salvati
    function initBg(box: HTMLElement, b: Data = {}) {
        box.replaceChildren($<HTMLTemplateElement>("#tpl-bg").content.cloneNode(true));
        $(".bg-label", box).textContent = box.dataset.label ?? "";
        $("[name=bgOn]", box).checked = !!b.color;
        if (b.color) $("[name=bgColor]", box).value = b.color;
        $("[name=textOn]", box).checked = !!b.text;
        if (b.text) $("[name=textColor]", box).value = b.text;
        $("[name=bgVeil]", box).value = String(b.veil ?? 0);
        $("[name=height]", box).value = String(b.height ?? 0);
        $("[name=op]", box).value = String(b.op ?? 100);
        for (const r of $$("input[type=range]", box)) showRange(r);
        $("[name=dark]", box).checked = !!b.dark;
        $("[name=parallax]", box).checked = !!b.parallax;
        for (const k of ["font", "size", "pad", "vpos", "align", "w", "lh", "fs", "anim", "fx"]) $(`[name=${k}]`, box).value = String(b[k] ?? "");
        $("[name=preset]", box).append(...(settings.stili ?? []).map((s: Data) => new Option(s.name, s.name)));
        initImg($<HTMLElement>(".img", box), b.image);
    }
    // valore accanto ai cursori: velo in %, altezza in % dello schermo, larghezza immagine in % (0 = automatica)
    const showRange = (r: HTMLInputElement) =>
        (r.previousElementSibling!.textContent =
            r.name === "bgVeil" || r.name === "op" ? `${r.value}%` : r.value === "0" ? "automatica" : `${r.value}%${r.name === "height" ? " dello schermo" : ""}`);
    function readBg(box: Element) {
        const v = (k: string) => $(`[name=${k}]`, box).value.trim() || undefined;
        const on = (k: string) => $(`[name=${k}]`, box).checked || undefined;
        const b = {
            color: on("bgOn") && v("bgColor"), image: getImg($(".img", box)),
            veil: Number(v("bgVeil")) || undefined, op: v("op") === "100" ? undefined : Number(v("op")), dark: on("dark"), parallax: on("parallax"),
            text: on("textOn") && v("textColor"), font: v("font"), size: v("size") && Number(v("size")),
            pad: v("pad"), height: Number(v("height")) || undefined, vpos: v("vpos"),
            align: v("align"), w: v("w"), lh: v("lh") && Number(v("lh")), fs: v("fs") && Number(v("fs")),
            anim: v("anim"), fx: v("fx"),
        };
        return Object.values(b).some(Boolean) ? b : undefined;
    }
    // eventi del riquadro stile, sia nell'editor evento sia nel dialog delle sezioni
    function bgInput(t: HTMLInputElement) {
        if (t.type === "range") showRange(t);
        const box = t.closest<HTMLElement>(".bg");
        if (!box) return;
        if (t.name === "bgColor") $("[name=bgOn]", box).checked = true;
        if (t.name === "textColor") $("[name=textOn]", box).checked = true;
        if (t.name === "preset" && t.value) initBg(box, settings.stili.find((s: Data) => s.name === t.value)?.style);
    }
    async function bgClick(b: HTMLElement) {
        const box = b.closest<HTMLElement>(".bg");
        if (!box) return false;
        if ("font" in b.dataset) openFonts($("[name=font]", box));
        else if ("styleSave" in b.dataset || "styleDel" in b.dataset) {
            const pick = $("[name=preset]", box).value;
            const style = readBg(box);
            const name = "styleSave" in b.dataset ? prompt("Nome dello stile (uno uguale viene sostituito):", pick)?.trim().slice(0, 40) : pick;
            if (!name || ("styleSave" in b.dataset && !style)) return true;
            if ("styleDel" in b.dataset && !confirm(`Eliminare lo stile "${name}"?`)) return true;
            const stili = [...settings.stili.filter((s: Data) => s.name !== name), ...("styleSave" in b.dataset ? [{ name, style }] : [])];
            // si salvano subito e solo gli stili, senza toccare le altre modifiche in corso
            const { error } = await actions.saveSettings({ settings: { ...settings, stili }, author: author() } as any);
            sHist = undefined;
            if (error) return say(error.message, true), true;
            settings.stili = stili;
            const keep = readBg(box);
            initBg(box, keep);
            $("[name=preset]", box).value = "styleSave" in b.dataset ? name : "";
            say("styleSave" in b.dataset ? `Stile "${name}" salvato ✓` : `Stile "${name}" eliminato`);
        } else return false;
        return true;
    }

    // ── righe ripetibili (date, personaggi, foto della galleria)
    function addRow(kind: "date" | "char" | "shot" | "faq" | "serata", into: Element, v: Data = {}) {
        const row = clone(kind);
        row.querySelectorAll<HTMLInputElement>("label > [name]").forEach((el) => (el.value = v[el.name] ?? ""));
        row.querySelectorAll<HTMLElement>(".img").forEach((b) => initImg(b, kind === "shot" ? v.image : v[b.dataset.name!]));
        row.append(clone("btns"));
        into.append(row);
        if (kind === "date") markDate(row);
        return row;
    }
    function markDate(row: Element) {
        const iso = $("[name=dateISO]", row).value;
        row.classList.toggle("past", !!iso && iso < oggi);
        $("[data-dl]", row).textContent = iso ? dateLabel(iso) + (iso < oggi ? " · passata" : "") : "";
    }

    // ── foto delle serate passate: data, luogo, foto
    function addSerata(x: Data = {}) {
        const r = addRow("serata", $("#serate", form!), { sDate: x.dateISO, sPlace: x.place });
        x.photos?.forEach((g: Data) => addRow("shot", $(".shots", r), g));
        return r;
    }

    // ── schede: titolo, blocchi, stile
    const PRESETS: Record<string, Data> = {
        storia: { title: "La storia", blocks: [{ type: "testo" }] },
        abiti: { title: "Gli abiti dell'epoca", blocks: [{ type: "galleria" }] },
        personaggi: { title: "Personaggi", blocks: [{ type: "personaggi", body: "Ogni ospite riceverà la propria scheda via email.\nQuesti sono i volti che troverai al banchetto." }] },
        galleria: { title: "Galleria", blocks: [{ type: "galleria" }] },
        testo: { title: "Nuova scheda", blocks: [{ type: "testo" }] },
    };
    function addTab(t: Data, open = false) {
        const el = clone("tab") as HTMLDetailsElement;
        el.open = open;
        $("[name=tabTitle]", el).value = t.title ?? "";
        initBlocks($<HTMLElement>(".blocks-wrap", el), upgradeTab(t).blocks ?? []);
        initBg($<HTMLElement>(":scope > .grid > .bg-wrap > .bg", el), t.background);
        $("#tabs", form!).append(el);
        markTab(el);
        return el;
    }
    function markTab(el: Element) {
        const blocks = $$<HTMLElement>(".block-ed", el);
        const kinds = [...new Set(blocks.map((b) => BLOCK_TEXT[b.dataset.type!][1].toLowerCase()))].join(", ");
        $(".tab-name", el).textContent = ($("[name=tabTitle]", el).value || "Senza titolo") + (kinds ? ` · ${kinds}` : " · vuota");
    }

    // ── blocchi (schede evento, home, pagine nuove): il tipo si sceglie aggiungendolo e non cambia
    function initBlocks(wrap: HTMLElement, blocks: Data[]) {
        const add = $<HTMLElement>(":scope > .add-blocks", wrap);
        add.replaceChildren($<HTMLTemplateElement>("#tpl-add").content.cloneNode(true));
        const list = $<HTMLElement>(":scope > .blocks", wrap);
        list.replaceChildren();
        blocks.forEach((b) => addBlock(list, b));
    }
    function addBlock(list: Element, b: Data, open = false) {
        const el = clone("block") as HTMLDetailsElement;
        el.open = open;
        el.dataset.type = b.type;
        for (const x of $$<HTMLElement>("[data-for]", el)) x.hidden = !x.dataset.for!.split(" ").includes(b.type);
        el.classList.toggle("off", !!b.hidden);
        const set = (n: string, v: unknown) => { const i = el.querySelector<HTMLInputElement>(`[name=${n}]`); if (i) i.value = v == null ? "" : String(v); };
        set("bTitle", b.title); set("bBody", b.body); set("key", b.key ?? "home-hero"); set("side", b.side);
        set("imgAr", b.imgAr); set("imgW", b.imgW ?? 0); set("valign", b.valign);
        showRange($("[name=imgW]", el));
        set("label", b.label); set("href", b.href); set("video", b.video); set("show", b.show ?? "prossimi"); set("limit", b.limit);
        initImg($<HTMLElement>(".img[data-name=bImage]", el), b.image);
        b.gallery?.forEach((g: Data) => addRow("shot", $(".shots", el), g));
        b.characters?.forEach((c: Data) => addRow("char", $(".chars", el), c));
        b.faq?.forEach((f: Data) => addRow("faq", $(".faqs", el), f));
        initBg($<HTMLElement>(".bg", el), b.style);
        list.append(el);
        markBlock(el);
        return el;
    }
    // blocco nuovo, aperto, in fondo alla lista o prima di `before`
    // stile di un blocco ridisegnato subito nell'anteprima, senza aspettare il nuovo render
    function livePaint(blk: HTMLElement) {
        const root = liveDoc()?.querySelector(`[data-ed="${keyOf(blk)}"]`)?.firstElementChild as HTMLElement | null;
        if (root) paintSez(root, readBg($(".bg", blk)));
    }
    function newBlock(list: Element, type: string, before?: Element) {
        const el = addBlock(list, { type, ...(type === "eventi" ? { title: "Prossimi appuntamenti" } : {}) }, true);
        before?.before(el);
        markBlock(el);
        return el;
    }
    function markBlock(el: HTMLElement) {
        const type = el.dataset.type!;
        const [ico, name] = BLOCK_TEXT[type];
        const v = (n: string) => el.querySelector<HTMLInputElement>(`[name=${n}]`)?.value.trim() ?? "";
        const n = $$(".shots > .row, .chars > .row, .faqs > .row", el).length;
        const what = type === "sezione" ? $<HTMLSelectElement>("[name=key]", el).selectedOptions[0]?.text : v("bTitle") || v("bBody").split("\n")[0];
        $(".block-ico", el).textContent = ico;
        $(".block-name", el).textContent = name + (what ? ` · ${what.length > 50 ? what.slice(0, 50) + "…" : what}` : "") + (n ? ` (${n})` : "") + (el.classList.contains("off") ? " · nascosto" : "");
        $(".md-label", el).textContent = type === "testo" ? "Testo" : type === "bottone" ? "Testo sopra il bottone (facoltativo)" : "Introduzione (facoltativa)";
        const tab = el.closest(".tab-ed");
        if (tab) markTab(tab);
    }
    function readBlock(el: HTMLElement) {
        const type = el.dataset.type!;
        const is = (...t: string[]) => t.includes(type);
        const v = (n: string, root: ParentNode = el) => root.querySelector<HTMLInputElement>(`[name=${n}]`)?.value.trim() || undefined;
        const rows = (sel: string) => $$<HTMLElement>(`${sel} > .row`, el);
        const list = <T,>(a: T[]) => (a.length ? a : undefined);
        const limit = v("limit");
        return {
            type,
            hidden: el.classList.contains("off") || undefined,
            title: is("sezione") ? undefined : v("bTitle"),
            body: is("sezione") ? undefined : v("bBody"),
            image: is("testo") ? getImg($(".img[data-name=bImage]", el)) : undefined,
            side: is("testo") ? v("side") : undefined,
            imgAr: is("testo") ? v("imgAr") : undefined,
            imgW: is("testo") ? Number(v("imgW")) || undefined : undefined,
            valign: is("testo") ? v("valign") : undefined,
            gallery: is("galleria") ? list(rows(".shots").map((r) => ({ image: getImg($(".img", r)), caption: v("caption", r) })).filter((g) => g.image)) : undefined,
            characters: is("personaggi") ? list(rows(".chars").map((r) => ({ name: v("name", r), role: v("role", r), hint: v("hint", r), portrait: getImg($(".img", r)) }))) : undefined,
            faq: is("faq") ? list(rows(".faqs").map((r) => ({ q: v("q", r), a: v("a", r) }))) : undefined,
            label: is("bottone") ? v("label") : undefined,
            href: is("bottone") ? v("href") : undefined,
            video: is("video") ? v("video") : undefined,
            show: is("eventi") ? v("show") : undefined,
            limit: is("eventi") && limit ? Number(limit) : undefined,
            key: is("sezione") ? v("key") : undefined,
            style: is("sezione") ? undefined : readBg($(".bg", el)),
        };
    }
    const readBlocks = (wrap: Element) => $$<HTMLElement>(":scope > .blocks > .block-ed", wrap).map(readBlock);

    // clic comuni a editor evento e pagine: blocchi, righe, markdown, inquadratura, stile. true = gestito
    function editClick(b: HTMLElement): boolean {
        const blk = b.closest<HTMLElement>(".block-ed");
        const item = b.closest<HTMLElement>(".row, .block-ed, .tab-ed");
        if (b.dataset.add === "block") {
            const el = newBlock($(":scope > .blocks", b.closest(".blocks-wrap")!), b.dataset.type!);
            (el.querySelector<HTMLInputElement>("[name=bTitle], [name=key]"))?.focus();
            el.scrollIntoView({ block: "nearest", behavior: "smooth" });
        } else if (b.dataset.add === "char") $("[name=name]", addRow("char", $(".chars", blk!))).focus();
        else if (b.dataset.add === "faq") $("[name=q]", addRow("faq", $(".faqs", blk!))).focus();
        else if ("hide" in b.dataset && blk) blk.classList.toggle("off");
        else if ("dup" in b.dataset && blk) {
            const copy = addBlock(blk.parentElement!, readBlock(blk), true);
            blk.after(copy);
        } else if ("crop" in b.dataset) return openCrop(b.closest<HTMLElement>(".img")!), true;
        else if ("clear" in b.dataset) setImg(b.closest<HTMLElement>(".img")!);
        else if (b.dataset.md) return mdTool(b.dataset.md, b.closest(".md")!), true;
        else if (b.closest(".bg") && ("font" in b.dataset || "styleSave" in b.dataset || "styleDel" in b.dataset)) return bgClick(b), true;
        else if (item && "rm" in b.dataset) {
            if (item.matches(".tab-ed") && !confirm(`Rimuovere la scheda "${$("[name=tabTitle]", item).value}"?`)) return true;
            if (item.matches(".block-ed") && !confirm(`Rimuovere il blocco "${$(".block-name", item).textContent}"?`)) return true;
            const tab = item.parentElement?.closest(".tab-ed");
            item.remove();
            if (tab) markTab(tab);
        } else if (item && "up" in b.dataset) item.previousElementSibling?.before(item);
        else if (item && "down" in b.dataset) item.nextElementSibling?.after(item);
        else return false;
        if (blk?.isConnected) markBlock(blk);
        return true;
    }
    // galleria: più foto insieme, una riga per foto
    async function editChange(t: HTMLInputElement) {
        if (!("multi" in t.dataset)) return;
        const blk = t.closest<HTMLElement>(".block-ed, .serata")!;
        const files = [...(t.files ?? [])];
        t.value = "";
        for (const f of files) {
            const url = await upload(f, blk);
            if (url) addRow("shot", $(".shots", blk), { image: { src: url } });
        }
        if (blk.matches(".block-ed")) markBlock(blk);
    }
    function editInput(t: HTMLInputElement) {
        bgInput(t);
        const own = t.closest(".bg") && t.closest<HTMLElement>(".block-ed");
        if (own) livePaint(own);
        if (t.name === "bBody") renderPreview(t.closest(".md")!);
        if (t.name === "tabTitle") markTab(t.closest(".tab-ed")!);
        const blk = t.closest<HTMLElement>(".block-ed");
        if (blk && ["bTitle", "bBody", "key"].includes(t.name)) markBlock(blk);
    }

    // ── clic: aggiungi/sposta/rimuovi righe e schede, markdown, inquadratura, font
    form.addEventListener("click", (e) => {
        const b = (e.target as Element).closest("button");
        if (!b) return;
        if (b.closest("summary")) e.preventDefault(); // i bottoni nel titolo di scheda/blocco non lo chiudono
        if (b.dataset.add === "date") {
            // la nuova data copia luogo e quota dall'ultima
            const last = $$("#dates > .row", form).pop();
            const r = addRow("date", $("#dates", form), last ? { location: $("[name=location]", last).value, price: $("[name=price]", last).value } : {});
            $("[name=dateISO]", r).focus();
        } else if (b.dataset.add === "tab") {
            const el = addTab(structuredClone(PRESETS[b.dataset.preset!]), true);
            $("[name=tabTitle]", el).select();
            el.scrollIntoView({ block: "nearest" });
        } else if (b.dataset.add === "serata") {
            // parte dall'ultima data già passata, col suo luogo
            const past = $$("#dates > .row", form).map((r) => ({ d: $("[name=dateISO]", r).value, l: $("[name=location]", r).value })).filter((x) => x.d && x.d < oggi).pop();
            $("[name=sDate]", addSerata({ dateISO: past?.d, place: past?.l || undefined })).focus();
        } else if (b.dataset.font) return openFonts($(`[name=${b.dataset.font}]`, form));
        else if (!editClick(b)) return;
        setDirty(true);
    });

    form.addEventListener("change", (e) => {
        const t = e.target as HTMLInputElement;
        if (t.name === "titleFont" || t.name === "characterFont") return fontSample(t.name);
        editChange(t);
    });

    form.addEventListener("input", (e) => {
        const t = e.target as HTMLInputElement;
        if (t.type === "file") return;
        setDirty(true);
        if (t.name === "dateISO") markDate(t.closest(".row")!);
        if (t.name === "title") {
            $("#ed-title").textContent = t.value || "Nuovo evento";
            if (slugEl.dataset.auto) slugEl.value = slugify(t.value);
            fontSample("titleFont");
        }
        if (t === slugEl) delete slugEl.dataset.auto;
        if (t.name === "excerpt") countExcerpt();
        editInput(t);
    });

    function countExcerpt() {
        const n = $<HTMLTextAreaElement>("[name=excerpt]", form!).value.trim().length;
        const el = $<HTMLElement>("#excerpt-count");
        el.textContent = `${n} caratteri · ideale 120–220`;
        el.classList.toggle("warn", n > 260);
    }

    // ── testo delle schede: barra markdown e anteprima
    const renderPreview = (box: Element) => {
        const out = $<HTMLElement>(".md-out", box);
        if (!out.hidden) out.innerHTML = md($<HTMLTextAreaElement>("textarea", box).value);
    };
    function mdTool(kind: string, box: Element) {
        const ta = $<HTMLTextAreaElement>("textarea", box);
        if (kind === "preview") {
            const out = $<HTMLElement>(".md-out", box);
            out.hidden = !out.hidden;
            $("[data-md=preview]", box).setAttribute("aria-pressed", String(!out.hidden));
            return renderPreview(box);
        }
        const { selectionStart: s, selectionEnd: e, value } = ta;
        const sel = value.slice(s, e);
        if (kind === "link") {
            const url = prompt("Indirizzo del link (https://…)", "https://");
            if (!url || !/^https?:\/\/\S+$/.test(url)) return;
            ta.setRangeText(`[${sel || "testo del link"}](${url})`, s, e, "select");
        } else {
            const m = kind === "b" ? "**" : "*";
            ta.setRangeText(m + (sel || "testo") + m, s, e, "select");
        }
        ta.focus();
        ta.dispatchEvent(new Event("input", { bubbles: true }));
    }

    // ── font: selettore con anteprime (una sola richiesta, caricata alla prima apertura)
    const fontDlg = $<HTMLDialogElement>("#fonts");
    const fontSearch = $("input[type=search]", fontDlg);
    let fontTarget: HTMLInputElement | undefined;
    const loaded = new Set<string>();
    const loadFont = (href: string) => {
        if (loaded.has(href)) return;
        loaded.add(href);
        document.head.append(Object.assign(document.createElement("link"), { rel: "stylesheet", href }));
    };
    function openFonts(input: HTMLInputElement) {
        fontTarget = input;
        loadFont(fontDlg.dataset.href!);
        const sample = $("[name=title]", form!).value || "Memento Convivium";
        $$<HTMLElement>("[data-pick] span", fontDlg).forEach((s) => (s.textContent = sample));
        const cur = input.value;
        $$<HTMLElement>("[data-pick]", fontDlg).forEach((b) => b.classList.toggle("on", b.dataset.pick === cur));
        fontSearch.value = "";
        filterFonts();
        fontDlg.showModal();
    }
    function filterFonts() {
        const q = fontSearch.value.trim().toLowerCase();
        $$<HTMLElement>("[data-pick]", fontDlg).forEach((b) => (b.hidden = !!q && !b.dataset.pick!.toLowerCase().includes(q)));
        $$<HTMLElement>("section", fontDlg).forEach((s) => (s.hidden = !s.querySelector("[data-pick]:not([hidden])")));
    }
    fontSearch.oninput = filterFonts;
    fontDlg.addEventListener("click", (e) => {
        const b = (e.target as Element).closest<HTMLElement>("[data-pick]");
        if (!b) return;
        const input = fontTarget!;
        input.value = b.dataset.pick!;
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
        fontDlg.close();
    });
    function fontSample(name: string) {
        const font = $(`[name=${name}]`, form!).value.trim();
        const fam = font.split(",")[0].trim().replace(/['"]/g, "");
        const el = $<HTMLElement>(`[data-sample=${name}]`, form!);
        el.style.fontFamily = font;
        el.textContent =
            name === "titleFont"
                ? $("[name=title]", form!).value || "Titolo dell'evento"
                : form!.querySelector<HTMLInputElement>(".chars [name=name]")?.value || "Nome del personaggio";
        el.hidden = !font;
        if (fam && !BASE_FONTS.includes(fam)) loadFont(`https://fonts.googleapis.com/css2?family=${fam.replace(/ /g, "+")}&display=swap`);
    }

    // ── card dell'evento (timeline in home e lista eventi), coi dati non salvati
    const cardsDlg = $<HTMLDialogElement>("#cards-dlg");
    $<HTMLButtonElement>("#cards-btn").onclick = () => {
        cardsDlg.showModal();
        renderPrev($<HTMLElement>(".prev", cardsDlg), { ...collect(), cards: true });
    };

    // ── libreria foto: sfoglia/elimina da "📁 Libreria foto", oppure sceglie per una casella (una foto) o una galleria (più foto)
    const mediaDlg = $<HTMLDialogElement>("#media");
    const mediaGrid = $<HTMLElement>(".media-grid", mediaDlg);
    const mediaAdd = $<HTMLButtonElement>("[data-pickmulti]", mediaDlg);
    let mediaPick: ((urls: string[]) => void) | undefined;
    let mediaMulti = false;
    let mediaFree = false;
    let mediaSel = new Set<string>();
    const mediaPaint = () => {
        for (const c of $$<HTMLElement>(".media-card", mediaGrid)) {
            c.hidden = mediaFree && c.dataset.used !== "0";
            c.classList.toggle("sel", mediaSel.has(c.dataset.id!));
        }
        for (const b of $$<HTMLElement>("[data-f]", mediaDlg)) b.classList.toggle("on", (b.dataset.f === "free") === mediaFree);
        mediaAdd.textContent = mediaSel.size ? `Aggiungi ${mediaSel.size} foto` : "Aggiungi";
        mediaAdd.disabled = !mediaSel.size;
    };
    async function openMedia(pick?: (urls: string[]) => void, multi = false) {
        mediaPick = pick;
        mediaMulti = multi;
        mediaSel = new Set();
        mediaAdd.hidden = !multi;
        $(".media-hint", mediaDlg).textContent = pick ? (multi ? "Spunta le foto da aggiungere alla galleria." : "Clicca una foto per usarla.") : "Le foto non usate si possono eliminare; quelle in uso restano.";
        mediaGrid.textContent = "Caricamento…";
        mediaDlg.showModal();
        const { data, error } = await actions.listImages();
        if (error) return void (mediaGrid.textContent = error.message);
        mediaGrid.textContent = data.length ? "" : "Nessuna foto caricata.";
        for (const m of data) {
            const c = document.createElement("div");
            c.className = "media-card";
            c.dataset.id = m.id;
            c.dataset.used = m.used ? "1" : "0";
            c.innerHTML = `<button type="button" class="media-pick"><img loading="lazy" alt=""></button><small></small>`;
            $<HTMLImageElement>("img", c).src = `/img/${m.id}`;
            $("small", c).textContent = `${kb(m.bytes)} · ${fmtTime(m.createdAt).split(",")[0]}`;
            if (!m.used) {
                const del = Object.assign(document.createElement("button"), { type: "button", textContent: "Elimina", className: "media-del" });
                del.dataset.del = m.id;
                c.append(Object.assign(document.createElement("span"), { className: "badge", textContent: m.inHistory ? "non usata (solo cronologia)" : "non usata" }), del);
            }
            mediaGrid.append(c);
        }
        mediaPaint();
    }
    mediaDlg.addEventListener("click", async (e) => {
        const t = e.target as Element;
        const f = t.closest<HTMLElement>("[data-f]");
        if (f) { mediaFree = f.dataset.f === "free"; return mediaPaint(); }
        const del = t.closest<HTMLElement>("[data-del]");
        if (del) {
            if (!confirm("Eliminare questa foto per sempre? Non è usata, ma potrebbe comparire in una versione della cronologia.")) return;
            const { error } = await actions.deleteImage({ id: del.dataset.del! });
            if (error) return void say(error.message, true);
            del.closest(".media-card")!.remove();
            return;
        }
        if (t.closest("[data-pickmulti]")) {
            mediaDlg.close();
            return mediaPick?.([...mediaSel]);
        }
        const card = t.closest<HTMLElement>(".media-pick")?.parentElement;
        if (!card || !mediaPick) return;
        if (!mediaMulti) {
            mediaDlg.close();
            return mediaPick([`/img/${card.dataset.id}`]);
        }
        const u = `/img/${card.dataset.id}`;
        mediaSel.has(u) ? mediaSel.delete(u) : mediaSel.add(u);
        mediaPaint();
    });
    $<HTMLButtonElement>("#media-open").onclick = () => openMedia();
    form.addEventListener("click", (e) => {
        const b = (e.target as Element).closest<HTMLElement>("[data-lib], [data-lib-multi]");
        if (!b) return;
        if ("lib" in b.dataset) {
            const box = b.closest<HTMLElement>(".img")!;
            openMedia(([src]) => { setImg(box, { src }); setDirty(true); });
        } else {
            const blk = b.closest<HTMLElement>(".block-ed, .serata")!;
            openMedia((urls) => {
                for (const src of urls) addRow("shot", $(".shots", blk), { image: { src } });
                if (blk.matches(".block-ed")) markBlock(blk);
                setDirty(true);
            }, true);
        }
    });

    // dialog: chiudi con ✕/Annulla o cliccando fuori
    for (const d of [cropDlg, fontDlg, cardsDlg, mediaDlg]) {
        d.addEventListener("click", (e) => {
            if ((e.target === d && !d.classList.contains("docked")) || (e.target as Element).closest("[data-close]")) d.close();
        });
    }

    // ── form ⇄ dati
    function fill(d: Data, slug: string) {
        form!.reset();
        form!.querySelectorAll("#dates, #tabs, #serate, fieldset > .img").forEach((r) => r.replaceChildren());
        for (const el of $$("fieldset > label > [name], .font-field > label > [name]", form!)) {
            el.value = el.name === "includes" ? (d.includes ?? []).join("\n") : String(d[el.name] ?? "");
        }
        slugEl.value = slug;
        $("[name=status]", form!).value = d.status ?? "bozza";
        d.dates?.forEach((x: Data) => addRow("date", $("#dates", form!), x));
        (d.tabs as Data[] | undefined)?.forEach((t) => addTab(t));
        d.serate?.forEach((x: Data) => addSerata(x));
        for (const box of $$<HTMLElement>("fieldset > .img", form!)) initImg(box, d[box.dataset.name!]);
        for (const box of $$<HTMLElement>(".sec > .bg, fieldset > .bg-wrap > .bg", form!)) initBg(box, d[box.dataset.name!]);
        $("[name=noPrenota]", form!).checked = !!d.noPrenota;
        $("#ed-title").textContent = d.title || "Nuovo evento";
        countExcerpt();
        fontSample("titleFont");
        fontSample("characterFont");
    }

    function collect() {
        // senza root: solo i campi diretti dei fieldset (le righe date hanno anche loro "location"/"price")
        const val = (name: string, root?: ParentNode) =>
            (root ?? form!).querySelector<HTMLInputElement>(
                root ? `[name=${name}]` : `fieldset > label > [name=${name}], .font-field > label > [name=${name}]`,
            )?.value.trim() || undefined;
        const img = (name: string, root: ParentNode = form!) => {
            const box = root.querySelector(`.img[data-name=${name}]`);
            return box ? getImg(box) : undefined;
        };
        const rows = (sel: string, root: ParentNode = form!) => $$(`${sel} > .row`, root);
        const list = <T,>(a: T[]) => (a.length ? a : undefined);
        const year = val("historicalYear");
        return {
            slug: val("slug") ?? "",
            data: {
                title: val("title"), theme: val("theme"), status: val("status"),
                duration: val("duration"), excerpt: val("excerpt"),
                dates: list(
                    rows("#dates")
                        .map((r) => ({ dateISO: val("dateISO", r)!, location: val("location", r), price: val("price", r) }))
                        .sort((a, b) => a.dateISO.localeCompare(b.dateISO)),
                ),
                location: val("location"), price: val("price"),
                includes: list($<HTMLTextAreaElement>("[name=includes]", form!).value.split("\n").map((s) => s.trim()).filter(Boolean)),
                cover: img("cover"),
                background: readBg($(".bg[data-name=background]", form!)),
                heroStyle: readBg($(".bg[data-name=heroStyle]", form!)),
                heroLayout: val("heroLayout"), coverMode: val("coverMode"),
                sfondo: readBg($(".bg[data-name=sfondo]", form!)),
                titleFont: val("titleFont"), characterFont: val("characterFont"),
                noPrenota: $("[name=noPrenota]", form!).checked || undefined,
                tabs: $$<HTMLElement>("#tabs > .tab-ed", form!).map((t) => ({
                    title: val("tabTitle", t),
                    blocks: readBlocks($(".blocks-wrap", t)),
                    background: readBg($(":scope > .grid > .bg-wrap > .bg", t)),
                })),
                serate: list(
                    rows("#serate")
                        .map((r) => ({
                            dateISO: val("sDate", r), place: val("sPlace", r),
                            photos: rows(".shots", r).map((x) => ({ image: img("shot", x), caption: val("caption", x) })).filter((g) => g.image),
                        }))
                        .filter((x) => x.photos.length),
                ),
                historicalYear: year === undefined ? undefined : Number(year),
                era: val("era"), yearLabel: val("yearLabel"), place: val("place"),
                timelineImage: img("timelineImage"),
            },
        };
    }

    // ── viste: editor evento | impostazioni | testi delle pagine | vuoto
    function show(v: typeof view) {
        view = v;
        form!.hidden = v !== "editor";
        settingsForm.hidden = v !== "settings";
        pagesView.hidden = v !== "pages";
        pageForm.hidden = v !== "page";
        $<HTMLElement>("#empty").hidden = v !== "empty";
        $<HTMLElement>("#save-top").hidden = v === "empty";
        $$<HTMLElement>(".view-link").forEach((a) => a.classList.toggle("on", a.dataset.view === v));
        // evento e pagine: impostazioni a sinistra, anteprima dal vivo a destra, elenco nel menu ☰
        const split = v === "editor" || v === "page";
        adminEl.classList.toggle("split", split);
        adminEl.classList.remove("nav-open");
        $<HTMLElement>("#menu").hidden = !split;
        live.hidden = !split;
        unfocus();
        selKey = "";
        histReset();
        undoBtn.hidden = redoBtn.hidden = !split;
        msg = $<HTMLElement>(".msg", { editor: form!, settings: settingsForm, pages: pagesView, page: pageForm, empty: form! }[v]);
        renderPages();
        renderHist();
    }
    // indirizzo della vista aperta, per tornarci se si annulla un cambio di vista
    const here = () =>
        ({ editor: `#${current?.id ?? ""}`, settings: "#impostazioni", pages: "#pagine", page: pageKey === "" ? location.pathname : `#pagina-${pageKey}`, empty: location.pathname })[view];

    // ── evento aperto: intestazione, pulsanti, cronologia
    const histSel = $<HTMLSelectElement>("#history");
    function setCurrent(ev: Evento | undefined) {
        current = ev;
        $("#ed-meta").textContent = ev?.updatedAt
            ? `Ultima modifica ${fmtTime(ev.updatedAt)}${ev.updatedBy ? " · " + ev.updatedBy : ""}`
            : "Non ancora salvato";
        $<HTMLAnchorElement>("#preview").href = `/eventi/${ev?.id}`;
        for (const id of ["#preview", "#dup", "#del", "#history"]) $<HTMLElement>(id).hidden = !ev;
        versions = [];
        renderHistory();
        if (ev) loadHistory(ev.id);
        renderList();
    }
    function renderHistory() {
        histSel.replaceChildren(
            new Option(versions.length ? `Cronologia (${versions.length})` : "Cronologia: vuota", ""),
            ...versions.map((v, i) =>
                new Option(`${fmtTime(v.savedAt)}${v.author ? " · " + v.author : ""}${v.deleted ? " · eliminato" : ""}`, String(i)),
            ),
        );
    }
    async function loadHistory(slug: string) {
        const { data } = await actions.history({ slug });
        if (data && current?.id === slug) {
            versions = data;
            renderHistory();
        }
    }
    histSel.onchange = () => {
        const v = versions[Number(histSel.value)];
        histSel.value = "";
        if (!v || !current || !discardOk()) return;
        fill(v.data, current.id);
        delete slugEl.dataset.auto;
        setDirty(true);
        say(`Caricata la versione del ${fmtTime(v.savedAt)}: premi Salva per ripristinarla (o riapri l'evento per annullare).`);
    };

    function open(ev: Evento | undefined, o: { data?: Data; slug?: string; note?: string } = {}) {
        if (!discardOk()) {
            history.replaceState(null, "", here());
            return false;
        }
        edits = {};
        // nuovo evento: parte con le tre schede tipiche
        fill(o.data ?? ev?.data ?? { tabs: [PRESETS.storia, PRESETS.abiti, PRESETS.personaggi] }, o.slug ?? ev?.id ?? "");
        // nuovo evento senza slug: lo slug segue il titolo finché non lo si modifica a mano
        if (ev || o.slug) delete slugEl.dataset.auto;
        else {
            slugEl.dataset.auto = "1";
            slugEl.value = slugify(o.data?.title ?? "");
        }
        show("editor");
        setCurrent(ev);
        setDirty(!ev && !!o.data);
        queueLive(0);
        say(o.note ?? "");
        if (!o.data) offerDraft((d) => fill(d.data, d.slug));
        if (matchMedia("(max-width: 760px)").matches) form!.scrollIntoView();
        return true;
    }

    // ── salvataggio senza ricaricare la pagina
    async function save(force = false) {
        say("Salvataggio…");
        const p = collect();
        const { data, error } = await actions.saveEvent({ ...p, originalSlug: current?.id, rev: current?.rev, force, author: author() } as any);
        if (error) {
            if (error.code === "PRECONDITION_FAILED")
                return say(error.message + " Salvando sovrascrivi le sue modifiche (restano nella cronologia).", true, ["Sovrascrivi comunque", () => save(true)]);
            return say(isInputError(error) ? "Controlla i campi: " + Object.keys(error.fields).join(", ").replace(/data\./g, "") : error.message, true);
        }
        const saved = { id: data.slug, data: p.data, updatedAt: data.updatedAt, updatedBy: author(), rev: data.rev } as unknown as Evento;
        const i = current ? eventi.indexOf(current) : -1;
        if (i >= 0) eventi[i] = saved;
        else eventi.push(saved);
        deleted = deleted.filter((v) => v.slug !== saved.id);
        renderTrash();
        delete slugEl.dataset.auto;
        dropDraft(`mc_draft:ev:${current?.id ?? ""}`);
        setCurrent(saved);
        setDirty(false);
        dropDraft();
        history.replaceState(null, "", `#${saved.id}`);
        if (Object.keys(edits).length && !(await saveSettings(edits))) return; // testi e stili del sito cambiati nell'anteprima
        say(`Salvato alle ${savedAt()} ✓`);
    }
    form.addEventListener("submit", (e) => {
        e.preventDefault();
        save();
    });
    addEventListener("keydown", (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === "s") {
            e.preventDefault();
            if (view === "editor") form.requestSubmit();
            else if (view === "settings") settingsForm.requestSubmit();
            else if (view === "pages") saveSettings(edits);
            else if (view === "page") pageForm.requestSubmit();
        }
    });

    $<HTMLButtonElement>("#save-top").onclick = () => dispatchEvent(new KeyboardEvent("keydown", { key: "s", ctrlKey: true }));

    // ── annulla/ripeti: pila di istantanee del form (con testi e stili cambiati nell'anteprima), 50 passi.
    // Dentro un campo di testo resta l'annulla nativo del browser; le sue modifiche contano comunque come istantanea.
    let hist: string[] = [];
    let hi = 0;
    let histTimer = 0;
    const undoBtn = $<HTMLButtonElement>("#undo");
    const redoBtn = $<HTMLButtonElement>("#redo");
    const histNow = () => JSON.stringify({ d: snapshot(), e: edits });
    function histBtns() {
        undoBtn.disabled = hi < 1;
        redoBtn.disabled = hi >= hist.length - 1;
    }
    // vista aperta: la pila riparte da lì
    function histReset() {
        clearTimeout(histTimer);
        hist = view === "editor" || view === "page" ? [histNow()] : [];
        hi = 0;
        histBtns();
    }
    const histSoon = () => (clearTimeout(histTimer), (histTimer = window.setTimeout(histPush, 400)));
    function histPush() {
        clearTimeout(histTimer);
        if (!hist.length) return;
        const s = histNow();
        if (s === hist[hi]) return;
        hist = [...hist.slice(0, hi + 1), s].slice(-50);
        hi = hist.length - 1;
        histBtns();
    }
    function histGo(n: number) {
        histPush(); // prima si fissa quel che è in sospeso
        const s = hist[hi + n];
        if (!s) return;
        hi += n;
        const { d, e } = JSON.parse(s);
        edits = e;
        if (view === "editor") fill(d.data, d.slug);
        else fillPage(d);
        const k = selKey;
        if (k && edEl(k)) pick(k);
        setDirty(true);
        clearTimeout(histTimer); // il ripristino non è una modifica nuova
        histBtns();
    }
    function histKey(e: KeyboardEvent) {
        const k = e.key.toLowerCase();
        if (!(e.ctrlKey || e.metaKey) || (k !== "z" && k !== "y") || (view !== "editor" && view !== "page")) return;
        if ((e.target as Element).closest?.("textarea, select, input:not([type=checkbox], [type=range], [type=color]), [contenteditable]:not([contenteditable=false]), dialog")) return;
        e.preventDefault();
        histGo(k === "y" || e.shiftKey ? 1 : -1);
    }
    undoBtn.onclick = () => histGo(-1);
    redoBtn.onclick = () => histGo(1);
    addEventListener("keydown", histKey);

    $<HTMLButtonElement>("#del").onclick = async () => {
        const ev = current;
        if (!ev || !confirm(`Eliminare "${ev.data.title}"?\nPotrai ripristinarlo dalla sezione "Eliminati".`)) return;
        const { error } = await actions.deleteEvent({ slug: ev.id, author: author() });
        if (error) return say(error.message, true);
        eventi.splice(eventi.indexOf(ev), 1);
        deleted.unshift({ id: 0, slug: ev.id, data: ev.data, author: author(), savedAt: Date.now() / 1000, deleted: true });
        renderTrash();
        setDirty(false);
        setCurrent(undefined);
        show("empty");
        $("#empty").textContent = `"${ev.data.title}" eliminato. Puoi ripristinarlo da "Eliminati".`;
        history.replaceState(null, "", location.pathname);
    };

    $<HTMLButtonElement>("#dup").onclick = () => {
        const d = structuredClone(collect().data) as Data;
        d.title = `${d.title} (copia)`;
        d.status = "bozza";
        delete d.dates;
        setDirty(false);
        open(undefined, { data: d, note: "Copia creata come bozza e senza date. Controlla titolo e slug, poi salva." });
    };

    $<HTMLButtonElement>("#new").onclick = () => {
        if (open(undefined)) history.replaceState(null, "", location.pathname);
        $("[name=title]", form).focus();
    };

    $<HTMLButtonElement>("#backup").onclick = () => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob([JSON.stringify(eventi, null, 2)], { type: "application/json" }));
        a.download = `mementoconvivium-eventi-${oggi}.json`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    };

    // ── impostazioni del sito
    const heroUrl = $<HTMLElement>("[data-show=link]", settingsForm);
    const heroAction = $<HTMLSelectElement>("[name=heroAction]", settingsForm);
    const syncHero = () => (heroUrl.hidden = heroAction.value !== "link");
    heroAction.onchange = syncHero;
    syncHero();
    settingsForm.addEventListener("click", (e) => {
        const b = (e.target as Element).closest("button");
        const row = b?.closest(".row");
        if (b && "crop" in b.dataset) return openCrop(b.closest<HTMLElement>(".img")!);
        if (b && "clear" in b.dataset) setImg(b.closest<HTMLElement>(".img")!);
        else if (b?.dataset.add === "nav") {
            const r = clone("nav");
            r.append(clone("btns"));
            $("#nav", settingsForm).append(r);
            $("input", r).focus();
        } else if (row && b && "rm" in b.dataset) row.remove();
        else if (row && b && "up" in b.dataset) row.previousElementSibling?.before(row);
        else if (row && b && "down" in b.dataset) row.nextElementSibling?.after(row);
        else return;
        setDirty(true);
    });
    // salva le impostazioni: quelle già salvate + le modifiche della vista (form o testi delle pagine)
    async function saveSettings(changes: Data) {
        say("Salvataggio…");
        const next = { ...settings, ...changes };
        const { error } = await actions.saveSettings({ settings: next, author: author() } as any);
        if (error) return say(isInputError(error) ? "Controlla i campi: " + Object.keys(error.fields).join(", ").replace(/settings\./g, "") : error.message, true), false;
        settings = next;
        edits = {};
        setDirty(false);
        dropDraft();
        sHist = undefined;
        renderHist();
        say(`Salvato alle ${savedAt()} ✓ (il sito si aggiorna entro un minuto)`);
        return true;
    }
    // menu del form impostazioni ridisegnato da settings.nav (le pagine nuove possono cambiarlo)
    function renderNav(nav: Data[] = settings.nav) {
        $("#nav", settingsForm).replaceChildren(
            ...nav.map((l: Data) => {
                const r = clone("nav");
                $("[name=label]", r).value = l.label;
                $("[name=href]", r).value = l.href;
                r.append(clone("btns"));
                return r;
            }),
        );
    }
    const SETTINGS_KEYS = ["email", "phone", "whatsapp", "instagram", "bookingUrl", "heroAction", "heroUrl", "nav", "banner", "seo", "analyticsToken", "sfondo"];
    function collectSettings() {
        const v = (n: string, root: ParentNode = settingsForm) => $(`[name=${n}]`, root).value.trim() || undefined;
        return {
            email: v("email"), phone: v("phone"), whatsapp: v("whatsapp") ?? "",
            instagram: v("instagram") ?? "", bookingUrl: v("bookingUrl") ?? "",
            heroAction: heroAction.value, heroUrl: v("heroUrl") ?? "",
            nav: $$(".row", $("#nav", settingsForm)).map((r) => ({ label: v("label", r), href: v("href", r) })),
            banner: { text: v("bannerText"), href: v("bannerHref") },
            seo: Object.fromEntries(
                $$<HTMLElement>(".seo-row", settingsForm)
                    .map((r) => [r.dataset.path!, { title: v("seoTitle", r), description: v("seoDesc", r), image: getImg($(".img", r)) }] as const)
                    .filter(([, x]) => x.title || x.description || x.image),
            ),
            analyticsToken: v("analyticsToken") ?? "",
            sfondo: readBg($(".bg[data-name=sfondo]", settingsForm)),
        };
    }
    function fillSettings(d: Data) {
        for (const k of ["email", "phone", "whatsapp", "instagram", "bookingUrl", "heroAction", "heroUrl", "analyticsToken"]) $(`[name=${k}]`, settingsForm).value = d[k] ?? "";
        $("[name=bannerText]", settingsForm).value = d.banner?.text ?? "";
        $("[name=bannerHref]", settingsForm).value = d.banner?.href ?? "";
        for (const r of $$<HTMLElement>(".seo-row", settingsForm)) {
            const x = d.seo?.[r.dataset.path!] ?? {};
            $("[name=seoTitle]", r).value = x.title ?? "";
            $<HTMLTextAreaElement>("[name=seoDesc]", r).value = x.description ?? "";
            const box = $<HTMLElement>(".img", r);
            box.replaceChildren();
            initImg(box, x.image);
        }
        initBg($(".bg[data-name=sfondo]", settingsForm), d.sfondo);
        renderNav(d.nav);
        syncHero();
    }
    settingsForm.addEventListener("input", (e) => {
        bgInput(e.target as HTMLInputElement);
        setDirty(true);
    });
    settingsForm.addEventListener("submit", (e) => {
        e.preventDefault();
        saveSettings(collectSettings());
    });

    // ── testi delle pagine: la pagina vera in un iframe, gli elementi [data-k] diventano modificabili
    let edits: Data = {}; // testi cambiati e non ancora salvati
    const pageFrame = $<HTMLIFrameElement>(".page-frame", pagesView);
    const pageSel = $<HTMLSelectElement>("[name=page]", pagesView);
    const EDIT_CSS = `[data-k]{outline:1px dashed rgb(0 0 0/.45);outline-offset:4px;cursor:text}
        [data-k]:hover{outline-color:#000}[data-k]:focus{outline:2px solid #1f5fa8;background:rgb(255 255 255/.7)}
        .sez-btn{position:absolute!important;top:5.5rem;right:1rem;z-index:20!important;font:600 14px system-ui;padding:.45rem .8rem;
        border:1px solid #000;border-radius:999px;background:#fff;color:#000;cursor:pointer;box-shadow:0 2px 8px rgb(0 0 0/.25)}
        .sez-btn:hover{background:#000;color:#fff}`;
    const sezDlg = $<HTMLDialogElement>("#sez-dlg");
    const sezBox = $<HTMLElement>(".bg", sezDlg);
    let sezEl: HTMLElement | undefined;
    const sezioni = (): Data => ({ ...settings.sezioni, ...edits.sezioni });
    // Stile di una sezione nella pagina dell'iframe, senza ricaricarla.
    // ponytail: rifà a mano il markup di components/Sfondo.astro; se cambia lì, va cambiato qui
    function paintSez(el: HTMLElement, b?: Data, replay = false) {
        const doc = el.ownerDocument;
        el.querySelector(":scope > .sfondo")?.remove();
        if (b?.color || b?.image) {
            const d = doc.createElement("div");
            d.className = "sfondo";
            d.ariaHidden = "true";
            if (b.color) d.style.background = b.color;
            if (b.op !== undefined) d.style.opacity = String(b.op / 100);
            if (b.image) d.append(Object.assign(doc.createElement("img"), { src: b.image.src, alt: "", style: imgStyle(b.image) }));
            if (b.veil) d.append(Object.assign(doc.createElement("span"), { style: `background:${veil(b as Bg)}` }));
            el.prepend(d);
        }
        for (const [k, v] of Object.entries(look(b as Bg))) v === undefined ? el.removeAttribute(k) : el.setAttribute(k, v);
        const fonts = googleFontsHref(b?.font);
        if (fonts && !doc.querySelector(`link[href="${CSS.escape(fonts)}"]`)) doc.head.append(Object.assign(doc.createElement("link"), { rel: "stylesheet", href: fonts }));
        if (replay && b?.anim) {
            el.classList.remove("in");
            void el.offsetWidth; // riparte la transizione
            requestAnimationFrame(() => el.classList.add("in"));
        } else el.classList.add("in");
    }
    function openSez(el: HTMLElement) {
        sezEl = el;
        initBg(sezBox, sezioni()[el.dataset.sez!]);
        sezDlg.returnValue = "";
        sezDlg.showModal();
    }
    sezDlg.addEventListener("click", (e) => {
        const b = (e.target as Element).closest<HTMLElement>("button[type=button]");
        if (b && "crop" in b.dataset) openCrop(b.closest<HTMLElement>(".img")!);
        else if (b && "clear" in b.dataset) setImg(b.closest<HTMLElement>(".img")!);
        else if (b) bgClick(b);
    });
    sezDlg.addEventListener("input", (e) => bgInput(e.target as HTMLInputElement));
    sezDlg.onclose = () => {
        if (sezDlg.returnValue !== "ok" || !sezEl) return;
        const v = readBg(sezBox);
        edits.sezioni = { ...sezioni(), [sezEl.dataset.sez!]: v };
        // stessa chiave in più pagine (es. prenota): si aggiorna tutto quello che si vede
        for (const el of sezEl.ownerDocument.querySelectorAll<HTMLElement>(`[data-sez="${sezEl.dataset.sez}"]`)) paintSez(el, v, true);
        setDirty(true);
    };
    pageSel.onchange = () => (pageFrame.src = pageSel.value);
    const phone = $<HTMLInputElement>("#phone");
    phone.onchange = () => pageFrame.classList.toggle("phone", phone.checked);
    pageFrame.onload = () => {
        const doc = pageFrame.contentDocument;
        if (!doc) return;
        doc.head.append(Object.assign(doc.createElement("style"), { textContent: EDIT_CSS }));
        const cur = { ...settings, ...edits };
        for (const el of doc.querySelectorAll<HTMLElement>("[data-k]")) {
            // la pagina può arrivare dalla cache: si mostrano i testi aggiornati
            if (cur[el.dataset.k!] !== undefined) el.textContent = cur[el.dataset.k!];
            el.contentEditable = "plaintext-only";
        }
        for (const el of doc.querySelectorAll<HTMLElement>("[data-sez]")) {
            paintSez(el, sezioni()[el.dataset.sez!]);
            const b = Object.assign(doc.createElement("button"), { type: "button", className: "sez-btn", textContent: "🎨 Stile" });
            b.onclick = () => openSez(el);
            el.append(b);
        }
        // niente link, menu o dialog della pagina mentre si modifica
        doc.addEventListener("click", (e) => {
            if ((e.target as Element).closest(".sez-btn")) return;
            e.stopPropagation();
            if (!(e.target as Element).closest("[data-k]") || (e.target as Element).closest("a")) e.preventDefault();
        }, true);
        doc.addEventListener("input", (e) => {
            const el = (e.target as Element).closest<HTMLElement>("[data-k]");
            if (!el) return;
            edits[el.dataset.k!] = el.textContent!.trim() || undefined;
            setDirty(true);
        });
    };

    // ── cronologia delle impostazioni: ogni vista mostra solo le versioni in cui la sua parte cambia
    let sHist: { id: number; data: Data; author?: string; savedAt: number }[] | undefined;
    const omit = (d: Data, keys: string[]) => Object.fromEntries(Object.entries(d).filter(([k]) => !keys.includes(k)));
    const part = (d: Data): unknown =>
        view === "page" ? (pageKey === "home" ? { blocks: d.home, sfondo: d.sfondoHome } : d.pagine?.find((p: Data) => p.slug === pageKey))
        : view === "settings" ? Object.fromEntries(SETTINGS_KEYS.map((k) => [k, d[k]]))
        : omit(d, [...SETTINGS_KEYS, "home", "sfondoHome", "pagine", "stili"]); // testi, motto, stili delle sezioni
    async function renderHist() {
        const sel = $<HTMLSelectElement>(".hist", { page: pageForm, settings: settingsForm, pages: pagesView }[view as "page"] ?? pageForm);
        if (!["page", "settings", "pages"].includes(view) || (view === "page" && pageKey === "")) return void (sel.hidden = true);
        sel.hidden = false;
        const shown = view;
        sHist ??= (await actions.settingsHistory()).data ?? [];
        if (view !== shown) return;
        let prev = JSON.stringify(part(settings) ?? null);
        const list = sHist.filter((v) => {
            const j = JSON.stringify(part(v.data) ?? null);
            return j !== prev && ((prev = j), true);
        });
        sel.replaceChildren(
            new Option(list.length ? `Cronologia (${list.length})` : "Cronologia: vuota", ""),
            ...list.map((v) => new Option(`${fmtTime(v.savedAt)}${v.author ? " · " + v.author : ""}`, String(v.id))),
        );
    }
    for (const sel of $$<HTMLSelectElement>("select.hist")) {
        sel.onchange = () => {
            const v = sHist?.find((x) => x.id === Number(sel.value));
            sel.value = "";
            if (!v) return;
            const p = part(v.data) as Data | undefined;
            if (view === "page") {
                if (!p) return say("In quella versione questa pagina non esisteva.", true);
                fillPage(pageKey === "home" ? p : { ...p, menu: v.data.nav.some((l: Data) => l.href === `/${pageKey}`) });
            } else if (view === "settings") fillSettings(v.data);
            else {
                // anche i testi tornati all'originale (chiave assente nella versione)
                const cur = part(settings) as Data;
                edits = Object.fromEntries([...new Set([...Object.keys(cur), ...Object.keys(p!)])].map((k) => [k, p![k]]));
                pageFrame.src = pageSel.value;
            }
            setDirty(true);
            say(`Caricata la versione del ${fmtTime(v.savedAt)}: premi Salva per ripristinarla (o riapri la vista per annullare).`);
        };
    }

    // ── home e pagine nuove: liste di blocchi salvate nelle impostazioni (home, pagine)
    let pageKey: string | undefined; // "home", slug della pagina aperta, "" = nuova
    const pageList = $<HTMLUListElement>("#page-list");
    function renderPages() {
        pageList.replaceChildren(
            ...[{ slug: "home", title: "🏠 Home" }, ...settings.pagine].map((p: Data) => {
                const li = document.createElement("li");
                const a = Object.assign(document.createElement("a"), { href: `#pagina-${p.slug}`, textContent: p.title });
                if (p.hidden) a.append(Object.assign(document.createElement("small"), { textContent: " · nascosta" }));
                a.classList.toggle("on", view === "page" && pageKey === p.slug);
                li.append(a);
                return li;
            }),
        );
    }
    const inMenu = (slug: string) => settings.nav.some((l: Data) => l.href === `/${slug}`);
    function openPage(key: string) {
        if (!discardOk()) return history.replaceState(null, "", here());
        const p = settings.pagine.find((x: Data) => x.slug === key);
        if (key !== "home" && key !== "" && !p) return;
        pageKey = key;
        edits = {};
        const home = key === "home";
        $<HTMLElement>("#pg-base").hidden = home;
        $<HTMLFieldSetElement>("#pg-base fieldset").disabled = home; // campi obbligatori della pagina: non bloccano il salvataggio della home
        $<HTMLElement>("#pg-del").hidden = home || key === "";
        $("#pg-meta").textContent = home ? "Le sezioni della home, nell'ordine in cui appaiono" : key ? `/${key}` : "Non ancora salvata";
        const openA = $<HTMLAnchorElement>("#pg-open");
        openA.hidden = key === "";
        openA.href = home ? "/" : `/${key}`;
        fillPage(home ? { blocks: settings.home, sfondo: settings.sfondoHome } : p ? { ...p, menu: inMenu(p.slug) } : { hidden: true, blocks: [{ type: "testo" }] });
        if (key === "") $<HTMLDetailsElement>("#page-ed .block-ed").open = true;
        show("page");
        setDirty(false);
        say(key === "" ? "Nuova pagina: parte nascosta, togli la spunta quando è pronta." : "");
        offerDraft(fillPage);
        queueLive(0);
        if (key === "") $("[name=pgTitle]", pageForm).focus();
    }
    // campi della pagina aperta ⇄ { slug, title, description, hidden, menu, blocks } (per la home solo blocks)
    function fillPage(p: Data) {
        pageForm.reset();
        const slug = $("[name=pgSlug]", pageForm);
        $("[name=pgTitle]", pageForm).value = p.title ?? "";
        slug.value = p.slug ?? "";
        $<HTMLTextAreaElement>("[name=pgDesc]", pageForm).value = p.description ?? "";
        $("[name=pgHidden]", pageForm).checked = !!p.hidden;
        $("[name=pgMenu]", pageForm).checked = !!p.menu;
        if (pageKey === "") slug.dataset.auto = "1";
        else delete slug.dataset.auto;
        $("#pg-title").textContent = pageKey === "home" ? "Home" : p.title || "Nuova pagina";
        initBlocks($(".blocks-wrap", pageForm), p.blocks ?? []);
        initBg($(".bg[data-name=sfondo]", pageForm), p.sfondo);
    }
    function collectPage() {
        const blocks = readBlocks($(".blocks-wrap", pageForm));
        const sfondo = readBg($(".bg[data-name=sfondo]", pageForm));
        if (pageKey === "home") return { blocks, sfondo };
        const v = (n: string) => $(`[name=${n}]`, pageForm).value.trim() || undefined;
        return {
            slug: v("pgSlug")!, title: v("pgTitle")!, description: v("pgDesc"),
            hidden: $("[name=pgHidden]", pageForm).checked || undefined,
            menu: $("[name=pgMenu]", pageForm).checked || undefined,
            blocks,
            sfondo,
        };
    }
    pageForm.addEventListener("click", (e) => {
        const b = (e.target as Element).closest("button");
        if (!b) return;
        if (b.closest("summary")) e.preventDefault();
        if (editClick(b)) setDirty(true);
    });
    pageForm.addEventListener("change", (e) => editChange(e.target as HTMLInputElement));
    pageForm.addEventListener("input", (e) => {
        const t = e.target as HTMLInputElement;
        if (t.type === "file") return;
        setDirty(true);
        editInput(t);
        const slug = $("[name=pgSlug]", pageForm);
        if (t.name === "pgTitle") {
            $("#pg-title").textContent = t.value || "Nuova pagina";
            if (slug.dataset.auto) slug.value = slugify(t.value);
        }
        if (t === slug) delete slug.dataset.auto;
    });
    pageForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (pageKey === "home") {
            const { blocks, sfondo } = collectPage();
            return void saveSettings({ ...edits, home: blocks, sfondoHome: sfondo });
        }
        const { menu: want, ...p } = collectPage() as Data;
        if (settings.pagine.some((x: Data) => x.slug === p.slug && x.slug !== pageKey)) return say(`C'è già una pagina /${p.slug}: scegli un altro indirizzo.`, true);
        // stessa posizione nell'elenco; il menu segue indirizzo e spunta "Nel menu"
        const pagine = [...settings.pagine];
        const i = pagine.findIndex((x: Data) => x.slug === pageKey);
        i >= 0 ? (pagine[i] = p) : pagine.push(p);
        let nav = settings.nav.map((l: Data) => (pageKey && l.href === `/${pageKey}` ? { ...l, href: `/${p.slug}` } : l));
        const has = nav.some((l: Data) => l.href === `/${p.slug}`);
        if (want && !has) nav.splice(Math.max(0, nav.length - 1), 0, { label: p.title, href: `/${p.slug}` }); // prima del bottone finale
        if (!want) nav = nav.filter((l: Data) => l.href !== `/${p.slug}`);
        if (!(await saveSettings({ ...edits, pagine, nav }))) return;
        dropDraft(`mc_draft:pg:${pageKey}`); // la bozza di una pagina nuova o rinominata
        renderNav();
        pageKey = p.slug;
        history.replaceState(null, "", `#pagina-${p.slug}`);
        $("#pg-meta").textContent = `/${p.slug}`;
        const openA = $<HTMLAnchorElement>("#pg-open");
        openA.hidden = false;
        openA.href = `/${p.slug}`;
        $<HTMLElement>("#pg-del").hidden = false;
        renderPages();
    });
    $<HTMLButtonElement>("#pg-del").onclick = async () => {
        const p = settings.pagine.find((x: Data) => x.slug === pageKey);
        if (!p || !confirm(`Eliminare la pagina "${p.title}"?`)) return;
        const inMenuBefore = settings.nav.find((l: Data) => l.href === `/${p.slug}`);
        const ok = await saveSettings({
            pagine: settings.pagine.filter((x: Data) => x !== p),
            nav: settings.nav.filter((l: Data) => l.href !== `/${p.slug}`),
        });
        if (!ok) return;
        renderNav();
        say(`Pagina "${p.title}" eliminata.`, false, [
            "Annulla",
            async () => {
                const back = { pagine: [...settings.pagine, p], nav: inMenuBefore ? [...settings.nav.slice(0, -1), inMenuBefore, ...settings.nav.slice(-1)] : settings.nav };
                if (await saveSettings(back)) renderNav(), openPage(p.slug), history.replaceState(null, "", `#pagina-${p.slug}`);
            },
        ]);
        pageKey = "";
        $<HTMLElement>("#pg-del").hidden = true;
        renderPages();
        history.replaceState(null, "", location.pathname);
    };
    $<HTMLButtonElement>("#new-page").onclick = () => {
        history.replaceState(null, "", location.pathname);
        openPage("");
    };

    const fromHash = () => {
        adminEl.classList.remove("nav-open");
        const id = decodeURIComponent(location.hash.slice(1));
        if (id.startsWith("pagina-")) {
            const key = id.slice(7);
            if (view !== "page" || pageKey !== key) openPage(key);
            return;
        }
        const v = ({ impostazioni: "settings", pagine: "pages" } as const)[id];
        if (v) {
            if (view === v) return;
            if (!discardOk()) return history.replaceState(null, "", here());
            setDirty(false);
            edits = {};
            show(v);
            say("");
            if (v === "pages") {
                pageFrame.src = pageSel.value; // ricarica: niente modifiche scartate a schermo
                offerDraft((d) => { edits = d; pageFrame.src = pageSel.value; });
            } else {
                fillSettings(settings);
                offerDraft(fillSettings);
            }
            renderList();
            return;
        }
        const ev = eventi.find((x) => x.id === id);
        if (ev && (ev !== current || form.hidden)) open(ev);
    };
    addEventListener("hashchange", fromHash);
    renderList();
    renderTrash();
    fromHash();
}
