import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import PropTypes from 'prop-types';
import toast from 'react-hot-toast';

/**
 * 图片编辑器组件 - 支持裁剪、滤镜、调整等功能
 */
const ImageEditor = ({ isOpen, image, onClose, onSave }) => {
  const canvasRef = useRef(null);
  const [editedImage, setEditedImage] = useState(null);
  const [currentFilter, setCurrentFilter] = useState('none');
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [scale, setScale] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);

  // 滤镜预设
  const filters = [
    { id: 'none', name: '原图', filter: '' },
    { id: 'grayscale', name: '黑白', filter: 'grayscale(100%)' },
    { id: 'sepia', name: '复古', filter: 'sepia(100%)' },
    { id: 'vintage', name: '怀旧', filter: 'sepia(50%) contrast(120%)' },
    { id: 'bright', name: '明亮', filter: 'brightness(120%) contrast(110%)' },
    { id: 'contrast', name: '高对比', filter: 'contrast(150%)' },
    { id: 'warm', name: '暖色', filter: 'sepia(30%) saturate(120%)' },
    { id: 'cool', name: '冷色', filter: 'hue-rotate(180deg) saturate(120%)' },
  ];

  // 加载图片到画布
  useEffect(() => {
    if (!isOpen || !image) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      setEditedImage(img);
    };

    img.src = image.src;
  }, [isOpen, image]);

  // 应用编辑效果
  const applyEffects = () => {
    if (!editedImage || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 保存当前状态
    ctx.save();

    // 应用变换
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(scale, scale);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);

    // 应用滤镜
    const filterStr = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
    ctx.filter = filterStr;

    // 绘制图片
    ctx.drawImage(editedImage, 0, 0);

    // 恢复状态
    ctx.restore();
  };

  // 监听参数变化，实时更新
  useEffect(() => {
    if (editedImage) {
      applyEffects();
    }
  }, [brightness, contrast, saturation, rotation, scale, editedImage]);

  // 应用滤镜
  const handleFilterChange = (filterId) => {
    setCurrentFilter(filterId);
    const filter = filters.find((f) => f.id === filterId);
    
    if (filterId === 'none') {
      setBrightness(100);
      setContrast(100);
      setSaturation(100);
    } else if (filterId === 'grayscale') {
      setSaturation(0);
    } else if (filterId === 'sepia') {
      setBrightness(110);
      setContrast(90);
      setSaturation(80);
    }
  };

  // 重置所有设置
  const handleReset = () => {
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setRotation(0);
    setScale(1);
    setCurrentFilter('none');
  };

  // 保存编辑后的图片
  const handleSave = async () => {
    if (!canvasRef.current) return;

    setIsProcessing(true);

    try {
      const canvas = canvasRef.current;
      
      // 转换为 Blob
      canvas.toBlob(async (blob) => {
        if (!blob) {
          toast.error('保存失败');
          setIsProcessing(false);
          return;
        }

        // 创建 File 对象
        const file = new File([blob], image.fileName || 'edited-image.jpg', {
          type: 'image/jpeg',
        });

        // 调用保存回调
        await onSave(file);
        
        toast.success('保存成功');
        setIsProcessing(false);
        onClose();
      }, 'image/jpeg', 0.9);
    } catch (error) {
      console.error('保存失败:', error);
      toast.error('保存失败');
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="image-editor-overlay">
      <motion.div
        className="image-editor"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
      >
        {/* 头部 */}
        <div className="editor-header">
          <h3>
            <i className="ri-image-edit-line"></i>
            图片编辑器
          </h3>
          <button className="editor-close" onClick={onClose}>
            <i className="ri-close-line"></i>
          </button>
        </div>

        {/* 主体 */}
        <div className="editor-body">
          {/* 画布区域 */}
          <div className="editor-canvas-container">
            <canvas ref={canvasRef} className="editor-canvas" />
          </div>

          {/* 控制面板 */}
          <div className="editor-controls">
            {/* 滤镜选择 */}
            <div className="control-section">
              <h4>滤镜效果</h4>
              <div className="filter-grid">
                {filters.map((filter) => (
                  <button
                    key={filter.id}
                    className={`filter-btn ${
                      currentFilter === filter.id ? 'active' : ''
                    }`}
                    onClick={() => handleFilterChange(filter.id)}
                  >
                    {filter.name}
                  </button>
                ))}
              </div>
            </div>

            {/* 调整参数 */}
            <div className="control-section">
              <h4>调整</h4>
              
              <div className="control-item">
                <label>
                  <i className="ri-sun-line"></i>
                  亮度
                  <span>{brightness}%</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="200"
                  value={brightness}
                  onChange={(e) => setBrightness(Number(e.target.value))}
                  className="slider"
                />
              </div>

              <div className="control-item">
                <label>
                  <i className="ri-contrast-line"></i>
                  对比度
                  <span>{contrast}%</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="200"
                  value={contrast}
                  onChange={(e) => setContrast(Number(e.target.value))}
                  className="slider"
                />
              </div>

              <div className="control-item">
                <label>
                  <i className="ri-palette-line"></i>
                  饱和度
                  <span>{saturation}%</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="200"
                  value={saturation}
                  onChange={(e) => setSaturation(Number(e.target.value))}
                  className="slider"
                />
              </div>
            </div>

            {/* 变换 */}
            <div className="control-section">
              <h4>变换</h4>
              
              <div className="control-item">
                <label>
                  <i className="ri-rotate-lock-line"></i>
                  旋转
                  <span>{rotation}°</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="360"
                  value={rotation}
                  onChange={(e) => setRotation(Number(e.target.value))}
                  className="slider"
                />
              </div>

              <div className="control-item">
                <label>
                  <i className="ri-zoom-in-line"></i>
                  缩放
                  <span>{scale.toFixed(2)}x</span>
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={scale}
                  onChange={(e) => setScale(Number(e.target.value))}
                  className="slider"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 底部操作 */}
        <div className="editor-footer">
          <button className="btn btn-outline" onClick={handleReset}>
            <i className="ri-refresh-line"></i>
            重置
          </button>
          <div className="footer-actions">
            <button className="btn btn-outline" onClick={onClose}>
              取消
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <div className="btn-spinner"></div>
                  保存中...
                </>
              ) : (
                <>
                  <i className="ri-save-line"></i>
                  保存
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

ImageEditor.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  image: PropTypes.shape({
    src: PropTypes.string.isRequired,
    fileName: PropTypes.string,
  }),
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
};

export default ImageEditor;
