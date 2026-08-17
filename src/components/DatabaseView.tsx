import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Search, 
  Download, 
  Image as ImageIcon, 
  Trash2, 
  Upload, 
  Calendar, 
  User, 
  FileText, 
  CheckCircle, 
  Eye, 
  RefreshCw,
  X,
  Clock,
  Lock
} from 'lucide-react';
import { Submission } from '../types';
import { formatPersianDate, downloadImage, downloadCSV } from '../utils/exportHelpers';

interface DatabaseViewProps {
  onLoadLayout: (submission: Submission) => void;
  onRefreshStats: () => void;
  adminToken: string | null;
  onRequireLogin: () => void;
}

export const DatabaseView: React.FC<DatabaseViewProps> = ({
  onLoadLayout,
  onRefreshStats,
  adminToken,
  onRequireLogin,
}) => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubDetail, setSelectedSubDetail] = useState<Submission | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);
  const [authError, setAuthError] = useState<boolean>(false);

  const fetchSubmissions = async () => {
    if (!adminToken) {
      setAuthError(true);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setAuthError(false);
      const res = await fetch('/api/submissions', {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
        },
      });
      if (res.status === 401) {
        setAuthError(true);
        return;
      }
      const data = await res.json();
      if (data.success) {
        setSubmissions(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching submissions from DB:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, [adminToken]);

  if (!adminToken || authError) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center max-w-lg mx-auto shadow-xs">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-2">
          دسترسی محدود به مدیر سیستم (ادمین)
        </h3>
        <p className="text-xs text-slate-500 mb-6 leading-relaxed">
          برای حفظ محرمانگی داده‌ها، فرم‌های ثبت‌شده و چیدمان‌های بقیه کاربران فقط با حساب ادمین قابل مشاهده و مدیریت است.
        </p>
        <button
          onClick={onRequireLogin}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white rounded-xl text-xs font-semibold shadow-xs transition"
        >
          <Lock className="w-4 h-4" />
          <span>ورود با نام کاربری و رمز عبور ادمین</span>
        </button>
      </div>
    );
  }

  const handleOpenDetail = async (sub: Submission) => {
    try {
      setDetailLoading(true);
      setSelectedSubDetail(sub);
      const res = await fetch(`/api/submissions/${sub.id}`, {
        headers: { 'Authorization': `Bearer ${adminToken}` },
      });
      const data = await res.json();
      if (data.success) {
        setSelectedSubDetail(data.data);
      }
    } catch (err) {
      console.error('Error fetching submission detail:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('آیا از حذف این چیدمان از دیتابیس اطمینان دارید؟')) {
      return;
    }
    try {
      setDeletingId(id);
      const res = await fetch(`/api/submissions/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${adminToken}` },
      });
      const data = await res.json();
      if (data.success) {
        setSubmissions(prev => prev.filter(s => s.id !== id));
        if (selectedSubDetail?.id === id) {
          setSelectedSubDetail(null);
        }
        onRefreshStats();
        setActionSuccessMessage('چیدمان با موفقیت از دیتابیس حذف شد.');
        setTimeout(() => setActionSuccessMessage(null), 3000);
      }
    } catch (err) {
      console.error('Error deleting submission:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownloadPng = async (sub: Submission) => {
    let assignments = sub.assignments;
    if (!assignments) {
      try {
        const res = await fetch(`/api/submissions/${sub.id}`, {
          headers: { 'Authorization': `Bearer ${adminToken}` },
        });
        const data = await res.json();
        assignments = data.data.assignments;
      } catch (e) {
        return;
      }
    }
    if (assignments) {
      await downloadImage(assignments, {
        preparedBy: sub.filler_name,
        title: sub.title,
      });
    }
  };

  const handleDownloadCsv = async (sub: Submission) => {
    let assignments = sub.assignments;
    if (!assignments) {
      try {
        const res = await fetch(`/api/submissions/${sub.id}`, {
          headers: { 'Authorization': `Bearer ${adminToken}` },
        });
        const data = await res.json();
        assignments = data.data.assignments;
      } catch (e) {
        return;
      }
    }
    if (assignments) {
      downloadCSV(assignments, {
        preparedBy: sub.filler_name,
        title: sub.title,
        notes: sub.notes,
      });
    }
  };

  const filteredSubmissions = submissions.filter(s => {
    const term = searchTerm.toLowerCase();
    return (
      s.title?.toLowerCase().includes(term) ||
      s.filler_name?.toLowerCase().includes(term) ||
      s.notes?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      
      {/* Top Banner and Search Bar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Database className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-900">
              دیتابیس چیدمان‌ها و فرم‌های ثبت‌شده
            </h2>
          </div>
          <p className="text-xs text-slate-500">
            مشاهده اختصاصی برای ادمین: کلیه فرم‌های پرشده و نحوه چینش صندلی‌ها در پایگاه داده SQLite ذخیره شده است.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="جستجو بر اساس نام پرکننده یا عنوان چیدمان..."
              className="w-full pl-3.5 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
            />
          </div>

          <button
            onClick={fetchSubmissions}
            title="به‌روزرسانی اطلاعات"
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {actionSuccessMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>{actionSuccessMessage}</span>
        </div>
      )}

      {/* Submissions Grid */}
      {loading ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200/80">
          <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-600">در حال خواندن داده‌ها از دیتابیس SQLite...</p>
        </div>
      ) : filteredSubmissions.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200/80 p-6">
          <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Database className="w-7 h-7" />
          </div>
          <h3 className="font-bold text-slate-800 text-base mb-1">
            {searchTerm ? 'هیچ موردی با این عبارت یافت نشد' : 'هنوز چیدمانی در دیتابیس ثبت نشده است'}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
            {searchTerm
              ? 'عبارت جستجو را تغییر دهید یا فیلتر را پاک کنید.'
              : 'کاربران می‌توانند از تب «نقشه و چیدمان»، صندلی‌ها را انتخاب و ثبت کنند.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSubmissions.map((sub) => {
            const assignedCount = sub.total_assigned ?? sub.actual_assigned_count ?? 0;
            const percent = Math.round((assignedCount / sub.total_seats) * 100);

            return (
              <div
                key={sub.id}
                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Top row: ID and Date */}
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                    <span className="font-mono bg-slate-100 px-2 py-0.5 rounded-md font-bold text-slate-700">
                      ثبت #{sub.id}
                    </span>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{formatPersianDate(sub.created_at)}</span>
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="font-bold text-slate-900 text-base mb-2 group-hover:text-indigo-600 transition truncate">
                    {sub.title}
                  </h3>

                  {/* Filler Info */}
                  <div className="space-y-1.5 text-xs text-slate-600 mb-4 bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span>تکمیل‌کننده:</span>
                      <strong className="text-slate-900 font-semibold truncate">{sub.filler_name}</strong>
                    </div>

                    {sub.notes && (
                      <div className="flex items-start gap-2 pt-1 text-slate-500 border-t border-slate-200/50">
                        <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span className="line-clamp-1 italic">{sub.notes}</span>
                      </div>
                    )}
                  </div>

                  {/* Seat Progress Bar */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-500">سیت‌های تخصیص‌یافته</span>
                      <span className="font-bold text-slate-800">
                        {assignedCount} / {sub.total_seats} ({percent}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${percent}%` }}
                        className={`h-full transition-all duration-300 ${
                          percent === 100 ? 'bg-emerald-500' : 'bg-indigo-600'
                        }`}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onLoadLayout(sub)}
                      title="بارگذاری در ویرایشگر نقشه"
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-semibold transition"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>بارگذاری چیدمان</span>
                    </button>

                    <button
                      onClick={() => handleOpenDetail(sub)}
                      title="مشاهده جزئیات صندلی‌ها"
                      className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-xl transition"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleDownloadPng(sub)}
                      title="دانلود تصویر PNG"
                      className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition"
                    >
                      <ImageIcon className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDownloadCsv(sub)}
                      title="دانلود فایل اکسل / CSV"
                      className="p-1.5 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition"
                    >
                      <Download className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDelete(sub.id)}
                      title="حذف از دیتابیس"
                      disabled={deletingId === sub.id}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Submission Detail Modal */}
      {selectedSubDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
            
            {/* Detail Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="bg-indigo-100 text-indigo-800 text-xs font-mono font-bold px-2 py-0.5 rounded">
                    ثبت #{selectedSubDetail.id}
                  </span>
                  <h3 className="font-bold text-slate-900 text-base">
                    {selectedSubDetail.title}
                  </h3>
                </div>
                <p className="text-xs text-slate-500">
                  تکمیل شده توسط: <strong className="text-slate-800">{selectedSubDetail.filler_name}</strong> • {formatPersianDate(selectedSubDetail.created_at)}
                </p>
              </div>
              <button
                onClick={() => setSelectedSubDetail(null)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Detail Content */}
            <div className="p-5 overflow-y-auto space-y-4">
              {selectedSubDetail.notes && (
                <div className="p-3 bg-amber-50/70 border border-amber-200 text-amber-900 rounded-xl text-xs">
                  <strong>یادداشت: </strong>
                  {selectedSubDetail.notes}
                </div>
              )}

              <div>
                <h4 className="text-xs font-bold text-slate-700 mb-2">
                  تفکیک جایگاه صندلی‌ها در این چیدمان:
                </h4>

                {detailLoading ? (
                  <div className="text-center py-8 text-slate-400 text-xs">
                    در حال دریافت تخصیص‌ها...
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {selectedSubDetail.assignments &&
                      Object.entries(selectedSubDetail.assignments).map(([seat, person]) => (
                        <div
                          key={seat}
                          className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-between"
                        >
                          <span className="font-mono text-xs font-bold text-indigo-700">{seat}</span>
                          <span className="text-xs font-semibold text-slate-900 truncate mt-1">
                            {person || <span className="text-slate-400 font-normal">خالی</span>}
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between">
              <button
                onClick={() => {
                  onLoadLayout(selectedSubDetail);
                  setSelectedSubDetail(null);
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
              >
                <Upload className="w-4 h-4" />
                <span>بارگذاری در ویرایشگر فعال</span>
              </button>

              <button
                onClick={() => setSelectedSubDetail(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-medium transition"
              >
                بستن
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
