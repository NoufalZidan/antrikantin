'use client';

import { useState } from 'react';
import MenuCard, { MenuItem } from './menucard';

export interface OrderItem extends MenuItem {
  quantity: number;
  variant?: string;
}

const dummyMenus: MenuItem[] = [
  { 
    id: 1, 
    name: 'Nasi Cumi Hitam', 
    description: 'Nasi hangat dengan cumi segar bumbu tinta hitam gurih pekat, serundeng kelapa, dan sambal mangga muda.', 
    price: 20000, 
    status: 'TERSEDIA', 
    category: 'MAKANAN', 
    sellerName: 'Administrator Kantin', 
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop' 
  },
  { 
    id: 2, 
    name: 'Oli Motor', 
    description: 'Oli mesin 4T SAE 10W-40 kemasan 0.8L untuk menjaga performa mesin tetap halus dan tarikan enteng.', 
    price: 50000, 
    status: 'HABIS', 
    category: 'LAINNYA', 
    sellerName: 'Administrator Kantin', 
    image: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=500&auto=format&fit=crop' 
  },
  { 
    id: 3, 
    name: 'Mie Telur', 
    description: 'Mie kenyal olahan bumbu rempah spesial dipadukan dengan telur mata sapi setengah matang, sawi hijau, dan bawang goreng.', 
    price: 10000, 
    status: 'TERSEDIA', 
    category: 'MAKANAN', 
    sellerName: 'Administrator Kantin', 
    image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=500&auto=format&fit=crop' 
  },
  { 
    id: 4, 
    name: 'Soto Ayam', 
    description: 'Soto ayam kuah bening kuning aromatik kaya rempah, dilengkapi suwiran ayam gurih, sohun, kol, telur rebus, dan koya.', 
    price: 12000, 
    status: 'TERSEDIA', 
    category: 'MAKANAN', 
    sellerName: 'Administrator Kantin', 
    image: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=500&auto=format&fit=crop' 
  },
  { 
    id: 5, 
    name: 'Jus Alpukat', 
    description: 'Olahan alpukat mentega segar kental manis alami, disajikan dengan lelehan susu kental cokelat premium.', 
    price: 10000, 
    status: 'HABIS', 
    category: 'MINUMAN', 
    sellerName: 'Administrator Kantin', 
    image: 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=500&auto=format&fit=crop' 
  },
  { 
    id: 6, 
    name: 'Es Teh Manis', 
    description: 'Teh melati seduh tradisional wangi aroma bunga, disajikan dingin dengan es batu segar dan gula asli.', 
    price: 5000, 
    status: 'TERSEDIA', 
    category: 'MINUMAN', 
    sellerName: 'Administrator Kantin', 
    image: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=500&auto=format&fit=crop' 
  },
  { 
    id: 7, 
    name: 'Nasi Goreng Spesial', 
    description: 'Nasi goreng wok aromatik smokey khas kantin dengan suwiran ayam, telur orak-arik, bakso sapi, dan kerupuk renyah.', 
    price: 15000, 
    status: 'TERSEDIA', 
    category: 'MAKANAN', 
    sellerName: 'Administrator Kantin', 
    image: 'https://images.unsplash.com/photo-1585238341710-4b4e6784d0e0?w=500&auto=format&fit=crop' 
  },
  { 
    id: 8, 
    name: 'Teh Tarik Premium', 
    description: 'Perpaduan teh hitam pekat dan susu kental manis ditarik sempurna hingga berbusa lembut khas citarasa Melayu.', 
    price: 8000, 
    status: 'TERSEDIA', 
    category: 'MINUMAN', 
    sellerName: 'Administrator Kantin', 
    image: 'https://images.unsplash.com/photo-1597318348346-7efab60bd3f3?w=500&auto=format&fit=crop' 
  },
];

const categories = ['Semua', 'Makanan', 'Minuman', 'Camilan', 'Dessert', 'Lainnya'];

export default function HomePage() {
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [showCartDetail, setShowCartDetail] = useState(false);
  const [activeOptionMenu, setActiveOptionMenu] = useState<MenuItem | null>(null);

  const filteredMenus = dummyMenus.filter((menu) => {
    const categoryMatch =
      selectedCategory === 'Semua' ||
      menu.category.toLowerCase() === selectedCategory.toLowerCase();
    const searchMatch = menu.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    return categoryMatch && searchMatch;
  });

  const addToCart = (item: MenuItem, variant: string) => {
    setCart((prev) => {
      const existing = prev.find(
        (i) => i.id === item.id && i.variant === variant
      );
      if (existing) {
        return prev.map((i) =>
          i.id === item.id && i.variant === variant
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      return [...prev, { ...item, quantity: 1, variant }];
    });
    setActiveOptionMenu(null);
  };

  const removeFromCart = (id: number, variant?: string) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === id && i.variant === variant);
      if (existing && existing.quantity > 1) {
        return prev.map((i) =>
          i.id === id && i.variant === variant
            ? { ...i, quantity: i.quantity - 1 }
            : i
        );
      }
      return prev.filter((i) => !(i.id === id && i.variant === variant));
    });
  };

  const totalItems = cart.reduce((acc, curr) => acc + curr.quantity, 0);
  const totalPrice = cart.reduce(
    (acc, curr) => acc + curr.price * curr.quantity,
    0
  );

  return (
    <div className="min-h-screen bg-emerald-50/30 pb-32">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="text-2xl font-bold text-emerald-600">J'S</div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:block px-4 py-2 rounded-full bg-gray-100 text-sm text-gray-700 font-medium">
              Administrator Kantin (admin)
            </div>
            <button className="text-gray-700 hover:text-gray-900 font-medium text-sm">
              Keluar
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-gradient-to-br from-emerald-600 to-emerald-500 text-white pt-10 pb-20 px-4 text-center relative">
        <h1 className="text-3xl font-bold mb-2">Kelola Menu Kantin</h1>
        <p className="text-emerald-100 text-sm">
          Kelola dan pantau semua menu yang tersedia.
        </p>
        <div className="absolute left-1/2 -translate-x-1/2 -bottom-6 w-full max-w-xl px-4">
          <div className="bg-white rounded-2xl p-1.5 shadow-lg flex items-center gap-2">
            <input
              type="text"
              placeholder="Cari menu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2.5 text-gray-700 outline-none"
            />
            <button className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-bold">
              Cari
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 pt-14">
        <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-5 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-6">
          {filteredMenus.map((menu) => {
            const inCartCount = cart
              .filter((c) => c.id === menu.id)
              .reduce((a, b) => a + b.quantity, 0);
            return (
              <div key={menu.id} className="relative">
                <MenuCard item={menu} />
                <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-white rounded-full shadow-md border border-gray-100 p-1">
                  {inCartCount > 0 && (
                    <>
                      <button
                        onClick={() => {
                          const items = cart.filter((c) => c.id === menu.id);
                          if (items.length > 0)
                            removeFromCart(menu.id, items[items.length - 1].variant);
                        }}
                        className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold"
                      >
                        -
                      </button>
                      <span className="text-sm font-bold px-1">
                        {inCartCount}
                      </span>
                    </>
                  )}
                  <button
                    onClick={() => {
                      if (menu.status === 'HABIS') return;
                      if (
                        menu.category === 'MAKANAN' ||
                        menu.category === 'MINUMAN'
                      ) {
                        setActiveOptionMenu(menu);
                      } else {
                        addToCart(menu, 'Standard');
                      }
                    }}
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                      menu.status === 'HABIS'
                        ? 'bg-gray-100 text-gray-400'
                        : 'bg-emerald-600 text-white'
                    }`}
                    disabled={menu.status === 'HABIS'}
                  >
                    +
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Option Modal */}
      {activeOptionMenu && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 p-4">
          <div className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-3xl p-6">
            <h3 className="text-xl font-bold mb-4">
              Pilih Opsi: {activeOptionMenu.name}
            </h3>
            <div className="space-y-3">
              {activeOptionMenu.category === 'MAKANAN'
                ? ['Tidak Pedas', 'Sedang', 'Pedas', 'Sangat Pedas'].map(
                    (v) => (
                      <button
                        key={v}
                        onClick={() => addToCart(activeOptionMenu, v)}
                        className="w-full py-3 rounded-xl border border-gray-200 text-left px-4 font-medium hover:border-emerald-500 hover:bg-emerald-50"
                      >
                        {v}
                      </button>
                    )
                  )
                : ['Dingin', 'Hangat/Panas'].map((v) => (
                    <button
                      key={v}
                      onClick={() => addToCart(activeOptionMenu, v)}
                      className="w-full py-3 rounded-xl border border-gray-200 text-left px-4 font-medium hover:border-emerald-500 hover:bg-emerald-50"
                    >
                      {v}
                    </button>
                  ))}
            </div>
            <button
              onClick={() => setActiveOptionMenu(null)}
              className="w-full mt-4 py-2 text-gray-500 font-medium"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Floating Cart Bar */}
      {totalItems > 0 && (
        <div
          className={`fixed bottom-0 left-0 right-0 z-50 transition-all duration-300 ${
            showCartDetail ? 'h-[60vh]' : 'h-20'
          }`}
        >
          {showCartDetail && (
            <div
              className="fixed inset-0 bg-black/20 -z-10"
              onClick={() => setShowCartDetail(false)}
            />
          )}

          <div className="bg-white border-t border-emerald-100 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] h-full flex flex-col rounded-t-3xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 flex-shrink-0">
              <button
                onClick={() => setShowCartDetail(!showCartDetail)}
                className="flex items-center gap-3"
              >
                <div
                  className={`transition-transform duration-300 ${
                    showCartDetail ? 'rotate-180' : ''
                  }`}
                >
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-emerald-600"
                  >
                    <polyline points="18 15 12 9 6 15"></polyline>
                  </svg>
                </div>
                <div className="text-left">
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">
                    {totalItems} Item
                  </p>
                  <p className="font-extrabold text-emerald-600 text-lg">
                    Rp {totalPrice.toLocaleString('id-ID')}
                  </p>
                </div>
              </button>

              <button className="bg-emerald-600 text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-emerald-600/20 active:scale-95">
                Checkout
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 border-t border-gray-50">
              {cart.map((item, idx) => (
                <div
                  key={`${item.id}-${item.variant}-${idx}`}
                  className="flex items-center gap-4 py-4 border-b border-gray-50 last:border-0"
                >
                  {/* Thumbnail */}
                  <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                        {item.category}
                      </span>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                        {item.variant}
                      </span>
                    </div>
                    <p className="font-bold text-gray-800 text-sm truncate">{item.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Rp {item.price.toLocaleString('id-ID')} x {item.quantity}
                    </p>
                    <p className="text-sm font-extrabold text-emerald-600 mt-1">
                      Rp {(item.price * item.quantity).toLocaleString('id-ID')}
                    </p>
                  </div>

                  {/* Qty Controls */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => removeFromCart(item.id, item.variant)}
                      className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center font-bold text-gray-500 hover:bg-gray-200"
                    >
                      -
                    </button>
                    <span className="font-bold text-sm w-5 text-center">{item.quantity}</span>
                    <button
                      onClick={() => addToCart(item, item.variant!)}
                      className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-white hover:bg-emerald-700"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}

              {/* Ringkasan */}
              <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal ({totalItems} item)</span>
                  <span className="font-semibold text-gray-700">Rp {totalPrice.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Biaya Layanan</span>
                  <span className="font-semibold text-gray-700">Gratis</span>
                </div>
                <div className="flex justify-between text-base pt-2 border-t border-gray-100">
                  <span className="font-bold text-gray-800">Total Pembayaran</span>
                  <span className="font-extrabold text-emerald-600">Rp {totalPrice.toLocaleString('id-ID')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}