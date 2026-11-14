export function BrandIcon() {
  return <svg className="brand-symbol" viewBox="0 0 48 48" fill="none" aria-hidden="true">
    <path className="brand-symbol-frame" d="M24 2.5 44 13.5v21L24 45.5 4 34.5v-21L24 2.5Z"/>
    <path className="brand-symbol-left" d="M9.5 16.5h8l6.5 7.5-6.5 7.5h-8"/>
    <path className="brand-symbol-right" d="M38.5 16.5h-8L24 24l6.5 7.5h8"/>
    <path className="brand-symbol-core" d="m24 19 5 5-5 5-5-5 5-5Z"/>
  </svg>;
}

export function Brand() {
  return <span className="brand-name"><span className="brand-name-system" data-text="SYSTEM">SYSTEM</span><span className="brand-name-wars" data-text="WARS">WARS</span></span>;
}
