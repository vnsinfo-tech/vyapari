import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authAPI } from '../../api/services';

export const login = createAsyncThunk('auth/login', async (creds, { rejectWithValue }) => {
  try {
    const { data } = await authAPI.login(creds);
    localStorage.setItem('token', data.token);
    localStorage.setItem('refreshToken', data.refreshToken);
    return data;
  } catch (err) { return rejectWithValue(err.response?.data?.message || 'Login failed'); }
});

export const register = createAsyncThunk('auth/register', async (creds, { rejectWithValue }) => {
  try {
    const { data } = await authAPI.register(creds);
    localStorage.setItem('token', data.token);
    localStorage.setItem('refreshToken', data.refreshToken);
    return data;
  } catch (err) { return rejectWithValue(err.response?.data?.message || 'Registration failed'); }
});

export const fetchMe = createAsyncThunk('auth/fetchMe', async (_, { rejectWithValue }) => {
  try {
    const { data } = await authAPI.getMe();
    return data;
  } catch (err) { return rejectWithValue(err.response?.data?.message); }
});

const authSlice = createSlice({
  name: 'auth',
  initialState: { user: null, business: null, token: localStorage.getItem('token'), loading: false, error: null },
  reducers: {
    logout: (state) => {
      state.user = null; state.business = null; state.token = null;
      localStorage.removeItem('token'); localStorage.removeItem('refreshToken');
    },
    updateBusiness: (state, action) => { state.business = { ...state.business, ...action.payload }; },
  },
  extraReducers: (builder) => {
    const pending = (state) => { state.loading = true; state.error = null; };
    const rejected = (state, action) => { state.loading = false; state.error = action.payload; };
    builder
      .addCase(login.pending, pending).addCase(login.rejected, rejected)
      .addCase(login.fulfilled, (state, { payload }) => { state.loading = false; state.user = payload.user; state.business = payload.business; state.token = payload.token; })
      .addCase(register.pending, pending).addCase(register.rejected, rejected)
      .addCase(register.fulfilled, (state, { payload }) => { state.loading = false; state.user = payload.user; state.business = payload.business; state.token = payload.token; })
      .addCase(fetchMe.fulfilled, (state, { payload }) => { state.user = payload.user; state.business = payload.business; });
  },
});

export const { logout, updateBusiness } = authSlice.actions;

// Thunk: calls backend logout, clears auth + permissions state
export const logoutUser = () => async (dispatch) => {
  try { await authAPI.logout(); } catch { /* ignore */ }
  dispatch(logout());
  dispatch({ type: 'permissions/clearPermissions' });
};

export default authSlice.reducer;
