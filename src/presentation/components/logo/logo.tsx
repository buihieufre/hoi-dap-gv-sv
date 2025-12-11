import React from "react";

// Định nghĩa Keyframes và Styles dùng chung cho cả 3 logo
// Bạn có thể chuyển phần này vào file CSS toàn cục nếu muốn
const globalStyles = `
  @keyframes drawLine { to { stroke-dashoffset: 0; } }
  @keyframes popIn { to { opacity: 1; transform: scale(1); } }
  @keyframes breathe {
      0%, 100% { filter: drop-shadow(0 0 2px currentColor); transform: scale(1); }
      50% { filter: drop-shadow(0 0 10px currentColor); transform: scale(1.03); }
  }
  @keyframes scanMove {
      0% { transform: translateY(-100%); }
      100% { transform: translateY(200%); }
  }
  
  .animate-draw { animation: drawLine 2s cubic-bezier(0.4, 0, 0.2, 1) forwards; }
  .animate-draw-delayed { animation: drawLine 2s cubic-bezier(0.4, 0, 0.2, 1) 0.5s forwards; }
  .animate-pop { animation: popIn 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) 1.5s forwards; }
  .animate-breathe { animation: breathe 4s ease-in-out infinite; }
  .animate-scan { animation: scanMove 3s linear infinite; }
`;

// --- SVG PATHS CHUẨN HÓA (SHAPE MỚI) ---
const paths = {
  outerHex: "M50 5 L90 27.5 V72.5 L50 95 L10 72.5 V27.5 L50 5Z",
  // Shape Q mới: Đuôi ngắn (63-68), nằm gọn bên trong
  qShape: "M50 25 L72 37 V63 L60 70 L50 75 L28 63 V37 L50 25 Z M63 63 L68 68",
  aCore: "M50 35 L62 60 H38 L50 35Z",
};

/**
 * Component 1: CyberBuildLogo
 * Hiệu ứng: Vẽ nét (Drawing stroke)
 */
export const CyberBuildLogo = ({
  className = "w-40 h-40",
  color = "#38BDF8",
}) => {
  return (
    <div className={`relative ${className}`}>
      <style>{globalStyles}</style>
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Outer Hex */}
        <path
          className="animate-draw"
          d={paths.outerHex}
          stroke={color}
          strokeWidth="1.5"
          fill="none"
          strokeDasharray="300"
          strokeDashoffset="300"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Q Shape */}
        <path
          className="animate-draw-delayed"
          d={paths.qShape}
          stroke={color}
          strokeWidth="3"
          fill="none"
          strokeDasharray="300"
          strokeDashoffset="300"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* A Core */}
        <path
          className="animate-pop opacity-0 origin-center"
          d={paths.aCore}
          fill={color}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};

/**
 * Component 2: SystemPulseLogo
 * Hiệu ứng: Nhịp thở (Breathing)
 */
export const SystemPulseLogo = ({
  className = "w-40 h-40",
  color = "#38BDF8",
}) => {
  return (
    <div className={`relative ${className}`} style={{ color: color }}>
      <style>{globalStyles}</style>
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g className="animate-breathe origin-center">
          {/* Outer Hex (Mờ làm nền) */}
          <path
            d={paths.outerHex}
            stroke={color}
            strokeWidth="1"
            fill="none"
            opacity="0.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Q Shape (Mờ nhẹ bên trong) */}
          <path
            d={paths.qShape}
            stroke={color}
            strokeWidth="3"
            fill={color}
            fillOpacity="0.1"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* A Core */}
          <path
            d={paths.aCore}
            fill={color}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      </svg>
    </div>
  );
};

/**
 * Component 3: DataScanLogo
 * Hiệu ứng: Quét dữ liệu (Scanning beam)
 */
export const DataScanLogo = ({
  className = "w-40 h-40",
  color = "#38BDF8",
}) => {
  // Tạo ID duy nhất cho gradient và mask để tránh xung đột nếu render nhiều logo
  const idSuffix = React.useId();
  const gradId = `scanGradient-${idSuffix}`;
  const maskId = `hexMask-${idSuffix}`;

  return (
    <div className={`relative ${className}`}>
      <style>{globalStyles}</style>
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ filter: `drop-shadow(0 0 5px ${color}55)` }}
      >
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="50%" stopColor={color} stopOpacity="0.6" />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
          <mask id={maskId}>
            {/* Mask dùng chính shape Q và A để chỉ quét lên phần chữ */}
            <path
              d={paths.qShape}
              fill="white"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d={paths.aCore}
              fill="white"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </mask>
        </defs>

        {/* Base Layer (Tối hơn) */}
        <path
          d={paths.outerHex}
          stroke={color}
          strokeWidth="1"
          fill="none"
          opacity="0.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d={paths.qShape}
          stroke={color}
          strokeWidth="3"
          fill="#0F172A"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Tam giác A Core màu sáng */}
        <path
          d={paths.aCore}
          fill={color}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Scanning Beam */}
        <g mask={`url(#${maskId})`}>
          <rect
            x="0"
            y="-50"
            width="100"
            height="50"
            fill={`url(#${gradId})`}
            className="animate-scan"
          />
          <rect
            x="0"
            y="-10"
            width="100"
            height="2"
            fill="#fff"
            className="animate-scan"
            style={{ opacity: 0.9 }}
          />
        </g>
      </svg>
    </div>
  );
};

// --- DEMO APP HIỂN THỊ 3 COMPONENT ---
export default function App() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 font-sans">
      <div className="text-center mb-12">
        <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-600 mb-2">
          HEXA CORE COMPONENTS
        </h1>
        <p className="text-slate-500 text-xs tracking-widest uppercase">
          React • Tailwind • SVG Animation
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
        <div className="flex flex-col items-center gap-6 group">
          <div className="p-8 rounded-2xl bg-slate-900/50 border border-slate-800 group-hover:border-cyan-500/50 transition-colors duration-300">
            <CyberBuildLogo className="w-48 h-48" />
          </div>
          <div className="text-center">
            <h3 className="text-cyan-400 font-bold tracking-wider text-sm">
              CYBER BUILD
            </h3>
            <p className="text-slate-500 text-xs mt-1">Drawing Animation</p>
          </div>
        </div>

        <div className="flex flex-col items-center gap-6 group">
          <div className="p-8 rounded-2xl bg-slate-900/50 border border-slate-800 group-hover:border-cyan-500/50 transition-colors duration-300">
            <SystemPulseLogo className="w-48 h-48" />
          </div>
          <div className="text-center">
            <h3 className="text-cyan-400 font-bold tracking-wider text-sm">
              SYSTEM PULSE
            </h3>
            <p className="text-slate-500 text-xs mt-1">Breathing Effect</p>
          </div>
        </div>

        <div className="flex flex-col items-center gap-6 group">
          <div className="p-8 rounded-2xl bg-slate-900/50 border border-slate-800 group-hover:border-cyan-500/50 transition-colors duration-300">
            <DataScanLogo className="w-48 h-48" />
          </div>
          <div className="text-center">
            <h3 className="text-cyan-400 font-bold tracking-wider text-sm">
              DATA SCAN
            </h3>
            <p className="text-slate-500 text-xs mt-1">Masking Scan</p>
          </div>
        </div>
      </div>
    </div>
  );
}
