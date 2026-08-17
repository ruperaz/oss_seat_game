import React, { useState, useEffect } from 'react';
import { Users, Plus, Trash2, Search, RefreshCw, Upload, Check, AlertCircle, FileSpreadsheet, Lock } from 'lucide-react';
import { Person } from '../types';
import { parseCSV, normalizeNameList, norm } from '../utils/exportHelpers';

interface PeopleManagerProps {
  onRosterUpdated: (names: string[]) => void;
  adminToken: string | null;
  onRequireLogin: () => void;
}

export const PeopleManager: React.FC<PeopleManagerProps> = ({ onRosterUpdated, adminToken, onRequireLogin }) => {
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [newName, setNewName] = useState('');
  const [bulkText, setBulkText] = useState('');
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchPeople = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/people');
      const data = await res.json();
      if (data.success) {
        setPeople(data.data || []);
        onRosterUpdated(data.data.map((p: Person) => p.name));
      }
    } catch (err) {
      console.error('Error fetching people:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPeople();
  }, []);

  const handleAddSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminToken) {
      onRequireLogin();
      return;
    }
    if (!newName.trim()) return;

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/people', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          names: [newName.trim()],
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPeople(data.data);
        onRosterUpdated(data.data.map((p: Person) => p.name));
        setNewName('');
        setMessage({ text: 'عضو جدید با موفقیت به دیتابیس افزوده شد.', type: 'success' });
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ text: data.error || 'خطا در افزودن فرد', type: 'error' });
      }
    } catch (err) {
      setMessage({ text: 'خطا در افزودن فرد', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePerson = async (id: number) => {
    if (!adminToken) {
      onRequireLogin();
      return;
    }
    try {
      const res = await fetch(`/api/people/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${adminToken}` },
      });
      const data = await res.json();
      if (data.success) {
        const updated = people.filter(p => p.id !== id);
        setPeople(updated);
        onRosterUpdated(updated.map(p => p.name));
      }
    } catch (err) {
      console.error('Error deleting person:', err);
    }
  };

  const handleBulkSubmit = async () => {
    if (!adminToken) {
      onRequireLogin();
      return;
    }
    if (!bulkText.trim()) return;
    const names = bulkText
      .split(/[\n,،]+/)
      .map(norm)
      .filter(Boolean);

    if (!names.length) return;

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/people', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ names }),
      });
      const data = await res.json();
      if (data.success) {
        setPeople(data.data);
        onRosterUpdated(data.data.map((p: Person) => p.name));
        setBulkText('');
        setShowBulkModal(false);
        setMessage({ text: `${data.addedCount} نام جدید به دیتابیس افزوده شد.`, type: 'success' });
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (err) {
      setMessage({ text: 'خطا در افزودن دسته‌جمعی', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetToDefault = async () => {
    if (!adminToken) {
      onRequireLogin();
      return;
    }
    if (!window.confirm('آیا مایلید لیست افراد به ۳۳ نفر پیش‌فرض اولیه بازگردانده شود؟')) {
      return;
    }
    try {
      setLoading(true);
      const res = await fetch('/api/people/reset', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${adminToken}` },
      });
      const data = await res.json();
      if (data.success) {
        setPeople(data.data);
        onRosterUpdated(data.data.map((p: Person) => p.name));
        setMessage({ text: 'لیست پیش‌فرض اولیه با موفقیت بازنشانی شد.', type: 'success' });
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (err) {
      console.error('Error resetting people:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!adminToken) {
      onRequireLogin();
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const rows = parseCSV(text.replace(/^\uFEFF/, ''));
      if (!rows.length) return alert('فایل انتخابی خالی است.');

      const headers = rows[0].map(norm);
      let idx = headers.indexOf('نام');
      if (idx < 0) idx = headers.indexOf('نام و نام خانوادگی');
      if (idx < 0) idx = 0; // fallback to column 0

      let importedNames = rows.slice(1).map(r => norm(r[idx])).filter(Boolean);
      importedNames = normalizeNameList(importedNames);

      const res = await fetch('/api/people', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ names: importedNames }),
      });
      const data = await res.json();
      if (data.success) {
        setPeople(data.data);
        onRosterUpdated(data.data.map((p: Person) => p.name));
        setMessage({ text: `${importedNames.length} نفر از فایل CSV با موفقیت وارد شدند.`, type: 'success' });
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (err) {
      alert('خطا در پردازش فایل CSV');
    }
    e.target.value = '';
  };

  const filteredPeople = people.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      
      {/* Top Banner and Actions */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-900">
              مدیریت اسامی و لیست اعضا (دیتابیس)
            </h2>
          </div>
          <p className="text-xs text-slate-500">
            اسامی افراد موجود برای تخصیص بر روی صندلی‌ها. مدیریت و تغییرات در این بخش مختص ادمین است.
          </p>
        </div>

        {adminToken ? (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowBulkModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-semibold transition"
            >
              <Plus className="w-4 h-4" />
              <span>افزودن دسته‌جمعی</span>
            </button>

            <label className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-semibold transition cursor-pointer">
              <FileSpreadsheet className="w-4 h-4" />
              <span>ورود از CSV</span>
              <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
            </label>

            <button
              onClick={handleResetToDefault}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>بازنشانی پیش‌فرض</span>
            </button>
          </div>
        ) : (
          <button
            onClick={onRequireLogin}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl text-xs font-semibold transition"
          >
            <Lock className="w-4 h-4" />
            <span>ورود ادمین برای ویرایش لیست</span>
          </button>
        )}
      </div>

      {message && (
        <div
          className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          {message.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Add Single Person Form (Admin only) */}
      {adminToken && (
        <form
          onSubmit={handleAddSingle}
          className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-center gap-3"
        >
          <div className="w-full sm:flex-1">
            <input
              type="text"
              required
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="نام و نام خانوادگی عضو جدید..."
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting || !newName.trim()}
            className="w-full sm:w-auto px-5 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white rounded-xl text-xs font-semibold transition disabled:opacity-50 shrink-0"
          >
            افزودن فرد
          </button>
        </form>
      )}

      {/* Search and Count */}
      <div className="flex items-center justify-between">
        <div className="relative w-full max-w-xs">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="جستجوی همکار..."
            className="w-full pl-3.5 pr-10 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          />
        </div>
        <div className="text-xs font-medium text-slate-500">
          تعداد کل: <strong className="text-slate-800">{people.length}</strong> نفر
        </div>
      </div>

      {/* People Grid */}
      {loading ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200/80">
          <RefreshCw className="w-6 h-6 text-indigo-600 animate-spin mx-auto mb-2" />
          <p className="text-xs text-slate-500">در حال بارگذاری لیست افراد...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
          {filteredPeople.map((person, idx) => (
            <div
              key={person.id || idx}
              className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs hover:border-indigo-300 transition flex items-center justify-between group"
            >
              <div className="flex items-center gap-2.5 truncate">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0">
                  {person.name.charAt(0)}
                </div>
                <div className="font-bold text-xs text-slate-900 truncate">
                  {person.name}
                </div>
              </div>

              {adminToken && (
                <button
                  onClick={() => handleDeletePerson(person.id)}
                  title="حذف از لیست"
                  className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Bulk Add Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm">
                افزودن دسته‌جمعی اسامی همکاران
              </h3>
              <button
                onClick={() => setShowBulkModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-3">
              <p className="text-xs text-slate-500">
                نام‌ها را با رفتن به خط بعدی (اینتر) یا علامت کاما (،) از یکدیگر جدا کنید:
              </p>
              <textarea
                rows={8}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder="علی رضایی&#10;مریم احمدی&#10;محمد حسینی"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white font-mono leading-relaxed resize-none"
              />
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50/60 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowBulkModal(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-medium transition"
              >
                انصراف
              </button>
              <button
                onClick={handleBulkSubmit}
                disabled={isSubmitting || !bulkText.trim()}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50"
              >
                {isSubmitting ? 'در حال افزودن...' : 'افزودن به دیتابیس'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
