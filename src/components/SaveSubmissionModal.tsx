import React, { useState } from 'react';
import { Save, X, Database, CheckCircle2, User, FileText, AlertCircle } from 'lucide-react';
import { Submission } from '../types';

interface SaveSubmissionModalProps {
  assignments: Record<string, string>;
  totalSeats: number;
  editingSubmission?: Submission | null;
  adminToken?: string | null;
  onSaveSuccess: (submission: Submission) => void;
  onClose: () => void;
}

export const SaveSubmissionModal: React.FC<SaveSubmissionModalProps> = ({
  assignments,
  totalSeats,
  editingSubmission,
  adminToken,
  onSaveSuccess,
  onClose,
}) => {
  const [fillerName, setFillerName] = useState(editingSubmission?.filler_name || '');
  const [title, setTitle] = useState(
    editingSubmission?.title || `چیدمان سیت‌ها - ${new Date().toLocaleDateString('fa-IR')}`
  );
  const [notes, setNotes] = useState(editingSubmission?.notes || '');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const assignedCount = Object.values(assignments).filter(Boolean).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fillerName.trim()) {
      setError('لطفاً نام تکمیل‌کننده فرم را وارد نمایید.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const payload = {
        title: title.trim(),
        filler_name: fillerName.trim(),
        notes: notes.trim(),
        assignments,
        total_seats: totalSeats,
      };

      const url = editingSubmission
        ? `/api/submissions/${editingSubmission.id}`
        : '/api/submissions';
      const method = editingSubmission ? 'PUT' : 'POST';

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (adminToken) {
        headers['Authorization'] = `Bearer ${adminToken}`;
      }

      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'خطا در ذخیره‌سازی اطلاعات');
      }

      onSaveSuccess(data.data || { ...editingSubmission, ...payload });
      onClose();
    } catch (err: any) {
      setError(err.message || 'مشکلی در برقراری ارتباط با دیتابیس رخ داد.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-indigo-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                {editingSubmission ? 'ویرایش اطلاعات چیدمان در دیتابیس' : 'ذخیره دائمی چیدمان در دیتابیس'}
              </h3>
              <p className="text-xs text-slate-500">
                اطلاعات پرکننده و جایگاه تمام سیت‌ها در دیتابیس ثبت می‌شود
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          
          {error && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Seat allocation stats chip */}
          <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs">
            <span className="text-slate-600">تعداد سیت‌های تخصیص‌یافته:</span>
            <div className="flex items-center gap-1.5 font-bold text-indigo-700">
              <span className="font-mono">{assignedCount}</span>
              <span className="text-slate-400">از</span>
              <span className="font-mono">{totalSeats}</span>
              <span className="text-[10px] bg-indigo-100 px-1.5 py-0.5 rounded text-indigo-800">
                {Math.round((assignedCount / totalSeats) * 100)}%
              </span>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              عنوان چیدمان (اختیاری)
            </label>
            <div className="relative">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثال: چیدمان پیشنهادی برای سالن اصلی"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
              />
            </div>
          </div>

          {/* Filler Name (Required) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              نام و نام خانوادگی پرکننده فرم <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={fillerName}
                onChange={(e) => setFillerName(e.target.value)}
                placeholder="مثال: رضا هاشمی"
                className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition font-medium"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              توضیحات و یادداشت‌ها (اختیاری)
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="توضیحات تکمیلی در مورد تغییرات یا چیدمان جدید..."
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition resize-none"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium transition"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white rounded-xl text-xs font-semibold shadow-xs disabled:opacity-50 transition"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'در حال ثبت در دیتابیس...' : 'ثبت قطعی در دیتابیس'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
