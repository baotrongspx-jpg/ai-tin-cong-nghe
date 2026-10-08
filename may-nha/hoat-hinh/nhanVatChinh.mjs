// Hai nhân vật chính Mèo Mun và Robot Bit (dùng chung cho video và ảnh bìa)
// ── Nhân vật (SVG vẽ tay, mỗi bộ phận một nhóm có điểm xoay) ─────────────
// Toạ độ nội bộ 0..600 (rộng) x 0..700 (cao), chân chạm y=680
export const meoSvg = `
<svg id="meo" class="nv" viewBox="0 0 600 700" width="620" height="723">
  <g id="meo-than-tat">
    <path id="meo-duoi" d="M380 560 C520 560 560 440 520 360 C505 330 470 340 480 370 C505 440 470 520 380 520 Z" fill="#f59e0b" stroke="#7c2d12" stroke-width="8"/>
    <ellipse cx="300" cy="676" rx="170" ry="18" fill="#00000055"/>
    <g id="meo-than">
      <path d="M190 660 C170 520 200 420 300 420 C400 420 430 520 410 660 Z" fill="#f59e0b" stroke="#7c2d12" stroke-width="8"/>
      <path d="M240 650 C230 560 250 480 300 480 C350 480 370 560 360 650 Z" fill="#fde7c3"/>
      <rect x="215" y="640" width="70" height="40" rx="20" fill="#f59e0b" stroke="#7c2d12" stroke-width="8"/>
      <rect x="315" y="640" width="70" height="40" rx="20" fill="#f59e0b" stroke="#7c2d12" stroke-width="8"/>
      <path d="M215 455 Q300 495 385 455" fill="none" stroke="#0ea5e9" stroke-width="22" stroke-linecap="round"/>
    </g>
    <g id="meo-tay-trai"><rect x="160" y="450" width="60" height="150" rx="30" fill="#f59e0b" stroke="#7c2d12" stroke-width="8"/></g>
    <g id="meo-tay-phai"><rect x="380" y="450" width="60" height="150" rx="30" fill="#f59e0b" stroke="#7c2d12" stroke-width="8"/></g>
    <g id="meo-dau">
      <path id="meo-tai-trai" d="M150 250 L170 90 L265 175 Z" fill="#f59e0b" stroke="#7c2d12" stroke-width="8" stroke-linejoin="round"/>
      <path d="M175 220 L183 130 L237 180 Z" fill="#fda4af"/>
      <path id="meo-tai-phai" d="M450 250 L430 90 L335 175 Z" fill="#f59e0b" stroke="#7c2d12" stroke-width="8" stroke-linejoin="round"/>
      <path d="M425 220 L417 130 L363 180 Z" fill="#fda4af"/>
      <ellipse cx="300" cy="280" rx="175" ry="150" fill="#f59e0b" stroke="#7c2d12" stroke-width="8"/>
      <path d="M250 165 L262 205 M300 155 L300 200 M350 165 L338 205" stroke="#b45309" stroke-width="10" stroke-linecap="round"/>
      <ellipse cx="300" cy="335" rx="95" ry="70" fill="#fde7c3"/>
      <g id="meo-mat-trai"><ellipse cx="235" cy="265" rx="42" ry="50" fill="#fff" stroke="#7c2d12" stroke-width="6"/><g id="meo-con-ngoi-trai"><circle cx="240" cy="270" r="24" fill="#1e293b"/><circle cx="248" cy="260" r="8" fill="#fff"/></g></g>
      <g id="meo-mat-phai"><ellipse cx="365" cy="265" rx="42" ry="50" fill="#fff" stroke="#7c2d12" stroke-width="6"/><g id="meo-con-ngoi-phai"><circle cx="360" cy="270" r="24" fill="#1e293b"/><circle cx="368" cy="260" r="8" fill="#fff"/></g></g>
      <path d="M288 318 L312 318 L300 332 Z" fill="#f472b6"/>
      <g id="meo-mieng-dong"><path d="M272 345 Q286 360 300 345 Q314 360 328 345" fill="none" stroke="#7c2d12" stroke-width="6" stroke-linecap="round"/></g>
      <g id="meo-mieng-mo"><ellipse cx="300" cy="358" rx="26" ry="24" fill="#7f1d1d"/><ellipse cx="300" cy="370" rx="16" ry="9" fill="#fb7185"/></g>
      <path d="M200 330 L120 315 M200 345 L118 350 M400 330 L480 315 M400 345 L482 350" stroke="#7c2d12" stroke-width="5" stroke-linecap="round"/>
      <ellipse cx="200" cy="320" rx="22" ry="12" fill="#fb718566"/><ellipse cx="400" cy="320" rx="22" ry="12" fill="#fb718566"/>
    </g>
  </g>
</svg>`

export const robotSvg = `
<svg id="robot" class="nv" viewBox="0 0 600 700" width="620" height="723">
  <g id="robot-than-tat">
    <ellipse cx="300" cy="676" rx="170" ry="18" fill="#00000055"/>
    <rect x="225" y="600" width="55" height="70" rx="12" fill="#94a3b8" stroke="#1e3a5f" stroke-width="8"/>
    <rect x="320" y="600" width="55" height="70" rx="12" fill="#94a3b8" stroke="#1e3a5f" stroke-width="8"/>
    <g id="robot-than">
      <rect x="175" y="400" width="250" height="220" rx="50" fill="#e0f2fe" stroke="#1e3a5f" stroke-width="8"/>
      <rect x="225" y="450" width="150" height="100" rx="20" fill="#0f172a"/>
      <g id="robot-tim"><path d="M300 525 C260 495 270 470 290 475 C296 477 300 482 300 487 C300 482 304 477 310 475 C330 470 340 495 300 525 Z" fill="#22d3ee"/></g>
    </g>
    <g id="robot-tay-trai"><rect x="115" y="420" width="62" height="170" rx="31" fill="#bae6fd" stroke="#1e3a5f" stroke-width="8"/><circle cx="146" cy="600" r="34" fill="#94a3b8" stroke="#1e3a5f" stroke-width="8"/></g>
    <g id="robot-tay-phai"><rect x="423" y="420" width="62" height="170" rx="31" fill="#bae6fd" stroke="#1e3a5f" stroke-width="8"/><circle cx="454" cy="600" r="34" fill="#94a3b8" stroke="#1e3a5f" stroke-width="8"/></g>
    <g id="robot-dau">
      <line x1="300" y1="140" x2="300" y2="70" stroke="#1e3a5f" stroke-width="10"/>
      <circle id="robot-ang-ten" cx="300" cy="62" r="24" fill="#f43f5e" stroke="#1e3a5f" stroke-width="6"/>
      <rect x="130" y="130" width="340" height="280" rx="80" fill="#e0f2fe" stroke="#1e3a5f" stroke-width="8"/>
      <rect x="110" y="235" width="30" height="80" rx="12" fill="#94a3b8" stroke="#1e3a5f" stroke-width="6"/>
      <rect x="460" y="235" width="30" height="80" rx="12" fill="#94a3b8" stroke="#1e3a5f" stroke-width="6"/>
      <rect x="170" y="175" width="260" height="190" rx="55" fill="#0f172a"/>
      <g id="robot-mat-trai"><rect x="208" y="215" width="58" height="70" rx="26" fill="#22d3ee"/></g>
      <g id="robot-mat-phai"><rect x="334" y="215" width="58" height="70" rx="26" fill="#22d3ee"/></g>
      <g id="robot-mieng-dong"><path d="M265 322 Q300 342 335 322" fill="none" stroke="#22d3ee" stroke-width="10" stroke-linecap="round"/></g>
      <g id="robot-mieng-mo"><rect x="262" y="305" width="76" height="44" rx="22" fill="#22d3ee"/><rect x="276" y="315" width="48" height="24" rx="12" fill="#0e7490"/></g>
    </g>
  </g>
</svg>`
