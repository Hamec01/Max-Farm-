import React from "react";

interface WorkerSVGProps {
  workerId: string;
  className?: string;
}

function Boots() {
  return (
    <>
      <ellipse cx="25" cy="63" rx="5" ry="3.5" fill="#713F12" stroke="#451A03" strokeWidth="1.5" />
      <ellipse cx="35" cy="63" rx="5" ry="3.5" fill="#713F12" stroke="#451A03" strokeWidth="1.5" />
    </>
  );
}

function Face({ skin = "#FFE4C4", hair = "#78350F" }: { skin?: string; hair?: string }) {
  return (
    <>
      <circle cx="16" cy="27" r="4" fill={hair} />
      <circle cx="44" cy="27" r="4" fill={hair} />
      <path d="M 18 24 Q 30 19 42 24" fill={hair} />
      <circle cx="30" cy="30" r="11" fill={skin} stroke="#713F12" strokeWidth="1.5" />
      <circle cx="25" cy="28" r="1.8" fill="#1F2937" />
      <circle cx="35" cy="28" r="1.8" fill="#1F2937" />
      <circle cx="26" cy="27" r="0.6" fill="#FFFFFF" />
      <circle cx="36" cy="27" r="0.6" fill="#FFFFFF" />
      <path d="M 26 33 Q 30 36 34 33" stroke="#713F12" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </>
  );
}

export const WorkerSVG: React.FC<WorkerSVGProps> = ({ workerId, className = "w-16 h-18 filter drop-shadow-md" }) => {
  switch (workerId) {
    case "worker-mama":
      return (
        <svg viewBox="0 0 60 70" className={className}>
          <ellipse cx="30" cy="18" rx="15" ry="5" fill="#B45309" stroke="#713F12" strokeWidth="2" />
          <rect x="22" y="10" width="16" height="8" rx="2" fill="#D97706" stroke="#713F12" strokeWidth="2" />
          <circle cx="16" cy="27" r="4" fill="#9CA3AF" />
          <circle cx="44" cy="27" r="4" fill="#9CA3AF" />
          <path d="M 18 24 Q 30 19 42 24" fill="#9CA3AF" />
          <circle cx="30" cy="30" r="11" fill="#FFC08A" stroke="#713F12" strokeWidth="1.5" />
          <circle cx="25" cy="28" r="1.5" fill="#1F2937" />
          <circle cx="35" cy="28" r="1.5" fill="#1F2937" />
          <path d="M 22 34 Q 30 33 38 34" stroke="#D1D5DB" strokeWidth="3.5" fill="none" strokeLinecap="round" />
          <rect x="20" y="39" width="20" height="16" rx="4" fill="#047857" stroke="#065F46" strokeWidth="1.5" />
          <rect x="21" y="55" width="8" height="7" fill="#047857" stroke="#065F46" strokeWidth="1.5" />
          <rect x="31" y="55" width="8" height="7" fill="#047857" stroke="#065F46" strokeWidth="1.5" />
          <line x1="18" y1="44" x2="12" y2="52" stroke="#FFC08A" strokeWidth="5" strokeLinecap="round" />
          <line x1="42" y1="44" x2="48" y2="52" stroke="#FFC08A" strokeWidth="5" strokeLinecap="round" />
          <path d="M 44 50 L 52 50 L 50 62 L 46 62 Z" fill="#9CA3AF" stroke="#374151" strokeWidth="1.5" />
          <Boots />
        </svg>
      );

    case "worker-nadya":
      return (
        <svg viewBox="0 0 60 70" className={className}>
          <ellipse cx="30" cy="22" rx="14" ry="11" fill="#EC4899" stroke="#9D174D" strokeWidth="1.5" />
          <path d="M 16 24 C 18 10, 42 10, 44 24" fill="#EC4899" stroke="#9D174D" strokeWidth="1.5" />
          <circle cx="30" cy="30" r="11" fill="#FFE4E6" stroke="#713F12" strokeWidth="1.5" />
          <circle cx="25" cy="28" r="1.5" fill="#1F2937" />
          <circle cx="35" cy="28" r="1.5" fill="#1F2937" />
          <path d="M 20 41 L 40 41 L 44 57 L 16 57 Z" fill="#059669" stroke="#047857" strokeWidth="1.5" />
          <rect x="23" y="44" width="14" height="13" fill="#F59E0B" stroke="#D97706" strokeWidth="1" />
          <rect x="21" y="55" width="8" height="7" fill="#059669" stroke="#047857" strokeWidth="1.5" />
          <rect x="31" y="55" width="8" height="7" fill="#059669" stroke="#047857" strokeWidth="1.5" />
          <line x1="18" y1="44" x2="14" y2="52" stroke="#FFE4E6" strokeWidth="5.5" strokeLinecap="round" />
          <line x1="42" y1="44" x2="46" y2="52" stroke="#FFE4E6" strokeWidth="5.5" strokeLinecap="round" />
          <rect x="10" y="48" width="6" height="6" rx="1" fill="#0D9488" />
          <Boots />
        </svg>
      );

    case "worker-lena":
    case "worker-pasha":
      return (
        <svg viewBox="0 0 60 70" className={className}>
          <ellipse cx="30" cy="21" rx="11" ry="8" fill="#F59E0B" stroke="#B45309" strokeWidth="1.5" />
          <path d="M 30 15 L 14 18" stroke="#B45309" strokeWidth="3" strokeLinecap="round" />
          <circle cx="17" cy="27" r="4" fill="#4B5563" />
          <circle cx="43" cy="27" r="4" fill="#4B5563" />
          <circle cx="30" cy="30" r="11" fill="#FFE5D9" stroke="#713F12" strokeWidth="1.5" />
          <circle cx="25" cy="28" r="1.8" fill="#1F2937" />
          <circle cx="35" cy="28" r="1.8" fill="#1F2937" />
          <rect x="20" y="39" width="20" height="14" rx="3" fill="#EF4444" stroke="#DC2626" strokeWidth="1.5" />
          <rect x="21" y="53" width="8" height="9" fill="#FFFFFF" stroke="#E5E7EB" strokeWidth="1" />
          <rect x="31" y="53" width="8" height="9" fill="#FFFFFF" stroke="#E5E7EB" strokeWidth="1" />
          {workerId === "worker-pasha" ? (
            <circle cx="10" cy="38" r="5" fill="#F0ABFC" stroke="#C026D3" strokeWidth="1" />
          ) : (
            <path d="M 11 38 Q 4 30 6 39 Z" fill="#FCD34D" stroke="#D97706" strokeWidth="1" />
          )}
          <line x1="18" y1="44" x2="10" y2="35" stroke="#78350F" strokeWidth="3" strokeLinecap="round" />
          <Boots />
        </svg>
      );

  /** Папа Андрей — светлый блондин, полное тело */
    case "worker-papa":
      return (
        <svg viewBox="0 0 60 70" className={className}>
          <ellipse cx="30" cy="18" rx="14" ry="10" fill="#FACC15" stroke="#713F12" strokeWidth="2" />
          <rect x="20" y="16" width="20" height="3" fill="#B45309" />
          <circle cx="16" cy="27" r="4.5" fill="#FDE68A" />
          <circle cx="44" cy="27" r="4.5" fill="#FDE68A" />
          <path d="M 18 24 Q 30 19 42 24" fill="#FDE68A" />
          <circle cx="30" cy="30" r="11" fill="#FFE4C4" stroke="#713F12" strokeWidth="1.5" />
          <circle cx="25" cy="28" r="1.8" fill="#1F2937" />
          <circle cx="35" cy="28" r="1.8" fill="#1F2937" />
          <path d="M 24 33 Q 30 35 36 33" stroke="#D97706" strokeWidth="2" fill="none" strokeLinecap="round" />
          <rect x="20" y="39" width="20" height="16" rx="4" fill="#2563EB" stroke="#1D4ED8" strokeWidth="1.5" />
          <rect x="21" y="55" width="8" height="7" fill="#1D4ED8" stroke="#1E3A8A" strokeWidth="1.5" />
          <rect x="31" y="55" width="8" height="7" fill="#1D4ED8" stroke="#1E3A8A" strokeWidth="1.5" />
          <line x1="18" y1="44" x2="10" y2="50" stroke="#FFE4C4" strokeWidth="5" strokeLinecap="round" />
          <line x1="42" y1="44" x2="50" y2="48" stroke="#FFE4C4" strokeWidth="5" strokeLinecap="round" />
          <rect x="48" y="42" width="4" height="14" fill="#78350F" stroke="#451A03" strokeWidth="1" />
          <rect x="44" y="40" width="12" height="4" fill="#9CA3AF" stroke="#4B5563" strokeWidth="1" />
          <Boots />
        </svg>
      );

    case "worker-andrey":
      return (
        <svg viewBox="0 0 60 70" className={className}>
          <ellipse cx="30" cy="20" rx="13" ry="8" fill="#84CC16" stroke="#4D7C0F" strokeWidth="1.5" />
          <circle cx="16" cy="27" r="4" fill="#D1D5DB" />
          <circle cx="44" cy="27" r="4" fill="#D1D5DB" />
          <path d="M 18 24 Q 30 19 42 24" fill="#D1D5DB" />
          <circle cx="30" cy="30" r="11" fill="#FFC08A" stroke="#713F12" strokeWidth="1.5" />
          <circle cx="25" cy="28" r="1.5" fill="#1F2937" />
          <circle cx="35" cy="28" r="1.5" fill="#1F2937" />
          <path d="M 22 34 Q 30 33 38 34" stroke="#9CA3AF" strokeWidth="3" fill="none" strokeLinecap="round" />
          <rect x="20" y="39" width="20" height="16" rx="4" fill="#16A34A" stroke="#15803D" strokeWidth="1.5" />
          <rect x="21" y="55" width="8" height="7" fill="#15803D" stroke="#14532D" strokeWidth="1.5" />
          <rect x="31" y="55" width="8" height="7" fill="#15803D" stroke="#14532D" strokeWidth="1.5" />
          <line x1="42" y1="44" x2="52" y2="38" stroke="#FFC08A" strokeWidth="4" strokeLinecap="round" />
          <circle cx="54" cy="36" r="4" fill="#EF4444" stroke="#B91C1C" strokeWidth="1" />
          <Boots />
        </svg>
      );

    case "worker-dima":
      return (
        <svg viewBox="0 0 60 70" className={className}>
          <ellipse cx="30" cy="19" rx="13" ry="7" fill="#0EA5E9" stroke="#0369A1" strokeWidth="1.5" />
          <Face skin="#FFE4C4" hair="#4B5563" />
          <rect x="20" y="39" width="20" height="16" rx="4" fill="#0369A1" stroke="#1E3A8A" strokeWidth="1.5" />
          <rect x="21" y="55" width="8" height="7" fill="#1E40AF" stroke="#1E3A8A" strokeWidth="1.5" />
          <rect x="31" y="55" width="8" height="7" fill="#1E40AF" stroke="#1E3A8A" strokeWidth="1.5" />
          <line x1="42" y1="44" x2="56" y2="32" stroke="#78350F" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M 54 30 Q 58 28 56 34" stroke="#6B7280" strokeWidth="1.5" fill="none" />
          <line x1="18" y1="44" x2="12" y2="52" stroke="#FFE4C4" strokeWidth="5" strokeLinecap="round" />
          <ellipse cx="56" cy="35" rx="3" ry="2" fill="#F59E0B" />
          <Boots />
        </svg>
      );

    case "worker-arina":
      return (
        <svg viewBox="0 0 60 70" className={className}>
          <path d="M 20 22 Q 30 12 40 22 L 38 28 Q 30 24 22 28 Z" fill="#7C3AED" stroke="#5B21B6" strokeWidth="1.5" />
          <Face skin="#FFE4E6" hair="#4B5563" />
          <rect x="20" y="39" width="20" height="16" rx="4" fill="#A855F7" stroke="#7E22CE" strokeWidth="1.5" />
          <rect x="22" y="42" width="16" height="10" fill="#FFFFFF" stroke="#E5E7EB" strokeWidth="1" />
          <rect x="21" y="55" width="8" height="7" fill="#7E22CE" stroke="#5B21B6" strokeWidth="1.5" />
          <rect x="31" y="55" width="8" height="7" fill="#7E22CE" stroke="#5B21B6" strokeWidth="1.5" />
          <line x1="18" y1="44" x2="10" y2="50" stroke="#FFE4E6" strokeWidth="5" strokeLinecap="round" />
          <line x1="42" y1="44" x2="48" y2="50" stroke="#FFE4E6" strokeWidth="5" strokeLinecap="round" />
          <Boots />
        </svg>
      );

    case "worker-sveta":
      return (
        <svg viewBox="0 0 60 70" className={className}>
          <ellipse cx="30" cy="20" rx="14" ry="9" fill="#F97316" stroke="#C2410C" strokeWidth="1.5" />
          <Face skin="#FFE4C4" hair="#92400E" />
          <rect x="20" y="39" width="20" height="16" rx="4" fill="#FFFFFF" stroke="#E5E7EB" strokeWidth="1.5" />
          <rect x="22" y="42" width="16" height="12" fill="#FEF3C7" stroke="#F59E0B" strokeWidth="1" />
          <rect x="21" y="55" width="8" height="7" fill="#F3F4F6" stroke="#D1D5DB" strokeWidth="1.5" />
          <rect x="31" y="55" width="8" height="7" fill="#F3F4F6" stroke="#D1D5DB" strokeWidth="1.5" />
          <ellipse cx="10" cy="48" rx="5" ry="3" fill="#D97706" stroke="#92400E" strokeWidth="1" />
          <line x1="18" y1="44" x2="12" y2="50" stroke="#FFE4C4" strokeWidth="5" strokeLinecap="round" />
          <Boots />
        </svg>
      );

    case "worker-misha":
      return (
        <svg viewBox="0 0 60 70" className={className}>
          <ellipse cx="30" cy="19" rx="12" ry="7" fill="#22C55E" stroke="#15803D" strokeWidth="1.5" />
          <Face skin="#FFE5D9" hair="#78350F" />
          <rect x="20" y="39" width="20" height="14" rx="3" fill="#84CC16" stroke="#65A30D" strokeWidth="1.5" />
          <rect x="21" y="53" width="8" height="9" fill="#65A30D" stroke="#4D7C0F" strokeWidth="1.5" />
          <rect x="31" y="53" width="8" height="9" fill="#65A30D" stroke="#4D7C0F" strokeWidth="1.5" />
          <line x1="42" y1="44" x2="54" y2="28" stroke="#78350F" strokeWidth="3" strokeLinecap="round" />
          <path d="M 52 26 Q 56 22 54 30" stroke="#A16207" strokeWidth="2" fill="none" />
          <Boots />
        </svg>
      );

    case "worker-masha":
      return (
        <svg viewBox="0 0 60 70" className={className}>
          <ellipse cx="30" cy="21" rx="14" ry="10" fill="#6366F1" stroke="#4338CA" strokeWidth="1.5" />
          <circle cx="16" cy="27" r="4" fill="#D1D5DB" />
          <circle cx="44" cy="27" r="4" fill="#D1D5DB" />
          <circle cx="30" cy="30" r="11" fill="#FFE4E6" stroke="#713F12" strokeWidth="1.5" />
          <circle cx="25" cy="28" r="1.5" fill="#1F2937" />
          <circle cx="35" cy="28" r="1.5" fill="#1F2937" />
          <path d="M 20 41 L 40 41 L 42 57 L 18 57 Z" fill="#4F46E5" stroke="#3730A3" strokeWidth="1.5" />
          <rect x="21" y="55" width="8" height="7" fill="#3730A3" stroke="#312E81" strokeWidth="1.5" />
          <rect x="31" y="55" width="8" height="7" fill="#3730A3" stroke="#312E81" strokeWidth="1.5" />
          <line x1="42" y1="44" x2="50" y2="36" stroke="#FFE4E6" strokeWidth="5" strokeLinecap="round" />
          <text x="50" y="34" fontSize="8" textAnchor="middle">⭐</text>
          <Boots />
        </svg>
      );

    case "worker-sergey":
      return (
        <svg viewBox="0 0 60 70" className={className}>
          <ellipse cx="30" cy="19" rx="13" ry="7" fill="#F59E0B" stroke="#B45309" strokeWidth="1.5" />
          <Face skin="#FFE4C4" hair="#374151" />
          <rect x="20" y="39" width="20" height="16" rx="4" fill="#6B7280" stroke="#4B5563" strokeWidth="1.5" />
          <rect x="21" y="55" width="8" height="7" fill="#4B5563" stroke="#374151" strokeWidth="1.5" />
          <rect x="31" y="55" width="8" height="7" fill="#4B5563" stroke="#374151" strokeWidth="1.5" />
          <line x1="42" y1="44" x2="52" y2="48" stroke="#FFE4C4" strokeWidth="5" strokeLinecap="round" />
          <path d="M 50 44 L 56 50 L 54 52 L 48 46 Z" fill="#9CA3AF" stroke="#4B5563" strokeWidth="1" />
          <Boots />
        </svg>
      );

    case "worker-pastuh":
      return (
        <svg viewBox="0 0 60 70" className={className}>
          <ellipse cx="30" cy="19" rx="14" ry="8" fill="#A16207" stroke="#713F12" strokeWidth="1.5" />
          <Face skin="#FFC08A" hair="#78350F" />
          <rect x="20" y="39" width="20" height="16" rx="4" fill="#B45309" stroke="#92400E" strokeWidth="1.5" />
          <rect x="21" y="55" width="8" height="7" fill="#92400E" stroke="#78350F" strokeWidth="1.5" />
          <rect x="31" y="55" width="8" height="7" fill="#92400E" stroke="#78350F" strokeWidth="1.5" />
          <line x1="18" y1="44" x2="8" y2="36" stroke="#FFC08A" strokeWidth="5" strokeLinecap="round" />
          <line x1="42" y1="44" x2="52" y2="50" stroke="#FFC08A" strokeWidth="5" strokeLinecap="round" />
          <path d="M 6 34 L 10 42 L 8 44 L 4 36 Z" fill="#78350F" stroke="#451A03" strokeWidth="1" />
          <Boots />
        </svg>
      );

    case "worker-kolya":
      return (
        <svg viewBox="0 0 60 70" className={className}>
          <ellipse cx="30" cy="20" rx="12" ry="7" fill="#EF4444" stroke="#B91C1C" strokeWidth="1.5" />
          <Face skin="#FFE5D9" hair="#1F2937" />
          <rect x="20" y="39" width="20" height="16" rx="4" fill="#059669" stroke="#047857" strokeWidth="1.5" />
          <rect x="21" y="55" width="8" height="7" fill="#047857" stroke="#065F46" strokeWidth="1.5" />
          <rect x="31" y="55" width="8" height="7" fill="#047857" stroke="#065F46" strokeWidth="1.5" />
          <line x1="42" y1="44" x2="50" y2="52" stroke="#FFE5D9" strokeWidth="5" strokeLinecap="round" />
          <rect x="46" y="48" width="8" height="6" rx="1" fill="#84CC16" stroke="#65A30D" strokeWidth="1" />
          <Boots />
        </svg>
      );

    case "worker-nina":
      return (
        <svg viewBox="0 0 60 70" className={className}>
          <path d="M 18 22 Q 30 10 42 22 L 40 30 Q 30 26 20 30 Z" fill="#F472B6" stroke="#DB2777" strokeWidth="1.5" />
          <Face skin="#FFE4E6" hair="#B45309" />
          <rect x="20" y="39" width="20" height="16" rx="4" fill="#FBCFE8" stroke="#F472B6" strokeWidth="1.5" />
          <rect x="21" y="55" width="8" height="7" fill="#F9A8D4" stroke="#EC4899" strokeWidth="1.5" />
          <rect x="31" y="55" width="8" height="7" fill="#F9A8D4" stroke="#EC4899" strokeWidth="1.5" />
          <ellipse cx="10" cy="46" rx="4" ry="5" fill="#FEF9C3" stroke="#EAB308" strokeWidth="1" />
          <line x1="18" y1="44" x2="12" y2="50" stroke="#FFE4E6" strokeWidth="5" strokeLinecap="round" />
          <Boots />
        </svg>
      );

    case "worker-olya":
      return (
        <svg viewBox="0 0 60 70" className={className}>
          <ellipse cx="30" cy="20" rx="12" ry="8" fill="#F9A8D4" stroke="#EC4899" strokeWidth="1.5" />
          <Face skin="#FFE5D9" hair="#78350F" />
          <rect x="20" y="39" width="20" height="16" rx="4" fill="#FDA4AF" stroke="#F43F5E" strokeWidth="1.5" />
          <rect x="21" y="55" width="8" height="7" fill="#FB7185" stroke="#E11D48" strokeWidth="1.5" />
          <rect x="31" y="55" width="8" height="7" fill="#FB7185" stroke="#E11D48" strokeWidth="1.5" />
          <ellipse cx="48" cy="48" rx="5" ry="6" fill="#FDE68A" stroke="#D97706" strokeWidth="1" />
          <line x1="42" y1="44" x2="48" y2="48" stroke="#FFE5D9" strokeWidth="5" strokeLinecap="round" />
          <Boots />
        </svg>
      );

    case "worker-vika":
      return (
        <svg viewBox="0 0 60 70" className={className}>
          <path d="M 20 22 Q 30 12 40 22 L 38 28 Q 30 24 22 28 Z" fill="#FB923C" stroke="#EA580C" strokeWidth="1.5" />
          <Face skin="#FFE4C4" hair="#1F2937" />
          <rect x="20" y="39" width="20" height="16" rx="4" fill="#F97316" stroke="#C2410C" strokeWidth="1.5" />
          <rect x="21" y="55" width="8" height="7" fill="#EA580C" stroke="#9A3412" strokeWidth="1.5" />
          <rect x="31" y="55" width="8" height="7" fill="#EA580C" stroke="#9A3412" strokeWidth="1.5" />
          <ellipse cx="10" cy="50" rx="5" ry="4" fill="#F472B6" stroke="#DB2777" strokeWidth="1" />
          <line x1="18" y1="44" x2="12" y2="50" stroke="#FFE4C4" strokeWidth="5" strokeLinecap="round" />
          <Boots />
        </svg>
      );

    case "worker-igor":
      return (
        <svg viewBox="0 0 60 70" className={className}>
          <ellipse cx="30" cy="19" rx="14" ry="8" fill="#EAB308" stroke="#A16207" strokeWidth="1.5" />
          <Face skin="#D4A574" hair="#1F2937" />
          <rect x="20" y="39" width="20" height="16" rx="4" fill="#CA8A04" stroke="#A16207" strokeWidth="1.5" />
          <rect x="21" y="55" width="8" height="7" fill="#A16207" stroke="#713F12" strokeWidth="1.5" />
          <rect x="31" y="55" width="8" height="7" fill="#A16207" stroke="#713F12" strokeWidth="1.5" />
          <line x1="42" y1="44" x2="54" y2="38" stroke="#78350F" strokeWidth="3" strokeLinecap="round" />
          <circle cx="55" cy="36" r="4" fill="#22C55E" stroke="#15803D" strokeWidth="1" />
          <Boots />
        </svg>
      );

    case "worker-tolya":
      return (
        <svg viewBox="0 0 60 70" className={className}>
          <ellipse cx="30" cy="19" rx="13" ry="7" fill="#14B8A6" stroke="#0F766E" strokeWidth="1.5" />
          <Face skin="#FFE4C4" hair="#374151" />
          <rect x="20" y="39" width="20" height="16" rx="4" fill="#0D9488" stroke="#115E59" strokeWidth="1.5" />
          <rect x="22" y="42" width="16" height="10" fill="#FFFFFF" stroke="#E5E7EB" strokeWidth="1" />
          <rect x="21" y="55" width="8" height="7" fill="#0F766E" stroke="#134E4A" strokeWidth="1.5" />
          <rect x="31" y="55" width="8" height="7" fill="#0F766E" stroke="#134E4A" strokeWidth="1.5" />
          <text x="48" y="42" fontSize="10" textAnchor="middle">🦕</text>
          <line x1="42" y1="44" x2="48" y2="40" stroke="#FFE4C4" strokeWidth="5" strokeLinecap="round" />
          <Boots />
        </svg>
      );

    case "worker-zoya":
      return (
        <svg viewBox="0 0 60 70" className={className}>
          <path d="M 18 22 Q 30 10 42 22 L 40 30 Q 30 26 20 30 Z" fill="#38BDF8" stroke="#0284C7" strokeWidth="1.5" />
          <Face skin="#FFE4E6" hair="#DC2626" />
          <rect x="20" y="39" width="20" height="16" rx="4" fill="#0EA5E9" stroke="#0369A1" strokeWidth="1.5" />
          <rect x="21" y="55" width="8" height="7" fill="#0284C7" stroke="#075985" strokeWidth="1.5" />
          <rect x="31" y="55" width="8" height="7" fill="#0284C7" stroke="#075985" strokeWidth="1.5" />
          <ellipse cx="10" cy="46" rx="5" ry="3" fill="#FFFFFF" stroke="#E5E7EB" strokeWidth="1" />
          <line x1="18" y1="44" x2="12" y2="48" stroke="#FFE4E6" strokeWidth="5" strokeLinecap="round" />
          <Boots />
        </svg>
      );

    case "worker-vera":
      return (
        <svg viewBox="0 0 60 70" className={className}>
          <path d="M 18 24 C 20 12, 40 12, 42 24" fill="#38BDF8" stroke="#0284C7" strokeWidth="1.5" />
          <circle cx="30" cy="30" r="11" fill="#FFE4E6" stroke="#713F12" strokeWidth="1.5" />
          <circle cx="25" cy="28" r="1.5" fill="#1F2937" />
          <circle cx="35" cy="28" r="1.5" fill="#1F2937" />
          <rect x="20" y="41" width="20" height="14" rx="3" fill="#0EA5E9" stroke="#0369A1" strokeWidth="1.5" />
          <rect x="21" y="55" width="8" height="7" fill="#0284C7" />
          <rect x="31" y="55" width="8" height="7" fill="#0284C7" />
          <line x1="14" y1="44" x2="8" y2="52" stroke="#FFE4E6" strokeWidth="5" strokeLinecap="round" />
          <path d="M 6 50 Q 4 44 8 42 Q 12 44 10 50 Z" fill="#38BDF8" />
          <Boots />
        </svg>
      );

    case "worker-fyodor":
      return (
        <svg viewBox="0 0 60 70" className={className}>
          <ellipse cx="30" cy="20" rx="12" ry="8" fill="#D1D5DB" stroke="#6B7280" strokeWidth="1.5" />
          <circle cx="30" cy="30" r="11" fill="#FFE5D9" stroke="#713F12" strokeWidth="1.5" />
          <circle cx="25" cy="28" r="1.8" fill="#1F2937" />
          <circle cx="35" cy="28" r="1.8" fill="#1F2937" />
          <path d="M 24 33 Q 30 35 36 33" stroke="#9CA3AF" strokeWidth="2" fill="none" />
          <rect x="20" y="39" width="20" height="14" rx="3" fill="#B45309" stroke="#92400E" strokeWidth="1.5" />
          <rect x="21" y="53" width="8" height="9" fill="#78350F" />
          <rect x="31" y="53" width="8" height="9" fill="#78350F" />
          <line x1="42" y1="44" x2="50" y2="40" stroke="#FFE5D9" strokeWidth="4" strokeLinecap="round" />
          <circle cx="52" cy="38" r="3" fill="#84CC16" />
          <Boots />
        </svg>
      );

    case "worker-sonya":
      return (
        <svg viewBox="0 0 60 70" className={className}>
          <path d="M 20 22 C 22 10, 38 10, 40 22" fill="#F472B6" stroke="#DB2777" strokeWidth="1.5" />
          <circle cx="30" cy="30" r="11" fill="#FFE4E6" stroke="#713F12" strokeWidth="1.5" />
          <circle cx="25" cy="28" r="1.5" fill="#1F2937" />
          <circle cx="35" cy="28" r="1.5" fill="#1F2937" />
          <rect x="20" y="41" width="20" height="14" rx="3" fill="#FBBF24" stroke="#D97706" strokeWidth="1.5" />
          <rect x="21" y="55" width="8" height="7" fill="#F59E0B" />
          <rect x="31" y="55" width="8" height="7" fill="#F59E0B" />
          <line x1="16" y1="44" x2="10" y2="50" stroke="#FFE4E6" strokeWidth="5" strokeLinecap="round" />
          <ellipse cx="8" cy="52" rx="4" ry="3" fill="#F97316" />
          <Boots />
        </svg>
      );

    case "worker-grisha":
      return (
        <svg viewBox="0 0 60 70" className={className}>
          <circle cx="30" cy="24" r="12" fill="#86EFAC" stroke="#16A34A" strokeWidth="1.5" />
          <circle cx="26" cy="22" r="1.5" fill="#1F2937" />
          <circle cx="34" cy="22" r="1.5" fill="#1F2937" />
          <rect x="22" y="38" width="16" height="14" rx="3" fill="#4ADE80" stroke="#15803D" strokeWidth="1.5" />
          <rect x="23" y="52" width="6" height="8" fill="#15803D" />
          <rect x="31" y="52" width="6" height="8" fill="#15803D" />
          <line x1="40" y1="42" x2="46" y2="36" stroke="#FFE4C4" strokeWidth="4" strokeLinecap="round" />
          <path d="M 44 34 L 50 30 L 48 38 Z" fill="#38BDF8" />
          <Boots />
        </svg>
      );

    case "worker-roman":
      return (
        <svg viewBox="0 0 60 70" className={className}>
          <ellipse cx="30" cy="19" rx="12" ry="7" fill="#FCD34D" stroke="#D97706" strokeWidth="1.5" />
          <Face skin="#FFE4C4" hair="#6B7280" />
          <rect x="20" y="39" width="20" height="16" rx="4" fill="#F59E0B" stroke="#D97706" strokeWidth="1.5" />
          <rect x="21" y="55" width="8" height="7" fill="#B45309" stroke="#92400E" strokeWidth="1.5" />
          <rect x="31" y="55" width="8" height="7" fill="#B45309" stroke="#92400E" strokeWidth="1.5" />
          <line x1="42" y1="44" x2="52" y2="50" stroke="#FFE4C4" strokeWidth="5" strokeLinecap="round" />
          <rect x="48" y="46" width="8" height="10" rx="1" fill="#9CA3AF" stroke="#4B5563" strokeWidth="1" />
          <line x1="50" y1="48" x2="54" y2="54" stroke="#6B7280" strokeWidth="1.5" />
          <Boots />
        </svg>
      );

    default:
      return null;
  }
};
