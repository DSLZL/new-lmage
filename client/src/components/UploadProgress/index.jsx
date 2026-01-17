import { motion, AnimatePresence } from 'framer-motion';
import PropTypes from 'prop-types';

/**
 * 上传进度组件 - 显示文件上传进度
 */
const UploadProgress = ({ files, onCancel, onRemove }) => {
  if (!files || files.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="upload-progress-container"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
      >
        <div className="upload-progress-header">
          <h4>
            <i className="ri-upload-cloud-2-line"></i>
            上传进度 ({files.filter((f) => f.status === 'done').length}/{files.length})
          </h4>
          {files.some((f) => f.status === 'uploading') && (
            <button className="cancel-all-btn" onClick={onCancel}>
              <i className="ri-close-line"></i>
              取消全部
            </button>
          )}
        </div>

        <div className="upload-progress-list">
          {files.map((file) => (
            <motion.div
              key={file.id}
              className={`upload-item upload-item-${file.status}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              {/* 文件图标 */}
              <div className="upload-item-icon">
                {file.status === 'uploading' && (
                  <div className="upload-spinner"></div>
                )}
                {file.status === 'done' && (
                  <i className="ri-checkbox-circle-fill success-icon"></i>
                )}
                {file.status === 'error' && (
                  <i className="ri-error-warning-fill error-icon"></i>
                )}
              </div>

              {/* 文件信息 */}
              <div className="upload-item-info">
                <div className="upload-item-name">{file.name}</div>
                <div className="upload-item-meta">
                  {file.status === 'uploading' && (
                    <span>{file.progress}%</span>
                  )}
                  {file.status === 'done' && (
                    <span className="success-text">上传成功</span>
                  )}
                  {file.status === 'error' && (
                    <span className="error-text">{file.error || '上传失败'}</span>
                  )}
                </div>

                {/* 进度条 */}
                {file.status === 'uploading' && (
                  <div className="upload-progress-bar">
                    <div
                      className="upload-progress-fill"
                      style={{ width: `${file.progress}%` }}
                    />
                  </div>
                )}
              </div>

              {/* 操作按钮 */}
              <div className="upload-item-actions">
                {file.status === 'uploading' && (
                  <button
                    className="upload-action-btn"
                    onClick={() => onCancel(file.id)}
                    title="取消"
                  >
                    <i className="ri-close-line"></i>
                  </button>
                )}
                {(file.status === 'done' || file.status === 'error') && (
                  <button
                    className="upload-action-btn"
                    onClick={() => onRemove(file.id)}
                    title="移除"
                  >
                    <i className="ri-delete-bin-line"></i>
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

UploadProgress.propTypes = {
  files: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      status: PropTypes.oneOf(['uploading', 'done', 'error']).isRequired,
      progress: PropTypes.number,
      error: PropTypes.string,
    })
  ).isRequired,
  onCancel: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
};

export default UploadProgress;
