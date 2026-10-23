const nav = document.getElementById('nav');
const toggle = document.getElementById('navToggle');
const menu = document.getElementById('navMenu');
const backdrop = document.getElementById('navBackdrop');
const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 40);
window.addEventListener('scroll', onScroll, {passive:true}); onScroll();
const closeMenu = () => {menu.classList.remove('open');toggle.classList.remove('open');backdrop.classList.remove('open');toggle.setAttribute('aria-expanded','false');document.body.style.overflow='';};
const openMenu = () => {menu.classList.add('open');toggle.classList.add('open');backdrop.classList.add('open');toggle.setAttribute('aria-expanded','true');document.body.style.overflow='hidden';};
toggle.addEventListener('click',()=>menu.classList.contains('open')?closeMenu():openMenu());
backdrop.addEventListener('click',closeMenu);
menu.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMenu));
document.addEventListener('keydown',e=>{if(!menu.classList.contains('open'))return;if(e.key==='Escape'){closeMenu();toggle.focus();}if(e.key==='Tab'){const links=[...menu.querySelectorAll('a')];if(e.shiftKey&&document.activeElement===toggle){e.preventDefault();links.at(-1).focus();}else if(!e.shiftKey&&document.activeElement===links.at(-1)){e.preventDefault();toggle.focus();}}});
matchMedia('(max-width:920px)').addEventListener('change',()=>closeMenu());

document.documentElement.classList.add('nav-ready');
