import { Injectable } from '@angular/core';
import {
  CanActivate,
  Router,
  UrlTree
} from '@angular/router';
import { SupabaseService } from './services/supabase.service';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(private supabase: SupabaseService, private router: Router) {}

  canActivate(): Observable<boolean | UrlTree> {
    return this.supabase.session$.pipe(
      map(session => {
        if (session) {
          return true;
        } else {
          return this.router.createUrlTree(['/auth']);
        }
      })
    );
  }
}
