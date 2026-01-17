import { motion, AnimatePresence } from 'framer-motion';
import PropTypes from 'prop-types';
import toast from 'react-hot-toast';

/**
 * 分享菜单组件
 */
const ShareMenu = ({ isOpen, onClose, imageUrl, imageTitle = '图片分享' }) => {
  // 复制链接
  const handleCopyLink = () => {
    navigator.clipboard.writeText(imageUrl);
    toast.success('链接已复制到剪贴板');
    onClose();
  };

  // 分享到社交平台
  const handleShare = (platform) => {
    const encodedUrl = encodeURIComponent(imageUrl);
    const encodedTitle = encodeURIComponent(imageTitle);
    
    const shareUrls = {
      twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      weibo: `https://service.weibo.com/share/share.php?url=${encodedUrl}&title=${encodedTitle}`,
      qq: `https://connect.qq.com/widget/shareqq/index.html?url=${encodedUrl}&title=${encodedTitle}`,
      telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`,
    };

    if (shareUrls[platform]) {
      window.open(shareUrls[platform], '_blank', 'width=600,height=400');
      onClose();
    }
  };

  // 使用 Web Share API
  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: imageTitle,
          text: '通过 TG-Image 分享',
          url: imageUrl,
        });
        onClose();
      } catch (error) {
        if (error.name !== 'AbortError') {
          toast.error('分享失败');
        }
      }
    } else {
      toast.error('您的浏览器不支持分享功能');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="share-menu-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="share-menu"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            <div className="share-menu-header">
              <h3>
                <i className="ri-share-line"></i>
                分享图片
              </h3>
              <button className="share-menu-close" onClick={onClose}>
                <i className="ri-close-line"></i>
              </button>
            </div>

            <div className="share-menu-content">
              {/* 原生分享 */}
              {navigator.share && (
                <button className="share-item share-native" onClick={handleNativeShare}>
                  <div className="share-icon">
                    <i className="ri-share-forward-line"></i>
                  </div>
                  <span>系统分享</span>
                </button>
              )}

              {/* 社交平台 */}
              <button className="share-item" onClick={() => handleShare('twitter')}>
                <div className="share-icon share-twitter">
                  <i className="ri-twitter-x-line"></i>
                </div>
                <span>Twitter</span>
              </button>

              <button className="share-item" onClick={() => handleShare('facebook')}>
                <div className="share-icon share-facebook">
                  <i className="ri-facebook-line"></i>
                </div>
                <span>Facebook</span>
              </button>

              <button className="share-item" onClick={() => handleShare('telegram')}>
                <div className="share-icon share-telegram">
                  <i className="ri-telegram-line"></i>
                </div>
                <span>Telegram</span>
              </button>

              <button className="share-item" onClick={() => handleShare('weibo')}>
                <div className="share-icon share-weibo">
                  <i className="ri-weibo-line"></i>
                </div>
                <span>微博</span>
              </button>

              <button className="share-item" onClick={() => handleShare('qq')}>
                <div className="share-icon share-qq">
                  <i className="ri-qq-line"></i>
                </div>
                <span>QQ</span>
              </button>

              {/* 复制链接 */}
              <button className="share-item" onClick={handleCopyLink}>
                <div className="share-icon share-copy">
                  <i className="ri-file-copy-line"></i>
                </div>
                <span>复制链接</span>
              </button>
            </div>

            {/* 链接预览 */}
            <div className="share-link-preview">
              <input
                type="text"
                value={imageUrl}
                readOnly
                className="share-link-input"
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

ShareMenu.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  imageUrl: PropTypes.string.isRequired,
  imageTitle: PropTypes.string,
};

export default ShareMenu;
