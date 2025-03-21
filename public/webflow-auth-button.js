// Auth Button Controller for Webflow landing page
document.addEventListener('DOMContentLoaded', function() {
  const authButtons = document.querySelectorAll('[data-auth-button]');
  const appUrl = 'https://dashboard.getlinkai.com';
  const loginUrl = `${appUrl}/login`;
  const dashboardUrl = `${appUrl}/dashboard`;
  
  // User circle icon SVG - consistent for all states
  const userIcon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z" stroke="currentColor" stroke-width="2"/><path d="M20 21C20 16.5817 16.4183 13 12 13C7.58172 13 4 16.5817 4 21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  
  // Button states with header-friendly options
  const states = {
    loading: {
      text: '',
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

  // Check authentication status
  async function checkAuthStatus() {
    try {
      // Initial button state
      updateButtons(states.loading);
      
      const response = await fetch('https://dashboard.getlinkai.com/api/auth/status', {
        method: 'GET',
        credentials: 'include'
      });
      
      if (!response.ok) throw new Error('Failed to check auth status');
      
      const data = await response.json();
      
      // Update button based on auth status
      if (data.isLoggedIn) {
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
        updateButtons(states.loggedOut);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
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
    });
  }
  
  // Check auth status when page loads
  if (authButtons.length > 0) {
    checkAuthStatus();
    
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
  }
}); 