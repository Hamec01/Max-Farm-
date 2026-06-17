import React from "react";

interface ScarecrowSVGProps {
  className?: string;
}

/** Доброе пугало в соломенной шляпе и с воробьиным другом */
export const ScarecrowSVG: React.FC<ScarecrowSVGProps> = ({
  className = "w-20 h-28 filter drop-shadow-lg",
}) => (
  <svg viewBox="0 0 80 110" className={className} aria-hidden>
    {/* Столб */}
    <rect x="37" y="42" width="6" height="58" fill="#92400E" stroke="#451A03" strokeWidth="1.5" rx="1" />
    {/* Перекладина рук */}
    <rect x="14" y="48" width="52" height="5" fill="#78350F" stroke="#451A03" strokeWidth="1" rx="2" />
    {/* Левая рука в перчатке */}
    <line x1="18" y1="50" x2="8" y2="38" stroke="#FDE68A" strokeWidth="5" strokeLinecap="round" />
    <circle cx="7" cy="36" r="5" fill="#F59E0B" stroke="#B45309" strokeWidth="1" />
    {/* Правая рука */}
    <line x1="62" y1="50" x2="72" y2="36" stroke="#FDE68A" strokeWidth="5" strokeLinecap="round" />
    <circle cx="73" cy="34" r="5" fill="#F59E0B" stroke="#B45309" strokeWidth="1" />
    {/* Туловище — мешковина */}
    <path
      d="M 26 52 L 54 52 L 50 78 L 30 78 Z"
      fill="#D97706"
      stroke="#92400E"
      strokeWidth="1.5"
    />
    <line x1="30" y1="58" x2="50" y2="58" stroke="#B45309" strokeWidth="1" />
    <line x1="32" y1="64" x2="48" y2="64" stroke="#B45309" strokeWidth="1" />
    <line x1="34" y1="70" x2="46" y2="70" stroke="#B45309" strokeWidth="1" />
    {/* Голова — тыква/мешок */}
    <ellipse cx="40" cy="38" rx="14" ry="13" fill="#FBBF24" stroke="#D97706" strokeWidth="2" />
    {/* Глаза-пуговицы */}
    <circle cx="34" cy="36" r="3" fill="#1F2937" />
    <circle cx="46" cy="36" r="3" fill="#1F2937" />
    <circle cx="35" cy="35" r="0.8" fill="#FFFFFF" />
    <circle cx="47" cy="35" r="0.8" fill="#FFFFFF" />
    {/* Улыбка */}
    <path d="M 33 42 Q 40 48 47 42" stroke="#92400E" strokeWidth="2" fill="none" strokeLinecap="round" />
    {/* Шляпа */}
    <ellipse cx="40" cy="24" rx="18" ry="5" fill="#854D0E" stroke="#451A03" strokeWidth="1.5" />
    <path d="M 28 24 L 32 10 Q 40 6 48 10 L 52 24 Z" fill="#A16207" stroke="#451A03" strokeWidth="1.5" />
  </svg>
);
