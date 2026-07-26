export function StarWavesLogo({ size = 30, className = "" }) {
  return (
    <svg
      aria-label="StarWaves Logo"
      role="img"
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={`starwaves-logo-icon ${className}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="100" height="100" rx="20" fill="#000" />
      <path
        d="M20 31.5 50 52l30-20.5M20 31.5V68.5c0 2.8 2.2 5 5 5h50c2.8 0 5-2.2 5-5V31.5M20 31.5c0-2.8 2.2-5 5-5h50c2.8 0 5 2.2 5 5"
        fill="none"
        stroke="#fff"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
