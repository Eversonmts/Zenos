
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'motion/react';
import { 
  Home, 
  List, 
  Plus, 
  X, 
  Target, 
  MoreHorizontal,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Repeat
} from 'lucide-react';
import { AppView } from '../types';

interface BottomNavProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  onQuickAction: (type: 'income' | 'expense' | 'transfer' | 'card') => void;
  onToggleSidebar: () => void;
  containerRef?: React.RefObject<HTMLDivElement>;
  txFilter?: 'all' | 'income' | 'expense';
  isUpdateAvailable?: boolean;
}

export default function BottomNav({ currentView, onNavigate, onQuickAction, onToggleSidebar, containerRef, txFilter, isUpdateAvailable }: BottomNavProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isFabOpen, setIsFabOpen] = useState(false);
  const { scrollY } = useScroll({
    container: containerRef || undefined
  });
  const [lastScrollY, setLastScrollY] = useState(0);

  useMotionValueEvent(scrollY, "change", (latest) => {
    const direction = latest > lastScrollY ? "down" : "up";
    if (latest > 50 && direction === "down" && isVisible && !isFabOpen) {
      setIsVisible(false);
    } else if (direction === "up" && !isVisible) {
      setIsVisible(true);
    }
    setLastScrollY(latest);
  });

  const quickActions = [
    { id: 'transfer', label: 'Transferência', icon: Repeat, color: 'bg-white', iconColor: 'text-indigo-600', position: { bottom: 100, left: '18%' } },
    { id: 'income', label: 'Receita', icon: TrendingUp, color: 'bg-white', iconColor: 'text-emerald-600', position: { bottom: 220, left: '30%' } },
    { id: 'card', label: 'Gasto cartão', icon: CreditCard, color: 'bg-white', iconColor: 'text-cyan-600', position: { bottom: 220, left: '70%' } },
    { id: 'expense', label: 'Gasto', icon: TrendingDown, color: 'bg-white', iconColor: 'text-rose-600', position: { bottom: 100, left: '82%' } },
  ];

  return (
    <>
      {/* Radial Menu Backdrop */}
      <AnimatePresence>
        {isFabOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsFabOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90]"
          />
        )}
      </AnimatePresence>

      {/* Radial Menu Items */}
      <AnimatePresence>
        {isFabOpen && (
          <div className="fixed inset-0 pointer-events-none z-[91]">
            {quickActions.map((action, index) => (
              <motion.div
                key={action.id}
                initial={{ scale: 0, opacity: 0, x: '-50%', y: 0 }}
                animate={{ 
                  scale: 1, 
                  opacity: 1, 
                  x: '-50%',
                  bottom: action.position.bottom,
                  left: action.position.left
                }}
                exit={{ scale: 0, opacity: 0, bottom: 20, left: '50%' }}
                transition={{ type: 'spring', damping: 15, stiffness: 200, delay: index * 0.05 }}
                className="absolute pointer-events-auto flex flex-col items-center gap-2"
              >
                <button
                  onClick={() => {
                    onQuickAction(action.id as any);
                    setIsFabOpen(false);
                  }}
                  className={`w-16 h-16 ${action.color} ${action.iconColor} rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-transform`}
                >
                  <action.icon className="w-8 h-8" />
                </button>
                <span className="text-[10px] font-black uppercase tracking-widest text-white drop-shadow-md">
                  {action.label}
                </span>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* Bottom Navigation Bar */}
      <motion.nav
        initial={{ y: 0 }}
        animate={{ y: isVisible ? 0 : 100 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="fixed bottom-0 left-0 right-0 bg-white dark:bg-[#0a0c14] border-t border-slate-200 dark:border-white/5 px-4 pb-safe pt-2 z-[100] lg:hidden"
      >
        <div className="flex items-center justify-between max-w-md mx-auto relative h-16">
          <button
            onClick={() => onNavigate('dashboard')}
            className={`flex flex-col items-center gap-1 flex-1 transition-colors ${currentView === 'dashboard' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'}`}
          >
            <Home className="w-6 h-6" />
            <span className="text-[10px] font-black uppercase tracking-wider">Principal</span>
          </button>

          <button
            onClick={() => onNavigate('transactions')}
            className={`flex flex-col items-center gap-1 flex-1 transition-colors ${currentView === 'transactions' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'}`}
          >
            <List className="w-6 h-6" />
            <span className="text-[10px] font-black uppercase tracking-wider">Transações</span>
          </button>

          {/* Central FAB Placeholder */}
          <div className="flex-1" />

          <button
            onClick={() => onNavigate('goals')}
            className={`flex flex-col items-center gap-1 flex-1 transition-colors ${currentView === 'goals' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'}`}
          >
            <Target className="w-6 h-6" />
            <span className="text-[10px] font-black uppercase tracking-wider">Metas</span>
          </button>

          <button
            onClick={onToggleSidebar}
            className={`relative flex flex-col items-center gap-1 flex-1 transition-colors text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white`}
          >
            <div className="relative">
              <MoreHorizontal className="w-6 h-6" />
              {isUpdateAvailable && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 border border-white dark:border-[#0a0c14] rounded-full animate-pulse" />
              )}
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider">Mais</span>
          </button>

          {/* Actual Central FAB */}
          <div className="absolute left-1/2 -translate-x-1/2 -top-6">
            <button
              onClick={() => {
                if (currentView === 'transactions' && txFilter !== 'all' && txFilter) {
                  onQuickAction(txFilter as any);
                } else {
                  setIsFabOpen(!isFabOpen);
                }
              }}
              className={`w-16 h-16 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 ${isFabOpen ? 'bg-[#6B21A8] rotate-[135deg]' : 'bg-[#6B21A8] hover:scale-110 active:scale-95'}`}
            >
              <Plus className="w-8 h-8 text-white" />
            </button>
          </div>
        </div>
      </motion.nav>
    </>
  );
}
