document.addEventListener("DOMContentLoaded", function () {
    (function () {
      if (!window.chatbotConfig || !window.chatbotConfig.chatbotId) {
        console.error("Chatbot configuration is missing. Please set window.chatbotConfig.chatbotId.");
        return;
      }
  
      var chatbotId = window.chatbotConfig.chatbotId;
      var apiUrl = window.chatbotConfig.apiUrl || "https://dashboard.getlinkai.com";
      var riveOrbColor = window.chatbotConfig.riveOrbColor;
      var borderGradientColors = window.chatbotConfig.borderGradientColors || ["#4F46E5", "#4338CA", "#6366F1"]; // Default to neutral
      
      // Create container for the widget
      var widgetContainer = document.createElement('div');
      widgetContainer.id = "openassistantgpt-widget-container";
      widgetContainer.style = "position: fixed; bottom: 0; right: 0; z-index: 9999; display: flex; flex-direction: column; align-items: flex-end;";
      document.body.appendChild(widgetContainer);
      
      // Create chat window container
      var chatContainer = document.createElement('div');
      chatContainer.id = "openassistantgpt-chat-container";
      chatContainer.style = "margin-right: 0.75rem; margin-bottom: 0.75rem; display: none; width: 30rem; height: 65vh; border: 2px solid #e2e8f0; border-radius: 0.5rem; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); transition: all 0.3s ease; background-color: white;";
      
      // Create chat iframe
      var chatIframe = document.createElement('iframe');
      chatIframe.src = apiUrl + "/embed/" + chatbotId + "/window?chatbox=false&withExitX=true";
      chatIframe.style = "width: 100%; height: 100%; border: 0;";
      chatIframe.allowFullscreen = true;
      chatIframe.id = "openassistantgpt-chatbot-iframe";
      
      chatContainer.appendChild(chatIframe);
      widgetContainer.appendChild(chatContainer);
      
      // Create button wrapper for animation
      var buttonWrapper = document.createElement('div');
      buttonWrapper.id = "openassistantgpt-button-wrapper";
      buttonWrapper.style = "position: relative; margin-right: 0.75rem; margin-bottom: 0.75rem;";
      widgetContainer.appendChild(buttonWrapper);
      
      // Create button iframe with Rive orb
      var buttonIframe = document.createElement('iframe');
      var buttonParams = new URLSearchParams();
      buttonParams.append('useRiveOrb', 'true');
      if (riveOrbColor !== undefined) {
        buttonParams.append('riveOrbColor', riveOrbColor);
      }
      
      // Add borderGradientColors to params if available
      if (borderGradientColors && borderGradientColors.length) {
        buttonParams.append('borderGradientColors', JSON.stringify(borderGradientColors));
      }
      
      buttonIframe.src = apiUrl + "/embed/" + chatbotId + "/button?" + buttonParams.toString();
      buttonIframe.style = "border: 0; background: transparent; position: absolute; bottom: 0; right: 0; width: 320px; height: 80px; overflow: hidden;";
      buttonIframe.allowFullscreen = true;
      buttonIframe.id = "openassistantgpt-chatbot-button-iframe";
      buttonWrapper.appendChild(buttonIframe);
      
      // Toggle chat visibility
      var isChatVisible = false;
      var isTransitioning = false;
      
      // Handle messages from iframes
      window.addEventListener('message', function(event) {
        if (event.data === 'openChat') {
          if (!isChatVisible && !isTransitioning) {
            isTransitioning = true;
            
            // Show chat window
            chatContainer.style.display = "block";
            
            // Check if mobile
            if (window.innerWidth < 640) {
              chatContainer.style.width = "calc(100vw - 2rem)";
              chatContainer.style.height = "calc(100vh - 7rem)";
              chatContainer.style.position = "fixed";
              chatContainer.style.bottom = "5rem";
              chatContainer.style.right = "1rem";
            }
            
            // Add animation
            setTimeout(function() {
              chatContainer.style.opacity = "1";
              chatContainer.style.transform = "translateY(0)";
            }, 10);
            
            // Send message to iframe
            chatIframe.contentWindow.postMessage("openChat", "*");
            
            isChatVisible = true;
            setTimeout(function() {
              isTransitioning = false;
            }, 300);
          }
        } else if (event.data === 'closeChat') {
          if (isChatVisible && !isTransitioning) {
            isTransitioning = true;
            
            // Hide chat window with animation
            chatContainer.style.opacity = "0";
            chatContainer.style.transform = "translateY(10px)";
            
            setTimeout(function() {
              chatContainer.style.display = "none";
              
              // Send message to iframe
              chatIframe.contentWindow.postMessage("closeChat", "*");
              
              isChatVisible = false;
              setTimeout(function() {
                isTransitioning = false;
              }, 300);
            }, 150);
          }
        }
      });
      
      // Handle window resize
      window.addEventListener('resize', function() {
        if (!isTransitioning && isChatVisible) {
          if (window.innerWidth < 640) {
            chatContainer.style.width = "calc(100vw - 2rem)";
            chatContainer.style.height = "calc(100vh - 7rem)";
          } else {
            chatContainer.style.width = "30rem";
            chatContainer.style.height = "65vh";
          }
        }
      });
    })();
  });