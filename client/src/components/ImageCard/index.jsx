import { memo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { formatFileSize, formatDate } from '@/utils/format';
import {
  Heart,
  Copy,
  Trash,
  CheckCircle,
  Circle
} from '@phosphor-icons/react';

/**
 * ImageCard 组件 - 使用 memo 避免不必要的重渲染
 * 只有当 props 真正变化时才重新渲染
 */
const ImageCard = memo(({
  image,
  isSelected = false,
  isFavorite = false,
  showSelection = false,
  onSelect,
  onFavorite,
  onCopy,
  onDelete,
  onClick,
}) => {
  // 缓存点击处理函数，避免每次渲染都创建新函数
  const handleCardClick = useCallback((e) => {
    if (!e.target.closest('button')) onClick?.(image);
  }, [onClick, image]);

  const handleSelect = useCallback((e) => {
    e.stopPropagation();
    onSelect?.(image.id);
  }, [onSelect, image.id]);

  const handleFavorite = useCallback((e) => {
    e.stopPropagation();
    onFavorite?.(image.id);
  }, [onFavorite, image.id]);

  const handleCopy = useCallback((e) => {
    e.stopPropagation();
    onCopy?.(image);
  }, [onCopy, image]);

  const handleDelete = useCallback((e) => {
    e.stopPropagation();
    onDelete?.(image);
  }, [onDelete, image]);

  return (
    <div
      className={`
        bg-white p-3 pb-8 shadow-sketch border border-gray-200 relative transition-transform duration-300 hover:z-20 hover:scale-105 hover:rotate-0 cursor-pointer
        ${isSelected ? 'ring-2 ring-marker-blue rotate-0' : 'rotate-slight-1 even:rotate-slight-n1'}
      `}
      onClick={handleCardClick}
    >
      {/* Tape */}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-16 h-6 bg-white/40 backdrop-blur-sm -rotate-2 shadow-tape z-10"></div>

      {/* Selection Checkbox (Sticker Style) */}
      {showSelection && (
        <button
          className="absolute top-2 left-2 z-30 text-pencil hover:text-marker-blue bg-white rounded-full"
          onClick={handleSelect}
        >
          {isSelected ? <CheckCircle size={32} weight="fill" className="text-marker-blue" /> : <Circle size={32} />}
        </button>
      )}

      {/* Image Area */}
      <div className="aspect-square bg-gray-50 overflow-hidden border border-gray-100 relative group">
        <img
          src={image.src}
          alt={image.fileName}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />

        {/* Hover Actions (Stickers) */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
           {onCopy && (
             <button
               className="bg-white p-2 rounded-full shadow-lg hover:bg-marker-yellow transition-transform hover:rotate-12 hover:scale-110"
               onClick={handleCopy}
               title="复制链接"
             >
               <Copy size={20} className="text-pencil" />
             </button>
           )}
           {onFavorite && (
             <button
               className="bg-white p-2 rounded-full shadow-lg hover:bg-marker-pink transition-transform hover:-rotate-12 hover:scale-110"
               onClick={handleFavorite}
               title="喜欢"
             >
               <Heart size={20} weight={isFavorite ? "fill" : "regular"} className={isFavorite ? "text-red-500" : "text-pencil"} />
             </button>
           )}
           {onDelete && (
             <button
               className="bg-white p-2 rounded-full shadow-lg hover:bg-red-100 transition-transform hover:rotate-6 hover:scale-110"
               onClick={handleDelete}
               title="丢弃"
             >
               <Trash size={20} className="text-red-500" />
             </button>
           )}
        </div>
      </div>

      {/* Caption */}
      <div className="mt-3 px-1">
        <p className="font-hand text-xl text-pencil truncate leading-tight" title={image.fileName}>
          {image.fileName}
        </p>
        <div className="flex justify-between items-center mt-1 text-gray-400 text-xs font-hand">
           <span>{formatFileSize(image.fileSize)}</span>
           <span>{formatDate(image.uploadTime)}</span>
        </div>
      </div>
    </div>
  );
});

ImageCard.displayName = 'ImageCard';

ImageCard.propTypes = {
  image: PropTypes.object.isRequired,
  isSelected: PropTypes.bool,
  isFavorite: PropTypes.bool,
  showSelection: PropTypes.bool,
  onSelect: PropTypes.func,
  onFavorite: PropTypes.func,
  onCopy: PropTypes.func,
  onDelete: PropTypes.func,
  onClick: PropTypes.func,
};

export default ImageCard;
