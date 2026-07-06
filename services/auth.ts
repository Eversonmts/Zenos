
import { supabase } from './supabase';
import { Profile, UserStatus } from '../types';
import { db } from './db';

const CURRENT_USER_KEY = 'zen_current_user';
const TEST_MODE_KEY = 'zen_test_mode';

let userChangeListener: ((user: Profile | null) => void) | null = null;

// Seed Admin (used only to grant the admin role by email on first login/signup)
const SEED_ADMIN_EMAIL = 'mattos.mmn@gmail.com';

const buildProfileFromAuthUser = (authUser: any, fallbackName?: string): Profile => ({
  id: authUser.id,
  email: authUser.email || '',
  full_name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || fallbackName || 'Usuário',
  role: authUser.email === SEED_ADMIN_EMAIL ? 'admin' : 'user',
  status: 'active',
  avatar_url: authUser.user_metadata?.avatar_url || null,
  phone: null,
  plan_id: null,
  menu_size: 'md',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
});

export const initializeAuth = (onUserChanged: (user: Profile | null) => void) => {
  userChangeListener = onUserChanged;

  // Check Test Mode first (local sandbox, never touches the real backend)
  const isTest = localStorage.getItem(TEST_MODE_KEY) === 'true';
  const currentUserLocal = localStorage.getItem(CURRENT_USER_KEY);

  if (isTest) {
    if (currentUserLocal) {
      onUserChanged(JSON.parse(currentUserLocal));
    } else {
      const testUser = loginAsTest();
      onUserChanged(testUser);
    }
  }

  // Get initial session from Supabase
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session) {
      localStorage.removeItem(TEST_MODE_KEY);
      handleAuthStateChange('SIGNED_IN', session, onUserChanged);
    } else if (!isTest) {
      onUserChanged(null);
    }
  });

  const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN') {
      localStorage.removeItem(TEST_MODE_KEY);
    }
    handleAuthStateChange(event, session, onUserChanged);
  });

  return () => {
    subscription.unsubscribe();
  };
};

const handleAuthStateChange = async (event: string, session: any, onUserChanged: (user: Profile | null) => void) => {
  const isTest = localStorage.getItem(TEST_MODE_KEY) === 'true';
  if (isTest && event !== 'SIGNED_IN') return;

  try {
    if (session?.user) {
      const sUser = session.user;
      let profile: Profile | undefined;

      try {
        profile = await db.users.getById(sUser.id);
      } catch (dbError) {
        console.error("Error fetching profile from Supabase DB:", dbError);
      }

      // If profile doesn't exist yet, the on_auth_user_created trigger may not have
      // finished running (e.g. right after signup). Wait briefly and retry.
      if (!profile) {
        await new Promise(r => setTimeout(r, 1000));
        profile = await db.users.getById(sUser.id);
      }

      if (!profile) {
        // Trigger genuinely failed (shouldn't normally happen) - create it client-side as a last resort.
        profile = buildProfileFromAuthUser(sUser);
        profile = await db.users.create(profile);
      }

      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(profile));
      onUserChanged(profile || null);
    } else if (event === 'SIGNED_OUT') {
      if (localStorage.getItem(TEST_MODE_KEY) !== 'true') {
        localStorage.removeItem(CURRENT_USER_KEY);
        onUserChanged(null);
      }
    }
  } catch (error) {
    console.error("Auth initialization error:", error);
    onUserChanged(null);
  }
};

export const login = async (email: string, password: string): Promise<{ success: boolean, user?: Profile, message?: string }> => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) throw error;

    if (data.user) {
      let profile: Profile | undefined;
      try {
        profile = await db.users.getById(data.user.id);
      } catch (e) {
        console.error("Error fetching profile after login:", e);
      }

      if (!profile) {
        profile = buildProfileFromAuthUser(data.user);
        profile = await db.users.create(profile);
      }

      localStorage.removeItem(TEST_MODE_KEY);
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(profile));
      if (userChangeListener) userChangeListener(profile);
      return { success: true, user: profile };
    }

    return { success: false, message: 'E-mail ou senha incorretos.' };
  } catch (error: any) {
    console.warn("Supabase Auth login failed:", error);
    const msg: string = error?.message || '';
    let displayMessage = 'E-mail ou senha incorretos.';
    if (msg.includes('Email not confirmed')) {
      displayMessage = 'Verifique seu e-mail para confirmar seu cadastro antes de entrar.';
    } else if (msg.toLowerCase().includes('invalid')) {
      displayMessage = 'E-mail ou senha inválidos.';
    }
    return { success: false, message: displayMessage };
  }
};

export const loginWithGoogle = async (): Promise<{ success: boolean, user?: Profile, message?: string }> => {
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error("Supabase Google login error:", error);
    return { success: false, message: 'Erro ao entrar com Google.' };
  }
};

export const logout = async () => {
  await supabase.auth.signOut();
  localStorage.removeItem(CURRENT_USER_KEY);
  localStorage.removeItem(TEST_MODE_KEY);
};

export const loginAsTest = (): Profile => {
  const testId = 'test_' + Math.random().toString(36).substr(2, 9);
  localStorage.setItem(TEST_MODE_KEY, 'true');

  const testUser: Profile = {
    id: testId,
    email: 'teste@zenos.com',
    full_name: 'Usuário de Teste',
    role: 'user',
    status: 'active',
    avatar_url: null,
    phone: null,
    plan_id: null,
    menu_size: 'md',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(testUser));
  if (userChangeListener) userChangeListener(testUser);
  return testUser;
};

export const register = async (name: string, email: string, password: string): Promise<{ success: boolean, sessionExists?: boolean, message?: string }> => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name }
      }
    });

    if (error) throw error;
    if (!data.user) {
      return { success: false, message: 'Não foi possível concluir o cadastro. Tente novamente.' };
    }

    // The on_auth_user_created trigger creates the profile, default settings and
    // default categories automatically in the database. We just mirror it locally
    // so the UI can log the user in right away without waiting for a round trip.
    const newProfile = buildProfileFromAuthUser(data.user, name);
    localStorage.setItem('zenos_user_' + newProfile.id, JSON.stringify(newProfile));

    const sessionExists = !!data.session;
    if (sessionExists) {
      localStorage.removeItem(TEST_MODE_KEY);
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(newProfile));
      if (userChangeListener) userChangeListener(newProfile);
    }

    return {
      success: true,
      sessionExists,
      message: sessionExists
        ? 'Cadastro realizado com sucesso!'
        : 'Cadastro realizado! Verifique seu e-mail para confirmar a conta antes de entrar.'
    };
  } catch (error: any) {
    console.error("Registration error:", error);
    const msg: string = error?.message || '';
    let message = 'Erro ao cadastrar usuário.';
    if (msg.includes('already registered') || msg.includes('already-in-use') || msg.includes('User already registered')) {
      message = 'Este e-mail já está em uso.';
    } else if (msg) {
      message = msg;
    }
    return { success: false, message };
  }
};

export const updateProfile = async (profile: Partial<Profile> & { id: string }) => {
  try {
    await db.users.update(profile);
    const current = getCurrentUser();
    if (current && current.id === profile.id) {
      const updated = { ...current, ...profile };
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(updated));
    }
    return true;
  } catch (error) {
    console.error("Error updating profile:", error);
    return false;
  }
};

export const getCurrentUser = (): Profile | null => {
  const local = localStorage.getItem(CURRENT_USER_KEY);
  return local ? JSON.parse(local) : null;
};

export const getUsers = async (): Promise<Profile[]> => {
  return await db.users.listAll();
};

export const updateUserStatus = async (userId: string, status: UserStatus) => {
  const profile = await db.users.getById(userId);
  if (profile) {
    profile.status = status;
    await db.users.update(profile);
    return true;
  }
  return false;
};

export const updateProfileData = async (profile: Profile) => {
  try {
    await db.users.update(profile);
    const currentUser = getCurrentUser();
    if (currentUser && currentUser.id === profile.id) {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(profile));
    }
    return true;
  } catch (error) {
    console.error("Error updating profile:", error);
    return false;
  }
};

export const deleteUser = async (userId: string) => {
  try {
    await db.users.delete(userId);
    return true;
  } catch (error) {
    console.error("Error deleting user:", error);
    return false;
  }
};

export const resetPassword = async (email: string): Promise<{ success: boolean, message?: string }> => {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error("Reset password error:", error);
    return { success: false, message: error.message || 'Erro ao enviar e-mail de recuperação.' };
  }
};
