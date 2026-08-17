import React, { useState, useEffect } from 'react';
import { BarChart3, Database, Users, LayoutGrid, CheckCircle2, TrendingUp, Clock, RefreshCw, Lock } from 'lucide-react';
import { GlobalStats } from '../types';
import { formatPersianDate } from '../utils/exportHelpers';

interface AnalyticsViewProps {
  adminToken: string | null;
  onRequireLogin: () => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ adminToken, onRequireLogin }) => {
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(false);

  const fetchStats = async () => {
    if (!adminToken) {
      setAuthError(true);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setAuthError(false);
      const res = await fetch('/api/stats', {
        headers: { 'Authorization': `Bearer ${adminToken}` },
      });
      if (res.status === 401) {
        setAuthError(true);
        return;
      }
      const data = await res.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [adminToken]);

  if (!adminToken || authError) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center max-w-lg mx-auto shadow-xs">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-2">
          دسترسی به آمار و گزارشات مختص ادمین است
        </h3>
        <p className="text-xs text-slate-500 mb-6 leading-relaxed">
          برای مشاهده آمار جامع، محبوب‌ترین سیت‌ها و چیدمان‌های سایر کاربران، لطفاً با حساب ادمین وارد شوید.
        </p>
        <button
          onClick={onRequireLogin}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white rounded-xl text-xs font-semibold shadow-xs transition"
        >
          <Lock className="w-4 h-4" />
          <span>ورود ادمین</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-6 shadow-xs flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-900">
              آمار و گزارش‌های دیتابیس (پنل ادمین)
            </h2>
          </div>
          <p className="text-xs text-slate-500">
            خلاصه آماری از چیدمان‌های ثبت‌شده و رفتار کاربران در پایگاه داده SQLite.
          </p>
        </div>

        <button
          onClick={fetchStats}
          className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
          title="به‌روزرسانی آمار"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-medium text-slate-600">کل چیدمان‌های ثبت‌شده</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {stats?.totalSubmissions ?? 0}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">تعداد فرم‌های ذخیره‌شده در دیتابیس</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-medium text-slate-600">کل تخصیص‌های صندلی</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {stats?.totalSeatAssignments ?? 0}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">مجموع سیت‌های پرشده در فرم‌ها</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-medium text-slate-600">تکمیل‌کنندگان متمایز</span>
            <div className="w-9 h-9 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {stats?.uniqueFillers ?? 0}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">کاربران ثبت‌کننده در دیتابیس</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-medium text-slate-600">میانگین تخصیص هر فرم</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {stats && stats.totalSubmissions > 0
              ? Math.round((stats.totalSeatAssignments / stats.totalSubmissions) * 10) / 10
              : 0}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">سیت بر هر فرم ثبت‌شده</p>
        </div>

      </div>

      {/* Two columns: Most assigned seats & Recent Submissions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Popular seats */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <h3 className="font-bold text-slate-900 text-sm mb-4 flex items-center gap-2">
            <LayoutGrid className="w-4 h-4 text-indigo-600" />
            <span>محبوب‌ترین و پرتکرارترین سیت‌ها</span>
          </h3>

          {!stats?.mostPopularSeats || stats.mostPopularSeats.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">
              هنوز داده‌ای برای این بخش ثبت نشده است.
            </p>
          ) : (
            <div className="space-y-2.5">
              {stats.mostPopularSeats.map((item, idx) => (
                <div
                  key={item.seat_code}
                  className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-md bg-indigo-100 text-indigo-700 text-xs font-bold font-mono flex items-center justify-center">
                      #{idx + 1}
                    </span>
                    <span className="font-bold font-mono text-sm text-slate-900">
                      سیت {item.seat_code}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600">
                    <strong className="font-mono text-indigo-700 font-bold">{item.count}</strong> مرتبه تخصیص
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <h3 className="font-bold text-slate-900 text-sm mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-600" />
            <span>آخرین چیدمان‌های ثبت‌شده</span>
          </h3>

          {!stats?.recentSubmissions || stats.recentSubmissions.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">
              هنوز داده‌ای ثبت نشده است.
            </p>
          ) : (
            <div className="space-y-2.5">
              {stats.recentSubmissions.map((sub) => (
                <div
                  key={sub.id}
                  className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between"
                >
                  <div>
                    <div className="font-bold text-xs text-slate-900 truncate">
                      {sub.title}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      توسط: {sub.filler_name} • {formatPersianDate(sub.created_at)}
                    </div>
                  </div>

                  <span className="bg-indigo-50 text-indigo-700 text-xs font-mono font-bold px-2 py-1 rounded-md shrink-0">
                    {sub.total_assigned} سیت
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
