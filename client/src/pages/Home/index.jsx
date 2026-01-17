import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { uploadFiles, validateFile } from '@/services/uploadService';
import {
  HiOutlineCloudUpload,
  HiOutlinePhotograph,
  HiOutlineDocumentDuplicate,
  HiOutlineClipboard,
  HiOutlineCheck,
  HiOutlineLink,
  HiOutlineCode,
  HiOutlineX,
  HiOutlineRefresh,
  HiOutlineDownload,
} from 'react-icons/hi';
import { SiMarkdown } from 'react-icons/si';
import './Home.css';

/**
 * 首页 - 图片上传
 */
const HomePage = () => {
  const [uploading, setUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState([]);
  const [uploadProgress, setUploadProgress] = useState({ completed: 0, total: 0, percent: 0 });

  // 处理文件上传
  const handleUpload = async (files) => {
    // 验证文件
    const validFiles = [];
    for (const file of files) {
      const validation = validateFile(file, {
        maxSize: 10 * 1024 * 1024, // 10MB
        allowedTypes: ['image/*'],
      });

      if (!validation.isValid) {
        toast.error(`${file.name}: ${validation.errors.join(', ')}`);
        continue;
      }

      validFiles.push(file);
    }

    if (validFiles.length === 0) {
      return;
    }

    // 开始上传
    setUploading(true);
    setUploadResults([]);
    setUploadProgress({ completed: 0, total: validFiles.length, percent: 0 });

    try {
      const result = await uploadFiles(
        validFiles,
        (progress) => {
          setUploadProgress(progress);
        },
        { concurrency: 5, retries: 3 }
      );

      if (result.success) {
        setUploadResults(result.data);
        toast.success(`成功上传 ${result.summary.success}/${result.summary.total} 张图片`);
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error('上传失败，请重试');
    } finally {
      setUploading(false);
    }
  };

  // 配置 Dropzone
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleUpload,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'],
    },
    multiple: true,
    disabled: uploading,
  });

  // 复制到剪贴板
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('已复制到剪贴板');
  };

  // 导出元数据
  const exportMetadata = () => {
    const successResults = uploadResults.filter(r => r.success);
    const metadata = {
      exportTime: new Date().toISOString(),
      totalCount: uploadResults.length,
      successCount: successResults.length,
      images: successResults.map(r => ({
        filename: r.filename,
        url: window.location.origin + r.data.src,
        origin: r.data.src,
        size: r.size,
        type: r.type,
        uploadTime: r.uploadTime,
      }))
    };
    
    const blob = new Blob([JSON.stringify(metadata, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `images-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('元数据已导出');
  };

  // 复制所有链接
  const copyAllUrls = () => {
    const urls = uploadResults
      .filter(r => r.success)
      .map(r => window.location.origin + r.data.src)
      .join('\n');
    navigator.clipboard.writeText(urls);
    toast.success('已复制所有图片链接');
  };

  // 复制 Markdown 列表
  const copyMarkdownList = () => {
    const markdown = uploadResults
      .filter(r => r.success)
      .map(r => `![${r.filename}](${window.location.origin}${r.data.src})`)
      .join('\n');
    navigator.clipboard.writeText(markdown);
    toast.success('已复制 Markdown 列表');
  };

  // 重新上传
  const handleUploadAgain = () => {
    setUploadResults([]);
    setUploadProgress({ completed: 0, total: 0, percent: 0 });
  };

  // 单独重试失败的图片
  const retryFailedImage = async (index) => {
    const failedResult = uploadResults[index];
    if (!failedResult || failedResult.success) return;

    toast.loading('重新上传中...');
    // TODO: 实现单独重试逻辑
  };

  const successCount = uploadResults.filter(r => r.success).length;
  const failedCount = uploadResults.filter(r => !r.success).length;

  return (
    <motion.div
      className="home-page"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* 上传区域 */}
      <section className="upload-section">
        <div className="upload-header">
          <h1 className="upload-title">上传图片</h1>
          <p className="upload-subtitle">简单、快速、安全的图片托管服务</p>
        </div>

        {/* 拖拽上传 */}
        {uploadResults.length === 0 && !uploading && (
          <motion.div
            {...getRootProps()}
            className={`dropzone ${isDragActive ? 'drag-active' : ''}`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <input {...getInputProps()} />
            <div className="dropzone-icon">
              <HiOutlineCloudUpload />
            </div>
            <p className="dropzone-text">
              {isDragActive ? '释放以上传文件' : '拖放图片到这里或点击选择'}
            </p>
            <div className="dropzone-hint">
              <span className="dropzone-hint-item">
                <HiOutlinePhotograph />
                支持多种图片格式
              </span>
              <span className="dropzone-hint-item">
                <HiOutlineDocumentDuplicate />
                支持批量上传
              </span>
              <span className="dropzone-hint-item">
                <HiOutlineClipboard />
                最多并发 5 个
              </span>
            </div>
          </motion.div>
        )}

        {/* 上传进度 */}
        {uploading && (
          <motion.div
            className="upload-progress"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="progress-info">
              <span className="progress-text">
                上传中... {uploadProgress.completed}/{uploadProgress.total}
              </span>
              <span className="progress-percent">{uploadProgress.percent}%</span>
            </div>
            <div className="progress-bar-container">
              <motion.div
                className="progress-bar"
                initial={{ width: 0 }}
                animate={{ width: `${uploadProgress.percent}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </motion.div>
        )}

        {/* 批量上传结果 */}
        {uploadResults.length > 0 && !uploading && (
          <motion.div
            className="upload-result-batch"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="result-header">
              <div className="result-summary">
                <HiOutlineCheck className="success-icon" />
                <h3>上传完成！</h3>
                <p>成功 {successCount} 张{failedCount > 0 && ` · 失败 ${failedCount} 张`}</p>
              </div>
              <div className="result-actions">
                <button className="btn btn-ghost" onClick={exportMetadata} title="导出元数据">
                  <HiOutlineDownload />
                  导出 JSON
                </button>
                <button className="btn btn-ghost" onClick={copyAllUrls} title="复制所有链接">
                  <HiOutlineLink />
                  复制链接
                </button>
                <button className="btn btn-ghost" onClick={copyMarkdownList} title="复制 Markdown">
                  <SiMarkdown />
                  复制 MD
                </button>
              </div>
            </div>

            {/* 图片列表 */}
            <div className="result-list">
              <AnimatePresence>
                {uploadResults.map((result, index) => (
                  <motion.div
                    key={index}
                    className={`result-item ${result.success ? 'success' : 'error'}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    {result.success ? (
                      <>
                        <img
                          src={window.location.origin + result.data.src}
                          alt={result.filename}
                          className="result-thumbnail"
                        />
                        <div className="result-info">
                          <div className="result-filename">{result.filename}</div>
                          <div className="result-url-group">
                            <input
                              type="text"
                              value={window.location.origin + result.data.src}
                              readOnly
                              onClick={(e) => e.target.select()}
                              className="result-url-input"
                            />
                            <button
                              className="btn-icon"
                              onClick={() => copyToClipboard(window.location.origin + result.data.src)}
                              title="复制链接"
                            >
                              <HiOutlineDocumentDuplicate />
                            </button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="error-icon-wrapper">
                          <HiOutlineX />
                        </div>
                        <div className="result-info">
                          <div className="result-filename">{result.filename}</div>
                          <div className="error-message">{result.error}</div>
                        </div>
                        <button
                          className="btn-icon retry-btn"
                          onClick={() => retryFailedImage(index)}
                          title="重试"
                        >
                          <HiOutlineRefresh />
                        </button>
                      </>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* 操作按钮 */}
            <div className="result-footer">
              <button className="btn btn-primary" onClick={handleUploadAgain}>
                <HiOutlineCloudUpload />
                继续上传
              </button>
            </div>
          </motion.div>
        )}
      </section>
    </motion.div>
  );
};

export default HomePage;
