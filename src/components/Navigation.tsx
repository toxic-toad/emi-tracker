import React from 'react';
import { motion } from 'framer-motion';
import { Home, CreditCard, Calendar, FileText, Settings, Plus } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '../utils/cn';

export function Navigation() {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/loans', icon: CreditCard, label: 'Loans' },
    { path: '/calendar', icon: Calendar, label: 'Calendar' },
    { path: '/reports', icon: FileText, label: 'Reports' },
    { path: '/settings', icon: Settings, label: 'Settings' }
  ];

  return (
    <>
      {/* Floating Add Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => navigate('/loans')}
        className="fixed bottom-24 right-4 z-50 w-14 h-14 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full shadow-lg shadow-blue-500/30 flex items-center justify-center"
      >
        <Plus size={24} className="text-white" />
      </motion.button>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 z-40">
        <div className="flex items-center justify-around py-2 px-4 max-w-md mx-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <motion.button
                key={item.path}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate(item.path)}
                className={cn(
                  'flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all',
                  isActive ? 'text-blue-400' : 'text-slate-500'
                )}
              >
                <item.icon size={20} />
                <span className="text-xs">{item.label}</span>
              </motion.button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
