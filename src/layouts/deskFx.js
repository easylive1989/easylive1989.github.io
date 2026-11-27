// The blog's stage machinery, between its pages.
//
// 關於我 is 推進山水: the words fade off the plaster, leaving the ink landscape, whose four layers push in to the about page's
// view (Landscape.astro, `near`); the about page opens on exactly that frame and fades its words in. Leaving the about page
// for 所有文章 pulls the camera back the same way.
//
// The masthead stays on the screen through all of it (desk.css pins it above the veils): its ink stone slides to the tab
// being opened. A tab with no transition of its own waits for the stone to arrive before the page changes.
//
// The page that starts a transition leaves a note in sessionStorage ('desk-arrive'); DeskLayout's head reads it before the
// next page paints and sets html[data-arrive], so that page begins where the transition left off. Modified clicks, middle
// clicks and reduced motion get plain navigation.

const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const ZOOM_MS = 1300; // the layers pushing in (desk.css .zoom-fx svg)

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const page = () => document.querySelector('.desk-page');
const go = (href, arrive) => {
  try { sessionStorage.setItem('desk-arrive', arrive); } catch {}
  location.href = href;
};
const plainClick = (e) => e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey;
let busy = false;
const SLIDE_MS = 320; // the ink stone most of the way to its tab (desk.css .blog-tabs-ink)

/** The masthead's ink stone slides to the tab `a` (or back to the page's own, with none). */
function slideInk(a) {
  const nav = document.querySelector('.blog-tabs');
  if (!nav) return;
  const tabs = [...nav.querySelectorAll('a[data-tab]')];
  const i = a ? tabs.indexOf(a) : Number(nav.dataset.i);
  if (i < 0) return;
  nav.style.setProperty('--i', String(i));
  tabs.forEach((t, j) => t.classList.toggle('on', j === i));
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
  if (busy) { if (e.target.closest('a')) e.preventDefault(); return; }
  if (reduce.matches || plainClick(e)) return;
  const a = e.target.closest('a[href]');
  if (!a || !page()) return;
  const onAbout = !!page().querySelector('.ink-land.is-near');
  const tab = a.matches('.blog-tabs a[data-tab]') ? a : a.matches('.blog-brand') ? document.querySelector('.blog-tabs [data-tab="archive"]') : null;
  if (!tab) return;
  if (tab.matches('[data-tab="about"]') && !onAbout) {
    e.preventDefault();
    slideInk(tab);
    zoomTo(a.href, true);
  } else if (onAbout && tab.matches('[data-tab="archive"]')) {
    e.preventDefault();
    slideInk(tab);
    zoomTo(a.href, false);
  } else if (a.href !== location.href) {
    // no transition of its own (an article back to 所有文章): the stone slides, then the page changes
    e.preventDefault();
    busy = true;
    slideInk(tab);
    setTimeout(() => { location.href = a.href; }, tab.classList.contains('on') && tab.getAttribute('aria-current') ? 0 : SLIDE_MS);
  }
});

// The fade-ins (desk.css) end by themselves; if this page never gets to paint them (a tab left in the
// background), dropping the note shows the page as it is anyway.
const arrive = document.documentElement.getAttribute('data-arrive');
if (arrive === 'zoom') setTimeout(() => document.documentElement.removeAttribute('data-arrive'), 1600);

// Back from the about page out of the back/forward cache: whatever was mid-air finishes in reverse.
addEventListener('pageshow', (e) => {
  if (!e.persisted) return;
  try { sessionStorage.removeItem('desk-arrive'); } catch {}
  document.documentElement.removeAttribute('data-arrive');
  slideInk(null);
  const zoom = document.querySelector('.zoom-fx');
  if (zoom) unzoom(zoom);
  else busy = false;
});
