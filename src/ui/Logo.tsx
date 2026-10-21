// Original Sema Kenya mark: a speech bubble with a shuka-style checked band.
export function Logo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="Sema Kenya">
      <defs>
        <clipPath id="bubble">
          <path d="M10 8h44a6 6 0 0 1 6 6v26a6 6 0 0 1-6 6H30l-12 10v-10h-8a6 6 0 0 1-6-6V14a6 6 0 0 1 6-6Z" />
        </clipPath>
      </defs>
      <g clipPath="url(#bubble)">
        <rect width="64" height="64" fill="#14532d" />
        <rect y="30" width="64" height="9" fill="#b91c1c" />
        <g fill="#1e3a8a" opacity="0.9">
          <rect x="4" y="30" width="5" height="9" />
          <rect x="17" y="30" width="5" height="9" />
          <rect x="30" y="30" width="5" height="9" />
          <rect x="43" y="30" width="5" height="9" />
          <rect x="56" y="30" width="5" height="9" />
        </g>
      </g>
      <text x="32" y="26" textAnchor="middle" fontFamily="system-ui, sans-serif" fontWeight="800" fontSize="17" fill="#fbf7f0">
        Sema
      </text>
    </svg>
  );
}
