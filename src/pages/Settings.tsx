import React, { useState, useEffect } from 'react';
import { Bell, Moon, Sun, Download, Upload, Trash2, DollarSign, Calendar as CalendarIcon } from 'lucide-react';
import { useLoans } from '../contexts/LoanContext';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Input';
import { UserSettings } from '../types';
import { toast } from 'react-hot-toast';

const STORAGE_KEY = 'emi_tracker_settings';

export function Settings() {
  const { loans, emis, addLoan } = useLoans();
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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const storedSettings = localStorage.getItem(STORAGE_KEY);
    if (storedSettings) {
      setSettings(JSON.parse(storedSettings));
    }
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      toast.success('Settings saved successfully');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = () => {
    const data = {
      loans,
      emis,
      settings,
      exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `emi-tracker-backup-${Date.now()}.json`;
    a.click();
    
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
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data.settings));
        }
        
        toast.success('Data imported successfully');
      } catch (error) {
        toast.error('Failed to import data');
      }
    };
    reader.readAsText(file);
  };

  const handleClearData = async () => {
    if (window.confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
      try {
        localStorage.removeItem('emi_tracker_loans');
        localStorage.removeItem('emi_tracker_emis');
        localStorage.removeItem(STORAGE_KEY);
        window.location.reload();
      } catch (error) {
        toast.error('Failed to clear data');
      }
    }
  };

  return (
    <div className="p-4 pb-24 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
      </div>

      {/* Currency & Date Format */}
      <Card gradient>
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <DollarSign size={20} />
            Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Currency</label>
            <Select
              value={settings.currency}
              onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
            >
              <option value="₹">₹ (INR)</option>
              <option value="$">$ (USD)</option>
              <option value="€">€ (EUR)</option>
              <option value="£">£ (GBP)</option>
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
              onChange={(e) => setSettings({ ...settings, monthlySalary: e.target.value ? parseFloat(e.target.value) : undefined })}
              placeholder="Enter your monthly salary"
            />
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card gradient>
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Bell size={20} />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { key: 'reminder7Days', label: 'Remind 7 days before EMI' },
            { key: 'reminder3Days', label: 'Remind 3 days before EMI' },
            { key: 'reminder1Day', label: 'Remind 1 day before EMI' },
            { key: 'reminderOnDueDate', label: 'Remind on due date' },
            { key: 'dailyOverdueReminder', label: 'Daily reminder if overdue' }
          ].map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-slate-300">{label}</span>
              <button
                onClick={() => setSettings({
                  ...settings,
                  notificationSettings: {
                    ...settings.notificationSettings,
                    [key]: !settings.notificationSettings[key as keyof typeof settings.notificationSettings]
                  }
                })}
                className={cn(
                  'w-12 h-6 rounded-full transition-colors',
                  settings.notificationSettings[key as keyof typeof settings.notificationSettings]
                    ? 'bg-blue-500'
                    : 'bg-slate-700'
                )}
              >
                <div
                  className={cn(
                    'w-5 h-5 rounded-full bg-white transition-transform',
                    settings.notificationSettings[key as keyof typeof settings.notificationSettings]
                      ? 'translate-x-6'
                      : 'translate-x-0.5'
                  )}
                />
              </button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card gradient>
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            {settings.darkMode ? <Moon size={20} /> : <Sun size={20} />}
            Appearance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <span className="text-slate-300">Dark Mode</span>
            <button
              onClick={() => setSettings({ ...settings, darkMode: !settings.darkMode })}
              className={cn(
                'w-12 h-6 rounded-full transition-colors',
                settings.darkMode ? 'bg-blue-500' : 'bg-slate-700'
              )}
            >
              <div
                className={cn(
                  'w-5 h-5 rounded-full bg-white transition-transform',
                  settings.darkMode ? 'translate-x-6' : 'translate-x-0.5'
                )}
              />
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card gradient>
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <CalendarIcon size={20} />
            Data Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            onClick={handleExportData}
            icon={<Download size={20} />}
            variant="secondary"
            className="w-full"
          >
            Export Data
          </Button>
          
          <div>
            <input
              type="file"
              accept=".json"
              onChange={handleImportData}
              className="hidden"
              id="import-file"
            />
            <label htmlFor="import-file">
              <Button
                icon={<Upload size={20} />}
                variant="secondary"
                className="w-full"
              >
                Import Data
              </Button>
            </label>
          </div>

          <Button
            onClick={handleClearData}
            icon={<Trash2 size={20} />}
            variant="danger"
            className="w-full"
          >
            Clear All Data
          </Button>
        </CardContent>
      </Card>

      <Button
        onClick={handleSave}
        loading={loading}
        className="w-full"
      >
        Save Settings
      </Button>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
