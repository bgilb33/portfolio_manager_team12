import { Component } from '@angular/core';
import { SupabaseService } from '../../services/supabase.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-auth',
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.css'
})
export class AuthComponent {
  isSignUpMode = false;
  email = '';
  password = '';
  fullName = '';

  constructor(private supabase: SupabaseService, private router: Router) {}

  toggleMode() {
    this.isSignUpMode = !this.isSignUpMode;
  }

  handleSubmit() {
    if (this.isSignUpMode) {
      this.supabase.signUp(this.email, this.password).then(res => {
        if (res.data.user) {
          localStorage.setItem('user', JSON.stringify(res.data.user));
          this.supabase.updateUserProfile({
            id: res.data.user.id,
            full_name: this.fullName
          });
          this.router.navigate(['/portfolio']);
        } else if (res.error) {
          console.error(res.error.message);
        }
      });
    } else {
      this.supabase.signInWithPassword(this.email, this.password).then(res => {
        if (res.data.session) {
          localStorage.setItem('user', JSON.stringify(res.data.user));
          this.router.navigate(['/portfolio']);
        } else if (res.error) {
          console.error(res.error.message);
        }
      });
    }
  }

 
}

