// The blog's two pieces of stage machinery, between its pages.
//
// 書架 is a secret door: on any blog page, following the 書架 tab splits a copy of the page down the middle, the halves slide
// apart onto a dark room, and the bookshelf page (reading.astro) fades in out of it. Its 「闔上暗門」 button fades the shelf out and
// goes back, where the halves slide together again: from the back/forward cache, the copy is still there, apart; on a fresh
// load it is built again.
//
// 關於我 is 推進山水: the words fade off the plaster, leaving the ink landscape, whose four layers push in to the about page's
// view (Landscape.astro, `near`); the about page opens on exactly that frame and fades its words in. Leaving the about page
// for 所有文章 pulls the camera back the same way.
//
// The page that starts a transition leaves a note in sessionStorage ('desk-arrive'); DeskLayout's head reads it before the
// next page paints and sets html[data-arrive], so that page begins where the transition left off. Modified clicks, middle
// clicks and reduced motion get plain navigation.

const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const DOOR_MS = 1100; // the halves parting (desk.css .door-leaf)
const ZOOM_MS = 1300; // the layers pushing in (desk.css .zoom-fx svg)

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const page = () => document.querySelector('.desk-page');
const go = (href, arrive) => {
  try { sessionStorage.setItem('desk-arrive', arrive); } catch {}
  location.href = href;
};
const plainClick = (e) => e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey;
let busy = false;

/** Two copies of the page at the current scroll, each clipped to one half; `apart` starts them slid away. */
function buildDoor(apart) {
  const src = page();
  const fx = document.createElement('div');
  fx.className = 'door-fx';
  fx.setAttribute('aria-hidden', 'true');
  const room = document.createElement('div');
  room.className = 'door-room';
  fx.append(room);
  for (const side of ['l', 'r']) {
    const leaf = document.createElement('div');
    leaf.className = `door-leaf door-${side}` + (apart ? ' is-apart' : '');
    const pane = document.createElement('div');
    pane.className = 'door-pane';
    const copy = src.cloneNode(true);
    copy.classList.add('door-copy');
    copy.style.top = `${-window.scrollY}px`;
    copy.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'));
    copy.inert = true;
    pane.append(copy);
    const edge = document.createElement('i');
    edge.className = 'door-edge';
    leaf.append(pane, edge);
    fx.append(leaf);
  }
  const seam = document.createElement('i');
  seam.className = 'door-seam';
  fx.append(seam);
  document.body.append(fx);
  return fx;
}

async function openDoor(href) {
  busy = true;
  const fx = buildDoor(false);
  fx.getBoundingClientRect(); // commit the closed state before it moves
  fx.classList.add('is-opening');
  await wait(280);
  fx.querySelectorAll('.door-leaf').forEach((l) => l.classList.add('is-apart'));
  await wait(DOOR_MS + 60);
  go(href, 'door-open');
}

async function closeDoor() {
  const fx = document.querySelector('.door-fx') ?? buildDoor(true);
  document.documentElement.removeAttribute('data-arrive'); // the real page, under the copy
  fx.classList.remove('is-opening');
  fx.getBoundingClientRect();
  await wait(80);
  fx.querySelectorAll('.door-leaf').forEach((l) => l.classList.remove('is-apart'));
  await wait(DOOR_MS + 80);
  fx.remove();
  busy = false;
}

/** The shelf fades back into the dark, then the page the door was opened from (or 所有文章) closes over it. */
async function leaveShelf() {
  busy = true;
  document.querySelector('.shelf-room')?.classList.add('is-leaving');
  await wait(450);
  let back = null;
  try {
    const ref = document.referrer ? new URL(document.referrer) : null;
    if (ref && ref.origin === location.origin && !ref.pathname.startsWith('/reading/')) back = ref;
  } catch {}
  try { sessionStorage.setItem('desk-arrive', 'door-close'); } catch {}
  if (back && history.length > 1) history.back();
  else location.href = back ? back.href : '/';
}

/** A copy of the landscape over a plaster veil, its layers gliding to the other view; then the next page. */
async function zoomTo(href, near) {
  busy = true;
  const land = page()?.querySelector('.ink-land');
  const fx = document.createElement('div');
  fx.className = 'zoom-fx';
  fx.setAttribute('aria-hidden', 'true');
  if (land) fx.append(land.cloneNode(true));
  document.body.append(fx);
  fx.getBoundingClientRect();
  fx.classList.add('is-on');
  await wait(360);
  fx.querySelector('.ink-land')?.classList.toggle('is-near', near);
  await wait(ZOOM_MS + 50);
  go(href, 'zoom');
}

/** Back here from the back/forward cache with the veil still up: glide the layers back and lift it. */
async function unzoom(fx) {
  const copy = fx.querySelector('.ink-land');
  const near = !!page()?.querySelector('.ink-land.is-near');
  copy?.classList.toggle('is-near', near);
  await wait(ZOOM_MS);
  fx.classList.remove('is-on');
  await wait(400);
  fx.remove();
  busy = false;
}

document.addEventListener('click', (e) => {
  if (busy) { if (e.target.closest('a, [data-door-close]')) e.preventDefault(); return; }
  if (e.target.closest('[data-door-close]')) {
    e.preventDefault();
    leaveShelf();
    return;
  }
  if (reduce.matches || plainClick(e)) return;
  const a = e.target.closest('a[href]');
  if (!a || !page()) return;
  const onShelf = !!document.querySelector('.shelf-room');
  const onAbout = !!page().querySelector('.ink-land.is-near');
  if (a.matches('.blog-tabs [data-tab="reading"]') && !onShelf) {
    e.preventDefault();
    openDoor(a.href);
  } else if (a.matches('.blog-tabs [data-tab="about"]') && !onAbout && !onShelf) {
    e.preventDefault();
    zoomTo(a.href, true);
  } else if (onAbout && a.matches('.blog-tabs [data-tab="archive"], .blog-brand')) {
    e.preventDefault();
    zoomTo(a.href, false);
  }
});

// Arriving back through the door on a fresh load: the copy is built apart and closes.
const arrive = document.documentElement.getAttribute('data-arrive');
if (arrive === 'door-close') closeDoor();
// The fade-ins (desk.css, reading.css) end by themselves; if this page never gets to paint them (a tab left in the
// background), dropping the note shows the page as it is anyway.
if (arrive === 'zoom' || arrive === 'door-open') setTimeout(() => document.documentElement.removeAttribute('data-arrive'), 1600);

// Back from the bookshelf or the about page out of the back/forward cache: whatever was mid-air finishes in reverse.
addEventListener('pageshow', (e) => {
  if (!e.persisted) return;
  try { sessionStorage.removeItem('desk-arrive'); } catch {}
  document.documentElement.removeAttribute('data-arrive');
  document.querySelector('.shelf-room')?.classList.remove('is-leaving');
  const door = document.querySelector('.door-fx');
  const zoom = document.querySelector('.zoom-fx');
  if (door) closeDoor();
  else if (zoom) unzoom(zoom);
  else busy = false;
});
