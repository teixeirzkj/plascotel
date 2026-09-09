import { FiStar } from "react-icons/fi";

/** Estrelas de avaliação (só leitura). Não renderiza nada sem avaliações. */
export function StarRating({
  media,
  quantidade,
  size = 14,
}: {
  media?: number;
  quantidade?: number;
  size?: number;
}) {
  if (!quantidade) return null;

  return (
    <div className="flex items-center gap-1">
      <div className="flex">
        {Array.from({ length: 5 }, (_, i) => {
          const preenchida = i < Math.round(media ?? 0);
          return (
            <FiStar
              key={i}
              size={size}
              className={preenchida ? "fill-gold text-gold" : "text-charcoal/20"}
            />
          );
        })}
      </div>
      <span className="text-xs text-charcoal/50">({quantidade})</span>
    </div>
  );
}
