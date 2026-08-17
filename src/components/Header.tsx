import React from 'react';
import { ViewTab } from '../types';
import { LayoutGrid, Database, Users, BarChart3, Save, Lock, LogOut, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  currentTab: ViewTab;
  onTabChange: (tab: ViewTab) => void;
  assignedCount: number;
  totalSeats: number;
  onOpenSaveModal: () => void;
  savedSubmissionsCount: number;
  isAdmin: boolean;
  onOpenLoginModal: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onTabChange,
  assignedCount,
  totalSeats,
  onOpenSaveModal,
  savedSubmissionsCount,
  isAdmin,
  onOpenLoginModal,
  onLogout,
}) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Brand zone */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs font-bold text-lg">
              <LayoutGrid className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 leading-tight">
                سامانه ثبت و چیدمان سیت‌ها
              </h1>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="flex items-center gap-1 text-emerald-600 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  دیتابیس متصل
                </span>
                {isAdmin && (
                  <>
                    <span>•</span>
                    <span className="text-indigo-600 font-semibold flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      پنل ادمین
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Navigation zone */}
          <nav className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => onTabChange('map')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                currentTab === 'map'
                  ? 'bg-white text-indigo-700 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              <span>نقشه و چیدمان</span>
              <span className={`px-1.5 py-0.2 text-xs rounded-full ${assignedCount === totalSeats ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'}`}>
                {assignedCount}/{totalSeats}
              </span>
            </button>

            <button
              onClick={() => onTabChange('database')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                currentTab === 'database'
                  ? 'bg-white text-indigo-700 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              {isAdmin ? <Database className="w-4 h-4" /> : <Lock className="w-3.5 h-3.5 text-slate-400" />}
              <span>دیتابیس ثبت‌ها</span>
              {isAdmin && (
                <span className="bg-indigo-100 text-indigo-700 px-1.5 py-0.2 text-xs rounded-full font-bold">
                  {savedSubmissionsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => onTabChange('people')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                currentTab === 'people'
                  ? 'bg-white text-indigo-700 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>لیست افراد</span>
            </button>

            <button
              onClick={() => onTabChange('analytics')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                currentTab === 'analytics'
                  ? 'bg-white text-indigo-700 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              {isAdmin ? <BarChart3 className="w-4 h-4" /> : <Lock className="w-3.5 h-3.5 text-slate-400" />}
              <span>آمار و تحلیل</span>
            </button>
          </nav>

          {/* Action zone */}
          <div className="flex items-center gap-2 shrink-0">
            {isAdmin ? (
              <button
                onClick={onLogout}
                title="خروج از حساب ادمین"
                className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl font-medium text-xs transition border border-rose-200/60"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">خروج ادمین</span>
              </button>
            ) : (
              <button
                onClick={onOpenLoginModal}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium text-xs transition"
              >
                <Lock className="w-3.5 h-3.5 text-slate-500" />
                <span>ورود ادمین</span>
              </button>
            )}

            <button
              onClick={onOpenSaveModal}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white rounded-xl font-medium text-xs sm:text-sm transition-all shadow-xs"
            >
              <Save className="w-4 h-4" />
              <span>ثبت فرم و چیدمان</span>
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};
