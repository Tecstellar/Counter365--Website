import { supabase } from '../lib/supabase';
import { storage } from '../lib/storage';
import { MenuItem, MenuCategory, ShopType } from '../types/models';
import { generateUUID } from '../lib/uuid';

const CATEGORIES_KEY = '@counterpro/categories_';
const MENU_ITEMS_KEY = '@counterpro/menu_items_';

export const STARTER_CATALOGS: Record<ShopType, { categories: string[]; items: Array<{ name: string; price: number; cat: string }> }> = {
  'Tea Shop': {
    categories: ['Tea & Coffee', 'Snacks', 'Cold'],
    items: [
      { name: 'Tea', price: 12, cat: 'Tea & Coffee' },
      { name: 'Strong Tea', price: 15, cat: 'Tea & Coffee' },
      { name: 'Milk Coffee', price: 20, cat: 'Tea & Coffee' },
      { name: 'Black Tea', price: 10, cat: 'Tea & Coffee' },
      { name: 'Boost', price: 25, cat: 'Tea & Coffee' },
      { name: 'Horlicks', price: 25, cat: 'Tea & Coffee' },
      { name: 'Ginger Tea', price: 15, cat: 'Tea & Coffee' },
      { name: 'Elaichi Tea', price: 18, cat: 'Tea & Coffee' },
      { name: 'Vada', price: 12, cat: 'Snacks' },
      { name: 'Bonda', price: 10, cat: 'Snacks' },
      { name: 'Samosa', price: 15, cat: 'Snacks' },
      { name: 'Bun Butter', price: 30, cat: 'Snacks' },
      { name: 'Egg Puffs', price: 25, cat: 'Snacks' },
      { name: 'Biscuit', price: 10, cat: 'Snacks' },
      { name: 'Lemon Juice', price: 25, cat: 'Cold' },
      { name: 'Butter Milk', price: 20, cat: 'Cold' },
      { name: 'Cool Drink', price: 20, cat: 'Cold' },
      { name: 'Water 1L', price: 20, cat: 'Cold' },
    ],
  },
  'Cafe': {
    categories: ['Coffee', 'Bakes', 'Cold'],
    items: [
      { name: 'Espresso', price: 90, cat: 'Coffee' },
      { name: 'Cappuccino', price: 140, cat: 'Coffee' },
      { name: 'Latte', price: 150, cat: 'Coffee' },
      { name: 'Cold Brew', price: 170, cat: 'Coffee' },
      { name: 'Filter Coffee', price: 60, cat: 'Coffee' },
      { name: 'Hot Chocolate', price: 160, cat: 'Coffee' },
      { name: 'Croissant', price: 120, cat: 'Bakes' },
      { name: 'Brownie', price: 140, cat: 'Bakes' },
      { name: 'Banana Cake', price: 110, cat: 'Bakes' },
      { name: 'Cheese Toast', price: 160, cat: 'Bakes' },
      { name: 'Cookie', price: 60, cat: 'Bakes' },
      { name: 'Muffin', price: 130, cat: 'Bakes' },
      { name: 'Iced Latte', price: 180, cat: 'Cold' },
      { name: 'Lemonade', price: 110, cat: 'Cold' },
      { name: 'Milkshake', price: 190, cat: 'Cold' },
      { name: 'Water', price: 20, cat: 'Cold' },
    ],
  },
  'Fast Food': {
    categories: ['Rolls & Burgers', 'Fried', 'Cold'],
    items: [
      { name: 'Chicken Roll', price: 90, cat: 'Rolls & Burgers' },
      { name: 'Paneer Roll', price: 80, cat: 'Rolls & Burgers' },
      { name: 'Veg Burger', price: 70, cat: 'Rolls & Burgers' },
      { name: 'Chicken Burger', price: 110, cat: 'Rolls & Burgers' },
      { name: 'Shawarma', price: 120, cat: 'Rolls & Burgers' },
      { name: 'Egg Roll', price: 70, cat: 'Rolls & Burgers' },
      { name: 'French Fries', price: 80, cat: 'Fried' },
      { name: 'Chicken 65', price: 140, cat: 'Fried' },
      { name: 'Nuggets', price: 120, cat: 'Fried' },
      { name: 'Onion Rings', price: 70, cat: 'Fried' },
      { name: 'Popcorn Chicken', price: 130, cat: 'Fried' },
      { name: 'Momos', price: 90, cat: 'Fried' },
      { name: 'Cola', price: 40, cat: 'Cold' },
      { name: 'Cold Coffee', price: 90, cat: 'Cold' },
      { name: 'Mojito', price: 80, cat: 'Cold' },
      { name: 'Water', price: 20, cat: 'Cold' },
    ],
  },
  'Tiffin Shop': {
    categories: ['Morning', 'Evening', 'Add-ons'],
    items: [
      { name: 'Idly (2)', price: 20, cat: 'Morning' },
      { name: 'Poori (2)', price: 40, cat: 'Morning' },
      { name: 'Pongal', price: 40, cat: 'Morning' },
      { name: 'Vada', price: 12, cat: 'Morning' },
      { name: 'Upma', price: 30, cat: 'Morning' },
      { name: 'Dosa', price: 40, cat: 'Morning' },
      { name: 'Chapathi (2)', price: 35, cat: 'Evening' },
      { name: 'Parotta (2)', price: 40, cat: 'Evening' },
      { name: 'Kothu Parotta', price: 80, cat: 'Evening' },
      { name: 'Egg Dosa', price: 60, cat: 'Evening' },
      { name: 'Uthappam', price: 45, cat: 'Evening' },
      { name: 'Rice Meals', price: 90, cat: 'Evening' },
      { name: 'Extra Chutney', price: 10, cat: 'Add-ons' },
      { name: 'Sambar', price: 15, cat: 'Add-ons' },
      { name: 'Curd', price: 15, cat: 'Add-ons' },
      { name: 'Egg', price: 12, cat: 'Add-ons' },
    ],
  },
  'Restaurant': {
    categories: ['Starters', 'Main', 'Cold'],
    items: [
      { name: 'Chicken 65', price: 150, cat: 'Starters' },
      { name: 'Paneer Tikka', price: 140, cat: 'Starters' },
      { name: 'Chilli Chicken', price: 160, cat: 'Starters' },
      { name: 'Gobi Manchurian', price: 110, cat: 'Starters' },
      { name: 'Chicken Biryani', price: 180, cat: 'Main' },
      { name: 'Mutton Biryani', price: 240, cat: 'Main' },
      { name: 'Meals Full', price: 120, cat: 'Main' },
      { name: 'Fried Rice', price: 120, cat: 'Main' },
      { name: 'Noodles', price: 120, cat: 'Main' },
      { name: 'Butter Naan', price: 45, cat: 'Main' },
      { name: 'Butter Chicken', price: 200, cat: 'Main' },
      { name: 'Paneer Butter Masala', price: 160, cat: 'Main' },
      { name: 'Fresh Lime Soda', price: 40, cat: 'Cold' },
      { name: 'Lassi', price: 50, cat: 'Cold' },
      { name: 'Soft Drink', price: 40, cat: 'Cold' },
      { name: 'Water 1L', price: 20, cat: 'Cold' },
    ],
  },
};

export const menuService = {
  /**
   * Listen for real-time Postgres changes to menu_items and menu_categories for instant multi-device sync
   */
  subscribeToMenuChanges(shopId: string, onUpdate: () => void): () => void {
    if (!shopId) return () => {};

    const channel = supabase
      .channel(`web-menu-sync-${shopId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'menu_categories', filter: `shop_id=eq.${shopId}` },
        () => {
          onUpdate();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'menu_items', filter: `shop_id=eq.${shopId}` },
        () => {
          onUpdate();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  async getCategories(shopId: string, shopType: ShopType = 'Tea Shop'): Promise<MenuCategory[]> {
    if (!shopId) return [];
    const key = `${CATEGORIES_KEY}${shopId}`;
    const local = await storage.getObject<MenuCategory[]>(key, []);

    try {
      const { data, error } = await (supabase.from('menu_categories') as any)
        .select('*')
        .eq('shop_id', shopId)
        .order('sort_order', { ascending: true })
        .limit(200);

      if (!error && data && data.length > 0) {
        const categories: MenuCategory[] = data
          .filter((c: any) => c.name && c.name.toLowerCase() !== 'all items')
          .map((c: any) => ({
            id: c.id,
            shopId: c.shop_id,
            name: c.name,
            sortOrder: c.sort_order ?? 0,
            isActive: c.is_active ?? true,
          }));

        if (categories.length > 0) {
          await storage.setObject(key, categories);
          return categories;
        }
      }
    } catch (err) {
      console.warn('getCategories remote notice:', err);
    }

    if (local && local.length > 0) {
      const clean = local.filter(c => c.name && c.name.toLowerCase() !== 'all items');
      if (clean.length > 0) return clean;
    }

    // Default categories matching Android starter catalogs
    const starter = STARTER_CATALOGS[shopType] || STARTER_CATALOGS['Tea Shop'];
    const defaults: MenuCategory[] = starter.categories.map((catName, idx) => ({
      id: generateUUID(),
      shopId,
      name: catName,
      sortOrder: idx,
      isActive: true,
    }));

    await storage.setObject(key, defaults);

    // Save to Supabase in background
    try {
      await (supabase.from('menu_categories') as any).upsert(
        defaults.map(c => ({
          id: c.id,
          shop_id: c.shopId,
          name: c.name,
          sort_order: c.sortOrder,
          is_active: true,
        })),
        { onConflict: 'shop_id,name' }
      );
    } catch (e) {
      console.warn('Persist default categories notice:', e);
    }

    return defaults;
  },

  async saveCategory(category: MenuCategory): Promise<MenuCategory> {
    const key = `${CATEGORIES_KEY}${category.shopId}`;
    const categories = await storage.getObject<MenuCategory[]>(key, []);
    const idx = categories.findIndex(c => c.id === category.id);

    if (idx >= 0) {
      categories[idx] = category;
    } else {
      categories.push(category);
    }
    await storage.setObject(key, categories);

    try {
      await (supabase.from('menu_categories') as any).upsert(
        {
          id: category.id,
          shop_id: category.shopId,
          name: category.name,
          sort_order: category.sortOrder,
          is_active: category.isActive,
        },
        { onConflict: 'shop_id,name' }
      );
    } catch (err) {
      console.warn('saveCategory remote error:', err);
    }

    return category;
  },

  async getMenuItems(shopId: string, shopType: ShopType = 'Tea Shop'): Promise<MenuItem[]> {
    if (!shopId) return [];
    const key = `${MENU_ITEMS_KEY}${shopId}`;
    const local = await storage.getObject<MenuItem[]>(key, []);

    try {
      const { data, error } = await (supabase.from('menu_items') as any)
        .select('*')
        .eq('shop_id', shopId)
        .order('sort_order', { ascending: true })
        .limit(1000);

      if (!error && data && data.length > 0) {
        const items: MenuItem[] = data.map((i: any) => ({
          id: i.id,
          shopId: i.shop_id,
          categoryId: i.category_id,
          name: i.name,
          price: Number(i.price) || 0,
          halfPrice: i.half_price ? Number(i.half_price) : undefined,
          hasHalf: i.has_half ?? false,
          isFavorite: i.is_favorite ?? false,
          isAvailable: i.is_available !== false,
          imageUrl: i.image_url,
          costPrice: i.cost_price ? Number(i.cost_price) : undefined,
          sortOrder: i.sort_order ?? 0,
        }));
        await storage.setObject(key, items);
        return items;
      }
    } catch (err) {
      console.warn('getMenuItems remote notice:', err);
    }

    // If local cache already has items for this shop, return them
    if (local && local.length > 0 && local[0].shopId === shopId) {
      return local;
    }

    // 2. Recovery from bill_items: If menu_items was empty, check if bills were created for this shop
    try {
      const { data: bi } = await (supabase.from('bill_items') as any)
        .select('*')
        .eq('shop_id', shopId)
        .limit(1000);

      if (bi && bi.length > 0) {
        const distinctMap = new Map<string, any>();
        for (const it of bi) {
          if (it.item_name && it.item_name.toLowerCase() !== 'unidentified' && !distinctMap.has(it.item_name.trim())) {
            distinctMap.set(it.item_name.trim(), it);
          }
        }

        if (distinctMap.size > 0) {
          const cats = await this.getCategories(shopId, shopType);
          const firstCatId = cats[0]?.id || generateUUID();

          const recoveredItems: MenuItem[] = [];
          let sOrder = 0;
          for (const [name, row] of distinctMap.entries()) {
            recoveredItems.push({
              id: row.menu_item_id || generateUUID(),
              shopId,
              categoryId: firstCatId,
              name,
              price: Number(row.unit_price) || 20,
              halfPrice: row.is_half ? Number(row.unit_price) : undefined,
              hasHalf: !!row.is_half,
              isFavorite: sOrder < 4,
              isAvailable: true,
              sortOrder: sOrder++,
            });
          }

          // Persist to Supabase so it permanently syncs
          await (supabase.from('menu_items') as any).upsert(
            recoveredItems.map(it => ({
              id: it.id,
              shop_id: it.shopId,
              category_id: it.categoryId,
              name: it.name,
              price: it.price,
              half_price: it.halfPrice || null,
              has_half: it.hasHalf,
              is_favorite: it.isFavorite,
              is_available: true,
              sort_order: it.sortOrder,
            })),
            { onConflict: 'id' }
          );

          await storage.setObject(key, recoveredItems);
          return recoveredItems;
        }
      }
    } catch (biErr) {
      console.warn('Auto-recover menu items from bill_items notice:', biErr);
    }

    // 3. Fallback: Auto bootstrap starter items if brand new shop
    try {
      await this.bootstrapShopCatalog(shopId, shopType);
      const bootstrapped = await storage.getObject<MenuItem[]>(key, []);
      if (bootstrapped && bootstrapped.length > 0) return bootstrapped;
    } catch (bErr) {
      console.warn('bootstrapShopCatalog notice:', bErr);
    }

    return [];
  },

  async saveMenuItem(item: MenuItem): Promise<MenuItem> {
    const key = `${MENU_ITEMS_KEY}${item.shopId}`;
    const items = await storage.getObject<MenuItem[]>(key, []);
    const idx = items.findIndex(i => i.id === item.id);

    if (idx >= 0) {
      items[idx] = item;
    } else {
      items.push(item);
    }
    await storage.setObject(key, items);

    try {
      await (supabase.from('menu_items') as any).upsert({
        id: item.id,
        shop_id: item.shopId,
        category_id: item.categoryId,
        name: item.name,
        price: item.price,
        half_price: item.hasHalf ? (item.halfPrice ?? null) : null,
        has_half: item.hasHalf,
        is_favorite: item.isFavorite,
        is_available: item.isAvailable,
        image_url: item.imageUrl || null,
        cost_price: item.costPrice || null,
        sort_order: item.sortOrder,
      });
    } catch (err) {
      console.warn('saveMenuItem remote error:', err);
    }

    return item;
  },

  async deleteMenuItem(itemId: string, shopId: string): Promise<void> {
    const key = `${MENU_ITEMS_KEY}${shopId}`;
    const items = await storage.getObject<MenuItem[]>(key, []);
    const updated = items.filter(i => i.id !== itemId);
    await storage.setObject(key, updated);

    try {
      await (supabase.from('menu_items') as any).delete().eq('id', itemId);
    } catch (err) {
      console.warn('deleteMenuItem remote error:', err);
    }
  },

  async toggleAvailability(itemId: string, shopId: string, isAvailable: boolean): Promise<void> {
    const key = `${MENU_ITEMS_KEY}${shopId}`;
    const items = await storage.getObject<MenuItem[]>(key, []);
    const item = items.find(i => i.id === itemId);
    if (item) {
      item.isAvailable = isAvailable;
      await storage.setObject(key, items);
    }

    try {
      await (supabase.from('menu_items') as any)
        .update({ is_available: isAvailable })
        .eq('id', itemId);
    } catch (err) {
      console.warn('toggleAvailability remote error:', err);
    }
  },

  /**
   * Bootstraps starter menu catalog for a newly registered shop in Supabase and local cache
   */
  async bootstrapShopCatalog(shopId: string, shopType: ShopType): Promise<void> {
    const catalog = STARTER_CATALOGS[shopType] || STARTER_CATALOGS['Tea Shop'];

    const categories: MenuCategory[] = catalog.categories.map((cName, idx) => ({
      id: generateUUID(),
      shopId,
      name: cName,
      sortOrder: idx,
      isActive: true,
    }));

    const items: MenuItem[] = catalog.items.map((it, idx) => {
      const cat = categories.find(c => c.name === it.cat) || categories[0];
      return {
        id: generateUUID(),
        shopId,
        categoryId: cat.id,
        name: it.name,
        price: it.price,
        halfPrice: it.price <= 60 ? Math.round(it.price * 0.6) : undefined,
        hasHalf: it.price <= 60,
        isFavorite: idx < 3,
        isAvailable: true,
        imageUrl: undefined,
        sortOrder: idx,
      };
    });

    const catsKey = `${CATEGORIES_KEY}${shopId}`;
    const itemsKey = `${MENU_ITEMS_KEY}${shopId}`;
    await storage.setObject(catsKey, categories);
    await storage.setObject(itemsKey, items);

    // Persist categories to Supabase
    try {
      await (supabase.from('menu_categories') as any).upsert(
        categories.map(c => ({
          id: c.id,
          shop_id: c.shopId,
          name: c.name,
          sort_order: c.sortOrder,
          is_active: c.isActive,
        })),
        { onConflict: 'id' }
      );
    } catch (cErr) {
      console.warn('bootstrapShopCatalog categories notice:', cErr);
    }

    // Persist all menu items to Supabase
    try {
      await (supabase.from('menu_items') as any).upsert(
        items.map(it => ({
          id: it.id,
          shop_id: it.shopId,
          category_id: it.categoryId,
          name: it.name,
          price: it.price,
          half_price: it.halfPrice || null,
          has_half: it.hasHalf,
          is_favorite: it.isFavorite,
          is_available: it.isAvailable,
          image_url: it.imageUrl || null,
          sort_order: it.sortOrder,
        })),
        { onConflict: 'id' }
      );
    } catch (iErr) {
      console.warn('bootstrapShopCatalog items notice:', iErr);
    }
  },
};
