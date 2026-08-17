import React, { useState } from 'react';
import { seatPercentages, managerName, planImageDataUrl } from '../constants/seatingData';
import { UserCheck, Sparkles, ZoomIn, ZoomOut, RotateCcw, Building2, User } from 'lucide-react';

interface SeatMapProps {
  assignments: Record<string, string>;
  activeSeat: string | null;
  onSelectSeat: (seatCode: string) => void;
  onQuickClearSeat: (seatCode: string) => void;
}

export const SeatMap: React.FC<SeatMapProps> = ({
  assignments,
  activeSeat,
  onSelectSeat,
  onQuickClearSeat,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  const handleZoom = (delta: number) => {
    setZoomLevel(prev => Math.min(150, Math.max(80, prev + delta)));
  };

  const handleResetZoom = () => {
    setZoomLevel(100);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Zoom and Map toolbar */}
      <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-600">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          <span className="font-medium text-slate-800">نقشه معماری و استقرار سیت‌ها</span>
          <span className="text-xs text-slate-400">| برای تغییر نام یا تخصیص، روی هر صندلی کلیک کنید</span>
        </div>

        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
          <button
            onClick={() => handleZoom(-10)}
            title="کوچک‌نمایی"
            className="p-1.5 hover:bg-white hover:text-slate-900 rounded-md text-slate-600 transition"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="px-2 text-xs font-mono font-medium text-slate-700 min-w-11 text-center">
            {zoomLevel}%
          </span>
          <button
            onClick={() => handleZoom(10)}
            title="بزرگ‌نمایی"
            className="p-1.5 hover:bg-white hover:text-slate-900 rounded-md text-slate-600 transition"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          {zoomLevel !== 100 && (
            <button
              onClick={handleResetZoom}
              title="بازنشانی زوم"
              className="p-1.5 hover:bg-white hover:text-slate-900 rounded-md text-slate-600 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Map Canvas Container */}
      <div className="bg-slate-900/5 rounded-2xl border border-slate-200/80 p-2 sm:p-4 overflow-auto max-h-[78vh] flex items-center justify-center">
        <div
          style={{ width: `${zoomLevel}%`, minWidth: '860px', transition: 'width 0.2s ease' }}
          className="relative bg-white rounded-xl shadow-md overflow-hidden select-none"
          dir="ltr"
        >
          {/* Base Plan Blueprint */}
          <img
            src={planImageDataUrl}
            alt="Floor Plan"
            className="w-full h-auto block pointer-events-none"
            loading="eager"
          />

          {/* Interactive Seat Elements */}
          {Object.entries(seatPercentages).map(([seatCode, [leftPct, topPct]]) => {
            const assignedPerson = assignments[seatCode];
            const isAssigned = Boolean(assignedPerson && assignedPerson.trim());
            const isActive = activeSeat === seatCode;

            return (
              <button
                key={seatCode}
                onClick={() => onSelectSeat(seatCode)}
                style={{
                  left: `${leftPct}%`,
                  top: `${topPct}%`,
                  width: '7.4%',
                  minHeight: '5.2%',
                }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-lg border text-center transition-all duration-150 group cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500 ${
                  isActive
                    ? 'ring-3 ring-indigo-500 scale-105 z-20 shadow-lg'
                    : 'hover:scale-103 hover:z-10 hover:shadow-md'
                } ${
                  isAssigned
                    ? 'bg-emerald-50/95 border-emerald-400 text-emerald-950 shadow-xs'
                    : 'bg-amber-50/95 border-amber-300 text-amber-900 shadow-xs'
                }`}
                dir="rtl"
              >
                <div className="p-1 flex flex-col items-center justify-center w-full h-full">
                  {/* Seat Code Header */}
                  <div className="flex items-center justify-between w-full px-0.5 mb-0.5">
                    <span
                      className={`text-[9px] sm:text-[10px] font-bold font-mono px-1 rounded ${
                        isAssigned
                          ? 'bg-emerald-200/70 text-emerald-800'
                          : 'bg-amber-200/70 text-amber-800'
                      }`}
                    >
                      {seatCode}
                    </span>
                    {isAssigned ? (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                    )}
                  </div>

                  {/* Assigned Person Name */}
                  <div
                    className="w-full text-center font-bold text-[10px] sm:text-[11px] lg:text-[12px] truncate px-0.5 leading-tight"
                    title={assignedPerson || 'خالی (کلیک برای تخصیص)'}
                  >
                    {isAssigned ? (
                      assignedPerson
                    ) : (
                      <span className="text-amber-700/70 font-normal italic text-[10px]">
                        خالی
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}

          {/* Manager Office Highlight Box */}
          <div
            className="absolute -translate-x-1/2 -translate-y-1/2 bg-indigo-700/95 border-2 border-indigo-900 text-white rounded-xl shadow-lg p-2 text-center"
            style={{
              left: '52.2%',
              top: '82.7%',
              width: '15.5%',
              minHeight: '8%',
            }}
            dir="rtl"
          >
            <div className="flex items-center justify-center gap-1 text-indigo-200 text-[10px] sm:text-[11px] font-medium mb-0.5">
              <Building2 className="w-3.5 h-3.5" />
              <span>اتاق مدیریت</span>
            </div>
            <div className="font-bold text-[12px] sm:text-[14px] truncate text-white">
              {managerName}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
