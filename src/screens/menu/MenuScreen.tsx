import React, { useState, useEffect } from 'react';
import {
  UtensilsCrossed,
  Plus,
  Search,
  Edit2,
  Trash2,
  Check,
  Tag,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { menuService } from '../../services/menuService';
import { MenuItem, MenuCategory } from '../../types/models';
import { formatRupee } from '../../lib/money';
import { generateUUID } from '../../lib/uuid';

export const MenuScreen: React.FC = () => {
  const { shop } = useShop();

  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [selectedCat, setSelectedCat] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Edit / Create Item Modal
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [price, setPrice] = useState('');
  const [hasHalf, setHasHalf] = useState(false);
  const [halfPrice, setHalfPrice] = useState('');
  const [isAvailable, setIsAvailable] = useState(true);

  // Category Modal
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = async (showLoading = true) => {
    if (!shop?.id) return;
    if (showLoading) setIsLoading(true);
    setIsRefreshing(true);
    try {
      const [c, itms] = await Promise.all([
        menuService.getCategories(shop.id, shop.shopType),
        menuService.getMenuItems(shop.id, shop.shopType),
      ]);
      setCategories(c);
      setItems(itms);
      if (c.length > 0 && !categoryId) {
        setCategoryId(c[0].id);
      }
    } catch (err) {
      console.warn('Menu load error:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (!shop?.id) return;
    loadData(true);

    const unsubscribe = menuService.subscribeToMenuChanges(shop.id, () => {
      loadData(false);
    });

    return () => {
      unsubscribe();
    };
  }, [shop?.id, shop?.shopType]);

  const filteredItems = items.filter((it) => {
    const matchesCat =
      selectedCat === 'all' ||
      it.categoryId === selectedCat ||
      (it as any).category === selectedCat;
    const matchesSearch = !searchQuery.trim() || it.name.toLowerCase().includes(searchQuery.toLowerCase().trim());
    return matchesCat && matchesSearch;
  });

  const handleOpenNewItem = () => {
    setEditingItem(null);
    setName('');
    setPrice('');
    setHasHalf(false);
    setHalfPrice('');
    setIsAvailable(true);
    if (categories.length > 0) setCategoryId(categories[0].id);
    setIsItemModalOpen(true);
  };

  const handleOpenEditItem = (item: MenuItem) => {
    setEditingItem(item);
    setName(item.name);
    setCategoryId(item.categoryId);
    setPrice(item.price.toString());
    setHasHalf(item.hasHalf);
    setHalfPrice(item.halfPrice ? item.halfPrice.toString() : '');
    setIsAvailable(item.isAvailable);
    setIsItemModalOpen(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shop?.id || !name.trim() || !price) return;

    const p = Number(price);
    const hp = hasHalf ? Number(halfPrice) || undefined : undefined;

    const item: MenuItem = {
      id: editingItem?.id || generateUUID(),
      shopId: shop.id,
      categoryId: categoryId || (categories[0]?.id || generateUUID()),
      name: name.trim(),
      price: p,
      halfPrice: hp,
      hasHalf,
      isFavorite: editingItem?.isFavorite || false,
      isAvailable,
      sortOrder: editingItem?.sortOrder || items.length,
    };

    await menuService.saveMenuItem(item);
    setIsItemModalOpen(false);
    await loadData();
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!shop?.id) return;
    if (confirm('Are you sure you want to delete this menu dish?')) {
      await menuService.deleteMenuItem(itemId, shop.id);
      await loadData();
    }
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shop?.id || !newCatName.trim()) return;

    await menuService.saveCategory({
      id: generateUUID(),
      shopId: shop.id,
      name: newCatName.trim(),
      sortOrder: categories.length,
      isActive: true,
    });
    setNewCatName('');
    setIsCatModalOpen(false);
    await loadData();
  };

  return (
    <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4">
      {/* Title & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold font-heading text-[#111111]">Menu & Category Catalog</h2>
          <p className="text-xs text-[#76716B]">Add dishes, configure half/full portions, and manage prices</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadData(true)}
            title="Sync & Refresh Menu"
            disabled={isRefreshing}
            className="p-2 rounded-xl text-xs font-bold border border-[#EBE7E1] bg-white hover:bg-[#FAF8F5] text-[#76716B] hover:text-[#111111] transition flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#FF5F00] ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline text-xs">Sync</span>
          </button>
          <button
            onClick={() => setIsCatModalOpen(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-bold border border-[#EBE7E1] bg-white hover:bg-[#FAF8F5] text-[#111111] transition flex items-center gap-1.5"
          >
            <Tag className="w-3.5 h-3.5 text-[#76716B]" />
            <span>Add Category</span>
          </button>
          <button
            onClick={handleOpenNewItem}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-[#FF5F00] hover:bg-[#EA580C] text-white transition flex items-center gap-1.5 shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>Add Dish</span>
          </button>
        </div>
      </div>

      {/* Category Filter Pills & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedCat('all')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition ${
              selectedCat === 'all'
                ? 'bg-[#111111] text-white'
                : 'bg-white border border-[#EBE7E1] text-[#76716B]'
            }`}
          >
            All Items ({items.length})
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCat(c.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition ${
                selectedCat === c.id
                  ? 'bg-[#111111] text-white'
                  : 'bg-white border border-[#EBE7E1] text-[#76716B]'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#76716B]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search menu dishes..."
            className="w-full pl-9 pr-3 py-2 text-xs font-semibold rounded-xl border border-[#EBE7E1] bg-white outline-hidden focus:border-[#FF5F00]"
          />
        </div>
      </div>

      {/* Items Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-[#76716B]">
          <div className="w-8 h-8 border-3 border-[#FF5F00] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <span>Loading menu catalog...</span>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="p-12 text-center text-xs text-[#76716B] bg-white rounded-2xl border border-[#EBE7E1]">
          No menu dishes found. Click "Add Dish" to add your first menu item.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-[#EBE7E1] p-4 shadow-xs flex flex-col justify-between hover:border-[#FED7AA] transition"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h4 className="text-sm font-bold text-[#111111]">{item.name}</h4>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    item.isAvailable ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                  }`}>
                    {item.isAvailable ? 'Available' : 'Sold Out'}
                  </span>
                </div>
                <div className="flex items-baseline gap-2 mb-3">
                  <span className="text-base font-extrabold text-[#FF5F00]">
                    {formatRupee(item.price)}
                  </span>
                  {item.hasHalf && item.halfPrice && (
                    <span className="text-xs font-semibold text-[#76716B]">
                      Half: {formatRupee(item.halfPrice)}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[#FAF8F5]">
                <span className="text-[11px] text-[#76716B] font-medium">
                  {categories.find(c => c.id === item.categoryId)?.name || 'General'}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEditItem(item)}
                    className="p-1.5 rounded-lg border border-[#EBE7E1] hover:bg-[#FAF8F5] text-[#76716B] hover:text-[#111111]"
                    title="Edit Dish"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    className="p-1.5 rounded-lg border border-red-200 hover:bg-red-50 text-red-600"
                    title="Delete Dish"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL: ADD / EDIT DISH */}
      {isItemModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-modal border border-[#EBE7E1]">
            <h3 className="text-base font-bold text-[#111111] mb-4">
              {editingItem ? 'Edit Menu Dish' : 'Add New Dish'}
            </h3>

            <form onSubmit={handleSaveItem} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#111111] mb-1">Dish Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Masala Dosa, Filter Coffee"
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-[#EBE7E1] outline-hidden focus:border-[#FF5F00]"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#111111] mb-1">Category</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-[#EBE7E1] outline-hidden bg-white"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#111111] mb-1">Selling Price (₹) *</label>
                  <input
                    type="number"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="40"
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-[#EBE7E1] outline-hidden focus:border-[#FF5F00]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#111111] mb-1">Available Status</label>
                  <button
                    type="button"
                    onClick={() => setIsAvailable(!isAvailable)}
                    className={`w-full py-2 rounded-xl text-xs font-bold border transition ${
                      isAvailable ? 'border-green-300 bg-green-50 text-green-700' : 'border-red-300 bg-red-50 text-red-700'
                    }`}
                  >
                    {isAvailable ? 'In Stock (Available)' : 'Sold Out'}
                  </button>
                </div>
              </div>

              {/* Half Portion Option */}
              <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#EBE7E1]">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-xs font-bold text-[#111111]">Offer Half Portion (₹)</span>
                  <input
                    type="checkbox"
                    checked={hasHalf}
                    onChange={(e) => setHasHalf(e.target.checked)}
                    className="w-4 h-4 accent-[#FF5F00]"
                  />
                </label>

                {hasHalf && (
                  <div className="mt-2.5">
                    <input
                      type="number"
                      required={hasHalf}
                      value={halfPrice}
                      onChange={(e) => setHalfPrice(e.target.value)}
                      placeholder="Half price (e.g. 25)"
                      className="w-full px-3 py-1.5 text-xs font-bold rounded-lg border border-[#EBE7E1] bg-white outline-hidden focus:border-[#FF5F00]"
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsItemModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-[#EBE7E1] text-xs font-bold text-[#76716B]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#FF5F00] text-white text-xs font-bold shadow-md"
                >
                  Save Dish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD CATEGORY */}
      {isCatModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-modal border border-[#EBE7E1]">
            <h3 className="text-sm font-bold text-[#111111] mb-3">Add Menu Category</h3>
            <form onSubmit={handleSaveCategory} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#76716B] mb-1">Category Title</label>
                <input
                  type="text"
                  required
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="e.g. Fresh Juices, Parotta"
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-[#EBE7E1] outline-hidden focus:border-[#FF5F00]"
                  autoFocus
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsCatModalOpen(false)}
                  className="flex-1 py-2 rounded-xl border border-[#EBE7E1] text-xs font-bold text-[#76716B]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-[#FF5F00] text-white text-xs font-bold"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
