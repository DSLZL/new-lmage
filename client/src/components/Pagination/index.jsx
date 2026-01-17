import { motion } from 'framer-motion';
import PropTypes from 'prop-types';

/**
 * 分页组件
 */
const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
  showPageNumbers = true,
  maxPageNumbers = 7,
}) => {
  // 生成页码数组
  const getPageNumbers = () => {
    if (totalPages <= maxPageNumbers) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages = [];
    const halfMax = Math.floor(maxPageNumbers / 2);

    if (currentPage <= halfMax) {
      // 靠近开始
      for (let i = 1; i <= maxPageNumbers - 2; i++) {
        pages.push(i);
      }
      pages.push('...');
      pages.push(totalPages);
    } else if (currentPage >= totalPages - halfMax) {
      // 靠近结束
      pages.push(1);
      pages.push('...');
      for (let i = totalPages - (maxPageNumbers - 3); i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // 中间位置
      pages.push(1);
      pages.push('...');
      for (let i = currentPage - 1; i <= currentPage + 1; i++) {
        pages.push(i);
      }
      pages.push('...');
      pages.push(totalPages);
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  const handlePageClick = (page) => {
    if (page !== '...' && page !== currentPage) {
      onPageChange(page);
    }
  };

  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  if (totalPages <= 1) {
    return null;
  }

  return (
    <motion.div
      className="pagination"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* 上一页 */}
      <button
        className="pagination-btn"
        onClick={handlePrevious}
        disabled={currentPage === 1}
        aria-label="上一页"
      >
        <i className="ri-arrow-left-s-line"></i>
      </button>

      {/* 页码 */}
      {showPageNumbers && (
        <div className="pagination-numbers">
          {pageNumbers.map((page, index) => (
            <button
              key={index}
              className={`pagination-number ${
                page === currentPage ? 'active' : ''
              } ${page === '...' ? 'ellipsis' : ''}`}
              onClick={() => handlePageClick(page)}
              disabled={page === '...'}
            >
              {page}
            </button>
          ))}
        </div>
      )}

      {/* 页码信息 */}
      {!showPageNumbers && (
        <span className="pagination-info">
          {currentPage} / {totalPages}
        </span>
      )}

      {/* 下一页 */}
      <button
        className="pagination-btn"
        onClick={handleNext}
        disabled={currentPage === totalPages}
        aria-label="下一页"
      >
        <i className="ri-arrow-right-s-line"></i>
      </button>
    </motion.div>
  );
};

Pagination.propTypes = {
  currentPage: PropTypes.number.isRequired,
  totalPages: PropTypes.number.isRequired,
  onPageChange: PropTypes.func.isRequired,
  showPageNumbers: PropTypes.bool,
  maxPageNumbers: PropTypes.number,
};

export default Pagination;
