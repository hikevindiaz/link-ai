// DEBUG Auth Button Controller for Webflow landing page
document.addEventListener('DOMContentLoaded', function() {
  console.log('Auth button debug script loaded');
  
  const authButtons = document.querySelectorAll('[data-auth-button]');
  console.log('Found auth buttons:', authButtons.length);
  
  const appUrl = 'https://dashboard.getlinkai.com';
  const loginUrl = `${appUrl}/login`;
  const dashboardUrl = `${appUrl}/dashboard`;
  
  // User circle icon SVG - consistent for all states
  const userIcon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z" stroke="currentColor" stroke-width="2"/><path d="M20 21C20 16.5817 16.4183 13 12 13C7.58172 13 4 16.5817 4 21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  
  // Button states with header-friendly options
  const states = {
    loading: {
      text: 'Loading...',
      icon: '<div class="auth-button-spinner"></div>',
      class: 'auth-button-loading',
      href: '#'
    },
    loggedIn: {
      text: 'My Account',
      icon: userIcon,
      class: 'auth-button-logged-in',
      href: dashboardUrl
    },
    loggedOut: {
      text: 'Sign In',
      icon: userIcon,
      class: 'auth-button-logged-out',
      href: loginUrl
    }
  };

  // Add a debug notification to the page
  function addDebugNotification(message, isError = false) {
    console.log(message);
    
    const notification = document.createElement('div');
    notification.style.position = 'fixed';
    notification.style.bottom = '10px';
    notification.style.right = '10px';
    notification.style.padding = '10px';
    notification.style.background = isError ? '#ff5252' : '#4CAF50';
    notification.style.color = 'white';
    notification.style.borderRadius = '4px';
    notification.style.zIndex = '9999';
    notification.style.maxWidth = '300px';
    notification.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
    notification.innerText = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transition = 'opacity 0.5s ease';
      setTimeout(() => notification.remove(), 500);
    }, 5000);
  }

  // Check authentication status
  async function checkAuthStatus() {
    try {
      // Initial button state
      updateButtons(states.loading);
      addDebugNotification("Checking auth status...");
      
      // Testing direct access to the status endpoint
      const statusUrl = 'https://dashboard.getlinkai.com/api/auth/status';
      addDebugNotification(`Fetching from ${statusUrl}`);
      
      const response = await fetch(statusUrl, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      addDebugNotification(`Response status: ${response.status}`);
      
      if (!response.ok) {
        throw new Error(`Failed to check auth status: ${response.status}`);
      }
      
      const data = await response.json();
      addDebugNotification(`Auth response: ${JSON.stringify(data)}`);
      
      // Update button based on auth status
      if (data.isLoggedIn) {
        addDebugNotification(`User is logged in: ${data.user?.name || 'No name'}`);
        // Personalize with user's name if available
        if (data.user && data.user.name) {
          const firstName = data.user.name.split(' ')[0];
          const personalizedState = {...states.loggedIn};
          personalizedState.text = firstName;
          updateButtons(personalizedState);
        } else {
          updateButtons(states.loggedIn);
        }
      } else {
        addDebugNotification(`User is NOT logged in`, true);
        updateButtons(states.loggedOut);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      addDebugNotification(`Auth check error: ${error.message}`, true);
      // Default to logged out state if check fails
      updateButtons(states.loggedOut);
    }
  }
  
  // Update all auth buttons on the page
  function updateButtons(state) {
    authButtons.forEach(button => {
      // Support for icon + text or icon-only modes
      const showTextAttr = button.getAttribute('data-show-text');
      const showText = showTextAttr !== null ? showTextAttr !== 'false' : true;
      const showIconAttr = button.getAttribute('data-show-icon');
      const showIcon = showIconAttr !== null ? showIconAttr !== 'false' : true;
      
      // Set icon if enabled
      if (showIcon) {
        // Create icon container if it doesn't exist
        let iconContainer = button.querySelector('.auth-button-icon');
        if (!iconContainer) {
          iconContainer = document.createElement('span');
          iconContainer.className = 'auth-button-icon';
          button.prepend(iconContainer);
        }
        iconContainer.innerHTML = state.icon;
      }
      
      // Set text if enabled
      if (showText) {
        let textContainer = button.querySelector('.auth-button-text');
        if (!textContainer) {
          textContainer = document.createElement('span');
          textContainer.className = 'auth-button-text';
          showIcon ? button.appendChild(textContainer) : button.prepend(textContainer);
        }
        textContainer.textContent = state.text;
      }
      
      // Update href
      button.href = state.href;
      
      // Remove all state classes
      button.classList.remove(
        states.loading.class,
        states.loggedIn.class, 
        states.loggedOut.class
      );
      
      // Add current state class
      button.classList.add(state.class);
      
      addDebugNotification(`Button updated to state: ${state.text}`);
    });
  }
  
  // Check auth status when page loads
  if (authButtons.length > 0) {
    addDebugNotification("Auth button found, checking status...");
    checkAuthStatus();
    
    // Add a check cookie button for debugging
    const debugButton = document.createElement('button');
    debugButton.innerText = 'Check Auth Cookies';
    debugButton.style.position = 'fixed';
    debugButton.style.top = '10px';
    debugButton.style.right = '10px';
    debugButton.style.padding = '5px 10px';
    debugButton.style.zIndex = '9999';
    debugButton.style.cursor = 'pointer';
    debugButton.onclick = () => {
      addDebugNotification(`Current cookies: ${document.cookie}`);
      checkAuthStatus();
    };
    document.body.appendChild(debugButton);
    
    // Add CSS for spinner animation if not already present
    if (!document.getElementById('auth-button-styles')) {
      const style = document.createElement('style');
      style.id = 'auth-button-styles';
      style.textContent = `
        .auth-button-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          border-top-color: white;
          animation: auth-spin 0.8s linear infinite;
        }
        
        @keyframes auth-spin {
          to { transform: rotate(360deg); }
        }
        
        [data-auth-button] {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: background-color 0.2s ease, color 0.2s ease;
          transform: none !important; /* Prevent jumping on hover */
        }
        
        .auth-button-icon {
          display: flex;
          align-items: center;
        }
        
        /* Prevent any animations that might cause jumping */
        [data-auth-button]:hover {
          transform: none !important;
        }
      `;
      document.head.appendChild(style);
    }
  } else {
    console.warn('No auth buttons found on page');
  }
}); 