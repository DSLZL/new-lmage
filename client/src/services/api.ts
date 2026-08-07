// 强类型后端 API 对接总线
const BASE_URL =
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://127.0.0.1:8787'
    : window.location.origin;

// 1. 获取请求 headers
function getHeaders(isMultipart = false): HeadersInit {
  const token = localStorage.getItem('tg_image_token');
  const headers: Record<string, string> = {};
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  if (!isMultipart) {
    headers['Content-Type'] = 'application/json';
  }
  
  return headers;
}

// 统一网络请求响应结构
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const response = await fetch(url, options);
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `HTTP Error ${response.status}`);
  }
  
  return response.json() as Promise<T>;
}

// ==================== 接口类型定义 ====================

export interface User {
  id: string;
  username: string;
  email: string;
  avatar_url?: string;
  bio?: string;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}

export interface Image {
  id: string;
  file_id: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  user_id: string;
  album_id?: string;
  thumb_file_id?: string;
  views: number;
  last_accessed_at?: number;
  is_trash: number;
  is_blocked: number;
  uploaded_at: number;
}

export interface Album {
  id: string;
  name: string;
  description?: string;
  cover_url?: string;
  has_password?: boolean;
  user_id: string;
  created_at: number;
}

export interface Tag {
  id: string;
  name: string;
  color?: string;
  user_id: string;
}

export interface QuotaStats {
  totalImages: number;
  totalSize: number;
  totalAlbums: number;
  totalTags: number;
  quotaLimit: number;
  quotaUsedPercentage: number;
}

// ==================== 接口方法实现 ====================

export const api = {
  // 1) 鉴权
  register: (body: any) =>
    request<AuthResponse>('/api/auth/register', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(body),
    }),
    
  login: (body: any) =>
    request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(body),
    }),
    
  getCurrentUser: () =>
    request<{ user: User }>('/api/auth/user', {
      method: 'GET',
      headers: getHeaders(),
    }),

  updateProfile: (body: any) =>
    request<{ message: string; user: User }>('/api/auth/profile', {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(body),
    }),

  changePassword: (body: any) =>
    request<{ message: string }>('/api/auth/password', {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(body),
    }),

  // 2) 图片网关
  uploadFile: (file: File, albumid?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (albumid) {
      formData.append('albumid', albumid);
    }
    return request<Array<{ src: string }>>('/upload', {
      method: 'POST',
      headers: getHeaders(true),
      body: formData,
    });
  },

  getImages: (page = 1, limit = 20) =>
    request<{ images: Image[]; total: number; page: number; limit: number }>(
      `/api/images?page=${page}&limit=${limit}`,
      {
        method: 'GET',
        headers: getHeaders(),
      }
    ),

  searchImages: (keyword: string) =>
    request<{ images: Image[] }>(`/api/images/search?keyword=${encodeURIComponent(keyword)}`, {
      method: 'GET',
      headers: getHeaders(),
    }),

  batchDeleteImages: (fileids: string[]) =>
    request<{ success: boolean; message: string }>('/api/images/batch/delete', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ file_ids: fileids }),
    }),

  getImageDetail: (imageid: string) =>
    request<Image>(`/api/images/${imageid}`, {
      method: 'GET',
      headers: getHeaders(),
    }),

  /** 单张图片的全部标签（光箱联动：展示与同步编辑） */
  getImageTags: (imageid: string) =>
    request<{ tags: Tag[] }>(`/api/images/${imageid}/tags`, {
      method: 'GET',
      headers: getHeaders(),
    }),

  deleteImagePhysically: (imageid: string) =>
    request<{ success: boolean; message: string }>(`/api/images/${imageid}`, {
      method: 'DELETE',
      headers: getHeaders(),
    }),

  // 3) 相册
  getAlbums: () =>
    request<{ albums: Album[] }>('/api/albums', {
      method: 'GET',
      headers: getHeaders(),
    }),

  createAlbum: (body: any) =>
    request<{ success: boolean; message: string; albumid: string }>('/api/albums', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(body),
    }),

  getAlbumDetail: (albumid: string, password?: string) => {
    const query = password ? `?password=${encodeURIComponent(password)}` : '';
    return request<{ album: Album; images: Image[] }>(`/api/albums/${albumid}${query}`, {
      method: 'GET',
      headers: getHeaders(),
    });
  },

  modifyAlbumImages: (albumid: string, imageids: string[], action: 'add' | 'remove') =>
    request<{ success: boolean; message: string }>(`/api/albums/${albumid}/images`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ image_ids: imageids, action }),
    }),

  deleteAlbum: (albumid: string) =>
    request<{ success: boolean; message: string }>(`/api/albums/${albumid}`, {
      method: 'DELETE',
      headers: getHeaders(),
    }),

  // 4) 标签
  getTags: () =>
    request<{ tags: Tag[] }>('/api/tags', {
      method: 'GET',
      headers: getHeaders(),
    }),

  createTag: (body: any) =>
    request<{ success: boolean; message: string; tagid: string }>('/api/tags', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(body),
    }),

  batchTagImages: (fileids: string[], tags: string[], action: 'add' | 'remove') =>
    request<{ success: boolean; message: string }>('/api/images/batch/tag', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ file_ids: fileids, tags, action }),
    }),

  getTagImages: (tagid: string) =>
    request<{ images: Image[] }>(`/api/tags/${tagid}/images`, {
      method: 'GET',
      headers: getHeaders(),
    }),

  // 5) 统计
  getStats: () =>
    request<{ stats: QuotaStats }>('/api/stats', {
      method: 'GET',
      headers: getHeaders(),
    }),
    
  // 6) 获取直链地址方法
  getFileUrl: (id: string, isThumb = false) => {
    const ext = id.includes('.') ? '' : '.png';
    const thumbParam = isThumb ? '?size=thumb' : '';
    return `${BASE_URL}/file/${id}${ext}${thumbParam}`;
  }
};
