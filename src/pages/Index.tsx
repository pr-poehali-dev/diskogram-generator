import { useState, useEffect } from 'react';
import Icon from '@/components/ui/icon';

const OCTANTS = [
  { id: 1, name: 'I — Властный / Лидирующий', short: 'Властный' },
  { id: 2, name: 'II — Независимый / Доминирующий', short: 'Эгоист.' },
  { id: 3, name: 'III — Прямолинейный / Агрессивный', short: 'Агресс.' },
  { id: 4, name: 'IV — Недоверчивый / Скептический', short: 'Подозр.' },
  { id: 5, name: 'V — Покорный / Застенчивый', short: 'Покорн.' },
  { id: 6, name: 'VI — Зависимый / Послушный', short: 'Завис.' },
  { id: 7, name: 'VII — Сотрудничающий / Конвенциальный', short: 'Дружел.' },
  { id: 8, name: 'VIII — Ответственный / Великодушный', short: 'Альтр.' },
];

const API_URL = 'https://functions.poehali.dev/03a9a0ae-3479-4175-b9d4-8d6db6b943eb';

type OctantValues = [number, number, number, number, number, number, number, number];

const defaultReal: OctantValues  = [3, 2, 1, 2, 6, 7, 8, 4];
const defaultIdeal: OctantValues = [8, 4, 5, 2, 2, 3, 9, 6];

function ScoreInput({
  value,
  onChange,
  color,
}: {
  value: number;
  onChange: (v: number) => void;
  color: 'blue' | 'rose';
}) {
  const colorClass = color === 'blue'
    ? 'focus:ring-blue-400 border-blue-200 text-blue-700'
    : 'focus:ring-rose-400 border-rose-200 text-rose-700';

  return (
    <input
      type="number"
      min={0}
      max={16}
      value={value}
      onChange={e => {
        const v = Math.max(0, Math.min(16, Number(e.target.value)));
        onChange(isNaN(v) ? 0 : v);
      }}
      className={`w-14 h-9 text-center rounded-xl border-2 bg-white font-mono font-semibold text-sm outline-none focus:ring-2 focus:ring-offset-1 transition-all ${colorClass}`}
    />
  );
}

function ScoreBar({ value, color }: { value: number; color: 'blue' | 'rose' }) {
  const pct = (value / 16) * 100;
  const zone = value <= 4 ? 'Низкий' : value <= 8 ? 'Средний' : value <= 12 ? 'Высокий' : 'Патол.';
  const zoneColor = value <= 4
    ? 'text-slate-400'
    : value <= 8
    ? 'text-amber-500'
    : value <= 12
    ? 'text-orange-500'
    : 'text-red-600';

  return (
    <div className="flex items-center gap-2 flex-1">
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${color === 'blue' ? 'bg-blue-400' : 'bg-rose-400'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`text-xs font-medium w-12 ${zoneColor}`}>{zone}</span>
    </div>
  );
}

export default function Index() {
  const [real, setReal] = useState<OctantValues>([...defaultReal]);
  const [ideal, setIdeal] = useState<OctantValues>([...defaultIdeal]);
  const [name, setName] = useState('');
  const [client, setClient] = useState('');
  const [date, setDate] = useState(new Date().toLocaleDateString('ru-RU'));
  const [title, setTitle] = useState('Дискограмма ДМО (Т. Лири)');
  const [format, setFormat] = useState<'png' | 'pdf'>('png');
  const [visibleChars, setVisibleChars] = useState(0);
  const authorName = 'Минковой Марии';

  useEffect(() => {
    setVisibleChars(0);
    let i = 0;
    const timer = setInterval(() => {
      i++;
      setVisibleChars(i);
      if (i >= authorName.length) clearInterval(timer);
    }, 70);
    return () => clearInterval(timer);
  }, []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewMime, setPreviewMime] = useState('');

  const updateReal  = (i: number, v: number) => setReal(prev  => { const n = [...prev]  as OctantValues; n[i] = v; return n; });
  const updateIdeal = (i: number, v: number) => setIdeal(prev => { const n = [...prev] as OctantValues; n[i] = v; return n; });

  const generate = async () => {
    setLoading(true);
    setError('');
    setPreviewUrl('');
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ real, ideal, name, client, date, title, format }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Ошибка сервера');
      const blob = atob(json.data);
      const bytes = new Uint8Array(blob.length);
      for (let i = 0; i < blob.length; i++) bytes[i] = blob.charCodeAt(i);
      const blobObj = new Blob([bytes], { type: json.mime });
      setPreviewUrl(URL.createObjectURL(blobObj));
      setPreviewMime(json.mime);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  };

  const download = () => {
    if (!previewUrl) return;
    const a = document.createElement('a');
    a.href = previewUrl;
    a.download = `diskogramma_${name || 'leary'}.${format}`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 font-sans">

      {/* Header */}
      <header className="border-b border-white/60 bg-white/70 backdrop-blur-md sticky top-0 z-20 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Анимированный логотип */}
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md animate-glow-pulse">
              <Icon name="CircleDot" size={18} className="text-white animate-logo-spin" />
            </div>
            <div>
              <h1 className="font-bold text-slate-800 text-lg leading-tight">ДМО — Дискограмма Лири</h1>
              <p className="text-xs text-slate-400 leading-none">Диагностика межличностных отношений</p>
            </div>
          </div>

          {/* Имя с переливающейся анимацией */}
          <div className="animate-border-glow border-2 rounded-2xl px-4 py-1.5" style={{ background: 'linear-gradient(135deg, #f0f0ff 0%, #f5f0ff 100%)' }}>
            <span
              className="relative font-bold text-lg tracking-wide animate-glow-pulse"
              style={{
                background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #a855f7, #ec4899, #8b5cf6, #6366f1)',
                backgroundSize: '200% auto',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                animation: 'shimmer 2.4s linear infinite, glow-pulse 2s ease-in-out infinite',
              }}
            >
              {authorName.slice(0, visibleChars)}
              {visibleChars < authorName.length && (
                <span className="inline-block w-0.5 h-5 bg-violet-500 ml-0.5 align-middle animate-pulse" style={{ WebkitTextFillColor: 'initial' }} />
              )}
            </span>
          </div>

          <span className="text-xs bg-blue-100 text-blue-700 font-semibold px-3 py-1 rounded-full">8 октантов</span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-1 xl:grid-cols-[1fr_440px] gap-8">

        {/* LEFT — форма */}
        <div className="space-y-6 animate-fade-in">

          {/* Данные испытуемого */}
          <div className="bg-white/80 backdrop-blur rounded-2xl shadow-sm border border-white p-6">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Icon name="User" size={14} />
              Данные испытуемого
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: 'ФИО / Имя', placeholder: 'Анастасия, 34 г.', value: name, setter: setName },
                { label: 'Исследователь', placeholder: 'Иванова М.И.', value: client, setter: setClient },
                { label: 'Дата', placeholder: '27.05.2026', value: date, setter: setDate },
                { label: 'Название методики', placeholder: 'Дискограмма ДМО (Т. Лири)', value: title, setter: setTitle },
              ].map(({ label, placeholder, value, setter }) => (
                <div key={label}>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">{label}</label>
                  <input
                    value={value}
                    onChange={e => setter(e.target.value)}
                    placeholder={placeholder}
                    className="w-full h-10 px-3 rounded-xl border-2 border-slate-100 bg-white text-sm text-slate-700 placeholder-slate-300 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Баллы по октантам */}
          <div className="bg-white/80 backdrop-blur rounded-2xl shadow-sm border border-white p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <Icon name="BarChart3" size={14} />
                Баллы по октантам (0–16)
              </h2>
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-blue-400 inline-block" />
                  <span className="text-slate-500">Я-реальное</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-rose-400 inline-block" />
                  <span className="text-slate-500">Я-идеальное</span>
                </span>
              </div>
            </div>

            <div className="space-y-1">
              {OCTANTS.map((oct, i) => (
                <div
                  key={oct.id}
                  className="grid grid-cols-[160px_1fr] gap-4 items-center py-2 px-3 rounded-xl hover:bg-slate-50/80 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 text-xs font-bold flex items-center justify-center shrink-0">
                      {oct.id}
                    </span>
                    <span className="text-sm text-slate-600 font-medium">{oct.short}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ScoreInput value={real[i]} onChange={v => updateReal(i, v)} color="blue" />
                    <ScoreBar value={real[i]} color="blue" />
                    <ScoreInput value={ideal[i]} onChange={v => updateIdeal(i, v)} color="rose" />
                    <ScoreBar value={ideal[i]} color="rose" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Формат и кнопка */}
          <div className="bg-white/80 backdrop-blur rounded-2xl shadow-sm border border-white p-5 flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-600">Формат:</span>
              {(['png', 'pdf'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${
                    format === f
                      ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                      : 'border-slate-100 text-slate-400 hover:border-slate-200'
                  }`}
                >
                  {f.toUpperCase()}
                </button>
              ))}
            </div>

            <button
              onClick={generate}
              disabled={loading}
              className="ml-auto flex items-center gap-2.5 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold text-sm shadow-lg shadow-blue-200 hover:shadow-blue-300 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Icon name="Loader" size={16} className="animate-spin" />
                  Строю график…
                </>
              ) : (
                <>
                  <Icon name="Zap" size={16} />
                  Построить дискограмму
                </>
              )}
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm animate-fade-in">
              <Icon name="AlertCircle" size={16} />
              {error}
            </div>
          )}
        </div>

        {/* RIGHT — превью */}
        <div className="animate-fade-in">
          <div className="sticky top-24 space-y-4">
            <div className="bg-white/80 backdrop-blur rounded-2xl shadow-sm border border-white overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-600 flex items-center gap-2">
                  <Icon name="Eye" size={14} />
                  Предпросмотр
                </h2>
                {previewUrl && (
                  <button
                    onClick={download}
                    className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <Icon name="Download" size={12} />
                    Скачать {format.toUpperCase()}
                  </button>
                )}
              </div>

              <div className="p-4 min-h-[320px] flex items-center justify-center">
                {!previewUrl && !loading && (
                  <div className="text-center space-y-3">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-100 to-blue-100 flex items-center justify-center mx-auto">
                      <Icon name="CircleDot" size={28} className="text-blue-300" />
                    </div>
                    <p className="text-sm text-slate-400 max-w-[200px]">
                      Введите баллы и нажмите «Построить»
                    </p>
                  </div>
                )}
                {loading && (
                  <div className="text-center space-y-3">
                    <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto">
                      <Icon name="Loader" size={28} className="text-blue-400 animate-spin" />
                    </div>
                    <p className="text-sm text-slate-400">Строю дискограмму…</p>
                  </div>
                )}
                {previewUrl && previewMime === 'image/png' && (
                  <img
                    src={previewUrl}
                    alt="Дискограмма"
                    className="w-full rounded-xl shadow-sm animate-scale-in"
                  />
                )}
                {previewUrl && previewMime === 'application/pdf' && (
                  <div className="text-center space-y-4 py-6">
                    <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto">
                      <Icon name="FileText" size={28} className="text-red-400" />
                    </div>
                    <p className="text-sm text-slate-500">PDF готов к скачиванию</p>
                    <button
                      onClick={download}
                      className="flex items-center gap-2 mx-auto px-5 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors shadow"
                    >
                      <Icon name="Download" size={14} />
                      Скачать PDF
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Шкала интерпретации */}
            <div className="bg-white/80 backdrop-blur rounded-2xl shadow-sm border border-white p-5">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Интерпретация уровней
              </h3>
              <div className="space-y-2">
                {[
                  { range: '0–4', label: 'Низкий', color: 'bg-slate-200', text: 'text-slate-600' },
                  { range: '5–8', label: 'Умеренный', color: 'bg-amber-300', text: 'text-amber-700' },
                  { range: '9–12', label: 'Высокий', color: 'bg-orange-400', text: 'text-orange-700' },
                  { range: '13–16', label: 'Патологический', color: 'bg-red-500', text: 'text-red-700' },
                ].map(z => (
                  <div key={z.range} className="flex items-center gap-3">
                    <span className={`w-3 h-3 rounded-full ${z.color} shrink-0`} />
                    <span className="font-mono text-xs text-slate-400 w-10">{z.range}</span>
                    <span className={`text-xs font-semibold ${z.text}`}>{z.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}