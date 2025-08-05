import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { firstValueFrom, Subscription } from 'rxjs';
import { ChatService } from '../../services/chat.service';

interface ChatMessage {
  id: string;
  message: string;
  isUser: boolean;
  timestamp: Date;
}

interface ChatResponse {
  response: string;
}

interface ChatHistoryResponse {
  history: ChatMessage[];
}

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  messages: ChatMessage[] = [];
  newMessage: string = '';
  isLoading: boolean = false;
  isVisible: boolean = false;
  userId: string = '';
  private messagesSubscription: Subscription;
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;
  private shouldScrollToBottom = false;

  constructor(private http: HttpClient, private chatService: ChatService) {
    this.messagesSubscription = this.chatService.messages$.subscribe(messages => {
      this.messages = messages;
      this.shouldScrollToBottom = true;
    });
  }

  ngOnInit(): void {
    console.log('Chat component initialized - resetting all state');
    
    // Reset chat state on component initialization
    this.messages = [];
    this.newMessage = '';
    this.isLoading = false;
    this.isVisible = false;
    
    // Force clear any existing messages from the service first
    this.chatService.clearMessages();
    
    this.initializeUser();
    
    // Listen for user changes and reset chat accordingly
    this.checkUserAndReset();
  }
  
  private checkUserAndReset(): void {
    // Generate a unique session ID for this login
    const sessionId = Date.now().toString();
    const storedSessionId = sessionStorage.getItem('chat_session_id');
    
    // Check if user has changed by comparing with stored user
    const storedUser = sessionStorage.getItem('current_user');
    const currentUser = localStorage.getItem('user');
    
    if (storedUser !== currentUser || storedSessionId !== sessionId) {
      // User has changed or new session, reset chat completely
      console.log('User changed or new session - resetting chat');
      this.resetChat();
      sessionStorage.setItem('current_user', currentUser || '');
      sessionStorage.setItem('chat_session_id', sessionId);
    }
  }

  private initializeUser(): void {
    // Get user ID from localStorage
    const user = localStorage.getItem('user');
    console.log('User from localStorage:', user);
    
    // Always clear messages when initializing user
    this.messages = [];
    this.chatService.clearMessages();
    
    if (user) {
      const userData = JSON.parse(user);
      console.log('Parsed user data:', userData);
      this.userId = userData.id || userData.user_id;
      console.log('Set userId to:', this.userId);
    } else {
      console.log('No user found in localStorage');
      this.userId = '';
    }
  }

  resetChat(): void {
    console.log('Resetting chat component...');
    
    // Force close the chat window
    this.isVisible = false;
    
    // Clear all state
    this.messages = [];
    this.newMessage = '';
    this.isLoading = false;
    this.userId = '';
    
    // Clear the service
    this.chatService.clearMessages();
    
    // Clear any cached data
    sessionStorage.removeItem('chat_messages');
    sessionStorage.removeItem('chat_history');
    
    // Force a change detection cycle
    setTimeout(() => {
      console.log('Messages after reset:', this.messages);
      console.log('Chat service messages:', this.chatService.getMessages());
    }, 100);
    
    // Re-initialize user when chat is reset
    this.initializeUser();
    
    // Update the stored user reference
    const currentUser = localStorage.getItem('user');
    sessionStorage.setItem('current_user', currentUser || '');
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom && this.messagesContainer) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  private scrollToBottom(): void {
    try {
      const element = this.messagesContainer.nativeElement;
      element.scrollTop = element.scrollHeight;
    } catch (err) {
      console.error('Error scrolling to bottom:', err);
    }
  }

  ngOnDestroy(): void {
    this.messagesSubscription.unsubscribe();
    
    // Clear all state when component is destroyed
    this.messages = [];
    this.newMessage = '';
    this.isLoading = false;
    this.isVisible = false;
    this.userId = '';
    
    // Clear service and cache
    this.chatService.clearMessages();
    sessionStorage.removeItem('chat_messages');
    sessionStorage.removeItem('chat_history');
    sessionStorage.removeItem('current_user');
  }

  toggleChat(): void {
    console.log('Toggle chat called, current visibility:', this.isVisible);
    this.isVisible = !this.isVisible;
    console.log('New visibility:', this.isVisible);
    
    // Don't load chat history - start fresh every time
    // This ensures no previous messages are shown
    if (this.isVisible && this.messages.length === 0) {
      console.log('Chat opened with no messages - starting fresh');
    }
    
    // Scroll to bottom when chat is opened
    if (this.isVisible) {
      setTimeout(() => {
        this.shouldScrollToBottom = true;
      }, 100);
    }
  }

  sendMessage(): void {
    console.log('Send message called with:', this.newMessage);
    console.log('Message trimmed:', this.newMessage.trim());
    console.log('UserId:', this.userId);
    if (!this.newMessage.trim() || !this.userId) {
      console.log('Message is empty or no userId');
      console.log('Message empty?', !this.newMessage.trim());
      console.log('UserId empty?', !this.userId);
      return;
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      message: this.newMessage,
      isUser: true,
      timestamp: new Date()
    };

    this.chatService.addMessage(userMessage);
    const messageToSend = this.newMessage;
    console.log('Clearing message, setting to empty string');
    this.newMessage = '';
    this.isLoading = true;
    this.shouldScrollToBottom = true;

    // Use the async method but don't await it in the main function
    this.sendMessageAsync(messageToSend);
  }

  private async sendMessageAsync(messageToSend: string): Promise<void> {
    try {
      const response = await firstValueFrom(this.http.post<ChatResponse>(`${environment.apiUrl}/api/chat/${this.userId}`, {
        message: messageToSend
      }));

      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        message: response.response || 'Sorry, I couldn\'t process your request.',
        isUser: false,
        timestamp: new Date()
      };

      this.chatService.addMessage(aiMessage);
      this.shouldScrollToBottom = true;
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        message: 'Sorry, there was an error processing your request. Please try again.',
        isUser: false,
        timestamp: new Date()
      };
      this.chatService.addMessage(errorMessage);
      this.shouldScrollToBottom = true;
    } finally {
      this.isLoading = false;
    }
  }

  async loadChatHistory(): Promise<void> {
    if (!this.userId) return;

    try {
      const response = await firstValueFrom(this.http.get<ChatHistoryResponse>(`${environment.apiUrl}/api/chat/${this.userId}/history`));
      if (response.history) {
        const history = response.history.map((msg: any) => ({
          id: msg.id || Date.now().toString(),
          message: msg.message,
          isUser: msg.isUser || false,
          timestamp: new Date(msg.timestamp || Date.now())
        }));
        this.chatService.clearMessages();
        history.forEach(msg => this.chatService.addMessage(msg));
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  }

  async clearChat(): Promise<void> {
    if (!this.userId) return;

    try {
      await firstValueFrom(this.http.post(`${environment.apiUrl}/api/chat/${this.userId}/clear`, {}));
      this.chatService.clearMessages();
    } catch (error) {
      console.error('Error clearing chat:', error);
    }
  }

  sendSuggestion(message: string): void {
    this.newMessage = message;
    this.sendMessage();
  }

  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }
} 