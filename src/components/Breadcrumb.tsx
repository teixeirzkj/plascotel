import { Link } from "react-router-dom";
import { FiChevronRight } from "react-icons/fi";

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Trilha de navegação" className="mb-4 flex flex-wrap items-center gap-1.5 text-xs text-charcoal/50 sm:text-sm">
      {items.map((item, i) => {
        const ultimo = i === items.length - 1;
        return (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <FiChevronRight size={12} className="flex-none" />}
            {item.to && !ultimo ? (
              <Link to={item.to} className="hover:text-charcoal hover:underline">
                {item.label}
              </Link>
            ) : (
              <span className={ultimo ? "truncate text-charcoal/80" : ""}>{item.label}</span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
