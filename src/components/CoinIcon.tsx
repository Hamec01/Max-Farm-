import React from "react";
import { SkillIcon } from "./ShopIcons";

interface CoinIconProps {
  className?: string;
  size?: number;
}

/** SVG-золотая монетка — классическая, с зубчатым краем и звездой */
export const CoinIcon: React.FC<CoinIconProps> = ({ className = "", size = 24 }) => {
  const gradId = React.useId().replace(/:/g, "");
  return (
  <svg
    viewBox="0 0 32 32"
    width={size}
    height={size}
    className={`inline-block shrink-0 ${className}`}
    aria-hidden
  >
    <defs>
      <radialGradient id={gradId} cx="38%" cy="32%" r="68%">
        <stop offset="0%" stopColor="#FDE68A" />
        <stop offset="55%" stopColor="#FBBF24" />
        <stop offset="100%" stopColor="#D97706" />
      </radialGradient>
    </defs>
    <circle cx="16" cy="16" r="14.5" fill="#B45309" />
    <circle cx="16" cy="16" r="13" fill={`url(#${gradId})`} stroke="#92400E" strokeWidth="1.2" />
    <circle cx="16" cy="16" r="10.5" fill="none" stroke="#F59E0B" strokeWidth="0.8" opacity="0.55" />
    <path
      d="M 16 9.5 L 17.6 13.4 L 21.8 13.6 L 18.5 16 L 19.6 20.1 L 16 17.8 L 12.4 20.1 L 13.5 16 L 10.2 13.6 L 14.4 13.4 Z"
      fill="#FEF3C7"
      stroke="#D97706"
      strokeWidth="0.7"
    />
    <ellipse cx="11.5" cy="10.5" rx="3.5" ry="2" fill="#FFFBEB" opacity="0.45" transform="rotate(-30 11.5 10.5)" />
  </svg>
  );
};

interface CoinPriceProps {
  amount: number | string;
  className?: string;
  iconSize?: number;
  showLabel?: boolean;
}

export const CoinPrice: React.FC<CoinPriceProps> = ({
  amount,
  className = "",
  iconSize = 14,
  showLabel = false,
}) => (
  <span className={`inline-flex items-center gap-0.5 ${className}`}>
    <CoinIcon size={iconSize} />
    <span>{typeof amount === "number" ? amount.toLocaleString() : amount}</span>
    {showLabel && <span className="opacity-90">монет</span>}
  </span>
);

/** Подкова удачи (ослик) */
export const HorseshoeIcon: React.FC<{ className?: string; size?: number }> = ({
  className = "",
  size = 24,
}) => (
  <svg viewBox="0 0 32 32" width={size} height={size} className={`inline-block shrink-0 ${className}`} aria-hidden>
    <path
      d="M 8 14 Q 8 6 16 6 Q 24 6 24 14 L 24 22 Q 24 28 20 28 L 18 28 L 18 24 L 20 24 Q 20 22 20 22 L 20 14 Q 20 10 16 10 Q 12 10 12 14 L 12 22 Q 12 24 14 24 L 14 28 L 12 28 Q 8 28 8 22 Z"
      fill="#D97706"
      stroke="#92400E"
      strokeWidth="1.5"
    />
    <circle cx="10" cy="18" r="1.2" fill="#FBBF24" />
    <circle cx="22" cy="18" r="1.2" fill="#FBBF24" />
  </svg>
);

const COIN_CHARS = new Set(["🪙", "💰"]);

export function isCoinEmoji(value: string): boolean {
  return COIN_CHARS.has(value);
}

interface GameIconProps {
  icon: string;
  className?: string;
  size?: number;
}

/** Emoji или SVG-иконка, если emoji не поддерживается системой */
export const GameIcon: React.FC<GameIconProps> = ({ icon, className = "", size = 24 }) => {
  if (icon === "coin" || isCoinEmoji(icon)) return <CoinIcon className={className} size={size} />;
  if (icon === "horseshoe") return <HorseshoeIcon className={className} size={size} />;
  if (icon === "skill") return <SkillIcon className={className} size={size} />;
  return <span className={`inline-block leading-none ${className}`}>{icon}</span>;
};

interface FloatLabelProps {
  text: string;
  className?: string;
}

/** Плавающий текст с монетами вместо квадратиков */
export const FloatLabel: React.FC<FloatLabelProps> = ({ text, className = "" }) => {
  const parts = text.split(/(🪙|💰)/g);
  return (
    <span className={`inline-flex items-center gap-0.5 flex-wrap justify-center ${className}`}>
      {parts.map((part, i) =>
        isCoinEmoji(part) ? <CoinIcon key={i} size={28} /> : part ? <span key={i}>{part}</span> : null
      )}
    </span>
  );
};

/** Плавающая частица над полем */
export const FloatParticle: React.FC<{ text: string }> = ({ text }) => {
  if (text.includes("🪙") || text.includes("💰")) {
    return <FloatLabel text={text} />;
  }
  if (text === "horseshoe" || text === "coin") {
    return <GameIcon icon={text} size={36} />;
  }
  return <span>{text}</span>;
};
