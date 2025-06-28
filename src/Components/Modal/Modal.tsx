import React, { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import "./Modal.css";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  ariaLabel?: string;
};

const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  children,
  ariaLabel,
}) => {
  const { t } = useTranslation();
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on ESC key and trap focus
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      // Focus trap
      if (e.key === "Tab" && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = document.activeElement;

        if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        } else if (e.shiftKey && active === first) {
          e.preventDefault();
          last.focus();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  // Focus first focusable element when modal opens
  useEffect(() => {
    if (!open || !modalRef.current) return;
    const focusable = modalRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length) focusable[0].focus();
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="modal-overlay modal-fade-in"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
      aria-label={ariaLabel || t("dialog")}
    >
      <div
        className="modal-content modal-slide-in"
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
      >
        <button
          className="modal-close"
          onClick={onClose}
          aria-label={t("close_modal")}
        >
          ×
        </button>
        {children}
      </div>
    </div>
  );
};

export default Modal;
