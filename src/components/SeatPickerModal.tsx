import React, { useState, useMemo } from 'react';
import { Search, UserMinus, X, Check, UserCheck, AlertCircle, Plus } from 'lucide-react';
import { norm } from '../utils/exportHelpers';

interface SeatPickerModalProps {
  seatCode: string | null;
  currentPerson: string | undefined;
  assignments: Record<string, string>;
  availablePeople: string[];
  onAssign: (seatCode: string, personName: string) => void;
  onClearSeat: (seatCode: string) => void;
  onClose: () => void;
}

export const SeatPickerModal: React.FC<SeatPickerModalProps> = ({
  seatCode,
  currentPerson,
  assignments,
  availablePeople,
  onAssign,
  onClearSeat,
  onClose,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Map of which person is on which seat
  const personToSeatMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const [seat, person] of Object.entries(assignments)) {
      if (person) {
        map[norm(person)] = seat;
      }
    }
    return map;
  }, [assignments]);

  const filteredPeople = useMemo(() => {
    const term = norm(searchTerm).toLowerCase();
    if (!term) return availablePeople;
    return availablePeople.filter(p => norm(p).toLowerCase().includes(term));
  }, [availablePeople, searchTerm]);

  if (!seatCode) return null;

  const handleSelectPerson = (name: string) => {
    onAssign(seatCode, name);
    onClose();
  };

  const handleCustomAssign = () => {
    if (searchTerm.trim()) {
      onAssign(seatCode, searchTerm.trim());
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-mono font-bold text-lg">
              {seatCode}
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                تخصیص فرد به سیت <span className="font-mono text-indigo-600">{seatCode}</span>
              </h3>
              <p className="text-xs text-slate-500">
                {currentPerson ? (
                  <span>
                    فرد فعلی: <strong className="text-slate-800">{currentPerson}</strong>
                  </span>
                ) : (
                  'این صندلی در حال حاضر خالی است'
                )}
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

        {/* Search Bar */}
        <div className="p-4 border-b border-slate-100">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="جستجوی نام یا تایپ نام جدید..."
              className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
              autoFocus
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
              >
                پاک‌سازی
              </button>
            )}
          </div>

          {/* Quick custom assign if not in list */}
          {searchTerm.trim() && !filteredPeople.some(p => norm(p).toLowerCase() === norm(searchTerm).toLowerCase()) && (
            <button
              onClick={handleCustomAssign}
              className="mt-2.5 w-full flex items-center justify-between px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-xl text-xs font-medium transition"
            >
              <div className="flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5" />
                <span>افزودن و تخصیص مستقیم: «{searchTerm.trim()}»</span>
              </div>
              <span className="bg-indigo-600 text-white px-2 py-0.5 rounded-md font-bold">انتخاب</span>
            </button>
          )}
        </div>

        {/* People List */}
        <div className="p-4 overflow-y-auto flex-1 space-y-1.5">
          <div className="text-xs font-semibold text-slate-400 mb-2 px-1">
            لیست همکاران و افراد حاضر ({filteredPeople.length} نفر)
          </div>

          {filteredPeople.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              موردی با این نام پیدا نشد. می‌توانید با فشردن دکمه بالا نام جدید را اضافه کنید.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {filteredPeople.map((name) => {
                const assignedSeat = personToSeatMap[norm(name)];
                const isCurrent = currentPerson && norm(currentPerson) === norm(name);
                const isAssignedElsewhere = assignedSeat && assignedSeat !== seatCode;

                return (
                  <button
                    key={name}
                    onClick={() => handleSelectPerson(name)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-right text-xs sm:text-sm transition duration-150 ${
                      isCurrent
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                        : isAssignedElsewhere
                        ? 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100/80'
                        : 'bg-white border-slate-200 text-slate-800 hover:border-indigo-300 hover:bg-indigo-50/50'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] shrink-0 font-bold ${
                          isCurrent
                            ? 'bg-emerald-600 text-white'
                            : isAssignedElsewhere
                            ? 'bg-slate-200 text-slate-600'
                            : 'bg-indigo-100 text-indigo-700'
                        }`}
                      >
                        {name.charAt(0)}
                      </div>
                      <span className="truncate">{name}</span>
                    </div>

                    <div className="shrink-0 flex items-center gap-1">
                      {isCurrent && (
                        <span className="flex items-center gap-1 text-emerald-700 text-xs font-semibold bg-emerald-100 px-1.5 py-0.5 rounded">
                          <Check className="w-3 h-3" />
                          این سیت
                        </span>
                      )}
                      {isAssignedElsewhere && (
                        <span className="text-[10px] text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded font-mono font-bold">
                          در {assignedSeat}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between gap-2">
          {currentPerson ? (
            <button
              onClick={() => {
                onClearSeat(seatCode);
                onClose();
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl text-xs font-medium transition"
            >
              <UserMinus className="w-4 h-4" />
              <span>خالی کردن این سیت</span>
            </button>
          ) : (
            <div></div>
          )}

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-medium transition"
          >
            بستن
          </button>
        </div>

      </div>
    </div>
  );
};
