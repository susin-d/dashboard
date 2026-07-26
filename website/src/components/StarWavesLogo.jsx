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
        d="M18 39c10-12 20-12 30 0s20 12 30 0M18 54c10-12 20-12 30 0s20 12 30 0M18 69c10-12 20-12 30 0s20 12 30 0"
        fill="none"
        stroke="#fff"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
