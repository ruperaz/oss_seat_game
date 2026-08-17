import React, { useState, useEffect, useRef } from 'react';
import { 
  Header 
} from './components/Header';
import { 
  SeatMap 
} from './components/SeatMap';
import { 
  SeatPickerModal 
} from './components/SeatPickerModal';
import { 
  SaveSubmissionModal 
} from './components/SaveSubmissionModal';
import { 
  DatabaseView 
} from './components/DatabaseView';
import { 
  PeopleManager 
} from './components/PeopleManager';
import { 
  AnalyticsView 
} from './components/AnalyticsView';
import { 
  AdminLoginModal 
} from './components/AdminLoginModal';
import { 
  seatCoordsPx, 
  managerName, 
  initialNames 
} from './constants/seatingData';
import { 
  ViewTab, 
  Submission 
} from './types';
import { 
  norm, 
  normalizeNameList, 
  downloadImage, 
  downloadCSV, 
  parseCSV 
} from './utils/exportHelpers';
import { 
  Shuffle, 
  Image as ImageIcon, 
  Download, 
  Trash2, 
  RotateCcw, 
  Save, 
  CheckCircle2, 
  User, 
  Sparkles, 
  AlertCircle,
  FileSpreadsheet
} from 'lucide-react';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<ViewTab>('map');
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [people, setPeople] = useState<string[]>([...initialNames]);
  const [activeSeat, setActiveSeat] = useState<string | null>(null);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);
  const [adminToken, setAdminToken] = useState<string | null>(() => {
    return localStorage.getItem('oss_seat_admin_token');
  });
  const [editingSubmission, setEditingSubmission] = useState<Submission | null>(null);
  const [preparedBy, setPreparedBy] = useState<string>('');
  const [savedCount, setSavedCount] = useState<number>(0);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalSeats = Object.keys(seatCoordsPx).length; // 32
  const assignedCount = Object.values(assignments).filter(Boolean).length;
  const isFull = assignedCount === totalSeats;
  const isAdmin = Boolean(adminToken);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Check admin session on load
  useEffect(() => {
    if (adminToken) {
      fetch('/api/auth/verify', {
        headers: { Authorization: `Bearer ${adminToken}` },
      })
        .then(res => res.json())
        .then(data => {
          if (!data.success || !data.isAdmin) {
            setAdminToken(null);
            localStorage.removeItem('oss_seat_admin_token');
          }
        })
        .catch(() => {
          // keep token or handle network error
        });
    }
  }, [adminToken]);

  // Load initial people roster and submissions count (if admin) from SQLite Database
  const fetchInitialData = async () => {
    try {
      const peopleRes = await fetch('/api/people');
      const peopleData = await peopleRes.json();
      if (peopleData.success && peopleData.data?.length) {
        setPeople(peopleData.data.map((p: { name: string }) => p.name));
      }

      if (adminToken) {
        const subsRes = await fetch('/api/submissions', {
          headers: { Authorization: `Bearer ${adminToken}` },
        });
        const subsData = await subsRes.json();
        if (subsData.success && subsData.data) {
          setSavedCount(subsData.data.length);
        }
      }
    } catch (err) {
      console.error('Error loading initial data:', err);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, [adminToken]);

  const handleLoginSuccess = (token: string) => {
    setAdminToken(token);
    localStorage.setItem('oss_seat_admin_token', token);
    showToast('با موفقیت به عنوان مدیر سیستم (ادمین) وارد شدید.');
  };

  const handleLogout = () => {
    setAdminToken(null);
    localStorage.removeItem('oss_seat_admin_token');
    if (currentTab === 'database' || currentTab === 'analytics') {
      setCurrentTab('map');
    }
    showToast('از حساب ادمین خارج شدید.', 'info');
  };

  const handleTabChange = (tab: ViewTab) => {
    if ((tab === 'database' || tab === 'analytics') && !isAdmin) {
      setIsAdminLoginOpen(true);
      setCurrentTab(tab);
      return;
    }
    setCurrentTab(tab);
  };

  // Secure shuffle for random filling
  const secureShuffle = <T,>(arr: T[]): T[] => {
    const copy = [...arr];
    const buf = new Uint32Array(copy.length);
    if (window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(buf);
      for (let i = copy.length - 1; i > 0; i--) {
        const j = buf[i] % (i + 1);
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
    } else {
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
    }
    return copy;
  };

  // Randomize remaining empty seats
  const handleRandomFillRemaining = () => {
    const allSeatKeys = Object.keys(seatCoordsPx);
    const assignedNamesSet = new Set(
      Object.values(assignments)
        .map(norm)
        .filter(Boolean)
    );

    // Candidates: people list excluding manager and already assigned
    const candidateNames = people
      .map(norm)
      .filter((n) => n && n !== norm(managerName) && !assignedNamesSet.has(n));

    const emptySeatKeys = allSeatKeys.filter((s) => !assignments[s]);

    if (emptySeatKeys.length === 0) {
      showToast('تمام سیت‌ها قبلاً پر شده‌اند!', 'info');
      return;
    }

    if (candidateNames.length === 0) {
      showToast('فرد جدیدی در لیست افراد برای تخصیص باقی نمانده است.', 'error');
      return;
    }

    const shuffledCandidates = secureShuffle(candidateNames);
    const nextAssignments = { ...assignments };

    const countToFill = Math.min(emptySeatKeys.length, shuffledCandidates.length);
    for (let i = 0; i < countToFill; i++) {
      nextAssignments[emptySeatKeys[i]] = shuffledCandidates[i];
    }

    setAssignments(nextAssignments);
    showToast(`${countToFill} سیت خالی با موفقیت به صورت تصادفی تخصیص داده شد.`);
  };

  // Single seat assignment
  const handleAssignSeat = (seatCode: string, personName: string) => {
    const next = { ...assignments };
    // If person was already somewhere else, clear that seat
    for (const [s, p] of Object.entries(next)) {
      if (norm(p) === norm(personName) && s !== seatCode) {
        delete next[s];
      }
    }
    next[seatCode] = personName;
    setAssignments(next);
    showToast(`سیت ${seatCode} به «${personName}» تخصیص یافت.`);
  };

  const handleClearSeat = (seatCode: string) => {
    const next = { ...assignments };
    delete next[seatCode];
    setAssignments(next);
    showToast(`سیت ${seatCode} خالی شد.`, 'info');
  };

  const handleClearAll = () => {
    if (Object.keys(assignments).length === 0) return;
    if (window.confirm('آیا از پاک‌سازی تمام سیت‌های تخصیص‌یافته اطمینان دارید؟')) {
      setAssignments({});
      setEditingSubmission(null);
      showToast('تمام سیت‌ها پاک‌سازی شدند.', 'info');
    }
  };

  const handleResetToDefault = () => {
    if (window.confirm('آیا مایلید تمام سیت‌ها و اسامی به حالت اولیه بازنشانی شوند؟')) {
      setAssignments({});
      setPeople([...initialNames]);
      setEditingSubmission(null);
      showToast('تنظیمات به حالت پیش‌فرض بازگشت.');
    }
  };

  // Export handlers
  const handleExportPng = async () => {
    const success = await downloadImage(assignments, {
      preparedBy: preparedBy || editingSubmission?.filler_name || 'تکمیل‌کننده نامشخص',
      title: editingSubmission?.title || 'چیدمان نهایی سیت‌ها',
    });
    if (success) {
      showToast('تصویر با کیفیت بالا (PNG) با موفقیت دانلود شد.');
    } else {
      showToast('خطا در تولید تصویر', 'error');
    }
  };

  const handleExportCsv = () => {
    downloadCSV(assignments, {
      preparedBy: preparedBy || editingSubmission?.filler_name || 'تکمیل‌کننده نامشخص',
      title: editingSubmission?.title || 'چیدمان سیت‌ها',
    });
    showToast('فایل اکسل / CSV با موفقیت دانلود شد.');
  };

  // Import CSV roster
  const handleImportCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const rows = parseCSV(text.replace(/^\uFEFF/, ''));
      if (!rows.length) return alert('فایل خالی است.');

      const headers = rows[0].map(norm);
      let idx = headers.indexOf('نام');
      if (idx < 0) idx = headers.indexOf('نام و نام خانوادگی');
      if (idx < 0) idx = 0;

      let newNames = rows.slice(1).map((r) => norm(r[idx])).filter(Boolean);
      newNames = normalizeNameList(newNames);

      const participants = newNames.filter((n) => n !== managerName);
      if (participants.length > totalSeats) {
        alert(`تعداد افراد (${participants.length}) از تعداد سیت‌ها (${totalSeats}) بیشتر است.`);
      }

      setPeople(newNames);
      setAssignments({});
      showToast(`فایل CSV با موفقیت بارگذاری شد (${newNames.length} نفر).`);
    } catch (err) {
      alert('خطا در خواندن فایل CSV');
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Load layout from database (Admin feature)
  const handleLoadSubmissionFromDb = (sub: Submission) => {
    if (sub.assignments) {
      setAssignments(sub.assignments);
    }
    setEditingSubmission(sub);
    if (sub.filler_name) {
      setPreparedBy(sub.filler_name);
    }
    setCurrentTab('map');
    showToast(`چیدمان «${sub.title}» ثبت شده توسط «${sub.filler_name}» در نقشه بارگذاری شد.`);
  };

  const handleSaveSuccess = (sub: Submission) => {
    setEditingSubmission(sub);
    setSavedCount((prev) => prev + 1);
    showToast('چیدمان با موفقیت در دیتابیس ثبت شد.');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      
      {/* Global Top Navbar */}
      <Header
        currentTab={currentTab}
        onTabChange={handleTabChange}
        assignedCount={assignedCount}
        totalSeats={totalSeats}
        onOpenSaveModal={() => setIsSaveModalOpen(true)}
        savedSubmissionsCount={savedCount}
        isAdmin={isAdmin}
        onOpenLoginModal={() => setIsAdminLoginOpen(true)}
        onLogout={handleLogout}
      />

      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-5 left-5 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl shadow-xl text-xs font-semibold animate-slide-up transition-all ${
            toast.type === 'success'
              ? 'bg-slate-900 text-white border border-slate-700'
              : toast.type === 'error'
              ? 'bg-rose-600 text-white'
              : 'bg-indigo-600 text-white'
          }`}
        >
          {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-white" />}
          {toast.type === 'info' && <Sparkles className="w-4 h-4 text-amber-300" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* TAB 1: INTERACTIVE MAP & SEAT PLANNER */}
        {currentTab === 'map' && (
          <div className="space-y-4">
            
            {/* Control & Action Toolbar */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs space-y-3">
              
              {/* Top Row: Prepared by Input & Status summary */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-1 max-w-md">
                  <div className="relative w-full">
                    <User className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={preparedBy}
                      onChange={(e) => setPreparedBy(e.target.value)}
                      placeholder="نام تکمیل‌کننده فرم (مثال: رضا هاشمی)..."
                      className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition font-medium"
                    />
                  </div>
                </div>

                {/* Live Status Pill */}
                <div className="flex items-center gap-2 text-xs bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200/70">
                  <span className="text-slate-500">وضعیت سیت‌ها:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {assignedCount} / {totalSeats}
                  </span>
                  {isFull ? (
                    <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                      کامل شد
                    </span>
                  ) : (
                    <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                      {totalSeats - assignedCount} صندلی خالی
                    </span>
                  )}
                </div>
              </div>

              {/* Bottom Row: Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                
                {/* Randomize / Smart Shuffle */}
                <button
                  onClick={handleRandomFillRemaining}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white rounded-xl text-xs font-semibold transition shadow-xs"
                >
                  <Shuffle className="w-3.5 h-3.5" />
                  <span>تخصیص تصادفی خالی‌ها</span>
                </button>

                {/* Save to DB Modal Trigger */}
                <button
                  onClick={() => setIsSaveModalOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-semibold transition"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>ثبت در دیتابیس</span>
                </button>

                {/* Export PNG */}
                <button
                  onClick={handleExportPng}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-medium transition"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
                  <span>خروجی تصویر (PNG)</span>
                </button>

                {/* Export CSV */}
                <button
                  onClick={handleExportCsv}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-medium transition"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600" />
                  <span>خروجی اکسل (CSV)</span>
                </button>

                {/* Import CSV */}
                <label className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-medium transition cursor-pointer">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-amber-600" />
                  <span>ورود فایل CSV</span>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".csv"
                    onChange={handleImportCsv}
                    className="hidden"
                  />
                </label>

                {/* Clear All */}
                <button
                  onClick={handleClearAll}
                  className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium transition mr-auto"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>پاک‌سازی سیت‌ها</span>
                </button>

                {/* Reset default */}
                <button
                  onClick={handleResetToDefault}
                  title="بازگردانی به ۳۳ نفر پیش‌فرض"
                  className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>

              </div>

            </div>

            {/* Interactive Visual Canvas */}
            <SeatMap
              assignments={assignments}
              activeSeat={activeSeat}
              onSelectSeat={(seatCode) => setActiveSeat(seatCode)}
              onQuickClearSeat={handleClearSeat}
            />

          </div>
        )}

        {/* TAB 2: DATABASE VIEW (Admin Protected) */}
        {currentTab === 'database' && (
          <DatabaseView
            onLoadLayout={handleLoadSubmissionFromDb}
            onRefreshStats={fetchInitialData}
            adminToken={adminToken}
            onRequireLogin={() => setIsAdminLoginOpen(true)}
          />
        )}

        {/* TAB 3: PEOPLE ROSTER MANAGER */}
        {currentTab === 'people' && (
          <PeopleManager
            onRosterUpdated={(newNames) => setPeople(newNames)}
            adminToken={adminToken}
            onRequireLogin={() => setIsAdminLoginOpen(true)}
          />
        )}

        {/* TAB 4: ANALYTICS & STATS (Admin Protected) */}
        {currentTab === 'analytics' && (
          <AnalyticsView
            adminToken={adminToken}
            onRequireLogin={() => setIsAdminLoginOpen(true)}
          />
        )}

      </main>

      {/* Seat Picker Modal */}
      {activeSeat && (
        <SeatPickerModal
          seatCode={activeSeat}
          currentPerson={assignments[activeSeat]}
          assignments={assignments}
          availablePeople={people}
          onAssign={handleAssignSeat}
          onClearSeat={handleClearSeat}
          onClose={() => setActiveSeat(null)}
        />
      )}

      {/* Save to SQLite Modal */}
      {isSaveModalOpen && (
        <SaveSubmissionModal
          assignments={assignments}
          totalSeats={totalSeats}
          editingSubmission={editingSubmission}
          adminToken={adminToken}
          onSaveSuccess={handleSaveSuccess}
          onClose={() => setIsSaveModalOpen(false)}
        />
      )}

      {/* Admin Login Modal */}
      <AdminLoginModal
        isOpen={isAdminLoginOpen}
        onClose={() => setIsAdminLoginOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />

    </div>
  );
};

export default App;
