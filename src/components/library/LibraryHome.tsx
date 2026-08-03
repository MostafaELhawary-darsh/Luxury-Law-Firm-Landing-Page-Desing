import { libraryCards } from '@/lib/libraryConfig';
import type { LibrarySection } from '@/lib/types';

interface LibraryHomeProps {
  onSelect: (section: LibrarySection) => void;
}

export default function LibraryHome({ onSelect }: LibraryHomeProps) {
  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-20 px-4 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-4 mb-6">
            <span className="w-12 h-px bg-gold/40" />
            <p className="font-body text-xs text-gold tracking-[0.4em] uppercase">Digital Law Library</p>
            <span className="w-12 h-px bg-gold/40" />
          </div>
          <h1 className="font-heading font-bold text-midnight text-3xl md:text-4xl mb-4">
            المكتبة القانونية الرقمية
          </h1>
          <p className="font-body font-light text-ink/60 text-base max-w-2xl mx-auto leading-[1.9]">
            منصة شاملة للبحث في التشريعات المصرية وأحكام المحاكم والفتاوى،
            مع فهرسة دقيقة وربط بين النصوص القانونية.
          </p>
        </div>

        {/* 4x3 Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {libraryCards.map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.id}
                onClick={() => onSelect(card.id)}
                className="group bg-white rounded-2xl p-8 shadow-sm hover:shadow-xl transition-all duration-500 ease-luxury border border-gray-100 hover:border-gold/30 text-right"
              >
                <div className="flex items-start gap-5">
                  <div
                    className={`flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center ${card.bgColor} transition-transform duration-500 group-hover:scale-110`}
                  >
                    <Icon
                      size={28}
                      strokeWidth={1.5}
                      className={card.iconColor}
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-heading font-bold text-midnight text-base mb-2 leading-snug group-hover:text-gold transition-colors duration-500">
                      {card.title}
                    </h3>
                    <p className="font-body text-xs text-ink/50 leading-[1.8]">
                      {card.description}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
