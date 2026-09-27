import { create } from 'zustand';
import type { CategoryKey } from '../domain/types';
import type { SummaryView } from '../domain/summary';
import { jalaaliOf, todayYmd, type Ymd } from '../lib/dates';

// View state shared across tabs (kept when switching tabs, not persisted).

export type MainTab = 'summary' | 'categories' | 'calendar';

interface UiState {
  mainTab: MainTab;
  summaryView: SummaryView;
  activeCategory: CategoryKey;
  selectedDate: Ymd;
  calCursor: { jy: number; jm: number };
  setMainTab: (tab: MainTab) => void;
  setSummaryView: (view: SummaryView) => void;
  setActiveCategory: (key: CategoryKey) => void;
  setSelectedDate: (date: Ymd) => void;
  shiftMonth: (delta: 1 | -1) => void;
}

const today = jalaaliOf(todayYmd());

export const useUi = create<UiState>()((set) => ({
  mainTab: 'summary',
  summaryView: 'week-current',
  activeCategory: 'actions',
  selectedDate: todayYmd(),
  calCursor: { jy: today.jy, jm: today.jm },
  setMainTab: (mainTab) => set({ mainTab }),
  setSummaryView: (summaryView) => set({ summaryView }),
  setActiveCategory: (activeCategory) => set({ activeCategory }),
  setSelectedDate: (selectedDate) => set({ selectedDate }),
  shiftMonth: (delta) =>
    set(({ calCursor: { jy, jm } }) => {
      const m = jm + delta;
      if (m < 1) return { calCursor: { jy: jy - 1, jm: 12 } };
      if (m > 12) return { calCursor: { jy: jy + 1, jm: 1 } };
      return { calCursor: { jy, jm: m } };
    }),
}));
