import { upload } from '@/utils/request';

/**
 * 上传服务 - 支持并发控制的批量上传
 * 优化：添加进度节流，避免频繁 setState 导致卡顿
 */

/**
 * 创建节流函数 - 控制函数执行频率
 * @param {Function} fn - 要节流的函数
 * @param {number} delay - 节流间隔（毫秒）
 */
const createThrottle = (fn, delay) => {
  let lastCall = 0;
  let lastArgs = null;
  let timeoutId = null;

  const throttled = (...args) => {
    lastArgs = args;
    const now = Date.now();

    if (now - lastCall >= delay) {
      lastCall = now;
      fn(...args);
    } else if (!timeoutId) {
      // 确保最后一次调用会被执行
      timeoutId = setTimeout(() => {
        lastCall = Date.now();
        timeoutId = null;
        if (lastArgs) {
          fn(...lastArgs);
        }
      }, delay - (now - lastCall));
    }
  };

  // 强制执行（用于完成时的最终回调）
  throttled.flush = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    if (lastArgs) {
      fn(...lastArgs);
      lastArgs = null;
    }
  };

  return throttled;
};

/**
 * 上传单个文件（内部方法）
 * @param {File} file - 文件对象
 * @param {number} retries - 重试次数
 * @param {Function} onProgress - 单文件进度回调
 * @returns {Promise} 上传结果
 */
const uploadSingleFile = async (file, retries = 3, onProgress) => {
  // 快速验证
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    return {
      success: false,
      filename: file.name,
      size: file.size,
      type: file.type,
      error: `文件大小不能超过 ${(maxSize / 1024 / 1024).toFixed(0)}MB`,
    };
  }

  const formData = new FormData();
  formData.append('file', file);

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await upload('/upload', formData, onProgress);
      const result = Array.isArray(response.data) ? response.data[0] : response.data;

      if (!result || !result.src) {
        throw new Error('上传失败：服务器返回数据格式错误');
      }

      return {
        success: true,
        filename: file.name,
        size: file.size,
        type: file.type,
        data: result,
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
      // 指数退避重试
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }
};

/**
 * 并发池控制器（优化版）
 * - 使用累加器避免 reduce 遍历
 * - 节流进度回调
 */
const runWithConcurrency = async (tasks, files, concurrency, onProgress) => {
  const results = [];
  let completed = 0;
  let index = 0;

  // 计算总大小
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  const fileProgress = new Array(files.length).fill(0);

  // 使用累加器追踪已上传大小，避免每次都 reduce
  let uploadedSizeCache = 0;

  // 创建节流的进度回调（100ms 间隔）
  const throttledProgress = onProgress ? createThrottle(onProgress, 100) : null;

  // 执行单个任务
  const runTask = async () => {
    while (index < tasks.length) {
      const currentIndex = index++;
      const task = tasks[currentIndex];
      const file = files[currentIndex];
      const previousProgress = fileProgress[currentIndex];

      try {
        const result = await task((percent) => {
          // 更新当前文件的进度
          const newProgress = (file.size * percent) / 100;
          const delta = newProgress - fileProgress[currentIndex];
          fileProgress[currentIndex] = newProgress;
          uploadedSizeCache += delta;

          // 计算总进度（直接使用累加器，不再 reduce）
          const totalPercent = Math.round((uploadedSizeCache / totalSize) * 100);

          if (throttledProgress) {
            throttledProgress({
              completed,
              total: tasks.length,
              percent: Math.min(totalPercent, 99), // 保留 100% 给完成状态
              currentIndex,
              result: null,
            });
          }
        });

        results[currentIndex] = result;
        completed++;

        // 确保文件进度为完整大小
        const finalDelta = file.size - fileProgress[currentIndex];
        fileProgress[currentIndex] = file.size;
        uploadedSizeCache += finalDelta;

        // 文件完成时立即回调
        if (throttledProgress) {
          const totalPercent = Math.round((uploadedSizeCache / totalSize) * 100);
          throttledProgress({
            completed,
            total: tasks.length,
            percent: completed === tasks.length ? 100 : Math.min(totalPercent, 99),
            currentIndex,
            result,
          });
        }
      } catch (error) {
        results[currentIndex] = {
          success: false,
          error: error.message || '上传失败'
        };
        completed++;

        // 失败也算完成
        const finalDelta = file.size - fileProgress[currentIndex];
        fileProgress[currentIndex] = file.size;
        uploadedSizeCache += finalDelta;
      }
    }
  };

  // 创建并发池
  const workers = Array(Math.min(concurrency, tasks.length))
    .fill(null)
    .map(() => runTask());

  await Promise.all(workers);

  // 确保最终进度被回调
  if (throttledProgress) {
    throttledProgress.flush();
    // 强制发送 100% 完成状态
    onProgress({
      completed: tasks.length,
      total: tasks.length,
      percent: 100,
      currentIndex: tasks.length - 1,
      result: results[results.length - 1],
    });
  }

  return results;
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
    concurrency = 5,
    retries = 3,
  } = options;

  try {
    // 创建上传任务数组
    const tasks = files.map(file => (onFileProgress) => uploadSingleFile(file, retries, onFileProgress));

    // 执行并发上传
    const results = await runWithConcurrency(tasks, files, concurrency, onProgress);

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
 */
export const uploadFile = async (file, onProgress) => {
  const result = await uploadFiles([file], onProgress, { concurrency: 1 });
  return result.data[0] || { success: false, error: '上传失败' };
};

/**
 * 验证文件
 */
export const validateFile = (file, options = {}) => {
  const {
    maxSize = 10 * 1024 * 1024,
    allowedTypes = ['image/*'],
  } = options;

  const errors = [];

  if (file.size > maxSize) {
    errors.push(`文件大小不能超过 ${(maxSize / 1024 / 1024).toFixed(0)}MB`);
  }

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
