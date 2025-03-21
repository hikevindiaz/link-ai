document.addEventListener("DOMContentLoaded", function () {
    (function () {
      if (!window.chatbotConfig || !window.chatbotConfig.chatbotId) {
        console.error("Chatbot configuration is missing. Please set window.chatbotConfig.chatbotId.");
        return;
      }
  
      var chatbotId = window.chatbotConfig.chatbotId;
    var apiUrl = window.chatbotConfig.apiUrl || "https://dashboard.getlinkai.com";
    // Separate gradient colors for sphere and border
    var sphereGradientColors = window.chatbotConfig.sphereGradientColors || ["#022597", "#000001", "#1a56db"]; // For the sphere
    var borderGradientColors = window.chatbotConfig.borderGradientColors || ["#2563EB", "#7E22CE", "#F97316"]; // For the border
    var chatbotName = window.chatbotConfig.chatbotName || "Link AI Smart Agent";
    var logoUrl = window.chatbotConfig.logoUrl || null;
    var textColor = window.chatbotConfig.textColor || "#000000";
    var backgroundColor = window.chatbotConfig.backgroundColor || "#FFFFFF";
    var message = window.chatbotConfig.message || "Hi, let's talk";
    var maxButtonWidth = window.chatbotConfig.maxButtonWidth || 320;
    var minButtonWidth = window.chatbotConfig.minButtonWidth || 180;
    
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
    
    // Add CSS for animations
    var styleElement = document.createElement('style');
    styleElement.textContent = `
      @property --border-angle {
        syntax: '<angle>';
        initial-value: 0deg;
        inherits: false;
      }
      
      @keyframes border {
        to {
          --border-angle: 360deg;
        }
      }
      
      .animate-border {
        animation: border 4s linear infinite;
      }
      
      @keyframes profileGradient {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }
      
      .animate-profileGradient {
        animation: profileGradient 5s ease infinite;
      }
    `;
    document.head.appendChild(styleElement);
    
    // Create button wrapper for animation
    var buttonWrapper = document.createElement('div');
    buttonWrapper.id = "openassistantgpt-button-wrapper";
    buttonWrapper.style = "position: relative; margin-right: 0.75rem; margin-bottom: 0.75rem;";
    widgetContainer.appendChild(buttonWrapper);
    
    // Extract colors for conic gradient (border)
    var color1 = borderGradientColors[0];
    var color2 = borderGradientColors[1];
    var color3 = borderGradientColors[2];
    
    // Create simplified conic gradient for border
    var conicGradient = `conic-gradient(from var(--border-angle), ${color1}, ${color2}, ${color3}, ${color2}, ${color1})`;
    
    // Calculate button width and determine if text needs truncation
    function calculateButtonDimensions(fullMessage) {
      // Create a temporary span to measure text width
      var tempSpan = document.createElement('span');
      tempSpan.style.visibility = 'hidden';
      tempSpan.style.position = 'absolute';
      tempSpan.style.whiteSpace = 'nowrap';
      tempSpan.style.fontSize = '1rem';
      tempSpan.style.fontWeight = 'bold';
      tempSpan.textContent = fullMessage;
      document.body.appendChild(tempSpan);
      
      var fullTextWidth = tempSpan.offsetWidth;
      
      var logoWidth = 36; // Logo width
      var padding = 24; // Left and right padding
      var gap = 8; // Gap between logo and text
      var emojiWidth = 20; // Emoji width
      var margin = 24; // Extra margin
      
      var requiredWidth = fullTextWidth + logoWidth + padding + gap + emojiWidth + margin;
      var displayedMessage = fullMessage;
      var calculatedWidth = requiredWidth;
      
      // If text is too long, truncate it
      if (requiredWidth > maxButtonWidth) {
        var maxChars = fullMessage.length;
        
        while (maxChars > 0) {
          var truncatedMessage = fullMessage.substring(0, maxChars) + "...";
          tempSpan.textContent = truncatedMessage;
          
          var truncatedWidth = tempSpan.offsetWidth;
          var truncatedRequiredWidth = truncatedWidth + logoWidth + padding + gap + emojiWidth + margin;
          
          if (truncatedRequiredWidth <= maxButtonWidth) {
            displayedMessage = truncatedMessage;
            calculatedWidth = truncatedRequiredWidth;
            break;
          }
          
          maxChars--;
        }
      }
      
      document.body.removeChild(tempSpan);
      
      // Ensure button is at least minButtonWidth
      calculatedWidth = Math.max(Math.min(calculatedWidth, maxButtonWidth), minButtonWidth);
      
      return {
        width: calculatedWidth,
        displayedMessage: displayedMessage
      };
    }
    
    var buttonDimensions = calculateButtonDimensions(message);
    var calculatedWidth = buttonDimensions.width;
    var displayedMessage = buttonDimensions.displayedMessage;
    
    // Create chat button (initial state)
    var chatButton = document.createElement('div');
    chatButton.id = "openassistantgpt-chat-button";
    chatButton.className = "animate-border";
    chatButton.style = "position: relative; cursor: pointer; width: " + calculatedWidth + "px; min-width: " + minButtonWidth + "px; max-width: " + maxButtonWidth + "px; border-radius: 16px; padding: 1px; background: " + conicGradient + "; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); transition: all 0.3s ease; transform-origin: right bottom;";
    
    // Create button inner
    var chatButtonInner = document.createElement('div');
    chatButtonInner.style = "display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 0.75rem; border-radius: 14px; background-color: " + backgroundColor + "; width: 100%;";
    
    // Create logo container
    var logoContainer = document.createElement('div');
    logoContainer.style = "width: 2.25rem; height: 2.25rem; border-radius: 9999px; overflow: hidden; position: relative; flex-shrink: 0; display: flex; align-items: center; justify-center;";
    
    // Add logo image or gradient sphere
    if (logoUrl) {
      // Use provided logo
      var logoImg = document.createElement('img');
      logoImg.src = logoUrl;
      logoImg.alt = chatbotName;
      logoImg.style = "width: 100%; height: 100%; object-fit: cover;";
      logoContainer.appendChild(logoImg);
    } else {
      // Create gradient agent sphere with sphere colors
      var gradientSphere = document.createElement('div');
      gradientSphere.className = "animate-profileGradient";
      gradientSphere.style = "width: 100%; height: 100%; border-radius: 50%; background-size: 200% 200%; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);";
      
      // Set gradient colors for the sphere
      var gradientDirection = "to bottom right";
      var sphereGradientString = sphereGradientColors.join(', ');
      gradientSphere.style.backgroundImage = `linear-gradient(${gradientDirection}, ${sphereGradientString})`;
      
      logoContainer.appendChild(gradientSphere);
    }
    
    chatButtonInner.appendChild(logoContainer);
    
    // Create text container
    var textContainer = document.createElement('div');
    textContainer.style = "display: flex; flex-direction: column; margin-top: -4px; min-width: 0; flex-grow: 1;";
    
    var title = document.createElement('span');
    title.style = "font-size: 10px; opacity: 0.7; color: " + textColor + "; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;";
    title.textContent = chatbotName;
    
    var messageContainer = document.createElement('div');
    messageContainer.style = "display: flex; align-items: center; margin-top: -4px;";
    
    var messageElement = document.createElement('span');
    messageElement.style = "font-size: 1rem; font-weight: bold; color: " + textColor + "; white-space: nowrap;";
    messageElement.textContent = displayedMessage;
    
    var emoji = document.createElement('span');
    emoji.style = "margin-left: 0.25rem; font-size: 1rem; flex-shrink: 0;";
    emoji.textContent = "👋";
    emoji.setAttribute("role", "img");
    emoji.setAttribute("aria-label", "wave");
    
    messageContainer.appendChild(messageElement);
    messageContainer.appendChild(emoji);
    
    textContainer.appendChild(title);
    textContainer.appendChild(messageContainer);
    chatButtonInner.appendChild(textContainer);
    
    chatButton.appendChild(chatButtonInner);
    buttonWrapper.appendChild(chatButton);
    
    // Create close button
    var closeButton = document.createElement('div');
    closeButton.id = "openassistantgpt-close-button";
    closeButton.className = "animate-border";
    closeButton.style = "position: absolute; right: 0; bottom: 0; cursor: pointer; width: 48px; height: 48px; border-radius: 50%; padding: 1px; background: " + conicGradient + "; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); transition: all 0.3s ease; transform-origin: center; opacity: 0; transform: scale(0); pointer-events: none;";
    
    var closeButtonInner = document.createElement('div');
    closeButtonInner.style = "display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; border-radius: 50%; background-color: " + backgroundColor + ";";
    
    // Create X icon
    var xIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    xIcon.setAttribute("width", "20");
    xIcon.setAttribute("height", "20");
    xIcon.setAttribute("viewBox", "0 0 24 24");
    xIcon.setAttribute("fill", "none");
    xIcon.setAttribute("stroke", textColor);
    xIcon.setAttribute("stroke-width", "2");
    xIcon.setAttribute("stroke-linecap", "round");
    xIcon.setAttribute("stroke-linejoin", "round");
    xIcon.style.transition = "transform 0.3s ease";
    xIcon.innerHTML = '<line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>';
    
    closeButtonInner.appendChild(xIcon);
    closeButton.appendChild(closeButtonInner);
    buttonWrapper.appendChild(closeButton);
    
    // Set initial dimensions for the wrapper
    buttonWrapper.style.width = chatButton.offsetWidth + "px";
    buttonWrapper.style.height = chatButton.offsetHeight + "px";
    
    // Toggle chat visibility
    var isChatVisible = false;
    var isTransitioning = false;
    
    function toggleChat() {
        if (isTransitioning) return;
        isTransitioning = true;
        
        var newVisibility = !isChatVisible;
        
        if (newVisibility) {
            // Transitioning to open state
            
            // Prepare the wrapper for the transition
            buttonWrapper.style.height = "48px";
            
            // Start animation
            chatButton.style.opacity = "0";
            chatButton.style.transform = "scale(0)";
            chatButton.style.pointerEvents = "none";
            
            // Show close button immediately but animate its appearance
            closeButton.style.pointerEvents = "auto";
            closeButton.style.opacity = "1";
            closeButton.style.transform = "scale(1)";
            
            // Show chat window after button transition
            setTimeout(function() {
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
            }, 150);
        } else {
            // Transitioning to closed state
            
            // Hide chat window with animation
            chatContainer.style.opacity = "0";
            chatContainer.style.transform = "translateY(10px)";
            
            // Animate X icon
            xIcon.style.transform = "rotate(90deg)";
            
            // Start animation
            closeButton.style.opacity = "0";
            closeButton.style.transform = "scale(0)";
            closeButton.style.pointerEvents = "none";
            
            // Show chat button
            chatButton.style.pointerEvents = "auto";
            chatButton.style.opacity = "1";
            chatButton.style.transform = "scale(1)";
            
            // Reset wrapper height
            buttonWrapper.style.height = chatButton.offsetHeight + "px";
            
            setTimeout(function() {
                // Reset X icon rotation for next time
                xIcon.style.transform = "rotate(0deg)";
                
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
    
    // Add click event listeners
    chatButton.addEventListener('click', toggleChat);
    closeButton.addEventListener('click', toggleChat);
    
    // Handle window resize
    window.addEventListener('resize', function() {
        if (!isTransitioning) {
            if (isChatVisible) {
                buttonWrapper.style.height = "48px";
                
            if (window.innerWidth < 640) {
                    chatContainer.style.width = "calc(100vw - 2rem)";
                    chatContainer.style.height = "calc(100vh - 7rem)";
                } else {
                    chatContainer.style.width = "30rem";
                    chatContainer.style.height = "65vh";
                }
            } else {
                buttonWrapper.style.width = chatButton.offsetWidth + "px";
                buttonWrapper.style.height = chatButton.offsetHeight + "px";
            }
        }
    });
    
    // Initial size adjustment
    window.addEventListener('load', function() {
        buttonWrapper.style.width = chatButton.offsetWidth + "px";
        buttonWrapper.style.height = chatButton.offsetHeight + "px";
    });
    })();
  });