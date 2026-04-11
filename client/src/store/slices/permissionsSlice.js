import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api/axios';

export const fetchMyPermissions = createAsyncThunk('permissions/fetch', async () => {
  try {
    const { data } = await api.get('/staff/my-permissions');
    return data; // { isOwner, permissions, role }
  } catch {
    return { isOwner: true, permissions: null, role: 'admin' };
  }
});

const permissionsSlice = createSlice({
  name: 'permissions',
  initialState: { isOwner: false, permissions: null, role: null, loaded: false },
  reducers: {
    clearPermissions: (state) => {
      state.isOwner = false;
      state.permissions = null;
      state.role = null;
      state.loaded = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMyPermissions.pending, (state) => {
        // Don't block rendering — assume owner until proven otherwise
        state.loaded = false;
      })
      .addCase(fetchMyPermissions.fulfilled, (state, { payload }) => {
        state.isOwner = payload.isOwner ?? true;
        state.permissions = payload.permissions ?? null;
        state.role = payload.role ?? 'admin';
        state.loaded = true;
      })
      .addCase(fetchMyPermissions.rejected, (state) => {
        state.isOwner = true;
        state.permissions = null;
        state.loaded = true;
      });
  },
});

export const { clearPermissions } = permissionsSlice.actions;
export default permissionsSlice.reducer;

export const selectCan = (permission) => (state) => {
  const { isOwner, permissions } = state.permissions;
  if (isOwner || !permissions) return true;
  return !!permissions[permission];
};
