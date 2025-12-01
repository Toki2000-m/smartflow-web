import React, { useEffect } from 'react';
import './ToastNotification.css';

export const ToastContainer = ({ toasts, removeToast }) => {
  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <Toast key={toast.id} {...toast} removeToast={removeToast} />
      ))}
    </div>
  );
};

const Toast = ({ id, message, type, duration, removeToast }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      removeToast(id);
    }, duration);
    
    return () => clearTimeout(timer);
  }, [id, duration, removeToast]);

  const getIcon = () => {
    switch(type) {
      case 'success': return 'check_circle';
      case 'error': return 'error';
      case 'warning': return 'warning';
      case 'info': return 'info';
      default: return 'check_circle';
    }
  };

  return (
    <div className={`toast toast-${type}`}>
      <span className="material-icons toast-icon">{getIcon()}</span>
      <span className="toast-message">{message}</span>
      <button className="toast-close" onClick={() => removeToast(id)}>
        <span className="material-icons">close</span>
      </button>
    </div>
  );
};