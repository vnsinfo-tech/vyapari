import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import uiReducer from './slices/uiSlice';
import permissionsReducer from './slices/permissionsSlice';

export const store = configureStore({
  reducer: { auth: authReducer, ui: uiReducer, permissions: permissionsReducer },
});
