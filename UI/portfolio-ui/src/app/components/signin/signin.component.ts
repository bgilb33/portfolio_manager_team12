import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-signin',
  templateUrl: './signin.component.html',
  styleUrls: ['./signin.component.css']
})
export class SigninComponent {
  email = '';
  password = '';
  errorMessage: string | null = null;

  constructor(private authService: AuthService, private router: Router) { }

  onSubmit() {
    this.errorMessage = null;
    this.authService.signIn(this.email, this.password)
      .then(response => {
        if (response.error) {
          this.errorMessage = response.error.message;
        } else if (response.data.user) {
          this.router.navigate(['/portfolio']);
        }
      })
      .catch(error => {
        this.errorMessage = error.message || 'An unexpected error occurred.';
        console.error(error);
      });
  }
}