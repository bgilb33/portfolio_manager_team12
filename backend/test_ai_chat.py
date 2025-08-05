#!/usr/bin/env python3
"""
Interactive AI Chat Test - Terminal Conversation
"""

import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def interactive_chat():
    """Interactive chat session in terminal"""
    try:
        from services.ai_chat_service import AIChatService
        
        print("🤖 Starting Interactive AI Chat Test")
        print("=" * 50)
        
        # Check if API key is available
        api_key = os.getenv('GOOGLE_GENAI_API_KEY')
        if not api_key:
            print("❌ GOOGLE_GENAI_API_KEY environment variable not set")
            print("Please set your Google GenAI API key in .env file")
            return False
        
        # Initialize the service
        ai_service = AIChatService()
        print("✅ AI Chat Service initialized successfully")
        
        # Test user ID (you can change this to test with different users)
        test_user_id = "75e44b0b-bb72-4e18-bb79-830fd6bfcdca"
        
        print(f"\n👤 User ID: {test_user_id}")
        print("💬 Start chatting! Type 'quit' or 'exit' to end the conversation")
        print("Type 'clear' to clear chat history")
        print("-" * 50)
        
        while True:
            try:
                # Get user input
                user_message = input("\n👤 You: ").strip()
                
                # Check for exit commands
                if user_message.lower() in ['quit', 'exit', 'q']:
                    print("\n👋 Goodbye!")
                    break
                
                # Check for clear command
                if user_message.lower() == 'clear':
                    ai_service.clear_chat_history(test_user_id)
                    print("🗑️  Chat history cleared!")
                    continue
                
                # Skip empty messages
                if not user_message:
                    continue
                
                print("🤖 AI is thinking...")
                
                # Send message to AI
                response = ai_service.chat(test_user_id, user_message)
                
                if 'error' in response:
                    print(f"❌ Error: {response['error']}")
                else:
                    print(f"\n🤖 AI: {response['response']}")
                    print(f"⏰ {response['timestamp']}")
                
                # Show conversation history (optional)
                if 'history' in response and response['history']:
                    print(f"\n📝 Conversation length: {len(response['history'])} messages")
                
            except KeyboardInterrupt:
                print("\n\n👋 Interrupted by user. Goodbye!")
                break
            except Exception as e:
                print(f"❌ Error during chat: {e}")
                continue
        
        return True
        
    except Exception as e:
        print(f"❌ Failed to start interactive chat: {e}")
        return False

def test_google_genai_connection():
    """Test basic Google GenAI connection"""
    try:
        from google import genai
        
        api_key = os.getenv('GOOGLE_GENAI_API_KEY')
        if not api_key:
            print("❌ GOOGLE_GENAI_API_KEY not set")
            return False
        
        client = genai.Client(api_key=api_key)
        
        # Test basic generation
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents="Hello, this is a test message."
        )
        
        print("✅ Google GenAI connection successful")
        print(f"Test response: {response.text[:100]}...")
        return True
        
    except Exception as e:
        print(f"❌ Google GenAI connection failed: {e}")
        return False

if __name__ == "__main__":
    print("🧪 Interactive AI Chat Test")
    print("=" * 50)
    
    # Test Google GenAI connection first
    print("1. Testing Google GenAI connection...")
    genai_success = test_google_genai_connection()
    
    if genai_success:
        print("\n2. Starting interactive chat session...")
        chat_success = interactive_chat()
        
        if chat_success:
            print("\n✅ Interactive chat completed successfully!")
        else:
            print("\n❌ Interactive chat failed.")
    else:
        print("\n❌ Google GenAI connection failed. Check your API key.")
    
    print("\n📝 Usage:")
    print("- Type your messages and press Enter")
    print("- Type 'quit', 'exit', or 'q' to end")
    print("- Type 'clear' to clear chat history")
    print("- Use Ctrl+C to interrupt") 