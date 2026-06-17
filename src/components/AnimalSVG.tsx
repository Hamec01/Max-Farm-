/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { AnimalSpecies } from "../types";

// НАСТРОЙКА СПРАЙТОВ ИЗ ФАЙЛОВ:
// true — загружать файлы из `/public/assets/animals/` (SVG или PNG).
// Сначала ищется .svg, затем .png; если ничего нет — встроенный SVG в коде.
export const USE_CUSTOM_SPRITES = false;
/** @deprecated имя сохранено для совместимости — используйте USE_CUSTOM_SPRITES */
export const USE_PNG_SPRITES = USE_CUSTOM_SPRITES;

function getSpriteBaseName(isSheared: boolean, isSad: boolean, isDirty: boolean): string {
  if (isSheared) return "bald";
  if (isSad) return "hungry";
  if (isDirty) return "dirty";
  return "happy";
}

function getSpriteCandidates(folderName: string, baseName: string): string[] {
  return [
    `/assets/animals/${folderName}/${baseName}.svg`,
    `/assets/animals/${folderName}/${baseName}.png`,
  ];
}

export interface AnimalSVGProps {
  species: AnimalSpecies;
  happiness: number;      // 0 to 100 (affects eyes/blush)
  isFed: boolean;         // affects hunger bubbles or expressions
  isSheared?: boolean;    // SHEEP ONLY: renders bald pink body!
  cleanliness: number;    // 0 to 100 (affects mud spots on pig/cow)
  className?: string;     // custom styling
}

export const AnimalSVG: React.FC<AnimalSVGProps> = ({
  species,
  happiness,
  isFed,
  isSheared = false,
  cleanliness,
  className = ""
}) => {
  const isSad = !isFed || happiness < 40;
  const isDirty = cleanliness < 50;
  const folderName = species.toLowerCase();
  const spriteBaseName = getSpriteBaseName(!!isSheared, isSad, isDirty);
  const spriteCandidates = React.useMemo(
    () => getSpriteCandidates(folderName, spriteBaseName),
    [folderName, spriteBaseName]
  );

  const [candidateIndex, setCandidateIndex] = React.useState(0);
  const [fileSpritesFailed, setFileSpritesFailed] = React.useState(false);

  React.useEffect(() => {
    setCandidateIndex(0);
    setFileSpritesFailed(false);
  }, [species, spriteBaseName]);

  // Файловый спрайт: SVG → PNG → встроенный SVG
  if (USE_CUSTOM_SPRITES && !fileSpritesFailed) {
    const spriteSrc = spriteCandidates[candidateIndex];

    return (
      <div className={`w-full h-full flex items-center justify-center relative ${className}`}>
        <img
          key={spriteSrc}
          src={spriteSrc}
          alt={`${species} ${spriteBaseName}`}
          referrerPolicy="no-referrer"
          className="w-full h-full object-contain filter drop-shadow-md select-none transition-transform active:scale-95 duration-200"
          onError={() => {
            const nextIndex = candidateIndex + 1;
            if (nextIndex < spriteCandidates.length) {
              setCandidateIndex(nextIndex);
              return;
            }
            console.warn(
              `Спрайты ${spriteCandidates.join(", ")} не найдены. Игра переключилась на встроенный SVG.`
            );
            setFileSpritesFailed(true);
          }}
        />
      </div>
    );
  }

  // Render happy cheeks if happy, or teardrop/sad eyes if sad
  const renderExpression = () => {
    if (isSad) {
      return (
        <g id="sad-expression">
          {/* Drooped eyebrows */}
          <path d="M -15 -25 L -5 -22" stroke="#4A3423" strokeWidth="3" strokeLinecap="round" />
          <path d="M 15 -25 L 5 -22" stroke="#4A3423" strokeWidth="3" strokeLinecap="round" />
          {/* Sad downturned mouth */}
          <path d="M -8 10 Q 0 4 8 10" stroke="#4A3423" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          {/* Blue sweat/tear drop */}
          <circle cx="18" cy="-5" r="3" fill="#3B82F6" />
          <path d="M 18 -9 L 21 -5 L 15 -5 Z" fill="#3B82F6" />
        </g>
      );
    } else {
      return (
        <g id="happy-expression">
          {/* Happy blushing cheeks */}
          <circle cx="-16" cy="5" r="5" fill="#FFAEC9" opacity="0.8" />
          <circle cx="16" cy="5" r="5" fill="#FFAEC9" opacity="0.8" />
          {/* Big smiling mouth */}
          <path d="M -7 4 Q 0 12 7 4" stroke="#4A3423" strokeWidth="3" fill="none" strokeLinecap="round" />
        </g>
      );
    }
  };

  // Render direct mud splats if dirty
  const renderMudSplats = () => {
    if (!isDirty) return null;
    return (
      <g id="mud-splats">
        <path d="M -25 25 Q -22 28 -24 32 Q -26 35 -20 33 Q -15 35 -17 28 Z" fill="#78350F" opacity="0.85" />
        <path d="M 20 15 Q 24 16 22 20 Q 25 22 18 24 Q 15 20 17 17 Z" fill="#78350F" opacity="0.85" />
        <path d="M -5 32 Q -2 30 1 33 Q 3 36 -2 38 Q -7 36 -5 32 Z" fill="#78350F" opacity="0.8" />
      </g>
    );
  };

  switch (species) {
    case AnimalSpecies.CHICKEN:
      return (
        <svg viewBox="0 0 100 100" className={`w-full h-full ${className}`} id="svg-chicken">
          {/* Shadow */}
          <ellipse cx="50" cy="85" rx="25" ry="6" fill="#1E3A1E" opacity="0.25" />
          {/* Feet */}
          <path d="M 40 75 L 35 85 M 40 75 L 40 86 M 40 75 L 45 84" stroke="#FBBF24" strokeWidth="4" strokeLinecap="round" />
          <path d="M 60 75 L 55 85 M 60 75 L 60 86 M 60 75 L 65 84" stroke="#FBBF24" strokeWidth="4" strokeLinecap="round" />
          {/* Red tail feathers */}
          <path d="M 22 45 Q 12 35 20 28" stroke="#EF4444" strokeWidth="8" fill="none" strokeLinecap="round" />
          {/* Body */}
          <circle cx="50" cy="55" r="28" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="2" />
          {/* Head comb */}
          <path d="M 40 28 Q 50 15 60 28" fill="#EF4444" />
          <circle cx="44" cy="22" r="6" fill="#EF4444" />
          <circle cx="50" cy="18" r="6" fill="#EF4444" />
          <circle cx="56" cy="22" r="6" fill="#EF4444" />
          {/* Wing */}
          <path d="M 35 55 Q 45 52 50 63 Q 45 70 32 60" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="1.5" />
          {/* Eyes */}
          {isSad ? (
            <g>
              <path d="M 42 42 L 48 44" stroke="#1E293B" strokeWidth="3" strokeLinecap="round" />
              <path d="M 58 42 L 52 44" stroke="#1E293B" strokeWidth="3" strokeLinecap="round" />
            </g>
          ) : (
            <g>
              <circle cx="44" cy="42" r="3.5" fill="#1E293B" />
              <circle cx="56" cy="42" r="3.5" fill="#1E293B" />
              {/* Eye sparkle */}
              <circle cx="45" cy="40" r="1" fill="#FFFFFF" />
              <circle cx="57" cy="40" r="1" fill="#FFFFFF" />
            </g>
          )}
          {/* Beak */}
          <polygon points="46,46 54,46 50,56" fill="#F59E0B" stroke="#D97706" strokeWidth="1" />
          <path d="M 47 52 Q 50 50 53 52" stroke="#EF4444" strokeWidth="3" fill="none" />
          
          {/* Happiness expression */}
          <g transform="translate(50, 55)">
            {happiness > 60 && <circle cx="-14" cy="-2" r="3" fill="#FFAEC9" opacity="0.75" />}
            {happiness > 60 && <circle cx="14" cy="-2" r="3" fill="#FFAEC9" opacity="0.75" />}
          </g>
        </svg>
      );

    case AnimalSpecies.DUCK:
      return (
        <svg viewBox="0 0 100 100" className={`w-full h-full ${className}`} id="svg-duck">
          {/* Shadow */}
          <ellipse cx="50" cy="85" rx="25" ry="6" fill="#1E3A1E" opacity="0.25" />
          {/* Feet */}
          <path d="M 42 75 L 35 84 L 45 84 Z" fill="#F59E0B" />
          <path d="M 58 75 L 50 84 L 62 84 Z" fill="#F59E0B" />
          {/* Body */}
          <ellipse cx="50" cy="60" rx="28" ry="20" fill="#FBBF24" />
          {/* Head */}
          <circle cx="58" cy="38" r="16" fill="#FBBF24" />
          {/* Wing */}
          <ellipse cx="42" cy="62" rx="14" ry="8" fill="#F59E0B" opacity="0.9" />
          {/* Eyes */}
          {isSad ? (
            <path d="M 56 32 L 62 36" stroke="#1E293B" strokeWidth="3" strokeLinecap="round" />
          ) : (
            <g>
              <circle cx="60" cy="34" r="3.5" fill="#1E293B" />
              <circle cx="61.5" cy="32.5" r="1.5" fill="#FFFFFF" />
            </g>
          )}
          {/* Duck bill */}
          <path d="M 68 36 Q 78 36 76 43 Q 66 43 68 36" fill="#F97316" stroke="#EA580C" strokeWidth="1" />
          {/* Tail feather fluff */}
          <path d="M 22 55 Q 16 48 24 48 Z" fill="#FBBF24" />
          {isSad && <path d="M 56 46 Q 60 48 64 46" stroke="#4A3423" strokeWidth="2" fill="none" />}
        </svg>
      );

    case AnimalSpecies.GOOSE:
      return (
        <svg viewBox="0 0 100 100" className={`w-full h-full ${className}`} id="svg-goose">
          <ellipse cx="50" cy="85" rx="26" ry="6" fill="#1E3A1E" opacity="0.25" />
          {/* Orange flippers */}
          <path d="M 42 75 L 36 84 L 45 84 Z" fill="#EA580C" />
          <path d="M 58 75 L 51 84 L 60 84 Z" fill="#EA580C" />
          {/* Body */}
          <ellipse cx="46" cy="62" rx="24" ry="16" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="2" />
          {/* Elegant long neck */}
          <path d="M 58 60 Q 64 35 60 22" stroke="#F8FAFC" strokeWidth="12" fill="none" strokeLinecap="round" />
          {/* Head */}
          <circle cx="58" cy="22" r="11" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="0.5" />
          {/* Bill with slightly proud bump */}
          <path d="M 64 20 Q 74 18 73 25 Q 63 24 64 20" fill="#F97316" />
          <circle cx="65" cy="18" r="2.5" fill="#F97316" /> {/* Bump on forehead */}
          {/* Wing */}
          <ellipse cx="38" cy="64" rx="14" ry="8" fill="#F1F5F9" stroke="#CBD5E1" strokeWidth="1" />
          {/* Eye */}
          <circle cx="56" cy="20" r="3" fill="#1E293B" />
          <circle cx="57" cy="19" r="1.2" fill="#FFFFFF" />
        </svg>
      );

    case AnimalSpecies.TURKEY:
      return (
        <svg viewBox="0 0 100 100" className={`w-full h-full ${className}`} id="svg-turkey">
          <ellipse cx="50" cy="87" rx="28" ry="6" fill="#1E3A1E" opacity="0.25" />
          {/* Giant peacock-like tail feathers */}
          <g id="turkey-tail" opacity="0.95">
            <path d="M 15 60 Q 5 35 25 25" stroke="#78350F" strokeWidth="10" fill="none" strokeLinecap="round" />
            <path d="M 25 50 Q 15 15 40 12" stroke="#F59E0B" strokeWidth="10" fill="none" strokeLinecap="round" />
            <path d="M 50 45 Q 50 5 60 12" stroke="#B45309" strokeWidth="10" fill="none" strokeLinecap="round" />
            <path d="M 75 50 Q 85 15 60 25" stroke="#EF4444" strokeWidth="10" fill="none" strokeLinecap="round" />
            <path d="M 85 60 Q 95 35 75 25" stroke="#78350F" strokeWidth="10" fill="none" strokeLinecap="round" />
          </g>
          {/* Dark brown Turkey body */}
          <ellipse cx="50" cy="62" rx="26" ry="18" fill="#451A03" />
          {/* Head & Neck */}
          <path d="M 54 60 Q 64 45 56 32" stroke="#EF4444" strokeWidth="10" fill="none" strokeLinecap="round" />
          <circle cx="54" cy="30" r="11" fill="#3B82F6" /> {/* Turkey blue head */}
          {/* Red Snood hanging down bill */}
          <path d="M 58 32 Q 62 48 59 42" fill="#EF4444" />
          {/* Bill */}
          <polygon points="56,28 66,32 58,35" fill="#FBBF24" />
          {/* Wings */}
          <ellipse cx="38" cy="64" rx="12" ry="8" fill="#F59E0B" opacity="0.8" />
          {/* Eye */}
          <circle cx="52" cy="28" r="2.5" fill="#000000" />
          <circle cx="53" cy="27" r="1" fill="#FFFFFF" />
          <path d="M 45 78 L 40 88 M 52 78 L 52 88" stroke="#D97706" strokeWidth="4" strokeLinecap="round" />
        </svg>
      );

    case AnimalSpecies.RABBIT:
      return (
        <svg viewBox="0 0 100 100" className={`w-full h-full ${className}`} id="svg-rabbit">
          <ellipse cx="50" cy="85" rx="22" ry="5" fill="#1E3A1E" opacity="0.25" />
          {/* Tail */}
          <circle cx="24" cy="65" r="7" fill="#F1F5F9" stroke="#E2E8F0" strokeWidth="1" />
          {/* Body */}
          <ellipse cx="44" cy="62" rx="22" ry="16" fill="#F1F5F9" stroke="#E2E8F0" strokeWidth="1.5" />
          {/* Feet */}
          <ellipse cx="35" cy="78" rx="8" ry="4" fill="#E2E8F0" />
          <ellipse cx="52" cy="78" rx="8" ry="4" fill="#E2E8F0" />
          {/* Ears (one folded, one up) */}
          <path d="M 56 34 C 54 10, 64 10, 62 34 Z" fill="#F1F5F9" />
          <path d="M 58 32 C 57 15, 62 15, 61 32 Z" fill="#FFD1DC" /> {/* pink inner */}
          <path d="M 68 36 C 75 18, 83 23, 72 38 Z" fill="#F1F5F9" />
          <path d="M 69 36 C 75 22, 79 26, 72 37 Z" fill="#FFD1DC" />
          {/* Head */}
          <circle cx="62" cy="45" r="13" fill="#F1F5F9" stroke="#E2E8F0" strokeWidth="0.5" />
          {/* Eyes */}
          {isSad ? (
            <path d="M 64 39 L 68 43" stroke="#94A3B8" strokeWidth="3.5" strokeLinecap="round" />
          ) : (
            <g>
              <circle cx="66" cy="41" r="3.5" fill="#EA580C" /> {/* cute red/brown bunny eyes */}
              <circle cx="67.5" cy="39.5" r="1" fill="#FFFFFF" />
            </g>
          )}
          {/* Snout */}
          <polygon points="72,45 76,44 74,47" fill="#F43F5E" />
          {/* Whiskers */}
          <line x1="74" y1="47" x2="82" y2="45" stroke="#CBD5E1" strokeWidth="1.5" />
          <line x1="74" y1="48" x2="81" y2="52" stroke="#CBD5E1" strokeWidth="1.5" />
          {/* Happy blush */}
          {happiness > 50 && <circle cx="58" cy="49" r="3" fill="#FFAEC9" opacity="0.8" />}
        </svg>
      );

    case AnimalSpecies.SHEEP:
      return (
        <svg viewBox="0 0 100 100" className={`w-full h-full ${className}`} id="svg-sheep">
          <ellipse cx="50" cy="85" rx="30" ry="7" fill="#1E3A1E" opacity="0.25" />
          {/* Thin legs */}
          <line x1="38" y1="65" x2="38" y2="83" stroke="#475569" strokeWidth="5.5" strokeLinecap="round" />
          <line x1="50" y1="65" x2="50" y2="83" stroke="#475569" strokeWidth="5.5" strokeLinecap="round" />
          <line x1="62" y1="65" x2="62" y2="83" stroke="#475569" strokeWidth="5.5" strokeLinecap="round" />
          
          {/* Sheep Core Body */}
          {isSheared ? (
            // Shorn Bald Sheep (Funny Pink, embarrassed!)
            <g id="bald-sheep-body">
              {/* Pink, clean-shaven body */}
              <ellipse cx="48" cy="55" rx="24" ry="18" fill="#FFC0CB" stroke="#FDA4AF" strokeWidth="1.5" />
              {/* Funny bandage or shear mark */}
              <path d="M 38 52 Q 42 48 46 54" stroke="#FB7185" strokeWidth="2.5" fill="none" strokeLinecap="round" />
              <path d="M 52 58 Q 56 61 54 55" stroke="#FB7185" strokeWidth="2.5" fill="none" strokeLinecap="round" />
              {/* Funny text/thought bubble helper */}
              <text x="48" y="25" textAnchor="middle" fontSize="6.5" fill="#BE123C" fontWeight="bold">Вай, холодно!</text>
            </g>
          ) : (
            // Fluffy Woolly Body
            <g id="fluffy-sheep-body">
              {/* Cloud-like layered woolly circles */}
              <circle cx="32" cy="48" r="14" fill="#F8FAFC" />
              <circle cx="48" cy="42" r="15" fill="#F8FAFC" />
              <circle cx="64" cy="48" r="14" fill="#F8FAFC" />
              <circle cx="32" cy="62" r="14" fill="#F8FAFC" />
              <circle cx="48" cy="66" r="15" fill="#F8FAFC" />
              <circle cx="64" cy="62" r="14" fill="#F8FAFC" />
              <ellipse cx="48" cy="54" rx="25" ry="18" fill="#F8FAFC" />
              {/* Texture lines */}
              <path d="M 30 48 Q 33 45 36 50 M 42 41 Q 45 44 43 48 M 58 43 Q 62 40 60 46 M 52 64 Q 55 60 58 65" stroke="#E2E8F0" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            </g>
          )}

          {/* Sheep Head (always has a little hat of wool!) */}
          <g id="sheep-head">
            <ellipse cx="70" cy="45" rx="11" ry="13" fill="#4B5563" /> {/* Grey face */}
            {/* Wool cap on head (always wooly) */}
            <circle cx="70" cy="32" r="6" fill="#F1F5F9" />
            <circle cx="65" cy="34" r="5" fill="#F1F5F9" />
            <circle cx="75" cy="34" r="5" fill="#F1F5F9" />
            {/* Drooly floppy ears */}
            <path d="M 58 42 Q 52 46 59 48" fill="#4B5563" />
            <path d="M 82 42 Q 88 46 81 48" fill="#4B5563" />
            {/* Eyes */}
            {isSad ? (
              <g>
                <path d="M 64 42 L 68 44" stroke="#F1F5F9" strokeWidth="2" strokeLinecap="round" />
                <path d="M 72 42 L 76 44" stroke="#F1F5F9" strokeWidth="2" strokeLinecap="round" />
              </g>
            ) : (
              <g>
                <circle cx="66" cy="42" r="2.2" fill="#F1F5F9" />
                <circle cx="74" cy="42" r="2.2" fill="#F1F5F9" />
                <circle cx="67" cy="41" r="0.8" fill="#000000" />
                <circle cx="75" cy="41" r="0.8" fill="#000000" />
              </g>
            )}
            {/* Mouth */}
            <path d="M 67 52 Q 70 55 73 52" stroke="#F1F5F9" strokeWidth="2" fill="none" strokeLinecap="round" />
          </g>
        </svg>
      );

    case AnimalSpecies.PIG:
      return (
        <svg viewBox="0 0 100 100" className={`w-full h-full ${className}`} id="svg-pig">
          <ellipse cx="50" cy="85" rx="30" ry="7" fill="#1E3A1E" opacity="0.25" />
          {/* Curly tail */}
          <path d="M 18 52 Q 13 46 16 42 T 22 46" stroke="#FDA4AF" strokeWidth="4.5" fill="none" strokeLinecap="round" />
          {/* Chubby legs */}
          <line x1="34" y1="65" x2="34" y2="84" stroke="#FDA4AF" strokeWidth="8" strokeLinecap="round" />
          <line x1="34" y1="80" x2="34" y2="84" stroke="#F43F5E" strokeWidth="8" strokeLinecap="round" /> {/* feet */}
          <line x1="50" y1="65" x2="50" y2="84" stroke="#FDA4AF" strokeWidth="8" strokeLinecap="round" />
          <line x1="50" y1="80" x2="50" y2="84" stroke="#F43F5E" strokeWidth="8" strokeLinecap="round" />
          <line x1="66" y1="65" x2="66" y2="84" stroke="#FDA4AF" strokeWidth="8" strokeLinecap="round" />
          <line x1="66" y1="80" x2="66" y2="84" stroke="#F43F5E" strokeWidth="8" strokeLinecap="round" />
          
          {/* Main Pig Body */}
          <ellipse cx="46" cy="55" rx="28" ry="22" fill="#FCE7F3" stroke="#FBCFE8" strokeWidth="2" />
          
          {/* Mud spots */}
          {renderMudSplats()}

          {/* Head */}
          <circle cx="68" cy="46" r="16" fill="#FCE7F3" stroke="#FBCFE8" strokeWidth="0.5" />
          {/* Floppy ears */}
          <path d="M 56 36 Q 52 24 60 28 Z" fill="#FDA4AF" />
          <path d="M 76 34 Q 84 22 80 28 Z" fill="#FDA4AF" />
          {/* Snout with nostrils */}
          <ellipse cx="76" cy="51" rx="7" ry="5" fill="#FDA4AF" />
          <circle cx="74" cy="51" r="1.5" fill="#BE3144" />
          <circle cx="78" cy="51" r="1.5" fill="#BE3144" />
          {/* Eyes */}
          {isSad ? (
            <g>
              <line x1="61" y1="41" x2="65" y2="43" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="71" y1="41" x2="67" y2="43" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" />
            </g>
          ) : (
            <g>
              <circle cx="63" cy="41" r="3.2" fill="#4B5563" />
              <circle cx="71" cy="41" r="3.2" fill="#4B5563" />
              <circle cx="64" cy="40" r="1" fill="#FFFFFF" />
              <circle cx="72" cy="40" r="1" fill="#FFFFFF" />
            </g>
          )}

          {/* Happy blush */}
          {happiness > 60 && <circle cx="58" cy="47" r="2.5" fill="#F43F5E" opacity="0.7" />}
        </svg>
      );

    case AnimalSpecies.GOAT:
      return (
        <svg viewBox="0 0 100 100" className={`w-full h-full ${className}`} id="svg-goat">
          <ellipse cx="50" cy="85" rx="24" ry="5" fill="#1E3A1E" opacity="0.25" />
          {/* Thin brown legs */}
          <line x1="36" y1="65" x2="36" y2="82" stroke="#78350F" strokeWidth="5.5" strokeLinecap="round" />
          <line x1="48" y1="65" x2="48" y2="82" stroke="#78350F" strokeWidth="5.5" strokeLinecap="round" />
          <line x1="60" y1="65" x2="60" y2="82" stroke="#78350F" strokeWidth="5.5" strokeLinecap="round" />
          
          {/* Body */}
          <ellipse cx="44" cy="58" rx="22" ry="16" fill="#F1F5F9" stroke="#E2E8F0" strokeWidth="2" />
          
          {/* Cute white tail */}
          <path d="M 22 52 L 18 46 L 24 48 Z" fill="#F8FAFC" />

          {/* Head & Neck */}
          <path d="M 52 56 L 62 42 L 58 35 Z" fill="#F1F5F9" />
          <circle cx="60" cy="38" r="10" fill="#F1F5F9" stroke="#E2E8F0" strokeWidth="0.5" />
          {/* Curved Horns */}
          <path d="M 54 30 Q 48 15 42 22 Q 48 24 54 31 Z" fill="#F59E0B" />
          <path d="M 62 29 Q 62 12 56 16 Q 59 19 62 30 Z" fill="#F59E0B" />
          {/* Goatee beard */}
          <polygon points="62,47 62,55 58,47" fill="#E2E8F0" />
          {/* Drooping ears */}
          <path d="M 51 36 Q 44 40 48 44" fill="#E2E8F0" stroke="#CBD5E1" strokeWidth="1" />
          {/* Eyes */}
          {isSad ? (
            <path d="M 56 36 L 60 38" stroke="#475569" strokeWidth="2.5" />
          ) : (
            <g>
              <circle cx="58" cy="36" r="3" fill="#D97706" /> {/* goat gold eyes */}
              <circle cx="58" cy="36" r="1.5" fill="#000000" /> {/* slit pupil! */}
              <circle cx="59.2" cy="34.8" r="0.7" fill="#FFFFFF" />
            </g>
          )}
          {/* Nose */}
          <polygon points="66,40 69,39 67,41" fill="#F43F5E" />
        </svg>
      );

    case AnimalSpecies.COW:
      return (
        <svg viewBox="0 0 100 100" className={`w-full h-full ${className}`} id="svg-cow">
          <ellipse cx="50" cy="85" rx="36" ry="8" fill="#1E3A1E" opacity="0.25" />
          {/* Legs */}
          <line x1="28" y1="62" x2="28" y2="83" stroke="#4B5563" strokeWidth="8" strokeLinecap="round" />
          <line x1="28" y1="78" x2="28" y2="83" stroke="#1F2937" strokeWidth="8" strokeLinecap="round" /> {/* hoof */}
          <line x1="42" y1="62" x2="42" y2="83" stroke="#4B5563" strokeWidth="8" strokeLinecap="round" />
          <line x1="42" y1="78" x2="42" y2="83" stroke="#1F2937" strokeWidth="8" strokeLinecap="round" />
          <line x1="56" y1="62" x2="56" y2="83" stroke="#4B5563" strokeWidth="8" strokeLinecap="round" />
          <line x1="56" y1="78" x2="56" y2="83" stroke="#1F2937" strokeWidth="8" strokeLinecap="round" />
          
          {/* Pink milk udder (visible on cow!) */}
          <ellipse cx="44" cy="63" rx="10" ry="7" fill="#FFAEC9" />
          <circle cx="39" cy="68" r="2.5" fill="#FFAEC9" />
          <circle cx="44" cy="69" r="2.5" fill="#FFAEC9" />
          <circle cx="49" cy="68" r="2.5" fill="#FFAEC9" />

          {/* Main Cow Body (White with black/brown spots) */}
          <rect x="18" y="38" width="48" height="28" rx="10" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="2" />
          {/* Big Black Spots */}
          <ellipse cx="28" cy="46" rx="9" ry="6" fill="#111827" />
          <ellipse cx="48" cy="54" rx="12" ry="8" fill="#111827" />
          <ellipse cx="38" cy="58" rx="6" ry="4" fill="#111827" />
          <ellipse cx="60" cy="43" rx="6" ry="4" fill="#111827" />
          
          {/* Tail */}
          <path d="M 18 45 Q 10 50 14 65" stroke="#1F2937" strokeWidth="3" fill="none" />
          <circle cx="14" cy="65" r="4" fill="#111827" />

          {/* Head & Neck */}
          <path d="M 58 45 L 72 32 L 64 24" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="1" />
          <circle cx="68" cy="28" r="16" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="0.5" />
          {/* Head spots */}
          <ellipse cx="62" cy="22" rx="4" ry="5" fill="#111827" />
          
          {/* Cute Yellow Horns */}
          <path d="M 58 16 Q 58 8 52 11 Q 54 14 58 17 Z" fill="#FBBF24" />
          <path d="M 78 16 Q 78 8 84 11 Q 82 14 78 17 Z" fill="#FBBF24" />

          {/* Big Pink Snout */}
          <ellipse cx="76" cy="34" rx="11" ry="8" fill="#FFAEC9" />
          <circle cx="72" cy="33" r="1.8" fill="#E11D48" />
          <circle cx="80" cy="33" r="1.8" fill="#E11D48" />

          {/* Eyes */}
          {isSad ? (
            <g>
              <line x1="60" y1="24" x2="64" y2="26" stroke="#1F2937" strokeWidth="3" strokeLinecap="round" />
            </g>
          ) : (
            <g>
              <circle cx="62" cy="24" r="3.5" fill="#1F2937" />
              <circle cx="60.5" cy="22" r="1" fill="#FFFFFF" />
            </g>
          )}

          {/* Gold neck bell */}
          <rect x="64" y="40" width="8" height="3" fill="#D97706" />
          <circle cx="68" cy="45" r="4.5" fill="#F59E0B" />
        </svg>
      );

    case AnimalSpecies.DONKEY:
      return (
        <svg viewBox="0 0 100 100" className={`w-full h-full ${className}`} id="svg-donkey">
          <ellipse cx="50" cy="85" rx="30" ry="7" fill="#1E3A1E" opacity="0.25" />
          {/* Sturdy dark grey legs */}
          <line x1="32" y1="65" x2="32" y2="83" stroke="#64748B" strokeWidth="7" strokeLinecap="round" />
          <line x1="46" y1="65" x2="46" y2="83" stroke="#64748B" strokeWidth="7" strokeLinecap="round" />
          <line x1="60" y1="65" x2="60" y2="83" stroke="#64748B" strokeWidth="7" strokeLinecap="round" />
          
          {/* Body */}
          <ellipse cx="44" cy="58" rx="25" ry="18" fill="#475569" stroke="#334155" strokeWidth="1.5" />
          
          {/* Black Mane */}
          <path d="M 52 46 Q 50 32 58 24 Q 62 25 58 38 Z" fill="#0F172A" />

          {/* Head & Neck */}
          <path d="M 54 52 L 64 36 L 58 28 Z" fill="#475569" />
          <ellipse cx="64" cy="34" rx="12" ry="14" fill="#475569" stroke="#334155" strokeWidth="0.5" />

          {/* EXTREMELY TALL FLOPPY DONKEY EARS */}
          <path d="M 58 22 C 48 5, 52 5, 59 21 Z" fill="#475569" />
          <path d="M 60 21 C 52 9, 55 9, 58 20 Z" fill="#FDA4AF" /> {/* pink inner */}
          <path d="M 70 23 C 78 6, 82 8, 72 23 Z" fill="#475569" />
          <path d="M 69 22 C 75 10, 78 12, 71 21 Z" fill="#FDA4AF" />

          {/* Snout */}
          <ellipse cx="72" cy="41" rx="8" ry="6" fill="#F1F5F9" />
          <circle cx="70" cy="39" r="1.5" fill="#334155" />
          <circle cx="74" cy="39" r="1.5" fill="#334155" />

          {/* Eyes (Drooping/Sad cute look) */}
          <path d="M 58 31 L 62 33" stroke="#0F172A" strokeWidth="3" strokeLinecap="round" />
          {isSad ? (
            <path d="M 58 36 Q 61 38 64 36" stroke="#0F172A" strokeWidth="1.5" fill="none" />
          ) : (
            <g>
              <circle cx="60" cy="32" r="2.5" fill="#0F172A" />
              <circle cx="61" cy="31" r="0.8" fill="#FFFFFF" />
            </g>
          )}
        </svg>
      );

    case AnimalSpecies.HORSE:
      return (
        <svg viewBox="0 0 100 100" className={`w-full h-full ${className}`} id="svg-horse">
          <ellipse cx="50" cy="85" rx="34" ry="7" fill="#1E3A1E" opacity="0.25" />
          {/* Fast majestic legs */}
          <line x1="30" y1="62" x2="30" y2="83" stroke="#B45309" strokeWidth="7" strokeLinecap="round" />
          <line x1="30" y1="78" x2="30" y2="83" stroke="#FBBF24" strokeWidth="7" strokeLinecap="round" /> {/* gold hoof */}
          <line x1="44" y1="62" x2="44" y2="83" stroke="#B45309" strokeWidth="7" strokeLinecap="round" />
          <line x1="44" y1="78" x2="44" y2="83" stroke="#FBBF24" strokeWidth="7" strokeLinecap="round" />
          <line x1="58" y1="62" x2="58" y2="83" stroke="#B45309" strokeWidth="7" strokeLinecap="round" />
          <line x1="58" y1="78" x2="58" y2="83" stroke="#FBBF24" strokeWidth="7" strokeLinecap="round" />
          
          {/* Body */}
          <ellipse cx="42" cy="56" rx="27" ry="19" fill="#92400E" stroke="#78350F" strokeWidth="1.5" />
          
          {/* Beautiful flowy black tail */}
          <path d="M 16 48 Q 4 52 10 74" stroke="#1E293B" strokeWidth="6.5" fill="none" strokeLinecap="round" />

          {/* Majestic Mane */}
          <path d="M 52 46 Q 52 28 62 16 Q 66 18 60 36 Z" fill="#1E293B" />

          {/* Head & Neck */}
          <path d="M 54 50 L 68 32 L 60 22 Z" fill="#92400E" />
          <ellipse cx="66" cy="28" rx="12" ry="15" fill="#92400E" stroke="#78350F" strokeWidth="0.5" />
          
          {/* White star marking on forehead */}
          <polygon points="66,16 68,22 66,25 64,22" fill="#FFFFFF" />

          {/* Ears */}
          <polygon points="58,18 60,8 63,18" fill="#92400E" />
          <polygon points="70,18 72,8 75,18" fill="#92400E" />

          {/* Muzzle */}
          <ellipse cx="75" cy="36" rx="8" ry="6" fill="#78350F" />
          <circle cx="73" cy="34" r="1.5" fill="#000000" />
          <circle cx="77" cy="34" r="1.5" fill="#000000" />

          {/* Eyes */}
          {isSad ? (
            <path d="M 58 26 L 62 28" stroke="#000000" strokeWidth="3" />
          ) : (
            <g>
              <circle cx="61" cy="24" r="3.2" fill="#000000" />
              <circle cx="62" cy="23" r="1" fill="#FFFFFF" />
            </g>
          )}
        </svg>
      );

    case AnimalSpecies.BULL:
      return (
        <svg viewBox="0 0 100 100" className={`w-full h-full ${className}`} id="svg-bull">
          <ellipse cx="50" cy="85" rx="36" ry="8" fill="#1E3A1E" opacity="0.25" />
          {/* Thick strong legs */}
          <line x1="28" y1="62" x2="28" y2="83" stroke="#4B5563" strokeWidth="10.5" strokeLinecap="round" />
          <line x1="42" y1="62" x2="42" y2="83" stroke="#4B5563" strokeWidth="10.5" strokeLinecap="round" />
          <line x1="56" y1="62" x2="56" y2="83" stroke="#4B5563" strokeWidth="10.5" strokeLinecap="round" />
          
          {/* Body (Muscular and massive) */}
          <rect x="18" y="34" width="50" height="32" rx="8" fill="#374151" stroke="#1F2937" strokeWidth="2.5" />
          
          {/* Shoulders / Hump */}
          <circle cx="58" cy="36" r="14" fill="#374151" />

          {/* Head & Neck */}
          <path d="M 58 45 L 75 32 L 64 24" fill="#374151" />
          <circle cx="68" cy="28" r="17" fill="#374151" stroke="#1F2937" strokeWidth="0.5" />

          {/* HUGE SHARP WHITE HORNS */}
          <path d="M 56 16 Q 52 -2 42 6 Q 54 10 58 17 Z" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="1" />
          <path d="M 80 16 Q 84 -2 94 6 Q 82 10 78 17 Z" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="1" />

          {/* Snout with nose ring! */}
          <ellipse cx="76" cy="36" rx="10" ry="7" fill="#1F2937" />
          {/* Gold Nose Ring (Swingable!) */}
          <circle cx="76" cy="46" r="6" fill="none" stroke="#F59E0B" strokeWidth="2.5" />

          {/* Eyes (Determined but kind) */}
          {isSad ? (
            <path d="M 58 24 L 62 26" stroke="#FBBF24" strokeWidth="3" />
          ) : (
            <g>
              <circle cx="61" cy="24" r="4.2" fill="#FBBF24" />
              <circle cx="61" cy="24" r="2" fill="#000000" />
              <circle cx="62" cy="22.5" r="0.8" fill="#FFFFFF" />
            </g>
          )}
        </svg>
      );

    case AnimalSpecies.CAT:
      return (
        <svg viewBox="0 0 100 100" className={`w-full h-full ${className}`} id="svg-cat">
          <ellipse cx="50" cy="85" rx="25" ry="6" fill="#1E3A1E" opacity="0.25" />
          <path d="M 38 74 L 33 84 M 38 74 L 38 85 M 38 74 L 43 83" stroke="#EA580C" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M 58 74 L 53 84 M 58 74 L 58 85 M 58 74 L 63 83" stroke="#EA580C" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M 24 52 Q 14 42 18 32 Q 24 30 28 44" stroke="#F97316" strokeWidth="7" fill="none" strokeLinecap="round" />
          <ellipse cx="46" cy="58" rx="26" ry="20" fill="#F97316" stroke="#EA580C" strokeWidth="1.5" />
          <ellipse cx="44" cy="56" rx="16" ry="11" fill="#FB923C" opacity="0.45" />
          <path d="M 34 48 Q 38 56 36 64" stroke="#EA580C" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <path d="M 42 46 Q 46 54 44 64" stroke="#EA580C" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          {renderMudSplats()}
          <circle cx="66" cy="42" r="15" fill="#F97316" stroke="#EA580C" strokeWidth="0.5" />
          <polygon points="54,36 52,22 62,30" fill="#EA580C" />
          <polygon points="78,36 80,22 70,30" fill="#EA580C" />
          <polygon points="66,44 69,41 63,41" fill="#FDA4AF" />
          <line x1="56" y1="43" x2="48" y2="41" stroke="#EA580C" strokeWidth="1.2" />
          <line x1="56" y1="46" x2="49" y2="48" stroke="#EA580C" strokeWidth="1.2" />
          <line x1="76" y1="43" x2="84" y2="41" stroke="#EA580C" strokeWidth="1.2" />
          {isSad ? (
            <g>
              <path d="M 60 38 L 64 41" stroke="#1E293B" strokeWidth="3" strokeLinecap="round" />
              <path d="M 72 38 L 68 41" stroke="#1E293B" strokeWidth="3" strokeLinecap="round" />
            </g>
          ) : (
            <g>
              <circle cx="62" cy="38" r="3.5" fill="#1E293B" />
              <circle cx="72" cy="38" r="3.5" fill="#1E293B" />
              <circle cx="63" cy="36.5" r="1" fill="#FFFFFF" />
              <circle cx="73" cy="36.5" r="1" fill="#FFFFFF" />
            </g>
          )}
          <g transform="translate(66, 48)">
            {renderExpression()}
          </g>
        </svg>
      );

    case AnimalSpecies.DOG:
      return (
        <svg viewBox="0 0 100 100" className={`w-full h-full ${className}`} id="svg-dog">
          <ellipse cx="50" cy="85" rx="26" ry="6" fill="#1E3A1E" opacity="0.25" />
          <path d="M 40 74 L 35 84 M 40 74 L 40 85 M 40 74 L 45 83" stroke="#B45309" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M 60 74 L 55 84 M 60 74 L 60 85 M 60 74 L 65 83" stroke="#B45309" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M 22 54 Q 10 42 14 30 Q 20 28 26 44" stroke="#F59E0B" strokeWidth="8" fill="none" strokeLinecap="round" />
          <ellipse cx="46" cy="58" rx="28" ry="21" fill="#F59E0B" stroke="#D97706" strokeWidth="1.5" />
          <ellipse cx="44" cy="56" rx="14" ry="10" fill="#FBBF24" opacity="0.5" />
          {renderMudSplats()}
          <circle cx="68" cy="40" r="16" fill="#F59E0B" stroke="#D97706" strokeWidth="0.5" />
          <path d="M 56 34 Q 48 42 54 52 Z" fill="#B45309" />
          <path d="M 80 34 Q 88 42 82 52 Z" fill="#D97706" />
          <ellipse cx="74" cy="46" rx="7" ry="6" fill="#F1F5F9" />
          <ellipse cx="74" cy="44" rx="2.5" ry="2" fill="#111827" />
          {isSad ? (
            <g>
              <path d="M 62 36 L 66 39" stroke="#1E293B" strokeWidth="3" strokeLinecap="round" />
              <path d="M 74 36 L 70 39" stroke="#1E293B" strokeWidth="3" strokeLinecap="round" />
            </g>
          ) : (
            <g>
              <circle cx="64" cy="36" r="3.5" fill="#1E293B" />
              <circle cx="76" cy="36" r="3.5" fill="#1E293B" />
              <circle cx="65" cy="34.5" r="1" fill="#FFFFFF" />
              <circle cx="77" cy="34.5" r="1" fill="#FFFFFF" />
            </g>
          )}
          {!isSad && happiness > 50 && (
            <path d="M 72 50 Q 76 56 80 50" stroke="#EF4444" strokeWidth="3" fill="none" strokeLinecap="round" />
          )}
          <g transform="translate(68, 50)">
            {renderExpression()}
          </g>
        </svg>
      );

    case AnimalSpecies.T_REX:
      return (
        <svg viewBox="0 0 100 100" className={`w-full h-full ${className}`} id="svg-trex">
          <ellipse cx="50" cy="85" rx="26" ry="6" fill="#1E3A1E" opacity="0.25" />
          <circle cx="50" cy="56" r="26" fill="#15803D" stroke="#166534" strokeWidth="2" />
          <path d="M 65 52 L 74 54 M 65 58 L 74 60" stroke="#14532D" strokeWidth="4" strokeLinecap="round" />
          <ellipse cx="44" cy="55" rx="5" ry="6" fill="#14532D" opacity="0.1" />
          <text x="50" y="55" textAnchor="middle" fontSize="48" dy=".35em">🦖</text>
          {renderExpression()}
        </svg>
      );

    case AnimalSpecies.TRICERATOPS:
      return (
        <svg viewBox="0 0 100 100" className={`w-full h-full ${className}`} id="svg-triceratops">
          <ellipse cx="50" cy="85" rx="28" ry="6" fill="#1E3A1E" opacity="0.25" />
          <circle cx="48" cy="56" r="26" fill="#0D9488" stroke="#115E59" strokeWidth="2" />
          <text x="48" y="55" textAnchor="middle" fontSize="48" dy=".35em">🦕</text>
          {renderExpression()}
        </svg>
      );

    case AnimalSpecies.PTERODACTYL:
      return (
        <svg viewBox="0 0 100 100" className={`w-full h-full ${className}`} id="svg-pterodactyl">
          <ellipse cx="50" cy="85" rx="24" ry="5" fill="#1E3A1E" opacity="0.2" />
          <circle cx="50" cy="55" r="25" fill="#B45309" stroke="#78350F" strokeWidth="2" />
          <text x="50" y="53" textAnchor="middle" fontSize="48" dy=".35em">🦅</text>
          {renderExpression()}
        </svg>
      );

    case AnimalSpecies.DIPLODOCUS:
      return (
        <svg viewBox="0 0 100 100" className={`w-full h-full ${className}`} id="svg-diplodocus">
          <ellipse cx="50" cy="85" rx="28" ry="6" fill="#1E3A1E" opacity="0.25" />
          <circle cx="48" cy="56" r="26" fill="#0891B2" stroke="#0E7490" strokeWidth="2" />
          <text x="48" y="55" textAnchor="middle" fontSize="48" dy=".35em">🦕</text>
          {renderExpression()}
        </svg>
      );

    case AnimalSpecies.FENNEC:
      return (
        <svg viewBox="0 0 100 100" className={`w-full h-full ${className}`} id="svg-fennec">
          <ellipse cx="50" cy="85" rx="24" ry="5" fill="#1E3A1E" opacity="0.25" />
          <ellipse cx="48" cy="60" rx="22" ry="16" fill="#F59E0B" stroke="#D97706" strokeWidth="1.5" />
          {/* Big ears */}
          <path d="M 33 42 Q 15 15 38 32 Z" fill="#F59E0B" stroke="#D97706" strokeWidth="1.5" />
          <path d="M 34 39 Q 22 22 36 32 Z" fill="#FFD1DC" />
          <path d="M 63 42 Q 81 15 58 32 Z" fill="#F59E0B" stroke="#D97706" strokeWidth="1.5" />
          <path d="M 62 39 Q 74 22 60 32 Z" fill="#FFD1DC" />
          <text x="48" y="58" textAnchor="middle" fontSize="42" dy=".35em">🦊</text>
          {renderExpression()}
        </svg>
      );

    case AnimalSpecies.CAMEL:
      return (
        <svg viewBox="0 0 100 100" className={`w-full h-full ${className}`} id="svg-camel">
          <ellipse cx="50" cy="85" rx="28" ry="7" fill="#1E3A1E" opacity="0.25" />
          <ellipse cx="48" cy="62" rx="24" ry="17" fill="#D97706" stroke="#B45309" strokeWidth="2" />
          <circle cx="38" cy="46" r="10" fill="#D97706" stroke="#B45309" strokeWidth="1.5" />
          <circle cx="58" cy="46" r="10" fill="#D97706" stroke="#B45309" strokeWidth="1.5" />
          <text x="48" y="60" textAnchor="middle" fontSize="42" dy=".35em">🐫</text>
          {renderExpression()}
        </svg>
      );

    case AnimalSpecies.PEACOCK:
      return (
        <svg viewBox="0 0 100 100" className={`w-full h-full ${className}`} id="svg-peacock">
          <ellipse cx="50" cy="85" rx="22" ry="5" fill="#1E3A1E" opacity="0.25" />
          <ellipse cx="42" cy="58" rx="18" ry="14" fill="#1D4ED8" stroke="#1E3A8A" strokeWidth="1.5" />
          <path d="M 58 50 Q 78 30 72 55 Q 68 70 58 62 Z" fill="#059669" stroke="#047857" strokeWidth="1" />
          <circle cx="36" cy="48" r="8" fill="#2563EB" stroke="#1E40AF" strokeWidth="1.5" />
          <text x="48" y="58" textAnchor="middle" fontSize="36" dy=".35em">🦚</text>
          {renderExpression()}
        </svg>
      );

    case AnimalSpecies.SWAN:
      return (
        <svg viewBox="0 0 100 100" className={`w-full h-full ${className}`} id="svg-swan">
          <ellipse cx="50" cy="85" rx="24" ry="6" fill="#1E3A1E" opacity="0.25" />
          <ellipse cx="48" cy="62" rx="20" ry="15" fill="#FFFFFF" stroke="#E5E7EB" strokeWidth="2" />
          <path d="M 58 48 Q 72 38 68 52" stroke="#F97316" strokeWidth="3" fill="none" strokeLinecap="round" />
          <circle cx="36" cy="46" r="9" fill="#FFFFFF" stroke="#D1D5DB" strokeWidth="1.5" />
          <text x="48" y="58" textAnchor="middle" fontSize="38" dy=".35em">🦢</text>
          {renderExpression()}
        </svg>
      );

    default:
      return null;
  }
};
