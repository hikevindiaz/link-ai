import React, { useState, useEffect } from 'react';
import { RiCloseLine, RiArrowRightLine, RiFileTextLine, RiGlobalLine, RiQuestionLine, RiShoppingBagLine } from '@remixicon/react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { WelcomeModal } from './WelcomeModal';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface StepStatus {
  completed: boolean;
  nextUrl: string;
  buttonText: string;
  disabled?: boolean;
}

interface WelcomeBannerProps {
  borderGradient?: boolean;
  borderGradientColors?: string[];
}

const WelcomeBanner = ({
  borderGradient = true,
  borderGradientColors = ["#2563EB", "#7E22CE", "#F97316"], // Blue, Purple, Orange for the border
}: WelcomeBannerProps = {}) => {
  const router = useRouter();
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [showKnowledgeDialog, setShowKnowledgeDialog] = useState(false);
  const [activeStepForModal, setActiveStepForModal] = useState(0);
  const [stepStatus, setStepStatus] = useState<{
    onboarding: StepStatus;
    knowledge: StepStatus;
    agent: StepStatus;
  }>({
    onboarding: { completed: false, nextUrl: '/onboarding', buttonText: 'Complete onboarding' },
    knowledge: { completed: false, nextUrl: '/dashboard/knowledge-base/', buttonText: 'Add knowledge' },
    agent: { completed: false, nextUrl: '/dashboard/agents/', buttonText: 'Create agent' },
  });

  // Check if the banner should be shown based on localStorage
  useEffect(() => {
    const bannerDismissed = localStorage.getItem('welcomeBannerDismissed');
    if (bannerDismissed === 'true') {
      setIsOpen(false);
      return;
    }

    // Also hide banner if all steps are completed
    const hasCompletedOnboarding = localStorage.getItem('hasCompletedOnboarding') === 'true';
    const hasKnowledge = localStorage.getItem('hasKnowledgeSource') === 'true';
    const hasAgent = localStorage.getItem('hasChatbot') === 'true';
    
    if (hasCompletedOnboarding && hasKnowledge && hasAgent) {
      setIsOpen(false);
    }
  }, []);

  // Fetch user data to check completed steps
  useEffect(() => {
    if (!session?.user?.id) return;

    const fetchUserData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/user/welcome-status');
        const data = await response.json();

        if (data.success) {
          // Update localStorage based on server response
          localStorage.setItem('hasCompletedOnboarding', data.onboardingCompleted ? 'true' : 'false');
          localStorage.setItem('hasKnowledgeSource', data.hasKnowledgeSource ? 'true' : 'false');
          localStorage.setItem('hasChatbot', data.hasChatbot ? 'true' : 'false');
          
          setStepStatus({
            onboarding: {
              completed: data.onboardingCompleted,
              nextUrl: data.onboardingCompleted ? '/dashboard' : '/onboarding',
              buttonText: data.onboardingCompleted ? 'Completed' : 'Complete onboarding'
            },
            knowledge: {
              completed: data.hasKnowledgeSource,
              nextUrl: '/dashboard/knowledge-base',
              buttonText: data.hasKnowledgeSource ? 'Completed' : 'Add knowledge'
            },
            agent: {
              completed: data.hasChatbot,
              nextUrl: '/dashboard/agents',
              buttonText: data.hasChatbot ? 'Completed' : 'Create agent'
            }
          });

          // If all steps are completed, hide the banner
          if (data.onboardingCompleted && data.hasKnowledgeSource && data.hasChatbot) {
            setIsOpen(false);
          }
        }
      } catch (error) {
        console.error('Error fetching welcome status:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [session]);

  // Also check onboarding status when modal is closed to update banner
  useEffect(() => {
    // This effect only runs once when the modal closes
    if (!showWelcomeModal && session?.user?.id) {
      // Use localStorage value first for immediate feedback
      const hasCompletedOnboardingFromStorage = localStorage.getItem('hasCompletedOnboarding') === 'true';
      
      if (hasCompletedOnboardingFromStorage) {
        setStepStatus(prev => ({
          ...prev,
          onboarding: {
            ...prev.onboarding,
            completed: true,
            buttonText: 'Completed'
          }
        }));
      }
    }
  }, [showWelcomeModal]); // Removed session as dependency to avoid multiple triggers

  const handleDismiss = () => {
    localStorage.setItem('welcomeBannerDismissed', 'true');
    setIsOpen(false);
  };

  const handleAction = (url: string, stepType: 'onboarding' | 'knowledge' | 'agent') => {
    // For onboarding step, check if already completed
    if (stepType === 'onboarding' && stepStatus.onboarding.completed) {
      toast.info('You have already completed onboarding');
      return;
    }
    
    // For knowledge step, check if onboarding is completed first
    if (stepType === 'knowledge' && !stepStatus.onboarding.completed) {
      toast.warning('Please complete onboarding first');
      router.push('/onboarding');
      return;
    }
    
    // For agent step, check if knowledge step is completed first
    if (stepType === 'agent' && !stepStatus.knowledge.completed) {
      toast.warning('Please add knowledge sources first');
      router.push('/dashboard/knowledge-base');
      return;
    }
    
    // If it's the knowledge step and onboarding is complete, show the knowledge source dialog
    if (stepType === 'knowledge' && !stepStatus.knowledge.completed) {
      setShowKnowledgeDialog(true);
      return;
    }
    
    // Otherwise, redirect to the appropriate page
    router.push(url);
  };

  // Close modal callback to refresh banner state
  const handleModalClose = (open: boolean) => {
    setShowWelcomeModal(open);
    
    // Only fetch updated status if the modal was closed
    if (!open && session?.user?.id) {
      // Add a slight delay to prevent rapid state updates
      setTimeout(() => {
        fetchUserData();
      }, 300);
    }
  };

  // Extract fetchUserData as a separate function to avoid duplication
  const fetchUserData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/user/welcome-status');
      const data = await response.json();

      if (data.success) {
        // Update localStorage based on server response
        localStorage.setItem('hasCompletedOnboarding', data.onboardingCompleted ? 'true' : 'false');
        localStorage.setItem('hasKnowledgeSource', data.hasKnowledgeSource ? 'true' : 'false');
        localStorage.setItem('hasChatbot', data.hasChatbot ? 'true' : 'false');
        
        setStepStatus({
          onboarding: {
            completed: data.onboardingCompleted,
            nextUrl: data.onboardingCompleted ? '/dashboard' : '/onboarding',
            buttonText: data.onboardingCompleted ? 'Completed' : 'Complete onboarding'
          },
          knowledge: {
            completed: data.hasKnowledgeSource,
            nextUrl: '/dashboard/knowledge-base',
            buttonText: data.hasKnowledgeSource ? 'Completed' : 'Add knowledge'
          },
          agent: {
            completed: data.hasChatbot,
            nextUrl: '/dashboard/agents',
            buttonText: data.hasChatbot ? 'Completed' : 'Create agent'
          }
        });

        // If all steps are completed, hide the banner
        if (data.onboardingCompleted && data.hasKnowledgeSource && data.hasChatbot) {
          setIsOpen(false);
        }
      }
    } catch (error) {
      console.error('Error fetching welcome status:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || loading) return null;

  const steps = [
    {
      step: 1,
      title: 'Complete Onboarding',
      description: 'Set up your account with personal and business information.',
      ...stepStatus.onboarding
    },
    {
      step: 2,
      title: 'Create Knowledge Source',
      description: 'Add documents, websites, or Q&A to train your AI agents.',
      ...stepStatus.knowledge,
      disabled: !stepStatus.onboarding.completed
    },
    {
      step: 3,
      title: 'Create an Agent',
      description: 'Build an AI assistant powered by your knowledge sources.',
      ...stepStatus.agent,
      disabled: !stepStatus.knowledge.completed
    }
  ];

  // Create gradient colors for conic gradient (border)
  const [color1, color2, color3] = borderGradientColors;

  return (
    <div className="mb-8">
      {/* Welcome Modal */}
      <WelcomeModal 
        isOpen={showWelcomeModal} 
        onOpenChange={handleModalClose} 
        initialStep={activeStepForModal} 
      />

      {/* Knowledge Source Dialog */}
      {showKnowledgeDialog && (
        <Dialog open={showKnowledgeDialog} onOpenChange={setShowKnowledgeDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Your First Knowledge Source</DialogTitle>
              <DialogDescription>
                Knowledge Sources are the foundation of your AI agents. They contain all the information your agents will use to answer questions and help your customers.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6 mt-6">
              <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 dark:text-gray-50 mb-3">
                  What is a Knowledge Source?
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  A Knowledge Source is a collection of information that trains your AI agents. Think of it as the brain of your AI - the more comprehensive and organized your knowledge sources, the better your agents can assist customers.
                </p>
                
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <RiFileTextLine className="h-5 w-5 text-indigo-600 dark:text-indigo-400 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-gray-50">Documents & PDFs</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Upload product manuals, FAQs, policies, and guides
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <RiGlobalLine className="h-5 w-5 text-indigo-600 dark:text-indigo-400 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-gray-50">Websites</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Import content from your website, help center, or blog
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <RiQuestionLine className="h-5 w-5 text-indigo-600 dark:text-indigo-400 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-gray-50">Q&A Pairs</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Create custom questions and answers for specific scenarios
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <RiShoppingBagLine className="h-5 w-5 text-indigo-600 dark:text-indigo-400 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-gray-50">Product Catalogs</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Import your product inventory with descriptions and images
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <Button
                  variant="ghost"
                  onClick={() => setShowKnowledgeDialog(false)}
                >
                  Maybe later
                </Button>
                <Button
                  onClick={() => {
                    setShowKnowledgeDialog(false);
                    router.push('/dashboard/knowledge-base');
                  }}
                >
                  Create Knowledge Source
                  <RiArrowRightLine className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {borderGradient ? (
        <div className="gradient-border-wrapper">
          <Card className="relative p-6 gradient-border-content">
            <div className="absolute right-0 top-0 pr-3 pt-3">
              <Button
                className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-500 hover:dark:text-gray-300"
                variant="ghost"
                onClick={handleDismiss}
                aria-label="Close"
              >
                <RiCloseLine className="h-5 w-5 shrink-0" aria-hidden={true} />
              </Button>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
              Welcome to Link AI
            </h3>
            <p className="mt-2 text-sm/6 text-gray-500 dark:text-gray-500">
              Get started with Link AI in just three steps. Complete your account setup, add knowledge sources, and create your first AI agent.
            </p>
            <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-3">
              {steps.map((item) => (
                <div
                  key={item.title}
                  className={`flex flex-col justify-between border-l-2 py-1 pl-4 ${
                    item.completed
                      ? 'border-green-200 dark:border-green-400/20'
                      : 'border-blue-100 dark:border-blue-400/20'
                  }`}
                >
                  <div>
                    <span 
                      className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold ${
                        item.completed 
                          ? 'bg-green-50 text-green-600 dark:bg-green-400/20 dark:text-green-500' 
                          : 'bg-blue-50 text-blue-500 dark:bg-blue-400/20 dark:text-blue-500'
                      }`}
                    >
                      {item.completed ? 'Completed' : `Step ${item.step}`}
                    </span>
                    <h4 className="mt-4 text-sm font-medium text-gray-900 dark:text-gray-50">
                      {item.title}
                    </h4>
                    <p className="mt-2 text-sm/6 text-gray-500 dark:text-gray-500">
                      {item.description}
                    </p>
                  </div>
                  <Button 
                    disabled={item.disabled || item.completed}
                    className={`mt-6 ${item.completed ? 'bg-green-500 hover:bg-green-600' : ''}`}
                    onClick={() => handleAction(
                      item.nextUrl, 
                      item.title === 'Complete Onboarding' ? 'onboarding' : 
                      item.title === 'Create Knowledge Source' ? 'knowledge' : 'agent'
                    )}
                  >
                    {item.buttonText}
                    {!item.completed && <RiArrowRightLine className="ml-2 h-4 w-4" />}
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        </div>
      ) : (
        <Card className="relative p-6">
          <div className="absolute right-0 top-0 pr-3 pt-3">
            <Button
              className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-500 hover:dark:text-gray-300"
              variant="ghost"
              onClick={handleDismiss}
              aria-label="Close"
            >
              <RiCloseLine className="h-5 w-5 shrink-0" aria-hidden={true} />
            </Button>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
            Welcome to Link AI
          </h3>
          <p className="mt-2 text-sm/6 text-gray-500 dark:text-gray-500">
            Get started with Link AI in just three steps. Complete your account setup, add knowledge sources, and create your first AI agent.
          </p>
          <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-3">
            {steps.map((item) => (
              <div
                key={item.title}
                className={`flex flex-col justify-between border-l-2 py-1 pl-4 ${
                  item.completed
                    ? 'border-green-200 dark:border-green-400/20'
                    : 'border-blue-100 dark:border-blue-400/20'
                }`}
              >
                <div>
                  <span 
                    className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold ${
                      item.completed 
                        ? 'bg-green-50 text-green-600 dark:bg-green-400/20 dark:text-green-500' 
                        : 'bg-blue-50 text-blue-500 dark:bg-blue-400/20 dark:text-blue-500'
                    }`}
                  >
                    {item.completed ? 'Completed' : `Step ${item.step}`}
                  </span>
                  <h4 className="mt-4 text-sm font-medium text-gray-900 dark:text-gray-50">
                    {item.title}
                  </h4>
                  <p className="mt-2 text-sm/6 text-gray-500 dark:text-gray-500">
                    {item.description}
                  </p>
                </div>
                <Button 
                  disabled={item.disabled || item.completed}
                  className={`mt-6 ${item.completed ? 'bg-green-500 hover:bg-green-600' : ''}`}
                  onClick={() => handleAction(
                    item.nextUrl, 
                    item.title === 'Complete Onboarding' ? 'onboarding' : 
                    item.title === 'Create Knowledge Source' ? 'knowledge' : 'agent'
                  )}
                >
                  {item.buttonText}
                  {!item.completed && <RiArrowRightLine className="ml-2 h-4 w-4" />}
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* CSS for border animation */}
      <style jsx global>{`
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
        
        .gradient-border-wrapper {
          position: relative;
          border-radius: 8px;
          background: ${`conic-gradient(from var(--border-angle), ${color1}, ${color2}, ${color3}, ${color2}, ${color1})`};
          padding: 1px; /* Reduced from 2px to make the border thinner */
          animation: border 4s linear infinite;
        }
        
        .gradient-border-content {
          border-radius: 6px;
          background: var(--card-background);
          margin: 0;
          height: 100%;
          width: 100%;
        }
        
        :root {
          --card-background: white;
        }
        
        .dark {
          --card-background: hsl(var(--card));
        }
      `}</style>
    </div>
  );
};

export default WelcomeBanner; 