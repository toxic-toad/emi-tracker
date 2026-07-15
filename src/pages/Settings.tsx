import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Bell, Wallet, Database, Info, ChevronRight,
  Download, Upload, Trash2, IndianRupee, AlertTriangle,
  CheckCircle, XCircle, AlertCircle
} from 'lucide-react';
import { useLoans } from '../contexts/LoanContext';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { UserSettings } from '../types';
import { toast } from 'react-hot-toast';
import { setCurrency, formatCurrency } from '../utils/formatters';

const STORAGE_KEY = 'emi_tracker_settings';

const DEFAULT_SETTINGS: UserSettings = {
  userId: 'local',
  currency: '₹',
  dateFormat: 'DD/MM/YYYY',
  notificationSettings: {
    enabled: true,
    reminder7Days: true,
    reminder3Days: true,
    reminder1Day: true,
    reminderOnDueDate: true,
    dailyOverdueReminder: true
  },
  darkMode: true,
  monthlySalary: undefined,
  averageMonthlyTradingIncome: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

function sanitizeNumericInput(input: string): number | undefined {
  const trimmed = input.trim();
  if (trimmed === '') return undefined;
  const num = parseFloat(trimmed);
  if (!Number.isFinite(num)) return undefined;
  if (num < 0) return 0;
  return Math.round(num);
}

function Toggle({
  enabled,
  onToggle,
  disabled = false
}: {
  enabled: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); if (!disabled) onToggle(); }}
      className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${
        enabled ? 'bg-blue-500' : 'bg-slate-700'
      } ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
      role="switch"
      aria-checked={enabled}
      disabled={disabled}
    >
      <div
        className={`w-5 h-5 rounded-full bg-white transition-transform absolute top-0.5 ${
          enabled ? 'translate-x-[22px]' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}

function SettingsRow({
  icon,
  title,
  subtitle,
  onClick
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-700/30 active:bg-slate-700/50 transition-colors text-left"
    >
      <div className="w-9 h-9 rounded-xl bg-slate-700/50 flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white">{title}</p>
        <p className="text-xs text-slate-500 truncate">{subtitle}</p>
      </div>
      <ChevronRight size={16} className="text-slate-600 flex-shrink-0" />
    </button>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 mb-2 mt-2">
      {children}
    </p>
  );
}

function GroupedCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden mb-4">
      {children}
    </div>
  );
}

function Separator() {
  return <div className="h-px bg-slate-700/40 ml-[52px] mr-4" />;
}

export function Settings() {
  const { loans, emis, addLoan } = useLoans();
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);

  const [showFinancialProfile, setShowFinancialProfile] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showDataBackup, setShowDataBackup] = useState(false);

  const [tempSalary, setTempSalary] = useState('');
  const [tempTradingIncome, setTempTradingIncome] = useState('');

  const [confirmDelete, setConfirmDelete] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [notifPermission, setNotifPermission] = useState<NotificationPermission | 'unsupported'>('unsupported');

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setSettings(prev => ({
          ...prev,
          ...parsed,
          averageMonthlyTradingIncome:
            typeof parsed.averageMonthlyTradingIncome === 'number' && Number.isFinite(parsed.averageMonthlyTradingIncome)
              ? parsed.averageMonthlyTradingIncome
              : 0,
          notificationSettings: {
            ...prev.notificationSettings,
            ...(parsed.notificationSettings || {}),
            enabled: parsed.notificationSettings?.enabled ??
              Boolean(
                parsed.notificationSettings?.reminder7Days ||
                parsed.notificationSettings?.reminder3Days ||
                parsed.notificationSettings?.reminder1Day ||
                parsed.notificationSettings?.reminderOnDueDate ||
                parsed.notificationSettings?.dailyOverdueReminder
              )
          }
        }));
      }
    } catch {}
    setCurrency('₹');
    document.documentElement.classList.add('dark');
  }, []);

  useEffect(() => {
    if ('Notification' in window) {
      setNotifPermission(Notification.permission);
    } else {
      setNotifPermission('unsupported');
    }
  }, []);

  const persistSettings = useCallback((newSettings: UserSettings) => {
    setSettings(newSettings);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
  }, []);

  const openFinancialProfile = useCallback(() => {
    setTempSalary(settings.monthlySalary != null ? String(settings.monthlySalary) : '');
    setTempTradingIncome(
      settings.averageMonthlyTradingIncome != null && settings.averageMonthlyTradingIncome > 0
        ? String(settings.averageMonthlyTradingIncome)
        : ''
    );
    setShowFinancialProfile(true);
  }, [settings.monthlySalary, settings.averageMonthlyTradingIncome]);

  const handleSaveFinancialProfile = useCallback(() => {
    const salary = sanitizeNumericInput(tempSalary);
    const trading = sanitizeNumericInput(tempTradingIncome);

    persistSettings({
      ...settings,
      monthlySalary: salary,
      averageMonthlyTradingIncome: trading ?? 0,
      updatedAt: new Date().toISOString()
    });

    toast.success('Financial profile saved');
    setShowFinancialProfile(false);
  }, [tempSalary, tempTradingIncome, settings, persistSettings]);

  const displaySalary = sanitizeNumericInput(tempSalary) ?? 0;
  const displayTrading = sanitizeNumericInput(tempTradingIncome) ?? 0;
  const displayTotal = displaySalary + displayTrading;

  const requestNotificationPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!('Notification' in window)) return 'denied';
    if (Notification.permission === 'granted') return 'granted';
    if (Notification.permission === 'denied') return 'denied';
    try {
      const result = await Notification.requestPermission();
      setNotifPermission(result);
      return result;
    } catch {
      return 'denied';
    }
  }, []);

  const handleMasterNotifToggle = useCallback(async (enabled: boolean) => {
    if (enabled && notifPermission === 'default') {
      const result = await requestNotificationPermission();
      if (result === 'denied') {
        toast.error('Notification permission denied. Enable in browser settings.');
      }
    }
    if (enabled && notifPermission === 'denied') {
      toast.error('Notifications are blocked. Enable in browser settings.');
    }
    persistSettings({
      ...settings,
      notificationSettings: { ...settings.notificationSettings, enabled },
      updatedAt: new Date().toISOString()
    });
  }, [settings, notifPermission, requestNotificationPermission, persistSettings]);

  const toggleNotifSetting = useCallback((key: keyof typeof settings.notificationSettings) => {
    if (key === 'enabled') return;
    persistSettings({
      ...settings,
      notificationSettings: {
        ...settings.notificationSettings,
        [key]: !settings.notificationSettings[key]
      },
      updatedAt: new Date().toISOString()
    });
  }, [settings, persistSettings]);

  const handleExportData = useCallback(() => {
    const data = { loans, emis, settings, exportDate: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `emi-tracker-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Data exported successfully');
  }, [loans, emis, settings]);

  const handleImportData = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.loans) {
          data.loans.forEach((loan: any) => {
            const { id, userId, createdAt, updatedAt, ...loanData } = loan;
            addLoan(loanData);
          });
        }
        if (data.settings) {
          const importedSettings: UserSettings = {
            ...DEFAULT_SETTINGS,
            ...data.settings,
            averageMonthlyTradingIncome:
              typeof data.settings.averageMonthlyTradingIncome === 'number' && Number.isFinite(data.settings.averageMonthlyTradingIncome)
                ? data.settings.averageMonthlyTradingIncome
                : 0,
            notificationSettings: {
              ...DEFAULT_SETTINGS.notificationSettings,
              ...(data.settings.notificationSettings || {}),
              enabled: data.settings.notificationSettings?.enabled ??
                Boolean(
                  data.settings.notificationSettings?.reminder7Days ||
                  data.settings.notificationSettings?.reminder3Days ||
                  data.settings.notificationSettings?.reminder1Day ||
                  data.settings.notificationSettings?.reminderOnDueDate ||
                  data.settings.notificationSettings?.dailyOverdueReminder
                )
            }
          };
          persistSettings(importedSettings);
          setCurrency('₹');
        }
        toast.success('Data imported successfully');
      } catch {
        toast.error('Failed to import data');
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  }, [addLoan, persistSettings]);

  const handleClearData = useCallback(() => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    try {
      localStorage.removeItem('emi_tracker_loans');
      localStorage.removeItem('emi_tracker_emis');
      localStorage.removeItem(STORAGE_KEY);
      window.location.reload();
    } catch {
      toast.error('Failed to clear data');
    }
  }, [confirmDelete]);

  const closeDataBackup = useCallback(() => {
    setShowDataBackup(false);
    setConfirmDelete(false);
  }, []);

  const notifEnabled = settings.notificationSettings.enabled;
  const notifStatusLabel = notifPermission === 'granted'
    ? 'Permission granted'
    : notifPermission === 'denied'
      ? 'Permission denied'
      : notifPermission === 'unsupported'
        ? 'Not supported in this browser'
        : 'Permission not requested';
  const notifStatusColor = notifPermission === 'granted'
    ? 'text-green-400'
    : notifPermission === 'denied'
      ? 'text-red-400'
      : 'text-slate-500';
  const notifStatusIcon = notifPermission === 'granted'
    ? <CheckCircle size={14} className="text-green-400 flex-shrink-0" />
    : notifPermission === 'denied'
      ? <XCircle size={14} className="text-red-400 flex-shrink-0" />
      : <AlertCircle size={14} className="text-slate-500 flex-shrink-0" />;

  return (
    <div className="p-4 pb-24">
      <h1 className="text-2xl font-bold text-white mb-6">Settings</h1>

      <SectionLabel>General</SectionLabel>
      <GroupedCard>
        <SettingsRow
          icon={<Bell size={18} className="text-blue-400" />}
          title="Notifications"
          subtitle="EMI reminders and overdue alerts"
          onClick={() => setShowNotifications(true)}
        />
        <Separator />
        <SettingsRow
          icon={<Wallet size={18} className="text-emerald-400" />}
          title="Financial Profile"
          subtitle="Salary, trading earnings and financial health"
          onClick={openFinancialProfile}
        />
      </GroupedCard>

      <SectionLabel>Data</SectionLabel>
      <GroupedCard>
        <SettingsRow
          icon={<Database size={18} className="text-purple-400" />}
          title="Data & Backup"
          subtitle="Backup, restore or reset app data"
          onClick={() => { setConfirmDelete(false); setShowDataBackup(true); }}
        />
      </GroupedCard>

      <SectionLabel>About</SectionLabel>
      <GroupedCard>
        <div className="flex items-center gap-3 px-4 py-3.5">
          <div className="w-9 h-9 rounded-xl bg-slate-700/50 flex items-center justify-center flex-shrink-0">
            <Info size={18} className="text-slate-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white">EMI Tracker</p>
            <p className="text-xs text-slate-500">Version 1.0.0</p>
          </div>
        </div>
      </GroupedCard>

      <input
        type="file"
        accept=".json"
        onChange={handleImportData}
        className="hidden"
        ref={fileInputRef}
      />

      {/* ========== NOTIFICATIONS MODAL ========== */}
      <Modal
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        title="Notifications"
      >
        <div className="space-y-6">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">EMI Reminders</p>
            <div className="space-y-1">
              <div className="flex items-center justify-between py-2">
                <div className="min-w-0 mr-3">
                  <p className="text-sm font-medium text-white">EMI Notifications</p>
                  <p className="text-xs text-slate-500">Enable EMI reminders and overdue alerts</p>
                </div>
                <Toggle
                  enabled={notifEnabled}
                  onToggle={() => handleMasterNotifToggle(!notifEnabled)}
                />
              </div>
              <div className={`space-y-1 pl-2 transition-opacity ${!notifEnabled ? 'opacity-40 pointer-events-none' : ''}`}>
                {[
                  { key: 'reminder7Days' as const, label: '7 days before' },
                  { key: 'reminder3Days' as const, label: '3 days before' },
                  { key: 'reminder1Day' as const, label: '1 day before' },
                  { key: 'reminderOnDueDate' as const, label: 'On due date' }
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between py-2">
                    <span className="text-sm text-slate-300">{label}</span>
                    <Toggle
                      enabled={settings.notificationSettings[key]}
                      onToggle={() => toggleNotifSetting(key)}
                      disabled={!notifEnabled}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Overdue</p>
            <div className={`flex items-center justify-between py-2 transition-opacity ${!notifEnabled ? 'opacity-40 pointer-events-none' : ''}`}>
              <span className="text-sm text-slate-300">Daily overdue reminder</span>
              <Toggle
                enabled={settings.notificationSettings.dailyOverdueReminder}
                onToggle={() => toggleNotifSetting('dailyOverdueReminder')}
                disabled={!notifEnabled}
              />
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Status</p>
            <div className="flex items-center gap-2 py-2">
              {notifStatusIcon}
              <span className={`text-sm font-medium ${notifStatusColor}`}>
                {notifStatusLabel}
              </span>
            </div>
            {notifPermission === 'unsupported' && (
              <p className="text-xs text-slate-500 mt-1">
                Notifications are not supported in this browser or environment.
              </p>
            )}
            {notifPermission === 'denied' && (
              <p className="text-xs text-slate-500 mt-1">
                Notifications are blocked. Enable them in your browser settings.
              </p>
            )}
            {notifPermission === 'default' && (
              <p className="text-xs text-slate-500 mt-1">
                Permission has not been requested yet. Enable EMI Notifications to prompt for permission.
              </p>
            )}
            {notifPermission === 'granted' && (
              <p className="text-xs text-slate-500 mt-1">
                Notifications are only delivered when the app is open in this browser.
              </p>
            )}
          </div>
        </div>
      </Modal>

      {/* ========== FINANCIAL PROFILE MODAL ========== */}
      <Modal
        isOpen={showFinancialProfile}
        onClose={() => setShowFinancialProfile(false)}
        title="Financial Profile"
      >
        <div className="space-y-6">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Fixed Income</p>
            <Input
              label="Monthly Salary"
              type="number"
              inputMode="decimal"
              value={tempSalary}
              onChange={(e) => setTempSalary(e.target.value)}
              placeholder="Enter your monthly salary"
              icon={<IndianRupee size={16} />}
            />
            <p className="text-xs text-slate-500 mt-1.5">Your fixed monthly income from salary.</p>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Variable Income</p>
            <Input
              label="Average Monthly Trading Earnings"
              type="number"
              inputMode="decimal"
              value={tempTradingIncome}
              onChange={(e) => setTempTradingIncome(e.target.value)}
              placeholder="Enter average monthly trading income"
              icon={<IndianRupee size={16} />}
            />
            <p className="text-xs text-slate-500 mt-1.5">
              Your average monthly trading income. Used separately from fixed salary when analysing your finances.
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Income Summary</p>
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Fixed Income</span>
                <span className="text-white font-medium">{formatCurrency(displaySalary)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Trading Income</span>
                <span className="text-white font-medium">{formatCurrency(displayTrading)}</span>
              </div>
              <div className="h-px bg-slate-700/50" />
              <div className="flex justify-between text-sm">
                <span className="text-slate-300 font-medium">Estimated Total Monthly Income</span>
                <span className="text-blue-400 font-semibold">{formatCurrency(displayTotal)}</span>
              </div>
            </div>
          </div>

          <Button onClick={handleSaveFinancialProfile} className="w-full">
            Save Changes
          </Button>
        </div>
      </Modal>

      {/* ========== DATA & BACKUP MODAL ========== */}
      <Modal
        isOpen={showDataBackup}
        onClose={closeDataBackup}
        title="Data & Backup"
      >
        <div className="space-y-6">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Backup</p>
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
              <p className="text-sm font-medium text-white mb-1">Export Backup</p>
              <p className="text-xs text-slate-500 mb-3">
                Save a copy of your loans, payments and settings.
              </p>
              <Button
                onClick={handleExportData}
                icon={<Download size={16} />}
                variant="secondary"
                size="sm"
                className="w-full"
              >
                Export Backup
              </Button>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Restore</p>
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
              <p className="text-sm font-medium text-white mb-1">Import Backup</p>
              <p className="text-xs text-slate-500 mb-3">
                Restore data from a previously exported backup.
              </p>
              <Button
                icon={<Upload size={16} />}
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
              >
                Import Backup
              </Button>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-red-500 uppercase tracking-wider mb-3">Danger Zone</p>
            <div className="bg-red-950/30 border border-red-900/40 rounded-xl p-4">
              <p className="text-sm font-medium text-white mb-1">Delete All App Data</p>
              <p className="text-xs text-slate-500 mb-3">
                Permanently removes all loans, payment history and settings from this device.
              </p>
              {confirmDelete && (
                <p className="text-xs text-red-400 mb-3 flex items-center gap-1.5">
                  <AlertTriangle size={14} className="flex-shrink-0" />
                  This action cannot be undone. All your data will be permanently deleted.
                </p>
              )}
              <Button
                onClick={handleClearData}
                icon={<Trash2 size={16} />}
                variant="danger"
                size="sm"
                className="w-full"
              >
                {confirmDelete ? 'Confirm Delete All Data' : 'Delete All Data'}
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
