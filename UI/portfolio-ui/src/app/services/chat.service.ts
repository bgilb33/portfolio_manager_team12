import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private messages = new BehaviorSubject<any[]>([]);
  public messages$ = this.messages.asObservable();

  clearMessages() {
    console.log('Clearing messages in chat service');
    this.messages.next([]);
    
    // Also clear any cached data
    sessionStorage.removeItem('chat_messages');
    sessionStorage.removeItem('chat_history');
  }

  getMessages() {
    return this.messages.getValue();
  }

  addMessage(message: any) {
    const currentMessages = this.messages.getValue();
    this.messages.next([...currentMessages, message]);
  }
}