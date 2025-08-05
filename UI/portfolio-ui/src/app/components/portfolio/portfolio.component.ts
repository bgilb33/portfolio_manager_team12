import { Component, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { PortfolioService } from '../../services/portfolio.service';
import { forkJoin } from 'rxjs';
import { ChatComponent } from '../chat/chat.component';
import { ChatService } from '../../services/chat.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-portfolio',
  templateUrl: './portfolio.component.html',
  styleUrl: './portfolio.component.css'
})
export class PortfolioComponent {
  isLoading = true;
  showChat = true;
  @ViewChild(ChatComponent) chatComponent!: ChatComponent;

  constructor(
    private portfolioService: PortfolioService,
    private router: Router,
    private chatService: ChatService
  ) {}
  ngOnInit(): void {
    // Ensure chat component is shown
    this.showChat = true;
    
    this.portfolioService.userIdReady$.subscribe(ready => {
      if (ready) {
        forkJoin([
          this.portfolioService.getPortfolio(),
          this.portfolioService.getTimeSeriesData()
        ]).subscribe(() => {
          this.isLoading = false;
        });
      }
    });
  }

  logout(): void {
    // Hide chat component first to force recreation
    this.showChat = false;
    
    // Reset chat component completely
    if (this.chatComponent) {
      this.chatComponent.resetChat();
    }
    
    // Clear chat messages from service
    this.chatService.clearMessages();
    
    // Clear chat history from backend before logout
    const user = localStorage.getItem('user');
    if (user) {
      const userData = JSON.parse(user);
      const userId = userData.id || userData.user_id;
      if (userId) {
        // Call backend to clear chat history
        fetch(`${environment.apiUrl}/api/chat/${userId}/clear`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        }).catch(error => console.error('Error clearing chat history:', error));
      }
    }
    
    // Clear any stored user data
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    
    // Clear any cached chat data
    sessionStorage.removeItem('chat_messages');
    sessionStorage.removeItem('chat_history');
    sessionStorage.removeItem('current_user');
    sessionStorage.removeItem('chat_session_id');
    
    // Force a complete reset by navigating to auth and then back
    this.router.navigate(['/auth']).then(() => {
      // Clear any remaining state
      this.chatService.clearMessages();
    });
  }

  openChat(): void {
    console.log('Open chat called, chatComponent:', this.chatComponent);
    
    // Ensure chat component is visible
    this.showChat = true;
    
    // Wait for component to be created if it was hidden
    setTimeout(() => {
      if (this.chatComponent) {
        this.chatComponent.toggleChat();
      } else {
        console.error('Chat component not found!');
      }
    }, 100);
  }
}
