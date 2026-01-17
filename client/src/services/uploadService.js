import { upload } from '@/utils/request';

/**
 * 上传服务 - 支持并发控制的批量上传
 */

/**
 * 上传单个文件（内部方法）
 * @param {File} file - 文件对象
 * @param {number} retries - 重试次数
 * @returns {Promise} 上传结果
 */
const uploadSingleFile = async (file, retries = 3) => {
  const formData = new FormData();
  formData.append('file', file);

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await upload('/upload', formData);
      return {
        success: true,
        filename: file.name,
        size: file.size,
        type: file.type,
        data: response.data,
        uploadTime: new Date().toISOString(),
      };
    } catch (error) {
      if (attempt === retries - 1) {
        return {
          success: false,
          filename: file.name,
          size: file.size,
          type: file.type,
          error: error.response?.data?.error || error.message || '上传失败',
        };
      }
      // 重试前等待一下
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }
};

/**
 * 并发池控制器
 * @param {Array} tasks - 任务数组
 * @param {number} concurrency - 并发数
 * @param {Function} onProgress - 进度回调
 * @returns {Promise<Array>} 所有任务结果
 */
const runWithConcurrency = async (tasks, concurrency, onProgress) => {
  const results = [];
  const executing = [];
  let completed = 0;

  for (const [index, task] of tasks.entries()) {
    const promise = task().then(result => {
      completed++;
      if (onProgress) {
        onProgress({
          completed,
          total: tasks.length,
          percent: Math.round((completed / tasks.length) * 100),
          currentIndex: index,
          result,
        });
      }
      return result;
    });

    results.push(promise);
    executing.push(promise);

    if (executing.length >= concurrency) {
      await Promise.race(executing);
      executing.splice(executing.findIndex(p => p === promise), 1);
    }
  }

  return Promise.all(results);
};

/**
 * 批量上传文件（并发控制）
 * @param {File[]} files - 文件数组
 * @param {Function} onProgress - 进度回调
 * @param {object} options - 配置选项
 * @returns {Promise} 上传结果
 */
export const uploadFiles = async (files, onProgress, options = {}) => {
  const {
    concurrency = 5, // 默认并发数 5
    retries = 3,     // 默认重试 3 次
  } = options;

  try {
    // 创建上传任务数组
    const tasks = files.map(file => () => uploadSingleFile(file, retries));

    // 执行并发上传
    const results = await runWithConcurrency(tasks, concurrency, onProgress);

    const successResults = results.filter(r => r.success);
    const failedResults = results.filter(r => !r.success);

    return {
      success: true,
      data: results,
      summary: {
        total: results.length,
        success: successResults.length,
        failed: failedResults.length,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || '批量上传失败',
      data: [],
    };
  }
};

/**
 * 上传单个文件（对外接口）
 * @param {File} file - 文件对象
 * @param {Function} onProgress - 进度回调
 * @returns {Promise} 上传结果
 */
export const uploadFile = async (file, onProgress) => {
  const result = await uploadFiles([file], onProgress, { concurrency: 1 });
  return result.data[0] || { success: false, error: '上传失败' };
};

/**
 * 验证文件
 * @param {File} file - 文件对象
 * @param {object} options - 验证选项
 * @returns {object} 验证结果
 */
export const validateFile = (file, options = {}) => {
  const {
    maxSize = 10 * 1024 * 1024, // 默认 10MB
    allowedTypes = ['image/*'],
  } = options;

  const errors = [];

  // 检查文件大小
  if (file.size > maxSize) {
    errors.push(`文件大小不能超过 ${(maxSize / 1024 / 1024).toFixed(0)}MB`);
  }

  // 检查文件类型
  const isValidType = allowedTypes.some((type) => {
    if (type.includes('*')) {
      const [mainType] = type.split('/');
      return file.type.startsWith(mainType);
    }
    return file.type === type;
  });

  if (!isValidType) {
    errors.push('不支持的文件类型');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

export default {
  uploadFile,
  uploadFiles,
  validateFile,
};
