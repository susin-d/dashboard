export function StarWavesLogo({ size = 30, className = "" }) {
  return (
    <img
      src="/starwaves-logo.png"
      alt="StarWaves Logo"
      width={size}
      height={size}
      className={`starwaves-logo-icon ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        objectFit: 'contain',
        borderRadius: '50%',
        display: 'inline-block',
        verticalAlign: 'middle',
      }}
    />
  )
}
