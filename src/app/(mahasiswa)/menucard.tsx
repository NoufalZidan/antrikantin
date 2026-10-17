'use client';

export interface MenuItem {
  id: number;
  name: string;
  description: string;
  price: number;
  status: 'TERSEDIA' | 'HABIS';
  category: string;
  sellerName: string;
  image: string;
}

export default function MenuCard({ item }: { item: MenuItem }) {
  const isAvailable = item.status === 'TERSEDIA';

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 flex flex-col hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
      {/* Image */}
      <div className="relative w-full h-44 bg-gray-100">
        <img
          src={item.image}
          alt={item.name}
          className="w-full h-full object-cover"
        />
        <span
          className={`absolute top-3 left-3 px-3 py-1 rounded-full text-[10px] font-bold text-white uppercase tracking-wider ${
            isAvailable ? 'bg-emerald-500' : 'bg-rose-500'
          }`}
        >
          {item.status}
        </span>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        <span className="inline-block self-start px-2.5 py-0.5 rounded-md text-[10px] font-bold text-emerald-700 bg-emerald-50 uppercase tracking-wide mb-2">
          {item.category}
        </span>
        <h3 className="font-bold text-gray-800 text-base line-clamp-1">
          {item.name}
        </h3>
        <p className="text-gray-500 text-xs mt-1 line-clamp-3 min-h-[3.4rem] leading-relaxed">
          {item.description}
        </p>

        <div className="mt-auto pt-3 flex items-end justify-between border-t border-gray-50">
          <div>
            <span className="text-emerald-600 font-extrabold text-base">
              Rp {item.price.toLocaleString('id-ID')}
            </span>
            <span className="text-[11px] text-gray-400 block">
              oleh {item.sellerName}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
