import { createSlice } from '@reduxjs/toolkit';

const savedTheme = localStorage.getItem('theme') || 'light';
// Apply theme immediately on load to avoid flash
document.documentElement.classList.toggle('dark', savedTheme === 'dark');

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    sidebarOpen: true,
    theme: savedTheme,
  },
  reducers: {
    toggleSidebar: (state) => { state.sidebarOpen = !state.sidebarOpen; },
    toggleTheme: (state) => {
      state.theme = state.theme === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme', state.theme);
      document.documentElement.classList.toggle('dark', state.theme === 'dark');
    },
    setSidebar: (state, action) => { state.sidebarOpen = action.payload; },
  },
});

export const { toggleSidebar, toggleTheme, setSidebar } = uiSlice.actions;
export default uiSlice.reducer;
