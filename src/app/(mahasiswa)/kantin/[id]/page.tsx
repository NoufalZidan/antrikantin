'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import MenuCard, { MenuItem } from '../../menucard'; 

export interface OrderItem extends MenuItem {
  quantity: number;
  variant?: string;
}

const supabase = createClient();
const categories = ['Semua', 'Makanan', 'Minuman', 'Camilan', 'Dessert', 'Lainnya'];

export default function KantinDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();

  // State untuk menyimpan ID kantin
  const [canteenId, setCanteenId] = useState<string>('');

  const [canteenName, setCanteenName] = useState('Memuat...');
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [showCartDetail, setShowCartDetail] = useState(false);
  const [activeOptionMenu, setActiveOptionMenu] = useState<MenuItem | null>(null);
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 1. Ekstrak params secara asynchronous agar tidak memblokir prerendering Next.js
  useEffect(() => {
    params.then((resolvedParams) => {
      setCanteenId(resolvedParams.id);
    });
  }, [params]);

  // 2. Ambil data kantin dan menu setelah canteenId tersedia
  useEffect(() => {
    if (!canteenId) return;

    const fetchCanteenAndMenus = async () => {
      setIsLoading(true);
      
      // Ambil nama kantin dari tabel canteens
      const { data: canteen } = await supabase
        .from('canteens')
        .select('nama')
        .eq('id', canteenId)
        .single();
        
      if (canteen) setCanteenName(canteen.nama);

      // Ambil menu spesifik untuk kantin ini
      const { data: dbMenus } = await supabase
        .from('menus')
        .select('id, nama, deskripsi, harga, tersedia, gambar_url')
        .eq('canteen_id', canteenId);
      
      if (dbMenus && dbMenus.length > 0) {
        const mappedMenus: MenuItem[] = dbMenus.map((m: any) => ({
          id: m.id,
          name: m.nama,
          description: m.deskripsi,
          price: m.harga,
          status: m.tersedia ? 'TERSEDIA' : 'HABIS',
          category: 'LAINNYA', // Update ini jika kamu menambah kolom kategori di DB nanti
          sellerName: canteen?.nama || 'Kantin',
          image: m.gambar_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop'
        }));
        setMenus(mappedMenus);
      }
      setIsLoading(false);
    };

    fetchCanteenAndMenus();
  }, [canteenId]);

  const filteredMenus = menus.filter((menu) => {
    const categoryMatch = selectedCategory === 'Semua' || menu.category.toLowerCase() === selectedCategory.toLowerCase();
    const searchMatch = menu.name.toLowerCase().includes(searchQuery.toLowerCase());
    return categoryMatch && searchMatch;
  });

  const addToCart = (item: MenuItem, variant: string) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id && i.variant === variant);
      if (existing) {
        return prev.map((i) => i.id === item.id && i.variant === variant ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1, variant }];
    });
    setActiveOptionMenu(null);
  };

  const removeFromCart = (id: number, variant?: string) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === id && i.variant === variant);
      if (existing && existing.quantity > 1) {
        return prev.map((i) => i.id === id && i.variant === variant ? { ...i, quantity: i.quantity - 1 } : i);
      }
      return prev.filter((i) => !(i.id === id && i.variant === variant));
    });
  };

  const totalItems = cart.reduce((acc, curr) => acc + curr.quantity, 0);
  const totalPrice = cart.reduce((acc, curr) => acc + curr.price * curr.quantity, 0);

  return (
    <div className="min-h-screen bg-emerald-50/30 pb-32">
      {/* Header dengan Tombol Kembali */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4">
          <button 
            onClick={() => {
              if (cart.length > 0) {
                 if(confirm('Keranjangmu di kantin ini akan dihapus jika kamu kembali. Lanjutkan?')) {
                     router.push('/');
                 }
              } else {
                 router.push('/');
              }
            }} 
            className="text-gray-500 hover:text-emerald-600 font-bold flex items-center gap-2"
          >
            <span>&larr;</span> Kembali
          </button>
          <div className="text-xl font-bold text-emerald-600">{canteenName}</div>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-gradient-to-br from-emerald-600 to-emerald-500 text-white pt-10 pb-20 px-4 text-center relative">
        <h1 className="text-3xl font-bold mb-2">Pesan di {canteenName}</h1>
        <p className="text-emerald-100 text-sm">
          Jelajahi menu pilihan dan pesan dengan mudah.
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

        {isLoading ? (
           <div className="text-center py-10 text-gray-500">Memuat menu...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-6">
            {filteredMenus.length === 0 ? (
               <div className="col-span-full text-center text-gray-500 py-10">Belum ada menu di kantin ini.</div>
            ) : (
              filteredMenus.map((menu) => {
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
                          if (menu.category === 'MAKANAN' || menu.category === 'MINUMAN') {
                            setActiveOptionMenu(menu);
                          } else {
                            addToCart(menu, 'Standard');
                          }
                        }}
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                          menu.status === 'HABIS' ? 'bg-gray-100 text-gray-400' : 'bg-emerald-600 text-white'
                        }`}
                        disabled={menu.status === 'HABIS'}
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
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
            <button onClick={() => setActiveOptionMenu(null)} className="w-full mt-4 py-2 text-gray-500 font-medium">
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Overlay untuk Cart Detail */}
      <div
        className={`fixed inset-0 bg-black/20 z-40 transition-opacity duration-500 ${
          showCartDetail ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setShowCartDetail(false)}
      />

      {/* Cart Detail Sheet - Slide Up dengan animasi */}
      {totalItems > 0 && (
        <div 
          className={`fixed bottom-28 left-4 right-4 z-50 max-h-[calc(100vh-8rem)] transition-all duration-500 ease-out ${
            showCartDetail ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'
          }`}
        >
          <div className="bg-white rounded-3xl overflow-hidden shadow-[0_-4px_20px_rgba(0,0,0,0.15)] h-full flex flex-col">
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {cart.map((item, idx) => (
                <div key={`${item.id}-${item.variant}-${idx}`} className="flex items-center gap-4 py-4 border-b border-gray-50 last:border-0">
                  <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">{item.category}</span>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{item.variant}</span>
                    </div>
                    <p className="font-bold text-gray-800 text-sm truncate">{item.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Rp {item.price.toLocaleString('id-ID')} x {item.quantity}</p>
                    <p className="text-sm font-extrabold text-emerald-600 mt-1">Rp {(item.price * item.quantity).toLocaleString('id-ID')}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => removeFromCart(item.id, item.variant)} className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center font-bold text-gray-500 hover:bg-gray-200">-</button>
                    <span className="font-bold text-sm w-5 text-center">{item.quantity}</span>
                    <button onClick={() => addToCart(item, item.variant!)} className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-white hover:bg-emerald-700">+</button>
                  </div>
                </div>
              ))}
              <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                <div className="flex justify-between text-sm"><span className="text-gray-500">Subtotal ({totalItems} item)</span><span className="font-semibold text-gray-700">Rp {totalPrice.toLocaleString('id-ID')}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-500">Biaya Layanan</span><span className="font-semibold text-gray-700">Gratis</span></div>
                <div className="flex justify-between text-base pt-2 border-t border-gray-100"><span className="font-bold text-gray-800">Total Pembayaran</span><span className="font-extrabold text-emerald-600">Rp {totalPrice.toLocaleString('id-ID')}</span></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Cart Bar - Melayang */}
      {totalItems > 0 && (
        <div className="fixed bottom-4 left-4 right-4 z-50 h-20 bg-white rounded-2xl border border-emerald-100 shadow-[0_4px_20px_rgba(0,0,0,0.12)]">
          <div className="flex items-center justify-between px-6 py-4 h-full">
            <button onClick={() => setShowCartDetail(!showCartDetail)} className="flex items-center gap-3">
              <div className={`transition-transform duration-500 ${showCartDetail ? 'rotate-180' : ''}`}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600"><polyline points="18 15 12 9 6 15"></polyline></svg>
              </div>
              <div className="text-left">
                <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">{totalItems} Item</p>
                <p className="font-extrabold text-emerald-600 text-lg">Rp {totalPrice.toLocaleString('id-ID')}</p>
              </div>
            </button>
            <button 
              onClick={() => {
                // Simpan data checkout ke localStorage
                localStorage.setItem('checkout_data', JSON.stringify({
                  cart,
                  canteenName,
                  canteenId
                }));
                router.push('/checkout');
              }}
              className="bg-emerald-600 text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-emerald-600/20 active:scale-95"
            >
              Checkout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}