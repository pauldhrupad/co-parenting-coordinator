export default function BrandMark({ size = 22 }) {
  return <svg className="brand-mark" width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
    <path d="M4.5 15.2 10.7 9l5.3 5.2L21.3 9l6.2 6.2" stroke="currentColor" strokeWidth="2.35" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M7.2 13.7v11h17.6v-11" stroke="currentColor" strokeWidth="2.35" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12.2 24.7v-4.8h7.6v4.8" stroke="currentColor" strokeWidth="2.35" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="16" cy="15.2" r="2.35" fill="currentColor"/>
  </svg>;
}
