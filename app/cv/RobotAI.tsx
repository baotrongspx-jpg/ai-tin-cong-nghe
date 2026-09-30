// Robot AI hoạt hình vẽ bằng SVG, chuyển động bằng CSS (cv.css). Người bật "giảm chuyển động" thấy robot đứng yên.
export default function RobotAI({ className = '', ma = 'rb' }: { className?: string; ma?: string }) {
  return (
    <svg viewBox="0 0 200 230" className={`robot ${className}`} role="img" aria-label="Robot AI vẫy tay chào">
      <defs>
        <linearGradient id={`${ma}-than`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f8fafc" />
          <stop offset="1" stopColor="#cbd5e1" />
        </linearGradient>
        <linearGradient id={`${ma}-kinh`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0b1631" />
          <stop offset="1" stopColor="#1e3a8a" />
        </linearGradient>
        <radialGradient id={`${ma}-sang`}>
          <stop offset="0" stopColor="#67e8f9" />
          <stop offset="1" stopColor="#3b82f6" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Bóng dưới chân, co giãn theo nhịp bay */}
      <ellipse className="robot-bong" cx="100" cy="218" rx="46" ry="7" fill="#000" opacity=".3" />

      <g className="robot-bay">
        {/* Vòng quỹ đạo và hạt sáng */}
        <g className="robot-quy-dao" opacity=".8">
          <circle cx="30" cy="70" r="3" fill="#67e8f9" />
          <circle cx="172" cy="120" r="2.5" fill="#fbbf24" />
          <circle cx="160" cy="40" r="2" fill="#93c5fd" />
        </g>

        {/* Ăng-ten */}
        <line x1="100" y1="22" x2="100" y2="42" stroke="#94a3b8" strokeWidth="4" strokeLinecap="round" />
        <circle className="robot-den" cx="100" cy="18" r="12" fill={`url(#${ma}-sang)`} />
        <circle cx="100" cy="18" r="6" fill="#22d3ee" />

        {/* Tai */}
        <rect x="36" y="66" width="12" height="30" rx="6" fill="#3b82f6" />
        <rect x="152" y="66" width="12" height="30" rx="6" fill="#3b82f6" />

        {/* Đầu + kính */}
        <rect x="46" y="40" width="108" height="82" rx="30" fill={`url(#${ma}-than)`} stroke="#e2e8f0" strokeWidth="2" />
        <rect x="58" y="54" width="84" height="52" rx="22" fill={`url(#${ma}-kinh)`} />
        <g className="robot-mat" fill="#67e8f9">
          <ellipse cx="82" cy="78" rx="8" ry="10" />
          <ellipse cx="118" cy="78" rx="8" ry="10" />
        </g>
        <path d="M88 94q12 8 24 0" stroke="#67e8f9" strokeWidth="3" fill="none" strokeLinecap="round" />
        <ellipse cx="72" cy="96" rx="5" ry="3" fill="#f472b6" opacity=".5" />
        <ellipse cx="128" cy="96" rx="5" ry="3" fill="#f472b6" opacity=".5" />

        {/* Cổ + thân */}
        <rect x="88" y="120" width="24" height="10" rx="4" fill="#94a3b8" />
        <rect x="62" y="128" width="76" height="66" rx="24" fill={`url(#${ma}-than)`} stroke="#e2e8f0" strokeWidth="2" />
        <rect x="80" y="144" width="40" height="26" rx="9" fill={`url(#${ma}-kinh)`} />
        <text x="100" y="162" textAnchor="middle" fontSize="13" fontWeight="900" fill="#67e8f9" fontFamily="system-ui, sans-serif">
          AI
        </text>
        <circle className="robot-tim" cx="100" cy="182" r="4" fill="#fbbf24" />

        {/* Tay trái đứng yên, tay phải vẫy */}
        <rect x="42" y="136" width="18" height="44" rx="9" fill="#3b82f6" />
        <circle cx="51" cy="184" r="8" fill="#e2e8f0" />
        <g className="robot-tay">
          <rect x="140" y="104" width="18" height="44" rx="9" fill="#3b82f6" />
          <circle cx="149" cy="100" r="9" fill="#e2e8f0" />
        </g>
      </g>
    </svg>
  )
}
