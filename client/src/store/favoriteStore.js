import { create } from 'zustand';
import axios from 'axios';

/**
 * 收藏状态管理
 * 优化：移除乐观更新后的立即 refetch，真正实现乐观更新
 */
const useFavoriteStore = create((set, get) => ({
  // ========== 状态 ==========
  favorites: new Set(),
  favoriteImages: [],
  isLoading: false,
  error: null,

  // ========== 初始化收藏列表 ==========
  initFavorites: async () => {
    set({ isLoading: true, error: null });

    try {
      const response = await axios.get('/api/favorites');
      const { images } = response.data;

      const favoriteIds = new Set(images.map((img) => img.id));

      set({
        favorites: favoriteIds,
        favoriteImages: images,
        isLoading: false,
        error: null,
      });

      return { success: true, favorites: favoriteIds };
    } catch (error) {
      const errorMessage = error.response?.data?.error || '加载收藏列表失败';
      set({
        error: errorMessage,
        isLoading: false,
      });

      return { success: false, error: errorMessage };
    }
  },

  // ========== 获取收藏列表 ==========
  fetchFavorites: async () => {
    return get().initFavorites();
  },

  // ========== 添加收藏（真正的乐观更新） ==========
  addFavorite: async (imageId) => {
    // 保存旧状态用于回滚
    const oldFavorites = new Set(get().favorites);

    // 乐观更新
    set((state) => ({
      favorites: new Set([...state.favorites, imageId]),
    }));

    try {
      await axios.post(`/api/favorites/${imageId}`);
      // 成功后不再立即 refetch，保持乐观更新的状态
      // 下次打开收藏页面时会自动同步
      return { success: true };
    } catch (error) {
      // 失败时回滚
      set({ favorites: oldFavorites });

      const errorMessage = error.response?.data?.error || '添加收藏失败';
      set({ error: errorMessage });

      return { success: false, error: errorMessage };
    }
  },

  // ========== 取消收藏（真正的乐观更新） ==========
  removeFavorite: async (imageId) => {
    // 保存旧状态用于回滚
    const oldFavorites = new Set(get().favorites);
    const oldFavoriteImages = [...get().favoriteImages];

    // 乐观更新
    set((state) => {
      const newFavorites = new Set(state.favorites);
      newFavorites.delete(imageId);
      return {
        favorites: newFavorites,
        favoriteImages: state.favoriteImages.filter((img) => img.id !== imageId),
      };
    });

    try {
      await axios.delete(`/api/favorites/${imageId}`);
      return { success: true };
    } catch (error) {
      // 失败时回滚
      set({
        favorites: oldFavorites,
        favoriteImages: oldFavoriteImages,
      });

      const errorMessage = error.response?.data?.error || '取消收藏失败';
      set({ error: errorMessage });

      return { success: false, error: errorMessage };
    }
  },

  // ========== 切换收藏状态 ==========
  toggleFavorite: async (imageId) => {
    const isFavorite = get().favorites.has(imageId);

    if (isFavorite) {
      return get().removeFavorite(imageId);
    } else {
      return get().addFavorite(imageId);
    }
  },

  // ========== 批量添加收藏 ==========
  addFavorites: async (imageIds) => {
    const oldFavorites = new Set(get().favorites);

    // 乐观更新
    set((state) => ({
      favorites: new Set([...state.favorites, ...imageIds]),
    }));

    try {
      await axios.post('/api/favorites/batch', {
        action: 'add',
        imageIds,
      });

      return { success: true };
    } catch (error) {
      // 回滚
      set({ favorites: oldFavorites });

      const errorMessage = error.response?.data?.error || '批量添加收藏失败';
      set({ error: errorMessage });

      return { success: false, error: errorMessage };
    }
  },

  // ========== 批量取消收藏 ==========
  removeFavorites: async (imageIds) => {
    const oldFavorites = new Set(get().favorites);
    const oldFavoriteImages = [...get().favoriteImages];

    // 乐观更新
    set((state) => {
      const newFavorites = new Set(state.favorites);
      imageIds.forEach(id => newFavorites.delete(id));
      return {
        favorites: newFavorites,
        favoriteImages: state.favoriteImages.filter((img) => !imageIds.includes(img.id)),
      };
    });

    try {
      await axios.post('/api/favorites/batch', {
        action: 'remove',
        imageIds,
      });

      return { success: true };
    } catch (error) {
      // 回滚
      set({
        favorites: oldFavorites,
        favoriteImages: oldFavoriteImages,
      });

      const errorMessage = error.response?.data?.error || '批量取消收藏失败';
      set({ error: errorMessage });

      return { success: false, error: errorMessage };
    }
  },

  // ========== 检查是否收藏 ==========
  isFavorite: (imageId) => {
    return get().favorites.has(imageId);
  },

  // ========== 获取收藏数量 ==========
  getFavoriteCount: () => {
    return get().favorites.size;
  },

  // ========== 清除错误 ==========
  clearError: () => {
    set({ error: null });
  },

  // ========== 重置状态 ==========
  reset: () => {
    set({
      favorites: new Set(),
      favoriteImages: [],
      error: null,
    });
  },
}));

export { useFavoriteStore };
