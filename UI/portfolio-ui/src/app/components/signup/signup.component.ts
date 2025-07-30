import { Component } from '@angular/core';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-signup',
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.css']
})
export class SignupComponent {
  email = '';
  password = '';

  constructor(private authService: AuthService) { }

  onSubmit() {
    this.authService.signUp(this.email, this.password)
      .then(response => {
        console.log(response);
      })
      .catch(error => {
        console.error(error);
      });
  }
}