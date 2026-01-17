import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PropTypes from 'prop-types';
import toast from 'react-hot-toast';

/**
 * 图片查看器组件 - 支持缩放、旋转、下载等功能
 */
const ImageViewer = ({ isOpen, images, currentIndex = 0, onClose }) => {
  const [index, setIndex] = useState(currentIndex);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    setIndex(currentIndex);
    setScale(1);
    setRotation(0);
  }, [currentIndex, isOpen]);

  // 键盘事件
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          handlePrevious();
          break;
        case 'ArrowRight':
          handleNext();
          break;
        case '+':
        case '=':
          handleZoomIn();
          break;
        case '-':
          handleZoomOut();
          break;
        default:
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, index]);

  const currentImage = images[index];

  const handlePrevious = () => {
    if (index > 0) {
      setIndex(index - 1);
      setScale(1);
      setRotation(0);
    }
  };

  const handleNext = () => {
    if (index < images.length - 1) {
      setIndex(index + 1);
      setScale(1);
      setRotation(0);
    }
  };

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.25, 0.5));
  };

  const handleRotateLeft = () => {
    setRotation((prev) => prev - 90);
  };

  const handleRotateRight = () => {
    setRotation((prev) => prev + 90);
  };

  const handleReset = () => {
    setScale(1);
    setRotation(0);
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(currentImage.src);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = currentImage.fileName || 'image.jpg';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('下载成功');
    } catch (error) {
      toast.error('下载失败');
    }
  };

  if (!isOpen || !currentImage) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="image-viewer-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <div className="image-viewer-container" onClick={(e) => e.stopPropagation()}>
          {/* 工具栏 */}
          <div className="viewer-toolbar">
            <div className="toolbar-left">
              <span className="image-counter">
                {index + 1} / {images.length}
              </span>
              <span className="image-name">{currentImage.fileName}</span>
            </div>
            <div className="toolbar-right">
              <button className="toolbar-btn" onClick={handleZoomOut} title="缩小">
                <i className="ri-zoom-out-line"></i>
              </button>
              <span className="zoom-level">{Math.round(scale * 100)}%</span>
              <button className="toolbar-btn" onClick={handleZoomIn} title="放大">
                <i className="ri-zoom-in-line"></i>
              </button>
              <button className="toolbar-btn" onClick={handleRotateLeft} title="向左旋转">
                <i className="ri-anticlockwise-line"></i>
              </button>
              <button className="toolbar-btn" onClick={handleRotateRight} title="向右旋转">
                <i className="ri-clockwise-line"></i>
              </button>
              <button className="toolbar-btn" onClick={handleReset} title="重置">
                <i className="ri-refresh-line"></i>
              </button>
              <button className="toolbar-btn" onClick={handleDownload} title="下载">
                <i className="ri-download-line"></i>
              </button>
              <button className="toolbar-btn" onClick={onClose} title="关闭">
                <i className="ri-close-line"></i>
              </button>
            </div>
          </div>

          {/* 图片显示区域 */}
          <div className="viewer-content">
            <motion.img
              key={index}
              src={currentImage.src}
              alt={currentImage.fileName}
              className="viewer-image"
              style={{
                transform: `scale(${scale}) rotate(${rotation}deg)`,
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            />
          </div>

          {/* 导航按钮 */}
          {images.length > 1 && (
            <>
              <button
                className="viewer-nav viewer-nav-prev"
                onClick={handlePrevious}
                disabled={index === 0}
              >
                <i className="ri-arrow-left-s-line"></i>
              </button>
              <button
                className="viewer-nav viewer-nav-next"
                onClick={handleNext}
                disabled={index === images.length - 1}
              >
                <i className="ri-arrow-right-s-line"></i>
              </button>
            </>
          )}

          {/* 缩略图 */}
          {images.length > 1 && (
            <div className="viewer-thumbnails">
              {images.map((img, idx) => (
                <div
                  key={idx}
                  className={`thumbnail ${idx === index ? 'active' : ''}`}
                  onClick={() => {
                    setIndex(idx);
                    setScale(1);
                    setRotation(0);
                  }}
                >
                  <img src={img.src} alt={img.fileName} />
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

ImageViewer.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  images: PropTypes.arrayOf(
    PropTypes.shape({
      src: PropTypes.string.isRequired,
      fileName: PropTypes.string,
    })
  ).isRequired,
  currentIndex: PropTypes.number,
  onClose: PropTypes.func.isRequired,
};

export default ImageViewer;
