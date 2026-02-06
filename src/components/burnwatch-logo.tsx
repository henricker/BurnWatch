import React from "react";
import { Zap } from "lucide-react";

type BurnWatchLogoSize = "sm" | "md" | "lg";

type BurnWatchLogoProps = {
  size?: BurnWatchLogoSize;
  showText?: boolean;
};

/**
 * Componente de Logo oficial do BurnWatch
 * @param size - Tamanho do ícone ('sm', 'md', 'lg')
 * @param showText - Se deve exibir o texto "BurnWatch" ao lado do ícone
 */
export const BurnWatchLogo: React.FC<BurnWatchLogoProps> = ({
  size = "md",
  showText = true,
}) => {
  const sizeClasses: Record<
    BurnWatchLogoSize,
    { box: string; icon: number; text: string }
  > = {
    sm: { box: "w-6 h-6", icon: 12, text: "text-base" },
    md: { box: "w-7 h-7", icon: 14, text: "text-lg" },
    lg: { box: "w-10 h-10", icon: 20, text: "text-2xl" },
  };

  const currentSize = sizeClasses[size] ?? sizeClasses.md;

  return (
    <div className="group flex cursor-pointer items-center gap-3">
      {/* Ícone Estilizado (O \"Burn\") */}
      <div
        className={`${currentSize.box} bg-[#f97316] rounded flex items-center justify-center shadow-[0_0_10px_rgba(249,115,22,0.4)] transition-transform group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(249,115,22,0.6)]`}
      >
        <Zap size={currentSize.icon} className="text-white fill-white" />
      </div>

      {/* Texto da Marca (O \"Watch\") */}
      {showText && (
        <span
          className={`font-bold tracking-tight text-white ${currentSize.text}`}
        >
          BurnWatch
        </span>
      )}
    </div>
  );
};

export default BurnWatchLogo;

