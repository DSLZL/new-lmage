import { create } from 'zustand';
import axios from 'axios';

/**
 * 并发控制器 - 限制同时执行的请求数量
 */
const runWithConcurrencyLimit = async (tasks, limit = 5) => {
  const results = [];
  let index = 0;

  const runTask = async () => {
    while (index < tasks.length) {
      const currentIndex = index++;
      try {
        results[currentIndex] = await tasks[currentIndex]();
      } catch (error) {
        results[currentIndex] = { error: error.message };
      }
    }
  };

  // 创建并发池
  const workers = Array(Math.min(limit, tasks.length))
    .fill(null)
    .map(() => runTask());

  await Promise.all(workers);
  return results;
};

/**
 * 图片状态管理
 * 管理用户上传的图片列表、搜索、排序等
 */
const useImageStore = create((set, get) => ({
  // ========== 状态 ==========
  images: [],
  currentImage: null,
  isLoading: false,
  error: null,

  // 分页
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  },

  // 筛选和排序
  filters: {
    query: '',
    tag: '',
    sortBy: 'newest',
    viewMode: 'grid',
  },

  // 选择模式
  selectedImages: new Set(),
  isSelectionMode: false,

  // ========== 获取图片列表 ==========
  fetchImages: async (page = 1) => {
    set({ isLoading: true, error: null });

    try {
      const { query, tag } = get().filters;
      const { limit } = get().pagination;

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (query) params.append('q', query);
      if (tag) params.append('tag', tag);

      const response = await axios.get(`/api/images?${params}`);
      const { files, pagination } = response.data;

      // 映射数据格式
      const mappedFiles = files.map((file) => ({
        ...file,
        src: file.url || `/file/${file.id}`,
      }));

      // 应用排序
      const sortedFiles = get().sortImages(mappedFiles);

      set({
        images: sortedFiles,
        pagination: {
          ...get().pagination,
          ...pagination,
        },
        isLoading: false,
        error: null,
      });

      return { success: true, images: sortedFiles };
    } catch (error) {
      const errorMessage = error.response?.data?.error || '获取图片列表失败';
      set({
        error: errorMessage,
        isLoading: false,
      });

      return { success: false, error: errorMessage };
    }
  },

  // ========== 搜索图片 ==========
  searchImages: async (query) => {
    set((state) => ({
      filters: { ...state.filters, query },
      pagination: { ...state.pagination, page: 1 },
    }));

    return get().fetchImages(1);
  },

  // ========== 按标签筛选 ==========
  filterByTag: async (tag) => {
    set((state) => ({
      filters: { ...state.filters, tag },
      pagination: { ...state.pagination, page: 1 },
    }));

    return get().fetchImages(1);
  },

  // ========== 排序图片 ==========
  sortImages: (images) => {
    const { sortBy } = get().filters;
    const sorted = [...images];

    switch (sortBy) {
      case 'newest':
        return sorted.sort((a, b) => b.uploadTime - a.uploadTime);
      case 'oldest':
        return sorted.sort((a, b) => a.uploadTime - b.uploadTime);
      case 'largest':
        return sorted.sort((a, b) => b.fileSize - a.fileSize);
      case 'smallest':
        return sorted.sort((a, b) => a.fileSize - b.fileSize);
      case 'name':
        return sorted.sort((a, b) => a.fileName.localeCompare(b.fileName));
      default:
        return sorted;
    }
  },

  // ========== 设置排序方式 ==========
  setSortBy: (sortBy) => {
    set((state) => ({
      filters: { ...state.filters, sortBy },
      images: get().sortImages(state.images),
    }));
  },

  // ========== 设置视图模式 ==========
  setViewMode: (viewMode) => {
    set((state) => ({
      filters: { ...state.filters, viewMode },
    }));
  },

  // ========== 删除图片 ==========
  deleteImage: async (imageId) => {
    set({ isLoading: true, error: null });

    try {
      await axios.delete(`/api/images/${imageId}`);

      set((state) => ({
        images: state.images.filter((img) => img.id !== imageId),
        isLoading: false,
        error: null,
      }));

      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.error || '删除图片失败';
      set({
        error: errorMessage,
        isLoading: false,
      });

      return { success: false, error: errorMessage };
    }
  },

  // ========== 批量删除图片（带并发限制） ==========
  deleteImages: async (imageIds) => {
    set({ isLoading: true, error: null });

    try {
      // 创建删除任务数组
      const deleteTasks = imageIds.map((id) => () => axios.delete(`/api/images/${id}`));

      // 使用并发池执行，最多5个并发请求
      await runWithConcurrencyLimit(deleteTasks, 5);

      // 从列表中移除
      set((state) => ({
        images: state.images.filter((img) => !imageIds.includes(img.id)),
        selectedImages: new Set(),
        isSelectionMode: false,
        isLoading: false,
        error: null,
      }));

      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.error || '批量删除失败';
      set({
        error: errorMessage,
        isLoading: false,
      });

      return { success: false, error: errorMessage };
    }
  },

  // ========== 更新图片信息 ==========
  updateImage: async (imageId, data) => {
    set({ isLoading: true, error: null });

    try {
      const response = await axios.put(`/api/images/${imageId}`, data);
      const { file } = response.data;

      set((state) => ({
        images: state.images.map((img) =>
          img.id === imageId ? { ...img, ...file } : img
        ),
        isLoading: false,
        error: null,
      }));

      return { success: true, image: file };
    } catch (error) {
      const errorMessage = error.response?.data?.error || '更新图片信息失败';
      set({
        error: errorMessage,
        isLoading: false,
      });

      return { success: false, error: errorMessage };
    }
  },

  // ========== 选择模式 ==========
  toggleSelectionMode: () => {
    set((state) => ({
      isSelectionMode: !state.isSelectionMode,
      selectedImages: new Set(),
    }));
  },

  // ========== 选择/取消选择图片 ==========
  toggleImageSelection: (imageId) => {
    set((state) => {
      const newSelected = new Set(state.selectedImages);
      if (newSelected.has(imageId)) {
        newSelected.delete(imageId);
      } else {
        newSelected.add(imageId);
      }
      return { selectedImages: newSelected };
    });
  },

  // ========== 全选/取消全选 ==========
  toggleSelectAll: () => {
    set((state) => {
      const allSelected = state.selectedImages.size === state.images.length;
      if (allSelected) {
        return { selectedImages: new Set() };
      } else {
        return {
          selectedImages: new Set(state.images.map((img) => img.id)),
        };
      }
    });
  },

  // ========== 清空选择 ==========
  clearSelection: () => {
    set({ selectedImages: new Set() });
  },

  // ========== 设置当前图片 ==========
  setCurrentImage: (image) => {
    set({ currentImage: image });
  },

  // ========== 清除错误 ==========
  clearError: () => {
    set({ error: null });
  },

  // ========== 重置状态 ==========
  reset: () => {
    set({
      images: [],
      currentImage: null,
      selectedImages: new Set(),
      isSelectionMode: false,
      filters: {
        query: '',
        tag: '',
        sortBy: 'newest',
        viewMode: 'grid',
      },
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
      },
    });
  },
}));

export { useImageStore };
