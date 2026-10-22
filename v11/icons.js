/** Icônes d'interface homogènes SVG, sans police ni dépendance externe. */
const paths={
 packs:'<rect x="4" y="2" width="16" height="20" rx="3"/><path d="M8 7h8M8 11h8M10 16l2-2 2 2"/>',
 collection:'<rect x="4" y="5" width="13" height="16" rx="2"/><path d="M8 2h10a2 2 0 0 1 2 2v13M8 10h5M8 14h5"/>',
 albums:'<path d="M12 7v14M3 18V5a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v16M21 18V5a2 2 0 0 0-2-2h-5a2 2 0 0 0-2 2M5 17h5M14 17h5"/>',
 catalog:'<circle cx="11" cy="11" r="7.5"/><path d="m16.7 16.7 4.5 4.5"/>',
 wishlist:'<path d="m12 3 2.8 5.7 6.3.9-4.6 4.5 1.1 6.4L12 17.5l-5.6 3 1.1-6.4-4.6-4.5 6.3-.9L12 3Z"/>',
 market:'<path d="M4 9 6 3h12l2 6M4 9v12h16V9M4 9h16M9 9v3a3 3 0 0 0 6 0V9"/>',
 community:'<circle cx="9" cy="8" r="3"/><path d="M3 21v-2a6 6 0 0 1 12 0v2M16 5.2a3 3 0 0 1 0 5.6M18 15a5 5 0 0 1 3 4.5V21"/>',
 games:'<path d="M7 8h10a5 5 0 0 1 4.8 3.5l1.2 4.9a3 3 0 0 1-4.6 3.3L15 17H9l-3.4 2.7a3 3 0 0 1-4.6-3.3l1.2-4.9A5 5 0 0 1 7 8Z"/><path d="M7 11v6M4 14h6M16 12h.01M19 15h.01"/>',
 quests:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
 fusion:'<path d="m3 21 9-9M14 3l1 4 4 1-4 1-1 4-1-4-4-1 4-1 1-4ZM20 14l.7 2.3L23 17l-2.3.7L20 20l-.7-2.3L17 17l2.3-.7L20 14ZM2 8l.6 1.4L4 10l-1.4.6L2 12l-.6-1.4L0 10l1.4-.6L2 8Z"/>',
 rankings:'<path d="M8 20h8M12 17v3M8 3h8v8a4 4 0 0 1-8 0V3ZM8 6H4v2a4 4 0 0 0 4 4M16 6h4v2a4 4 0 0 1-4 4"/>',
 profile:'<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
 store:'<path d="M6 3h12l5 7-11 12L1 10l5-7ZM1 10h22M6 3l6 19L18 3"/>',
 settings:'<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="2"/><circle cx="16" cy="17" r="2"/>'
};
export function navigationIcon(key,fallback='✦'){
 const path=paths[key];
 return path?'<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">'+path+'</svg>':fallback;
}
