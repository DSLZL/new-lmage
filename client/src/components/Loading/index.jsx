import { motion } from 'framer-motion';
import PropTypes from 'prop-types';

/**
 * 加载组件 - 多种样式
 */
const Loading = ({ 
  type = 'spinner', 
  size = 'medium', 
  text = '', 
  fullscreen = false 
}) => {
  const renderLoader = () => {
    switch (type) {
      case 'spinner':
        return <div className={`spinner spinner-${size}`}></div>;
      
      case 'dots':
        return (
          <div className="dots-loader">
            <span className="dot"></span>
            <span className="dot"></span>
            <span className="dot"></span>
          </div>
        );
      
      case 'pulse':
        return <div className={`pulse-loader pulse-${size}`}></div>;
      
      case 'bars':
        return (
          <div className="bars-loader">
            <span className="bar"></span>
            <span className="bar"></span>
            <span className="bar"></span>
            <span className="bar"></span>
          </div>
        );
      
      default:
        return <div className={`spinner spinner-${size}`}></div>;
    }
  };

  const content = (
    <div className={`loading-content ${fullscreen ? 'fullscreen' : ''}`}>
      {renderLoader()}
      {text && <p className="loading-text">{text}</p>}
    </div>
  );

  if (fullscreen) {
    return (
      <motion.div
        className="loading-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {content}
      </motion.div>
    );
  }

  return content;
};

Loading.propTypes = {
  type: PropTypes.oneOf(['spinner', 'dots', 'pulse', 'bars']),
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  text: PropTypes.string,
  fullscreen: PropTypes.bool,
};

export default Loading;
