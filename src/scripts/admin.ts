// Logica di /admin (vanilla, nessun framework). Markup e <template> in src/pages/admin.astro.
import { actions, isInputError } from "astro:actions";
import { BASE_FONTS, dateLabel, imgStyle, md, nextDate, slugify, STATUS_TEXT, today, type Img } from "../lib/format";
import type { Version } from "../lib/db";
import type { Evento } from "../lib/schema";

type Data = Record<string, any>;
const $ = <T extends Element = HTMLInputElement>(sel: string, root: ParentNode = document) => root.querySelector<T>(sel)!;
const $$ = <T extends Element = HTMLInputElement>(sel: string, root: ParentNode = document) => [...root.querySelectorAll<T>(sel)];
const clone = (id: string) => $<HTMLTemplateElement>(`#tpl-${id}`).content.firstElementChild!.cloneNode(true) as HTMLElement;
const form = document.querySelector<HTMLFormElement>("#editor");
const settingsForm = $<HTMLFormElement>("#settings");
const pagesView = $<HTMLElement>("#pages");

if (form) {
    const init = JSON.parse($("#admin-data").textContent!) as { eventi: Evento[]; deleted: Version[]; settings: Data };
    const eventi = init.eventi;
    let deleted = init.deleted;
    let settings = init.settings; // impostazioni salvate; ogni vista salva le sue modifiche sopra queste
    let view: "editor" | "settings" | "pages" | "empty" = "empty";
    const oggi = today();
    let current: Evento | undefined; // evento salvato aperto nel form (undefined = nuovo)
    let versions: Version[] = [];
    let dirty = false;
    let msg = $<HTMLElement>(".msg", form);
    const slugEl = $("[name=slug]", form);

    // ── utilità
    const fmtTime = (s: number) =>
        new Date(s * 1000).toLocaleString("it-IT", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
    const discardOk = () => !dirty || confirm("Ci sono modifiche non salvate. Vuoi scartarle?");
    function say(text: string, err = false, action?: [string, () => void]) {
        msg.textContent = text;
        msg.classList.toggle("err", err);
        if (action) msg.append(" ", Object.assign(document.createElement("button"), { type: "button", textContent: action[0], onclick: action[1] }));
    }
    const savedAt = () => new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
    function setDirty(v: boolean) {
        dirty = v;
        $<HTMLElement>("#dirty").hidden = !v;
        document.title = (v ? "● " : "") + "Moderatori · Memento Convivium";
        if (v) queuePrev();
    }
    addEventListener("beforeunload", (e) => dirty && e.preventDefault());

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
    async function shrink(file: File): Promise<Blob> {
        const bmp = await createImageBitmap(file);
        const k = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
        const c = new OffscreenCanvas(Math.round(bmp.width * k), Math.round(bmp.height * k));
        c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
        const webp = await c.convertToBlob({ type: "image/webp", quality: 0.8 });
        // Safari non codifica webp: ripiega su jpeg
        return webp.type === "image/webp" ? webp : c.convertToBlob({ type: "image/jpeg", quality: 0.82 });
    }
    async function upload(file: File | undefined, box: HTMLElement): Promise<string | undefined> {
        if (!file?.type.startsWith("image/")) return void say("Serve un file immagine (jpg, png, webp…).", true);
        box.classList.add("busy");
        say("Caricamento immagine…");
        try {
            const blob = await shrink(file);
            const fd = new FormData();
            fd.append("file", new File([blob], "img", { type: blob.type }));
            const { data, error } = await actions.uploadImage(fd);
            if (error) return void say(error.message, true);
            setDirty(true);
            say("Immagine caricata: ricorda di salvare.");
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
        // stessa inquadratura dal vivo sulle immagini dell'anteprima vera (copertina, card della timeline)
        $<HTMLIFrameElement>("iframe", cropView).contentDocument
            ?.querySelectorAll<HTMLImageElement>(`img[src="${CSS.escape(crop.src)}"]`)
            .forEach((im) => (im.style.cssText = imgStyle({ ...crop, x, y })));
    }
    function openCrop(box: HTMLElement) {
        const i = getImg(box);
        if (!i) return;
        cropBox = box;
        crop = { ...i };
        $<HTMLImageElement>("img", cropSrc).src = $<HTMLImageElement>("img", cropPrev).src = i.src;
        cropPrev.dataset.shape = box.dataset.shape;
        cropView.hidden = !("preview" in box.dataset);
        cropDlg.classList.toggle("with-prev", !cropView.hidden);
        drawCrop();
        cropDlg.showModal();
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

    // ── anteprima vera: /admin/anteprima renderizza intestazione e card coi componenti del sito.
    // L'iframe è largo come una pagina (PREV_W) e viene rimpicciolito per stare nel riquadro.
    const PREV_W = 1200;
    async function renderPrev(wrap: HTMLElement) {
        const frame = $<HTMLIFrameElement>("iframe", wrap);
        const seq = String(Number(wrap.dataset.seq ?? 0) + 1);
        wrap.dataset.seq = seq;
        const res = await fetch("/admin/anteprima", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(collect()) });
        const html = res.ok ? await res.text() : "<p>Sessione scaduta: ricarica la pagina e rientra.</p>";
        if (wrap.dataset.seq !== seq) return; // nel frattempo è partita un'anteprima più recente
        const doc = frame.contentDocument;
        if (doc?.querySelector("main")) {
            // già caricata: si sostituisce solo il contenuto, così non lampeggia
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
        const main = frame.contentDocument?.querySelector("main");
        if (!main) return;
        const k = Math.min(1, wrap.clientWidth / PREV_W);
        const h = main.getBoundingClientRect().height;
        frame.style.cssText = `height:${h}px;transform:scale(${k})`;
        wrap.style.height = `${h * k}px`;
    }
    addEventListener("resize", () => $$<HTMLElement>(".prev").forEach(fitPrev));
    const prevSec = $<HTMLDetailsElement>("#prev-sec");
    let prevTimer = 0;
    function queuePrev() {
        clearTimeout(prevTimer);
        if (prevSec.open && !form!.hidden) prevTimer = window.setTimeout(() => renderPrev($<HTMLElement>(".prev", prevSec)), 500);
    }
    prevSec.ontoggle = queuePrev;

    // ── sfondo: colore (facoltativo), immagine inquadrata, velo chiaro
    function initBg(box: HTMLElement, b: Data = {}) {
        box.replaceChildren($<HTMLTemplateElement>("#tpl-bg").content.cloneNode(true));
        $(".bg-label", box).textContent = box.dataset.label ?? "";
        $("[name=bgOn]", box).checked = !!b.color;
        if (b.color) $("[name=bgColor]", box).value = b.color;
        $("[name=bgVeil]", box).value = String(b.veil ?? 0);
        $("output", box).textContent = `${b.veil ?? 0}%`;
        $("[name=anim]", box).value = b.anim ?? "";
        $("[name=fx]", box).value = b.fx ?? "";
        initImg($<HTMLElement>(".img", box), b.image);
    }
    function readBg(box: Element) {
        const color = $("[name=bgOn]", box).checked ? $("[name=bgColor]", box).value : undefined;
        const image = getImg($(".img", box));
        const veil = Number($("[name=bgVeil]", box).value) || undefined;
        const anim = $("[name=anim]", box).value || undefined;
        const fx = $("[name=fx]", box).value || undefined;
        return color || image || anim || fx ? { color, image, veil, anim, fx } : undefined;
    }

    // ── righe ripetibili (date, personaggi, foto della galleria)
    function addRow(kind: "date" | "char" | "shot", into: Element, v: Data = {}) {
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

    // ── schede
    const PRESETS: Record<string, Data> = {
        storia: { title: "La storia", template: "testo" },
        abiti: { title: "Gli abiti dell'epoca", template: "galleria" },
        personaggi: { title: "Personaggi", template: "personaggi", body: "Ogni ospite riceverà la propria scheda via email.\nQuesti sono i volti che troverai al banchetto." },
        galleria: { title: "Galleria", template: "galleria" },
        testo: { title: "Nuova scheda", template: "testo" },
    };
    function addTab(t: Data, open = false) {
        const el = clone("tab") as HTMLDetailsElement;
        el.open = open;
        $("[name=tabTitle]", el).value = t.title ?? "";
        $("[name=template]", el).value = t.template ?? "testo";
        $<HTMLTextAreaElement>("[name=tabBody]", el).value = t.body ?? "";
        initImg($<HTMLElement>(".only-testo", el), t.image);
        t.gallery?.forEach((g: Data) => addRow("shot", $(".shots", el), g));
        t.characters?.forEach((c: Data) => addRow("char", $(".chars", el), c));
        initBg($<HTMLElement>(".bg", el), t.background);
        $("#tabs", form!).append(el);
        markTab(el);
        return el;
    }
    function markTab(el: Element) {
        const tpl = $<HTMLSelectElement>("[name=template]", el);
        el.setAttribute("data-tpl", tpl.value);
        const n = tpl.value === "galleria" ? $$(".shots > .row", el).length : tpl.value === "personaggi" ? $$(".chars > .row", el).length : 0;
        $(".tab-name", el).textContent =
            ($("[name=tabTitle]", el).value || "Senza titolo") + " · " + tpl.selectedOptions[0].text + (n ? ` (${n})` : "");
        $(".md-label", el).textContent = tpl.value === "testo" ? "Testo" : "Introduzione (facoltativa)";
    }

    // ── clic: aggiungi/sposta/rimuovi righe e schede, markdown, inquadratura, font
    form.addEventListener("click", (e) => {
        const b = (e.target as Element).closest("button");
        if (!b) return;
        if (b.closest("summary")) e.preventDefault(); // i bottoni nel titolo della scheda non la chiudono
        const row = b.closest(".row, .tab-ed");
        const tab = b.closest(".tab-ed");
        if (b.dataset.add === "date") {
            // la nuova data copia luogo e quota dall'ultima
            const last = $$("#dates > .row", form).pop();
            const r = addRow("date", $("#dates", form), last ? { location: $("[name=location]", last).value, price: $("[name=price]", last).value } : {});
            $("[name=dateISO]", r).focus();
        } else if (b.dataset.add === "char") $("[name=name]", addRow("char", $(".chars", tab!))).focus();
        else if (b.dataset.add === "tab") {
            const el = addTab(PRESETS[b.dataset.preset!], true);
            $("[name=tabTitle]", el).select();
            el.scrollIntoView({ block: "nearest" });
        } else if ("crop" in b.dataset) return openCrop(b.closest<HTMLElement>(".img")!);
        else if ("clear" in b.dataset) setImg(b.closest<HTMLElement>(".img")!);
        else if (b.dataset.font) return openFonts(b.dataset.font);
        else if (b.dataset.md) return mdTool(b.dataset.md, b.closest(".md")!);
        else if (row && "rm" in b.dataset) {
            if (row.matches(".tab-ed") && !confirm(`Rimuovere la scheda "${$("[name=tabTitle]", row).value}"?`)) return;
            row.remove();
        } else if (row && "up" in b.dataset) row.previousElementSibling?.before(row);
        else if (row && "down" in b.dataset) row.nextElementSibling?.after(row);
        else return;
        if (tab?.isConnected) markTab(tab);
        setDirty(true);
    });

    // galleria: più foto insieme, una riga per foto
    form.addEventListener("change", async (e) => {
        const t = e.target as HTMLInputElement;
        if (t.name === "titleFont" || t.name === "characterFont") return fontSample(t.name);
        if (!("multi" in t.dataset)) return;
        const tab = t.closest(".tab-ed")!;
        const files = [...(t.files ?? [])];
        t.value = "";
        for (const f of files) {
            const url = await upload(f, tab as HTMLElement);
            if (url) addRow("shot", $(".shots", tab), { image: { src: url } });
        }
        markTab(tab);
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
        if (t.name === "tabBody") renderPreview(t.closest(".md")!);
        if (t.name === "tabTitle" || t.name === "template") markTab(t.closest(".tab-ed")!);
        if (t.name === "bgVeil") t.previousElementSibling!.textContent = `${t.value}%`;
        if (t.name === "bgColor") $("[name=bgOn]", t.closest(".bg-row")!).checked = true;
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
    let fontTarget = "";
    const loaded = new Set<string>();
    const loadFont = (href: string) => {
        if (loaded.has(href)) return;
        loaded.add(href);
        document.head.append(Object.assign(document.createElement("link"), { rel: "stylesheet", href }));
    };
    function openFonts(name: string) {
        fontTarget = name;
        loadFont(fontDlg.dataset.href!);
        const sample = $("[name=title]", form!).value || "Memento Convivium";
        $$<HTMLElement>("[data-pick] span", fontDlg).forEach((s) => (s.textContent = sample));
        const cur = $(`[name=${name}]`, form!).value;
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
        const input = $(`[name=${fontTarget}]`, form!);
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

    // dialog: chiudi con ✕/Annulla o cliccando fuori
    for (const d of [cropDlg, fontDlg]) {
        d.addEventListener("click", (e) => {
            if (e.target === d || (e.target as Element).closest("[data-close]")) d.close();
        });
    }

    // ── form ⇄ dati
    function fill(d: Data, slug: string) {
        form!.reset();
        form!.querySelectorAll("#dates, #tabs, fieldset > .img").forEach((r) => r.replaceChildren());
        for (const el of $$("fieldset > label > [name], .font-field > label > [name]", form!)) {
            el.value = el.name === "includes" ? (d.includes ?? []).join("\n") : String(d[el.name] ?? "");
        }
        slugEl.value = slug;
        $("[name=status]", form!).value = d.status ?? "bozza";
        d.dates?.forEach((x: Data) => addRow("date", $("#dates", form!), x));
        (d.tabs as Data[] | undefined)?.forEach((t) => addTab(t));
        for (const box of $$<HTMLElement>("fieldset > .img", form!)) initImg(box, d[box.dataset.name!]);
        for (const box of $$<HTMLElement>("fieldset > .bg", form!)) initBg(box, d[box.dataset.name!]);
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
                background: readBg($("fieldset > .bg[data-name=background]", form!)),
                heroStyle: readBg($("fieldset > .bg[data-name=heroStyle]", form!)),
                titleFont: val("titleFont"), characterFont: val("characterFont"),
                // i contenuti degli altri modelli non vengono salvati: la scheda tiene solo quelli del suo modello
                tabs: $$("#tabs > .tab-ed", form!).map((t) => {
                    const template = val("template", t)!;
                    return {
                        title: val("tabTitle", t), template,
                        body: $<HTMLTextAreaElement>("[name=tabBody]", t).value.trim() || undefined,
                        image: template === "testo" ? img("tabImage", t) : undefined,
                        gallery: template === "galleria" ? list(rows(".shots", t).map((r) => ({ image: img("shot", r), caption: val("caption", r) })).filter((g) => g.image)) : undefined,
                        characters: template === "personaggi" ? list(rows(".chars", t).map((r) => ({ name: val("name", r), role: val("role", r), hint: val("hint", r), portrait: img("portrait", r) }))) : undefined,
                        background: readBg($(".bg", t)),
                    };
                }),
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
        $<HTMLElement>("#empty").hidden = v !== "empty";
        $$<HTMLElement>(".view-link").forEach((a) => a.classList.toggle("on", a.dataset.view === v));
        msg = $<HTMLElement>(".msg", { editor: form!, settings: settingsForm, pages: pagesView, empty: form! }[v]);
    }
    // indirizzo della vista aperta, per tornarci se si annulla un cambio di vista
    const here = () => ({ editor: `#${current?.id ?? ""}`, settings: "#impostazioni", pages: "#pagine", empty: location.pathname })[view];

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
        queuePrev();
        say(o.note ?? "");
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
        setCurrent(saved);
        setDirty(false);
        history.replaceState(null, "", `#${saved.id}`);
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
        }
    });

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
        if (b?.dataset.add === "nav") {
            const r = clone("nav");
            r.append(clone("btns"));
            $("#nav", settingsForm).append(r);
            $("input", r).focus();
        } else if (row && b && "rm" in b.dataset) row.remove();
        else if (row && b && "up" in b.dataset) row.previousElementSibling?.before(row);
        else if (row && b && "down" in b.dataset) row.nextElementSibling?.after(row);
    });
    // salva le impostazioni: quelle già salvate + le modifiche della vista (form o testi delle pagine)
    async function saveSettings(changes: Data) {
        say("Salvataggio…");
        const next = { ...settings, ...changes };
        const { error } = await actions.saveSettings(next as any);
        if (error) return say(isInputError(error) ? "Controlla i campi: " + Object.keys(error.fields).join(", ") : error.message, true);
        settings = next;
        edits = {};
        setDirty(false);
        say(`Salvato alle ${savedAt()} ✓ (il sito si aggiorna entro un minuto)`);
    }
    settingsForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const v = (n: string, root: ParentNode = settingsForm) => $(`[name=${n}]`, root).value.trim() || undefined;
        saveSettings({
            email: v("email"), phone: v("phone"), whatsapp: v("whatsapp") ?? "",
            instagram: v("instagram") ?? "", bookingUrl: v("bookingUrl") ?? "",
            heroAction: heroAction.value, heroUrl: v("heroUrl") ?? "",
            nav: $$(".row", $("#nav", settingsForm)).map((r) => ({ label: v("label", r), href: v("href", r) })),
        });
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
            if (b.image) d.append(Object.assign(doc.createElement("img"), { src: b.image.src, alt: "", style: imgStyle(b.image) }));
            if (b.veil) d.append(Object.assign(doc.createElement("span"), { style: `background:rgb(245 242 236 / ${b.veil}%)` }));
            el.prepend(d);
        }
        for (const k of ["anim", "fx"]) b?.[k] ? el.setAttribute(`data-${k}`, b[k]) : el.removeAttribute(`data-${k}`);
        if (replay && b?.anim) {
            el.classList.remove("in");
            void el.offsetWidth; // riparte la transizione
            requestAnimationFrame(() => el.classList.add("in"));
        } else el.classList.add("in");
    }
    sezDlg.addEventListener("click", (e) => {
        const b = (e.target as Element).closest("button");
        if (b && "crop" in b.dataset) openCrop(b.closest<HTMLElement>(".img")!);
        else if (b && "clear" in b.dataset) setImg(b.closest<HTMLElement>(".img")!);
    });
    sezDlg.addEventListener("input", (e) => {
        const t = e.target as HTMLInputElement;
        if (t.name === "bgVeil") t.previousElementSibling!.textContent = `${t.value}%`;
        if (t.name === "bgColor") $("[name=bgOn]", sezBox).checked = true;
    });
    sezDlg.onclose = () => {
        if (sezDlg.returnValue !== "ok" || !sezEl) return;
        const v = readBg(sezBox);
        edits.sezioni = { ...sezioni(), [sezEl.dataset.sez!]: v };
        // stessa chiave in più pagine (es. prenota): si aggiorna tutto quello che si vede
        for (const el of sezEl.ownerDocument.querySelectorAll<HTMLElement>(`[data-sez="${sezEl.dataset.sez}"]`)) paintSez(el, v, true);
        setDirty(true);
    };
    pageSel.onchange = () => (pageFrame.src = pageSel.value);
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
            b.onclick = () => {
                sezEl = el;
                initBg(sezBox, sezioni()[el.dataset.sez!]);
                sezDlg.returnValue = "";
                sezDlg.showModal();
            };
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
    $<HTMLButtonElement>("#pages-save").onclick = () => saveSettings(edits);

    const fromHash = () => {
        const id = decodeURIComponent(location.hash.slice(1));
        const v = ({ impostazioni: "settings", pagine: "pages" } as const)[id];
        if (v) {
            if (view === v) return;
            if (!discardOk()) return history.replaceState(null, "", here());
            setDirty(false);
            edits = {};
            show(v);
            if (v === "pages") pageFrame.src = pageSel.value; // ricarica: niente modifiche scartate a schermo
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
