import { AlertTriangle, HelpCircle } from "lucide-react";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDanger?: boolean;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = "Xác nhận",
  cancelText = "Hủy bỏ",
  onConfirm,
  onCancel,
  isDanger = false,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl border border-slate-200/80 shadow-2xl max-w-md w-full overflow-hidden p-6 space-y-4 scale-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3.5">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            isDanger 
              ? "bg-rose-50 text-rose-600 border border-rose-100" 
              : "bg-indigo-50 text-indigo-600 border border-indigo-100"
          }`}>
            {isDanger ? <AlertTriangle size={20} /> : <HelpCircle size={20} />}
          </div>
          <div className="space-y-1.5 flex-1">
            <h3 className="text-base font-black text-slate-800 tracking-tight leading-none">{title}</h3>
            <p className="text-xs text-slate-500 font-medium leading-relaxed whitespace-pre-wrap">{message}</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-xl text-xs font-bold transition-all cursor-pointer select-none"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer select-none ${
              isDanger 
                ? "bg-rose-600 hover:bg-rose-700 shadow-rose-100" 
                : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100"
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
