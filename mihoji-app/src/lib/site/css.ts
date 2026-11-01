import { resolveTheme, type Palette, type StyleDef } from './themes';
import type { SectionType, StyleId } from './schema';

function fontFace(font: { family: string; file: string }, fontBase: string): string {
  return `@font-face{font-family:'${font.family}';src:url(${fontBase}/${font.file}) format('woff2');font-weight:100 900;font-style:normal;font-display:swap}`;
}

function tokens(style: StyleDef, palette: Palette): string {
  const colors: Record<string, string> = {
    '--bg': palette.bg, '--surface': palette.surface, '--alt': palette.alt, '--text': palette.text, '--muted': palette.muted,
    '--primary': palette.primary, '--on-primary': palette.onPrimary, '--accent': palette.accent, '--on-accent': palette.onAccent,
    '--inverse': palette.inverse, '--on-inverse': palette.onInverse, '--on-inverse-muted': palette.onInverseMuted,
    '--font-heading': `'${style.fonts.heading.family}', ${style.fonts.heading.fallback}`,
    '--font-body': `'${style.fonts.body.family}', ${style.fonts.body.fallback}`,
    '--container': '1120px',
  };
  return `:root{${Object.entries({ ...colors, ...style.tokens }).map(([name, value]) => `${name}:${value}`).join(';')};--line:color-mix(in srgb,var(--text) 14%,transparent)}`;
}

const BASE = `
*,*::before,*::after{box-sizing:border-box}
html{-webkit-text-size-adjust:100%;scroll-behavior:smooth;scroll-padding-top:5rem}
body{margin:0;background:var(--bg);color:var(--text);font-family:var(--font-body);font-size:1.0625rem;line-height:1.65;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
img,svg{max-width:100%}
h1,h2,h3{font-family:var(--font-heading);font-weight:var(--hw);letter-spacing:var(--hls);line-height:1.12;margin:0;text-wrap:balance}
h1{font-size:var(--h1)}h2{font-size:var(--h2)}h3{font-size:var(--h3);line-height:1.25}
p{margin:0;text-wrap:pretty}ul,ol{margin:0;padding:0;list-style:none}
a{color:var(--primary);text-underline-offset:.2em}
.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.skip{position:absolute;left:1rem;top:-4rem;background:var(--primary);color:var(--on-primary);padding:.75rem 1rem;border-radius:var(--r-sm);z-index:100}.skip:focus{top:1rem}
.wrap{width:min(100% - 2.5rem,var(--container));margin-inline:auto}
.s{padding-block:var(--sy);background:var(--bg);color:var(--text)}
.tone-alt{background:var(--alt)}
.tone-inverse{background:var(--inverse);color:var(--on-inverse)}
.tone-inverse h1,.tone-inverse h2,.tone-inverse h3{color:var(--on-inverse)}
.tone-inverse p,.tone-inverse .lead{color:var(--on-inverse-muted)}
.tone-inverse a:not(.btn){color:var(--accent)}
.s-head{max-width:44rem;margin-bottom:clamp(2.25rem,4.5vw,3.75rem)}
.s-head.center{margin-inline:auto;text-align:center}
.eyebrow{font-size:var(--eyebrow-size);font-weight:700;letter-spacing:var(--eyebrow-ls);text-transform:var(--eyebrow-tt);color:var(--primary);margin-bottom:.85rem}
.tone-inverse .eyebrow{color:var(--accent)}
.lead{font-size:1.1875rem;line-height:1.6;color:var(--muted);margin-top:1.1rem}
.ic{width:1.5rem;height:1.5rem;flex:none}
.actions{display:flex;flex-wrap:wrap;gap:.9rem;margin-top:2rem}
.btn{display:inline-flex;align-items:center;justify-content:center;min-height:3rem;padding:var(--btn-pad);border:2px solid transparent;border-radius:var(--btn-r);font-family:var(--font-body);font-size:1rem;font-weight:var(--btn-w);line-height:1.1;text-transform:var(--btn-tt);letter-spacing:var(--btn-ls);text-decoration:none;cursor:pointer;transition:transform .15s ease,filter .15s ease,box-shadow .15s ease}
.btn:hover{transform:translateY(-2px);filter:brightness(.94)}
.btn-primary{background:var(--primary);color:var(--on-primary);box-shadow:var(--btn-shadow)}
.btn-accent{background:var(--accent);color:var(--on-accent);box-shadow:var(--btn-shadow)}
.btn-ghost{background:transparent;color:var(--text);border-color:color-mix(in srgb,var(--text) 30%,transparent)}
.tone-inverse .btn-ghost,.s-hero--photo .btn-ghost,.s-cta--banner .btn-ghost{color:var(--on-inverse);border-color:color-mix(in srgb,var(--on-inverse) 55%,transparent)}
.tone-inverse .btn-primary{background:var(--accent);color:var(--on-accent)}
.btn-sm{min-height:2.5rem;padding:.6rem 1.15rem;font-size:.9375rem}
a:focus-visible,summary:focus-visible,.btn:focus-visible,input:focus-visible,textarea:focus-visible,select:focus-visible{outline:3px solid var(--accent);outline-offset:3px}
.price{font-family:var(--font-heading);font-weight:var(--hw);color:var(--primary);white-space:nowrap}
.tone-inverse .price{color:var(--accent)}
.tag{display:inline-block;font-size:.75rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;background:var(--accent);color:var(--on-accent);border-radius:999px;padding:.25rem .7rem;margin-bottom:.6rem}
.note{margin-top:1.5rem;color:var(--muted);font-size:.95rem}.note.center{text-align:center}
.ticks{display:grid;gap:.6rem;margin-top:1.6rem}.ticks li{display:flex;gap:.65rem;align-items:flex-start}.ticks .ic{width:1.25rem;height:1.25rem;margin-top:.25rem;color:var(--primary);stroke-width:2.4}
.cols-2{--cols:2}.cols-3{--cols:3}.cols-4{--cols:4}
.media-box{position:relative;overflow:hidden;background:var(--alt);border-radius:var(--r-md)}
.media{display:block;width:100%;height:100%;object-fit:cover}
.media--placeholder{display:grid;place-items:center;color:var(--on-primary);background:radial-gradient(circle at 18% 22%,rgba(255,255,255,.22),transparent 42%),radial-gradient(circle at 85% 85%,rgba(0,0,0,.22),transparent 48%),linear-gradient(135deg,var(--primary),color-mix(in srgb,var(--primary) 55%,var(--inverse)))}
.ph-ic{width:3rem;height:3rem;opacity:.45}.ph-text{font-family:var(--font-heading);font-weight:var(--hw);font-size:2.4rem;letter-spacing:.04em}
.credit{position:absolute;right:.5rem;bottom:.5rem;z-index:2;font-size:.7rem;line-height:1.3;background:rgba(0,0,0,.62);color:#fff;padding:.2rem .5rem;border-radius:999px}.credit a{color:#fff}
.site-header{position:sticky;top:0;z-index:50;background:color-mix(in srgb,var(--bg) 92%,transparent);backdrop-filter:saturate(1.4) blur(12px);border-bottom:1px solid var(--line)}
.bar{display:flex;align-items:center;justify-content:space-between;gap:1rem;min-height:4.25rem}
.brand{font-family:var(--font-heading);font-weight:var(--hw);font-size:1.25rem;letter-spacing:var(--hls);color:var(--text);text-decoration:none;line-height:1.1}
.nav-desktop{display:none}.nav-desktop a{color:var(--text);text-decoration:none;font-weight:600;font-size:.95rem;padding:.5rem .15rem;border-bottom:2px solid transparent}.nav-desktop a:hover{border-bottom-color:var(--accent)}
.bar-actions{display:flex;align-items:center;gap:.75rem}
.nav-mobile{position:relative}.nav-mobile summary{list-style:none;cursor:pointer;display:grid;place-items:center;width:2.75rem;height:2.75rem;border-radius:var(--r-sm);border:1px solid var(--line);color:var(--text)}.nav-mobile summary::-webkit-details-marker{display:none}
.nav-mobile nav{position:absolute;right:0;top:3.4rem;min-width:15rem;background:var(--surface);border:1px solid var(--line);border-radius:var(--r-md);box-shadow:var(--shadow-lg);padding:.5rem;display:grid}.nav-mobile nav a{padding:.8rem 1rem;color:var(--text);text-decoration:none;font-weight:600;border-radius:var(--r-sm)}.nav-mobile nav a:hover{background:var(--alt)}.nav-mobile nav a.btn{color:var(--on-primary);text-align:center}.nav-mobile nav a.btn:hover{background:var(--primary)}
@media(max-width:639px){.bar-actions>.btn{display:none}}
.menu-cta{margin:.5rem .25rem .25rem}
@media(min-width:640px){.menu-cta{display:none}}
@media(min-width:900px){.nav-desktop{display:flex;gap:1.6rem}.nav-mobile{display:none}}
.s-footer{padding-block:clamp(3rem,6vw,5rem) 2rem}
.foot-grid{display:grid;gap:2.5rem}.foot-brand{font-family:var(--font-heading);font-weight:var(--hw);font-size:1.6rem;color:var(--on-inverse)!important}.foot-tag{margin-top:.8rem;max-width:26rem}
.foot-h{font-weight:700;letter-spacing:.1em;text-transform:uppercase;font-size:.78rem;color:var(--on-inverse)!important;margin-bottom:1rem}
.s-footer li{margin-bottom:.45rem}.s-footer a{text-decoration:none}.s-footer a:hover{text-decoration:underline}
.foot-bottom{display:flex;flex-wrap:wrap;gap:.6rem 1.5rem;justify-content:space-between;margin-top:3rem;padding-top:1.5rem;border-top:1px solid color-mix(in srgb,var(--on-inverse) 18%,transparent);font-size:.9rem}
.s-footer--simple{text-align:center}.s-footer--simple .foot-tag{margin-inline:auto}.s-footer--simple .foot-bottom{justify-content:center}
@media(min-width:820px){.foot-grid{grid-template-columns:1.4fr 1fr 1.2fr}}
`;

const SECTION_CSS: Record<SectionType, string> = {
  hero: `
.s-hero{padding-block:0}
.hero-copy{max-width:44rem}.hero-copy h1{margin-top:.2rem}.hero-copy .lead{font-size:1.25rem;max-width:36rem}
.hero-ticks{grid-template-columns:repeat(auto-fit,minmax(13rem,max-content));column-gap:1.75rem;margin-top:1.8rem}
.s-hero--photo{position:relative;display:flex;align-items:flex-end;min-height:min(88svh,780px);background:var(--inverse);color:#fff}
.s-hero--photo .hero-bg{position:absolute;inset:0}.s-hero--photo .hero-bg .media-box{position:absolute;inset:0;border-radius:0}
.s-hero--photo .hero-bg::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(8,8,10,.42) 0%,rgba(8,8,10,.58) 45%,rgba(8,8,10,.82) 100%)}
.s-hero--photo .hero-inner{position:relative;z-index:1;padding-block:clamp(8rem,18vw,12rem) clamp(3.5rem,8vw,6.5rem)}
.s-hero--photo h1,.s-hero--photo .lead,.s-hero--photo .hero-ticks li{color:#fff}.s-hero--photo .eyebrow{color:var(--accent)}.s-hero--photo .ticks .ic{color:var(--accent)}
.s-hero--photo .lead{color:rgba(255,255,255,.92)}
.s-hero--split{background:linear-gradient(180deg,var(--alt),var(--bg))}
.hero-grid{display:grid;gap:2.5rem;padding-block:clamp(3rem,7vw,6rem);align-items:center}
.hero-photo{aspect-ratio:4/4.4;border-radius:var(--r-lg);box-shadow:var(--shadow-lg)}
.s-hero--centered{background:radial-gradient(120% 90% at 50% 0%,var(--alt),var(--bg) 70%)}
.hero-center{padding-block:clamp(4rem,9vw,7.5rem) clamp(3rem,6vw,5rem);text-align:center}.hero-center .hero-copy{margin-inline:auto}.hero-center .lead{margin-inline:auto}.hero-center .actions,.hero-center .hero-ticks{justify-content:center}
.hero-center .hero-art{margin-top:clamp(2.5rem,5vw,4rem)}.hero-banner{aspect-ratio:16/8;border-radius:var(--r-lg);box-shadow:var(--shadow-lg)}
@media(min-width:900px){.hero-grid{grid-template-columns:1.05fr .95fr;gap:4rem}}
`,
  about: `
.about-grid{display:grid;gap:2.5rem;align-items:center}.about-copy p{margin-top:1.1rem;color:var(--muted)}.about-copy .s-head{margin-bottom:1.5rem}.about-copy p:first-of-type{font-size:1.15rem;color:var(--text)}
.about-photo{aspect-ratio:5/4;border-radius:var(--r-lg);box-shadow:var(--shadow)}
.about-text{max-width:52rem}.about-text .ticks{grid-template-columns:repeat(auto-fit,minmax(16rem,1fr))}
@media(min-width:900px){.about-grid{grid-template-columns:1fr 1fr;gap:5rem}.s-about--image-left .about-grid{grid-template-columns:.95fr 1.05fr}.about-photo{aspect-ratio:4/4.4}}
`,
  services: `
.svc-grid{display:grid;gap:1.25rem}
.svc-item{position:relative;background:var(--surface);border:1px solid var(--line);border-radius:var(--r-md);padding:1.9rem;box-shadow:var(--shadow);display:flex;flex-direction:column;gap:.7rem}
.svc-item p{color:var(--muted)}.svc-item .price{margin-top:auto;padding-top:.8rem}
.svc-icon{display:grid;place-items:center;width:3.25rem;height:3.25rem;border-radius:var(--r-sm);background:color-mix(in srgb,var(--primary) 12%,var(--surface));color:var(--primary);margin-bottom:.4rem}
.s-services--icons .svc-item{background:transparent;border:0;box-shadow:none;padding:.5rem 1rem;text-align:center;align-items:center}.s-services--icons .svc-icon{width:4.25rem;height:4.25rem;border-radius:999px;background:var(--primary);color:var(--on-primary)}.s-services--icons .svc-icon .ic{width:1.9rem;height:1.9rem}
.svc-list{display:grid;border-top:1px solid var(--line)}.svc-list li{display:grid;grid-template-columns:auto 1fr;gap:.5rem 1.5rem;align-items:baseline;padding:1.75rem 0;border-bottom:1px solid var(--line)}
.svc-num{font-family:var(--font-heading);font-weight:var(--hw);color:var(--primary);font-size:1.1rem}.svc-list p{color:var(--muted);margin-top:.4rem}.svc-list .price{grid-column:2}
@media(min-width:760px){.svc-grid{grid-template-columns:repeat(2,1fr)}.svc-grid.cols-3,.svc-grid.cols-4{grid-template-columns:repeat(var(--cols),1fr)}}
@media(min-width:900px){.svc-grid{gap:1.75rem}.svc-list li{grid-template-columns:5rem 1fr auto;gap:2rem;align-items:start}.svc-list .price{grid-column:3;padding-top:.2rem}}
`,
  products: `
.prod-grid{display:grid;gap:1.5rem}
.prod{background:var(--surface);border:1px solid var(--line);border-radius:var(--r-md);overflow:hidden;box-shadow:var(--shadow);display:flex;flex-direction:column}
.prod--plain .prod-body{padding:1.75rem}.prod--plain .prod-line{flex-direction:column;gap:.35rem}.prod--plain h3{font-size:calc(var(--h3)*1.1)}.prod-photo{aspect-ratio:4/3;border-radius:0}.prod-body{padding:1.4rem 1.5rem 1.7rem;display:flex;flex-direction:column;gap:.4rem}
.prod-line{display:flex;justify-content:space-between;gap:1rem;align-items:baseline}.prod-body p{color:var(--muted);font-size:.98rem}
.menu-list{display:grid;gap:1.6rem 4rem;max-width:62rem;margin-inline:auto}.menu-row{display:flex;align-items:baseline;gap:.75rem}.menu-row .leader{flex:1;border-bottom:2px dotted color-mix(in srgb,var(--text) 28%,transparent);transform:translateY(-.3em)}.menu-list p{color:var(--muted);margin-top:.3rem;font-size:.98rem}
.prod-featured{display:grid;gap:2rem}.prod-main{display:block}.prod--big .prod-photo{aspect-ratio:4/3.1}.prod--big h3{font-size:calc(var(--h3)*1.25)}
.prod-side{display:grid;align-content:start}.prod-mini{display:flex;justify-content:space-between;gap:1.25rem;padding:1.35rem 0;border-bottom:1px solid var(--line)}.prod-mini:first-child{padding-top:0}.prod-mini p{color:var(--muted);font-size:.98rem;margin-top:.25rem}
@media(min-width:700px){.prod-grid{grid-template-columns:repeat(2,1fr)}.prod-grid.cols-3{grid-template-columns:repeat(3,1fr)}.menu-list{grid-template-columns:repeat(2,1fr)}}
@media(min-width:900px){.prod-featured{grid-template-columns:1.25fr 1fr;gap:3.5rem;align-items:start}}
`,
  gallery: `
.shot{margin:0}.shot figcaption{margin-top:.6rem;color:var(--muted);font-size:.92rem}.shot-media{border-radius:var(--r-md)}
.gallery-grid{display:grid;gap:1rem;grid-template-columns:repeat(2,1fr)}.gallery-grid .shot-media{aspect-ratio:1/1}
.gallery-masonry{columns:2;column-gap:1rem}.gallery-masonry .shot{break-inside:avoid;margin-bottom:1rem}.ratio-tall .shot-media{aspect-ratio:3/4}.ratio-square .shot-media{aspect-ratio:1/1}.ratio-wide .shot-media{aspect-ratio:4/3}
.gallery-scroll{display:flex;gap:1rem;overflow-x:auto;scroll-snap-type:x mandatory;padding-bottom:1rem;margin-inline:-1.25rem;padding-inline:1.25rem;scrollbar-width:thin}.gallery-scroll .shot{flex:0 0 min(78%,22rem);scroll-snap-align:start}.gallery-scroll .shot-media{aspect-ratio:4/5}
@media(min-width:800px){.gallery-grid{grid-template-columns:repeat(3,1fr);gap:1.25rem}.gallery-masonry{columns:3;column-gap:1.25rem}.gallery-scroll{margin-inline:0;padding-inline:0}.gallery-scroll .shot{flex-basis:24rem}}
`,
  testimonials: `
.quote{margin:0;background:var(--surface);border:1px solid var(--line);border-radius:var(--r-md);padding:2rem;box-shadow:var(--shadow);display:flex;flex-direction:column;gap:1.1rem}
.quote blockquote{margin:0}.quote blockquote p{font-size:1.1rem;line-height:1.6}
.quote figcaption{display:flex;align-items:center;gap:.8rem;margin-top:auto}.quote figcaption strong{display:block;line-height:1.2}.role{color:var(--muted);font-size:.92rem}
.avatar{display:grid;place-items:center;flex:none;width:2.75rem;height:2.75rem;border-radius:999px;background:var(--primary);color:var(--on-primary);font-family:var(--font-heading);font-weight:var(--hw)}
.stars{color:var(--primary);letter-spacing:.12em;font-size:1.1rem}.stars .off{color:color-mix(in srgb,var(--text) 22%,transparent)}
.quote-grid,.quote-row{display:grid;gap:1.25rem}.quote-row.cols-1{max-width:52rem;margin-inline:auto}.quote-list{display:grid;gap:1.25rem;max-width:50rem}.quote-list .quote{background:transparent;box-shadow:none;border:0;border-left:4px solid var(--accent);border-radius:0;padding:.25rem 0 .25rem 1.75rem}
.quote--big{max-width:52rem;margin:0 auto 1.5rem;text-align:center;align-items:center;padding:clamp(2rem,5vw,3.5rem)}.quote--big blockquote p{font-family:var(--font-heading);font-weight:var(--hw);font-size:clamp(1.4rem,3vw,2rem);line-height:1.35}.quote--big figcaption{margin-top:.5rem}
@media(min-width:760px){.quote-grid.cols-2,.quote-row.cols-2{grid-template-columns:repeat(2,1fr)}.quote-grid.cols-3,.quote-row.cols-3{grid-template-columns:repeat(3,1fr)}.quote-row.cols-1{grid-template-columns:1fr}.quote-grid.cols-1{max-width:40rem;margin-inline:auto}}
`,
  stats: `
.stat-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:2.5rem 1.5rem;text-align:center}.stat:last-child:nth-child(odd){grid-column:1/-1}
.stat-value{display:block;font-family:var(--font-heading);font-weight:var(--hw);font-size:clamp(2.6rem,6vw,4.2rem);line-height:1;color:var(--accent);letter-spacing:var(--hls)}
.stat-label{display:block;margin-top:.7rem;font-weight:600;color:var(--on-inverse-muted)}
.s-stats.tone-default .stat-value,.s-stats.tone-alt .stat-value{color:var(--primary)}.s-stats.tone-default .stat-label,.s-stats.tone-alt .stat-label{color:var(--muted)}
.s-stats--cards .stat{background:var(--surface);border:1px solid var(--line);border-radius:var(--r-md);padding:2rem 1rem;box-shadow:var(--shadow)}.s-stats--cards .stat-value{color:var(--primary)}.s-stats--cards .stat-label{color:var(--muted)}
@media(min-width:800px){.stat-grid{grid-template-columns:repeat(var(--cols),1fr)}.stat:last-child:nth-child(odd){grid-column:auto}.s-stats--row .stat+.stat{border-left:1px solid color-mix(in srgb,currentColor 22%,transparent)}}
`,
  hours: `
.hours-grid{display:grid;gap:2rem;align-items:center}.hours-grid .s-head{margin-bottom:0}
.hours-table{width:100%;border-collapse:collapse}.hours-table th,.hours-table td{padding:1rem 0;border-bottom:1px solid var(--line);text-align:left;font-weight:600}.hours-table td{text-align:right;color:var(--muted);font-weight:500}.hours-table tr:last-child th,.hours-table tr:last-child td{border-bottom:0}
.hours-box{background:var(--surface);border:1px solid var(--line);border-radius:var(--r-md);padding:1.25rem 1.75rem;box-shadow:var(--shadow)}
.hours-card{max-width:34rem;margin-inline:auto;background:var(--surface);border:1px solid var(--line);border-radius:var(--r-lg);padding:2rem 2rem 1.25rem;box-shadow:var(--shadow-lg)}.hours-ic{display:block;width:2.2rem;height:2.2rem;color:var(--primary);margin:0 auto .75rem}
.s-hours .note{padding-bottom:.25rem}
@media(min-width:900px){.hours-grid{grid-template-columns:1fr 1.1fr;gap:5rem}}
`,
  area: `
.chips{display:flex;flex-wrap:wrap;gap:.7rem;justify-content:center;max-width:56rem;margin-inline:auto}.chips li{background:var(--surface);border:1px solid var(--line);border-radius:999px;padding:.55rem 1.15rem;font-weight:600;box-shadow:var(--shadow)}
.place-cols{display:grid;gap:.9rem 2rem;grid-template-columns:repeat(auto-fill,minmax(13rem,1fr))}.place-cols li{display:flex;align-items:center;gap:.7rem;padding:.9rem 0;border-bottom:1px solid var(--line);font-weight:600}.place-cols .ic{width:1.2rem;height:1.2rem;color:var(--primary)}
`,
  faq: `
.faq-list{max-width:50rem;margin-inline:auto;display:grid;gap:.9rem}
.faq-list details{background:var(--surface);border:1px solid var(--line);border-radius:var(--r-md);box-shadow:var(--shadow)}
.faq-list summary{list-style:none;cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:1rem;padding:1.3rem 1.5rem;font-weight:700;font-size:1.08rem}.faq-list summary::-webkit-details-marker{display:none}
.faq-ic{transition:transform .2s ease;color:var(--primary)}details[open] .faq-ic{transform:rotate(180deg)}
.faq-answer{padding:0 1.5rem 1.5rem;color:var(--muted)}
.faq-cols{display:grid;gap:2.25rem 4rem}.faq-item p{margin-top:.6rem;color:var(--muted)}
@media(min-width:800px){.faq-cols{grid-template-columns:repeat(2,1fr)}}
`,
  team: `
.member-grid{display:grid;gap:2rem}.member{display:flex;flex-direction:column;gap:1rem}.member p{color:var(--muted);margin-top:.35rem;font-size:.98rem}.member .role{color:var(--primary);font-weight:700;margin-top:.1rem}
.member-photo{aspect-ratio:1/1;border-radius:var(--r-lg);max-width:15rem}.member-photo .ph-text{font-size:3rem}
.member-grid .member{text-align:center;align-items:center}.member-grid .member-photo{width:100%;max-width:14rem;border-radius:999px}
.member-list{display:grid;gap:2rem;max-width:52rem}.member-list .member{flex-direction:row;align-items:center;gap:1.75rem}.member-list .member-photo{flex:none;width:7.5rem;border-radius:var(--r-md)}
@media(min-width:760px){.member-grid{grid-template-columns:repeat(2,1fr)}.member-grid.cols-3{grid-template-columns:repeat(3,1fr)}}
`,
  cta: `
.cta-wrap{display:grid;gap:1.5rem}
.s-cta--banner{background:var(--primary);color:var(--on-primary);text-align:center}.s-cta--banner h2,.s-cta--banner .lead{color:var(--on-primary)}.s-cta--banner .lead{max-width:38rem;margin-inline:auto}.s-cta--banner .actions{justify-content:center}.s-cta--banner .actions{margin-top:1.5rem}
.s-cta--card .cta-card{display:grid;gap:1.5rem;background:var(--inverse);color:var(--on-inverse);border-radius:var(--r-lg);padding:clamp(2rem,5vw,3.5rem);box-shadow:var(--shadow-lg)}.s-cta--card h2{color:var(--on-inverse)}.s-cta--card .lead{color:var(--on-inverse-muted)}.s-cta--card .actions{margin-top:0}.s-cta--card .btn-primary{background:var(--accent);color:var(--on-accent)}.s-cta--card .btn-ghost{color:var(--on-inverse);border-color:color-mix(in srgb,var(--on-inverse) 55%,transparent)}
.s-cta--minimal{text-align:center;border-block:1px solid var(--line)}.s-cta--minimal .lead{max-width:36rem;margin-inline:auto}.s-cta--minimal .actions{justify-content:center}
@media(min-width:900px){.s-cta--card .cta-card{grid-template-columns:1.4fr auto;align-items:center}}
`,
  contact: `
.contact-split{display:grid;gap:3rem;align-items:start}.contact-centered{max-width:46rem}.contact-details{max-width:46rem}
.contact-list{display:grid;gap:1.1rem}.contact-list li{display:flex;gap:1rem;align-items:flex-start}.contact-list .ic{margin-top:.2rem;color:var(--primary)}.contact-list .k{display:block;font-size:.8rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}.contact-list a{font-weight:700;font-size:1.15rem;text-decoration:none}.contact-list a:hover{text-decoration:underline}
.contact-info .contact-list{margin-top:.5rem}.contact-centered .contact-list{margin-top:2.5rem;grid-template-columns:repeat(auto-fit,minmax(14rem,1fr))}.contact-details .contact-list{gap:1.6rem}
.form-card{background:var(--surface);border:1px solid var(--line);border-radius:var(--r-lg);padding:clamp(1.5rem,4vw,2.5rem);box-shadow:var(--shadow-lg)}
.form{display:grid;gap:1.1rem}.form-row{display:grid;gap:1.1rem}.form label{display:grid;gap:.45rem;font-weight:700;font-size:.95rem}
.form input,.form textarea,.form select{font:inherit;font-weight:400;color:var(--text);background:var(--bg);border:1.5px solid color-mix(in srgb,var(--text) 28%,transparent);border-radius:var(--r-sm);padding:.85rem 1rem;width:100%;min-height:3rem}.form textarea{resize:vertical}
.form .btn{justify-self:start}.form-note{font-size:.85rem;color:var(--muted)}
@media(min-width:900px){.contact-split{grid-template-columns:.9fr 1.1fr;gap:5rem}.form-row{grid-template-columns:1fr 1fr}}
`,
  map: `
.map-card{max-width:36rem;margin-inline:auto;background:var(--surface);border:1px solid var(--line);border-radius:var(--r-lg);padding:2rem;box-shadow:var(--shadow);text-align:center}
.address{display:flex;gap:.75rem;align-items:flex-start;font-size:1.15rem;font-weight:700;margin-bottom:1.1rem}.address .ic{color:var(--primary);margin-top:.15rem}.map-card .address{justify-content:center;text-align:left}
.access{display:grid;gap:.5rem;color:var(--muted);margin-bottom:1.5rem;text-align:left}.access li{padding-left:1.1rem;position:relative}.access li::before{content:"";position:absolute;left:0;top:.7em;width:.45rem;height:.45rem;border-radius:999px;background:var(--accent)}
.map-split{display:grid;gap:2.5rem;align-items:center}.map-art{position:relative;min-height:18rem;border-radius:var(--r-lg);border:1px solid var(--line);box-shadow:var(--shadow);background:linear-gradient(90deg,transparent 48%,color-mix(in srgb,var(--text) 16%,transparent) 48% 52%,transparent 52%) 0 0/9rem 9rem,linear-gradient(0deg,transparent 48%,color-mix(in srgb,var(--text) 16%,transparent) 48% 52%,transparent 52%) 0 0/7rem 7rem,linear-gradient(135deg,transparent 46%,color-mix(in srgb,var(--primary) 30%,transparent) 46% 50%,transparent 50%) 0 0/16rem 16rem,var(--alt)}
.map-pin{position:absolute;left:50%;top:50%;transform:translate(-50%,-80%);display:grid;place-items:center;width:3.75rem;height:3.75rem;border-radius:999px;background:var(--primary);color:var(--on-primary);box-shadow:0 10px 24px rgba(0,0,0,.25)}.map-pin .ic{width:1.75rem;height:1.75rem}
@media(min-width:900px){.map-split{grid-template-columns:1fr 1.1fr;gap:5rem}.map-art{min-height:24rem}}
`,
  footer: '',
  module: `
.mod-panel,.mod-split{display:grid;gap:2rem;align-items:start}
.mod-main,.mod-side{min-width:0}
.mod-side{display:grid;gap:1.4rem;background:var(--surface);color:var(--text);border:1px solid var(--line);border-radius:var(--r-lg);padding:clamp(1.4rem,3.5vw,2rem);box-shadow:var(--shadow)}
.mod-split .mod-side{background:transparent;border:0;box-shadow:none;padding:0}.mod-split .s-head{margin-bottom:0}
.mod-list{display:grid;gap:0;background:var(--surface);color:var(--text);border:1px solid var(--line);border-radius:var(--r-lg);padding:.4rem clamp(1rem,3vw,1.75rem)}
.mod-row{display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;padding-block:1.05rem;border-bottom:1px solid var(--line)}.mod-row:last-child{border-bottom:0}
.mod-row h3{font-size:1.1rem}.mod-row p{color:var(--muted);font-size:.95rem;margin-top:.2rem}.mod-row .price small,.mod-price small{font-family:var(--font-body);font-weight:400;font-size:.85rem;color:var(--muted)}
.mod-cat{font-size:.85rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);font-family:var(--font-body);margin:1.6rem 0 .7rem}.mod-cat:first-child{margin-top:0}
.mod-note{font-size:.9rem;color:var(--muted)}
.mod-facts{display:grid;gap:.9rem}.mod-facts li,.mod-promise{display:flex;gap:.7rem;align-items:flex-start}.mod-facts .ic,.mod-promise .ic{flex:none;width:1.3rem;height:1.3rem;margin-top:.2rem;color:var(--primary)}.mod-promise{font-weight:700}
.mod-side .ticks{margin-top:0}
.mod-soon{display:grid;gap:.5rem;justify-items:start}
.btn-soon,.btn-soon:hover{background:var(--surface);color:var(--muted);border:2px dashed color-mix(in srgb,var(--muted) 60%,transparent);box-shadow:none;cursor:not-allowed;transform:none;filter:none}
.soon-badge{font-size:.8rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
.mod-fallback{display:grid;gap:.55rem;padding-top:1.1rem;border-top:1px solid var(--line)}.mod-fallback .k{font-size:.9rem;color:var(--muted)}.mod-fallback li:not(.k){display:flex;gap:.6rem;align-items:center}.mod-fallback .ic{width:1.1rem;height:1.1rem;color:var(--primary)}.mod-fallback a{font-weight:700;text-decoration:none}.mod-fallback a:hover{text-decoration:underline}
.mod-offers{display:grid;gap:1.1rem}.mod-offer{display:grid;align-content:start;gap:.35rem;background:var(--surface);color:var(--text);border:1px solid var(--line);border-radius:var(--r-lg);padding:1.5rem;box-shadow:var(--shadow)}.mod-offer .tag{justify-self:start}.mod-offer p{color:var(--muted)}.mod-offer .mod-price{font-family:var(--font-heading);font-weight:var(--hw);font-size:1.9rem;color:var(--primary);line-height:1.1}
.mod-news .lead{margin-bottom:.6rem}
@media(min-width:760px){.mod-offers{grid-template-columns:repeat(2,1fr)}.mod-offers.cols-3{grid-template-columns:repeat(3,1fr)}}
@media(min-width:900px){.mod-panel{grid-template-columns:1.45fr 1fr;gap:3rem}.mod-split{grid-template-columns:.85fr 1.15fr;gap:4.5rem}.mod-split .mod-side{position:sticky;top:6rem}}
`,
};

const STYLE_EXTRAS: Record<StyleId, string> = {
  artisan: `
.eyebrow::before{content:"";display:inline-block;width:.55rem;height:.55rem;border-radius:999px;background:var(--accent);margin-right:.6rem;vertical-align:.12em}.s-head.center .eyebrow::before{margin-right:.5rem}
.s-hero--photo h1{font-weight:600}.hero-photo{border-radius:var(--r-lg) var(--r-lg) var(--r-lg) 120px}
.svc-icon{border-radius:999px}.about-photo{border-radius:var(--r-lg) 110px var(--r-lg) var(--r-lg)}
`,
  moderne: `
.s-head{max-width:40rem}.eyebrow{display:inline-block;padding:.3rem .8rem;border-radius:999px;background:color-mix(in srgb,var(--primary) 9%,var(--bg))}.tone-inverse .eyebrow{background:color-mix(in srgb,var(--accent) 16%,transparent)}
.svc-item,.prod,.quote,.hours-box,.map-card,.mod-offer,.mod-side{box-shadow:none}.btn:hover{transform:none}
.s-hero--split{background:var(--bg)}.hero-photo{border-radius:var(--r-lg)}
`,
  premium: `
h1,h2{font-weight:500}.lead{font-size:1.2rem}
.eyebrow{display:flex;align-items:center;gap:1rem}.eyebrow::after{content:"";height:1px;width:3rem;background:var(--accent)}.s-head.center .eyebrow{justify-content:center}.s-head.center .eyebrow::before{content:"";height:1px;width:3rem;background:var(--accent)}.s-hero--photo .eyebrow::after{background:var(--accent)}.hero-center .eyebrow{justify-content:center}.hero-center .eyebrow::before{content:"";height:1px;width:3rem;background:var(--accent)}
.svc-item,.prod,.quote,.hours-box,.map-card,.form-card,.faq-list details,.mod-offer,.mod-side{box-shadow:none}.btn:hover{transform:none}
.media-box{border-radius:var(--r-sm)}.svc-icon{background:transparent;border:1px solid var(--accent);border-radius:0;color:var(--accent)}
.s-services--icons .svc-icon{background:transparent;color:var(--accent);border:1px solid var(--accent)}
.stat-value{font-weight:500}.s-hero--photo .hero-inner{padding-block:clamp(9rem,22vw,15rem) clamp(4rem,9vw,7rem)}
.brand{letter-spacing:.14em;text-transform:uppercase;font-size:1.05rem}
.s-cta--banner{background:var(--inverse);color:var(--on-inverse)}.s-cta--banner h2,.s-cta--banner .lead{color:var(--on-inverse)}
`,
  dynamique: `
.eyebrow{display:inline-block;background:var(--accent);color:var(--on-accent);padding:.35rem .9rem;border-radius:999px;transform:rotate(-2deg)}.tone-inverse .eyebrow{color:var(--on-accent)}.s-hero--photo .eyebrow{color:var(--on-accent)}
.btn:hover{transform:translateY(-3px) rotate(-.6deg)}.btn:active{transform:translateY(1px);box-shadow:none}
.svc-item,.prod,.quote,.hours-box,.map-card,.form-card,.mod-offer,.mod-list,.mod-panel .mod-side{border:2px solid var(--text)}.svc-item:nth-child(3n+2){background:var(--alt)}
.svc-icon{background:var(--accent);color:var(--on-accent);border-radius:var(--r-sm);transform:rotate(-4deg)}
.s-hero--split{background:var(--alt)}.hero-photo{border:3px solid var(--text);transform:rotate(1.5deg)}
.stat-value{-webkit-text-stroke:0}.chips li{border:2px solid var(--text)}.s-cta--banner{border-block:4px solid var(--accent)}
`,
};

export function minify(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').replace(/\s*([{};,>])\s*/g, '$1').replace(/;}/g, '}').trim();
}

// Feuille de style complète et autonome du site : pas de CDN, seulement les blocs des sections réellement utilisées.
export function buildCss(theme: { style: StyleId; palette?: string }, used: Iterable<SectionType>, fontBase = '/fonts'): string {
  const { style, palette } = resolveTheme(theme);
  const fonts = [style.fonts.heading, style.fonts.body].filter((font, index, list) => list.findIndex((other) => other.file === font.file) === index);
  const types = new Set(used);
  // Le module devis réutilise le formulaire de la section contact.
  if (types.has('module')) types.add('contact');
  const sections = [...types].map((type) => SECTION_CSS[type]).join('\n');
  return minify([fonts.map((font) => fontFace(font, fontBase)).join(''), tokens(style, palette), BASE, sections, STYLE_EXTRAS[theme.style]].join('\n'));
}
