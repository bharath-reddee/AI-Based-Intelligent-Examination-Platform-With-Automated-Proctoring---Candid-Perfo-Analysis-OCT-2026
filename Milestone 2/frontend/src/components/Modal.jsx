import React, { useEffect } from 'react';
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Info,
  HelpCircle,
  X,
  RefreshCw
} from 'lucide-react';

const Modal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  children,
  type = 'info', 
  confirmText = 'OK',
  cancelText,
  loading = false,
  confirmDisabled = false,
  showCloseButton = true,
  maxWidth = 'max-w-md',
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && onClose && !loading) {
        onClose();
      }
    };

    
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, loading]);

  if (!isOpen) return null;

  
  const getIconConfig = () => {
    switch (type) {
      case 'warning':
        return {
          icon: <AlertTriangle className="w-8 h-8 text-[#D69B35]" />,
          badgeBg: 'bg-[#D69B35]/10 border-[#D69B35]/30',
          btnBg: 'bg-[#D69B35] hover:bg-[#b8852d] text-white shadow-sm',
        };
      case 'danger':
        return {
          icon: <AlertCircle className="w-8 h-8 text-[#D95C65]" />,
          badgeBg: 'bg-[#D95C65]/10 border-[#D95C65]/30',
          btnBg: 'bg-[#D95C65] hover:bg-[#c24b54] text-white shadow-sm',
        };
      case 'success':
        return {
          icon: <CheckCircle2 className="w-8 h-8 text-[#299D70]" />,
          badgeBg: 'bg-[#299D70]/10 border-[#299D70]/30',
          btnBg: 'bg-[#299D70] hover:bg-[#22835d] text-white shadow-sm',
        };
      case 'confirm':
        return {
          icon: <HelpCircle className="w-8 h-8 text-[#4169C1]" />,
          badgeBg: 'bg-[#4169C1]/10 border-[#4169C1]/30',
          btnBg: 'bg-[#4169C1] hover:bg-[#3558a7] text-white shadow-sm',
        };
      case 'info':
      default:
        return {
          icon: <Info className="w-8 h-8 text-[#233B67]" />,
          badgeBg: 'bg-[#233B67]/10 border-[#233B67]/30',
          btnBg: 'bg-[#233B67] hover:bg-[#1a2c4e] text-white shadow-sm',
        };
    }
  };

  const { icon, badgeBg, btnBg } = getIconConfig();

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    } else if (onClose) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-[#202B40]/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      onClick={() => {
        if (onClose && !loading) onClose();
      }}
    >
      <div
        className={`relative w-full ${maxWidth} my-auto rounded-3xl bg-white border border-[#E2E8F0] shadow-2xl p-6 sm:p-8 space-y-5 text-center transform animate-in zoom-in-95 duration-150`}
        onClick={(e) => e.stopPropagation()}
      >
        {showCloseButton && onClose && (
          <button
            onClick={onClose}
            disabled={loading}
            className="absolute top-5 right-5 p-2 rounded-xl text-[#718096] hover:text-[#202B40] hover:bg-[#EDF2FA] transition-colors disabled:opacity-40"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <div className={`w-16 h-16 rounded-2xl ${badgeBg} border flex items-center justify-center mx-auto shadow-sm`}>
          {icon}
        </div>

        <div className="space-y-2">
          {title && (
            <h3 className="text-lg sm:text-xl font-bold text-[#202B40] tracking-tight">
              {title}
            </h3>
          )}
          {message && (
            <p className="text-xs sm:text-sm text-[#718096] leading-relaxed max-w-sm mx-auto">
              {message}
            </p>
          )}
        </div>

        {children && <div className="text-left pt-1">{children}</div>}

        <div className="flex items-center justify-center gap-3 pt-3">
          {cancelText && (
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-3 px-4 rounded-xl text-xs font-semibold text-[#718096] hover:text-[#202B40] bg-[#EDF2FA] hover:bg-[#E2E8F0] border border-[#E2E8F0] transition-all disabled:opacity-40"
            >
              {cancelText}
            </button>
          )}

          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading || confirmDisabled}
            className={`flex-1 py-3 px-5 rounded-xl text-xs font-bold ${btnBg} shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <span>{confirmText}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Modal;
