import { useState, useEffect } from 'react';
import { Bell, Moon, Sun, Download, Upload, Trash2, DollarSign, Calendar as CalendarIcon, LogOut } from 'lucide-react';
import { useLoans } from '../contexts/LoanContext';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { UserSettings } from '../types';
import { toast } from 'react-hot-toast';
import { setCurrency } from '../utils/formatters';

const STORAGE_KEY = 'emi_tracker_settings';

export function Settings() {
  const { loans, emis, addLoan } = useLoans();
  const { user, signOut } = useAuth();
  const [settings, setSettings] = useState<UserSettings>({
    userId: 'local',
    currency: '₹',
    dateFormat: 'DD/MM/YYYY',
    notificationSettings: {
      reminder7Days: true,
      reminder3Days: true,
      reminder1Day: true,
      reminderOnDueDate: true,
      dailyOverdueReminder: true
    },
    darkMode: true,
    monthlySalary: undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const storedSettings = localStorage.getItem(STORAGE_KEY);
    if (storedSettings) {
      const parsed = JSON.parse(storedSettings);
      setSettings(parsed);
      setCurrency(parsed.currency || '₹');
      applyDarkMode(parsed.darkMode);
    } else {
      applyDarkMode(true);
    }
  }, []);

  const applyDarkMode = (isDark: boolean) => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      setCurrency(settings.currency);
      applyDarkMode(settings.darkMode);
      toast.success('Settings saved successfully');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleDarkModeToggle = () => {
    const newDark = !settings.darkMode;
    setSettings(prev => ({ ...prev, darkMode: newDark }));
    applyDarkMode(newDark);
  };

  const handleCurrencyChange = (value: string) => {
    setSettings(prev => ({ ...prev, currency: value }));
    setCurrency(value);
  };

  const handleExportData = () => {
    const data = { loans, emis, settings, exportDate: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `emi-tracker-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Data exported successfully');
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
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
          setSettings(data.settings);
          setCurrency(data.settings.currency || '₹');
          applyDarkMode(data.settings.darkMode);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data.settings));
        }
        toast.success('Data imported successfully');
      } catch {
        toast.error('Failed to import data');
      }
    };
    reader.readAsText(file);
  };

  const handleClearData = async () => {
    if (window.confirm('Are you sure you want to clear all data? This cannot be undone.')) {
      try {
        localStorage.removeItem('emi_tracker_loans');
        localStorage.removeItem('emi_tracker_emis');
        localStorage.removeItem(STORAGE_KEY);
        window.location.reload();
      } catch {
        toast.error('Failed to clear data');
      }
    }
  };

  const toggleNotification = (key: keyof typeof settings.notificationSettings) => {
    setSettings(prev => ({
      ...prev,
      notificationSettings: {
        ...prev.notificationSettings,
        [key]: !prev.notificationSettings[key]
      }
    }));
  };

  return (
    <div className="p-4 pb-24 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        {user && (
          <span className="text-xs text-slate-500 bg-slate-800 px-3 py-1 rounded-full truncate max-w-[150px]">
            {user.email || 'Logged in'}
          </span>
        )}
      </div>

      {/* Preferences */}
      <Card gradient>
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <DollarSign size={18} /> Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Currency</label>
            <Select
              value={settings.currency}
              onChange={(e) => handleCurrencyChange(e.target.value)}
            >
              <option value="₹">₹ (INR)</option>
              <option value="$">$ (USD)</option>
              <option value="€">€ (EUR)</option>
              <option value="£">£ (GBP)</option>
              <option value="¥">¥ (JPY)</option>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Date Format</label>
            <Select
              value={settings.dateFormat}
              onChange={(e) => setSettings({ ...settings, dateFormat: e.target.value })}
            >
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Monthly Salary (Optional)</label>
            <Input
              type="number"
              value={settings.monthlySalary || ''}
              onChange={(e) => setSettings({
                ...settings,
                monthlySalary: e.target.value ? parseFloat(e.target.value) : undefined
              })}
              placeholder="Enter your monthly salary"
            />
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card gradient>
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Bell size={18} /> Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { key: 'reminder7Days' as const, label: 'Remind 7 days before EMI' },
            { key: 'reminder3Days' as const, label: 'Remind 3 days before EMI' },
            { key: 'reminder1Day' as const, label: 'Remind 1 day before EMI' },
            { key: 'reminderOnDueDate' as const, label: 'Remind on due date' },
            { key: 'dailyOverdueReminder' as const, label: 'Daily reminder if overdue' }
          ].map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-slate-300 text-sm">{label}</span>
              <button
                onClick={() => toggleNotification(key)}
                className={`w-12 h-6 rounded-full transition-colors ${settings.notificationSettings[key] ? 'bg-blue-500' : 'bg-slate-700'}`}
                role="switch"
                aria-checked={settings.notificationSettings[key]}
              >
                <div className={`w-5 h-5 rounded-full bg-white transition-transform ${settings.notificationSettings[key] ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card gradient>
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            {settings.darkMode ? <Moon size={18} /> : <Sun size={18} />}
            Appearance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <span className="text-slate-300 text-sm">Dark Mode</span>
            <button
              onClick={handleDarkModeToggle}
              className={`w-12 h-6 rounded-full transition-colors ${settings.darkMode ? 'bg-blue-500' : 'bg-slate-700'}`}
              role="switch"
              aria-checked={settings.darkMode}
            >
              <div className={`w-5 h-5 rounded-full bg-white transition-transform ${settings.darkMode ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card gradient>
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <CalendarIcon size={18} /> Data Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={handleExportData} icon={<Download size={18} />} variant="secondary" className="w-full">
            Export Data
          </Button>
          <div>
            <input type="file" accept=".json" onChange={handleImportData} className="hidden" id="import-file" />
            <label htmlFor="import-file">
              <Button icon={<Upload size={18} />} variant="secondary" className="w-full">
                Import Data
              </Button>
            </label>
          </div>
          <Button onClick={handleClearData} icon={<Trash2 size={18} />} variant="danger" className="w-full">
            Clear All Data
          </Button>
        </CardContent>
      </Card>

      {/* Account */}
      <Card gradient>
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <LogOut size={18} /> Account
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={signOut} icon={<LogOut size={18} />} variant="secondary" className="w-full">
            Sign Out
          </Button>
        </CardContent>
      </Card>

      <Button onClick={handleSave} loading={saving} className="w-full">
        Save Settings
      </Button>
    </div>
  );
}
