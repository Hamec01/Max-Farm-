import React from "react";
import { AnimalSpecies } from "../types";
import { AnimalSVG } from "./AnimalSVG";

/** Мини-спрайт животного для карточек магазина */
export const AnimalShopIcon: React.FC<{ species: AnimalSpecies; className?: string }> = ({
  species,
  className = "",
}) => (
  <div
    className={`w-11 h-11 lg:w-14 lg:h-14 mx-auto filter drop-shadow animate-bounce-slow ${className}`}
    aria-hidden
  >
    <AnimalSVG species={species} happiness={85} isFed={true} cleanliness={90} />
  </div>
);

/** Иконка «Навыки» — волшебная палочка со звёздочками */
export const SkillIcon: React.FC<{ className?: string; size?: number }> = ({
  className = "",
  size = 24,
}) => (
  <svg
    viewBox="0 0 32 32"
    width={size}
    height={size}
    className={`inline-block shrink-0 ${className}`}
    aria-hidden
  >
    <path
      d="M 6 26 L 20 12 L 22 14 L 8 28 Z"
      fill="#92400E"
      stroke="#5C3A21"
      strokeWidth="1"
    />
    <path
      d="M 20 12 L 24 4 L 28 8 L 22 14 Z"
      fill="#A855F7"
      stroke="#7E22CE"
      strokeWidth="1.2"
    />
    <circle cx="25" cy="5" r="2.5" fill="#FDE047" stroke="#EAB308" strokeWidth="0.8" />
    <path
      d="M 10 8 L 11 11 L 14 12 L 11 13 L 10 16 L 9 13 L 6 12 L 9 11 Z"
      fill="#FBBF24"
      stroke="#D97706"
      strokeWidth="0.6"
    />
    <path
      d="M 16 4 L 16.8 6.2 L 19 7 L 16.8 7.8 L 16 10 L 15.2 7.8 L 13 7 L 15.2 6.2 Z"
      fill="#F472B6"
      stroke="#DB2777"
      strokeWidth="0.5"
    />
    <circle cx="6" cy="20" r="1.5" fill="#60A5FA" opacity="0.9" />
  </svg>
);
