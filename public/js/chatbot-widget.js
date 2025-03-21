// Chatbot Widget Implementation
(function() {
  // Get configuration
  const config = window.chatbotConfig || {};
  const chatbotId = config.chatbotId;
  const theme = config.theme || 'light';
  
  if (!chatbotId) {
    console.error('LinkAI Chatbot: No chatbotId provided in configuration');
    return;
  }
  
  // Create styles
  const styles = document.createElement('style');
  styles.innerHTML = `
    .linkai-chatbot-widget {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 9999;
    }
    
    .linkai-chatbot-button {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background-color: #4f46e5;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      transition: all 0.2s ease-in-out;
    }
    
    .linkai-chatbot-button:hover {
      transform: scale(1.05);
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
    }
    
    .linkai-chatbot-icon {
      width: 30px;
      height: 30px;
    }
    
    .linkai-chatbot-window {
      position: fixed;
      bottom: 90px;
      right: 20px;
      width: 380px;
      height: 600px;
      background-color: white;
      border-radius: 10px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      overflow: hidden;
      display: none;
      z-index: 9999;
      border: 1px solid #e2e8f0;
    }
    
    .linkai-chatbot-window.open {
      display: block;
    }
    
    .linkai-chatbot-iframe {
      width: 100%;
      height: 100%;
      border: none;
    }
    
    @media (max-width: 480px) {
      .linkai-chatbot-window {
        width: calc(100% - 40px);
        height: calc(100% - 140px);
      }
    }
  `;
  document.head.appendChild(styles);
  
  // Create widget container
  const widget = document.createElement('div');
  widget.className = 'linkai-chatbot-widget';
  
  // Create button
  const button = document.createElement('div');
  button.className = 'linkai-chatbot-button';
  button.innerHTML = `
    <svg class="linkai-chatbot-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
    </svg>
  `;
  
  // Create chat window
  const chatWindow = document.createElement('div');
  chatWindow.className = 'linkai-chatbot-window';
  
  // Create iframe
  const baseUrl = window.location.origin;
  const iframe = document.createElement('iframe');
  iframe.className = 'linkai-chatbot-iframe';
  iframe.src = `${baseUrl}/embed/${chatbotId}/window?theme=${theme}`;
  iframe.allowFullscreen = true;
  iframe.allow = 'clipboard-read; clipboard-write';
  
  // Add elements to DOM
  chatWindow.appendChild(iframe);
  widget.appendChild(button);
  widget.appendChild(chatWindow);
  document.body.appendChild(widget);
  
  // Toggle chat window
  button.addEventListener('click', () => {
    chatWindow.classList.toggle('open');
    
    // If opening the chat, focus the iframe
    if (chatWindow.classList.contains('open')) {
      setTimeout(() => {
        iframe.focus();
      }, 100);
    }
  });
  
  // Close chat when clicking outside
  document.addEventListener('click', (event) => {
    const isClickInside = widget.contains(event.target);
    
    if (!isClickInside && chatWindow.classList.contains('open')) {
      chatWindow.classList.remove('open');
    }
  });
  
  // Prevent propagation of clicks inside the widget
  widget.addEventListener('click', (event) => {
    event.stopPropagation();
  });
  
  // Message event listener for cross-iframe communication
  window.addEventListener('message', (event) => {
    // Add security check for origin if needed
    if (event.data.type === 'LINKAI_CLOSE_CHAT') {
      chatWindow.classList.remove('open');
    }
  });

  console.log('LinkAI Chatbot Widget initialized successfully');
})(); 