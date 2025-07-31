import { Injectable } from '@angular/core';
import {
  createClient,
  SupabaseClient,
  AuthSession,
  AuthChangeEvent,
  Session,
  User,
} from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { BehaviorSubject } from 'rxjs';

export interface UserProfile {
  id?: string;
  full_name: string;
  created_at?: string;
  updated_at?: string;
}

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  private supabase: SupabaseClient;

  private _session = new BehaviorSubject<AuthSession | null>(null);
  public session$ = this._session.asObservable();

  constructor() {
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseKey
    );

    // Initialize session once on load
    this.supabase.auth.getSession().then(({ data }) => {
      this._session.next(data.session);
    });

    // Listen to auth state changes and update session
    this.supabase.auth.onAuthStateChange((_event, session) => {
      this._session.next(session);
    });
  }

  get session() {
    return this._session.value;
  }

  getUser() {
    return this.supabase.auth.getUser();
  }

  authChanges(callback: (event: AuthChangeEvent, session: Session | null) => void) {
    return this.supabase.auth.onAuthStateChange(callback);
  }

  signIn(email: string) {
    return this.supabase.auth.signInWithOtp({ email }); // for magic link (OTP)
  }

  signOut() {
    return this.supabase.auth.signOut();
  }

  getUserProfile(userId: string) {
    return this.supabase
      .from('user_profiles')
      .select('id, full_name, created_at, updated_at')
      .eq('id', userId)
      .single();
  }

  getCurrentUser() {
    return this.supabase.auth.getUser();
  }

  updateUserProfile(profile: UserProfile) {
    const update = {
      ...profile,
      updated_at: new Date().toISOString(),
    };

    return this.supabase.from('user_profiles').upsert(update);
  }

  signUp(email: string, password: string) {
    return this.supabase.auth.signUp({
      email,
      password,
    });
  }

  signInWithPassword(email: string, password: string) {
    return this.supabase.auth.signInWithPassword({
      email,
      password,
    });
  }
}
