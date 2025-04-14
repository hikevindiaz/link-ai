# 🚀 Link AI - Human-First, AI-Powered

Welcome to **Link AI**, the platform designed to empower businesses by automating repetitive tasks through intelligent, conversational **agents**. Whether you're streamlining customer support, generating leads, managing orders, or scheduling appointments, Link AI provides the tools you need to automate conversations and enhance business efficiency.

---

## 🌟 Key Features

- **Conversational Agents (AI)**  
  Deploy smart, customizable agents that serve as the first point of contact across channels including SMS, web, and social platforms. These agents can chat and extract data to streamline your business operations. :contentReference[oaicite:0]{index=0}

- **Omnichannel Support**  
  Engage with customers via Web Widget, SMS, WhatsApp, and Voice, all connected through a unified agent, ensuring consistent communication across platforms.

- **Simple Onboarding Flow**  
  Create your account, connect your data, and launch your AI agent to start automating success. No coding required. :contentReference[oaicite:1]{index=1}

- **Lead Generation & CRM Integration**  
  Capture and sync high-quality leads to tools like Google Calendar, Monday.com, and Stripe, facilitating seamless workflow integration. :contentReference[oaicite:2]{index=2}

- **Ordering System (POS Ready)**  
  Enable customers to schedule pickups or deliveries through simple SMS or social platforms like Instagram. Integrate with your POS or Shopify to gather the latest data and direct orders to your team. :contentReference[oaicite:3]{index=3}

- **Appointment Scheduling**  
  Integrate seamlessly with your calendar to automate bookings and reminders, enhancing customer experience and operational efficiency.

- **Customer Support 24/7**  
  Reduce response time and increase satisfaction with AI-powered support agents, providing round-the-clock assistance to your customers.

## Voice Interface

The application includes a low-latency voice interface that allows users to interact with the AI assistant through speech.

### Features

- Real-time speech-to-text using OpenAI's Whisper model
- Fast text-to-speech using ElevenLabs Flash v2.5 model for minimal latency
- Voice activity detection (VAD) for natural conversation flow
- Animated visual feedback using Rive animations
- Proper error handling and recovery

### Implementation

The voice interface is implemented using:

- WebSockets for real-time text-to-speech streaming 
- MediaRecorder API for audio capture
- AudioContext API for audio processing and level detection
- React hooks for state management

### Usage

To start a voice conversation, click the "Voice" button in the chat header, then click "Start Voice Call". 
The system will play a welcome message and then begin listening for your voice input.

### Development

The main components and hooks for the voice interface are:

- `useVoiceInterfaceV2`: Core hook that handles voice state management (in `hooks/use-voice-interface-v2.tsx`)
- `VoiceInterfaceV2`: UI component for voice interaction (in `components/chat-interface/voice-interface-v2.tsx`)
- `RiveVoiceOrb`: Animated visualization component (in `components/chat-interface/rive-voice-orb.tsx`)

Voice API endpoints:
- `/api/voice-credentials`: Provides secure WebSocket endpoints and credentials
- `/api/openai/stt`: Handles speech-to-text processing using OpenAI Whisper

---

## 🧠 Why Link AI?

✅ **No Technical Skills Required**  
✅ **Plug-and-Play Setup**  
✅ **Add-On Features for Any Need**  
✅ **Built-in Analytics**  
✅ **Custom Branding (White Label Available)**

---

## 💼 Plans & Pricing

For detailed information on plans and pricing, please visit our [Pricing Page](https://getlinkai.com).

---

## 🧭 Roadmap

- [x] Web Widget Deployment  
- [x] Multi-Agent System  
- [x] CRM Sync + Zapier Support  
- [ ] Webflow App Integration  
- [ ] Self-Serve Onboarding with Templates  
- [ ] Advanced Analytics Dashboard  
- [ ] POS Integrations (Square, Toast, etc.)

---

## 📩 Contact & Support

Got questions? Need help setting up your agents?  
Reach out to our team at [support@getlinkai.com](mailto:support@getlinkai.com) or visit [www.getlinkai.com](https://getlinkai.com).

---

## 🧠 Built with ❤️ by the Evermedia Corp team

Link AI is the result of years of experience in automation, sales, and client success — empowering businesses to thrive in the AI age.

