import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

interface RouteProps {
  params: {
    agentId: string;
  };
}

// GET /api/agents/[agentId]/actions - Retrieve all action configurations for an agent
export async function GET(request: Request, { params }: RouteProps) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { agentId } = params;
    if (!agentId) {
      return NextResponse.json({ error: 'Agent ID is required' }, { status: 400 });
    }

    // Check if agent belongs to the user
    const agent = await prisma.chatbot.findUnique({
      where: {
        id: agentId,
        userId: session.user.id,
      },
    });

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found or unauthorized' }, { status: 404 });
    }

    // Get all action configurations for the agent
    const actionConfigurations = await prisma.actionConfiguration.findMany({
      where: {
        agentId,
      },
      include: {
        calendarConfiguration: true,
      },
    });

    console.log(`[API DEBUG] Found ${actionConfigurations.length} action configs for agent: ${agentId}`);
    
    // Transform the data for easier consumption by the frontend
    const transformedActions = actionConfigurations.map(action => {
      let config = action.config as Record<string, any>;
      
      // If there's a calendar configuration, merge it with the config
      if (action.actionType === 'calendar' && action.calendarConfiguration) {
        console.log(`[API DEBUG] Found calendar config for action ${action.id}:`, action.calendarConfiguration);
        config = {
          ...config,
          defaultCalendarId: action.calendarConfiguration.defaultCalendarId,
          askForDuration: action.calendarConfiguration.askForDuration,
          askForNotes: action.calendarConfiguration.askForNotes,
          defaultDuration: action.calendarConfiguration.defaultDuration,
          bufferBetweenAppointments: action.calendarConfiguration.bufferBetweenAppointments,
          maxBookingsPerSlot: action.calendarConfiguration.maxBookingsPerSlot,
          minimumAdvanceNotice: action.calendarConfiguration.minimumAdvanceNotice,
          requirePhoneNumber: action.calendarConfiguration.requirePhoneNumber,
          defaultLocation: action.calendarConfiguration.defaultLocation,
          bookingPrompt: action.calendarConfiguration.bookingPrompt,
          confirmationMessage: action.calendarConfiguration.confirmationMessage,
        };
      }
      
      return {
        id: action.id,
        actionType: action.actionType,
        isEnabled: action.isEnabled,
        config,
      };
    });

    return NextResponse.json(transformedActions);
  } catch (error) {
    console.error('Error fetching action configurations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch action configurations' },
      { status: 500 }
    );
  }
}

// POST /api/agents/[agentId]/actions - Update action configurations for an agent
export async function POST(request: Request, { params }: RouteProps) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { agentId } = params;
    if (!agentId) {
      return NextResponse.json({ error: 'Agent ID is required' }, { status: 400 });
    }

    // Check if agent belongs to the user
    const agent = await prisma.chatbot.findUnique({
      where: {
        id: agentId,
        userId: session.user.id,
      },
    });

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found or unauthorized' }, { status: 404 });
    }

    // Get the action configurations from the request body
    const body = await request.json();
    const { actions } = body;
    
    console.log(`[API DEBUG] POST request to update actions for agent ${agentId}:`);
    console.log(`[API DEBUG] Request body:`, JSON.stringify(body, null, 2));
    
    if (!actions || !Array.isArray(actions)) {
      return NextResponse.json({ error: 'Actions array is required' }, { status: 400 });
    }

    // Process each action configuration
    const results = [];
    
    for (const action of actions) {
      // Handle difference in naming between frontend and API
      const type = action.type || action.actionType; // Accept both formats
      const { isEnabled = true, config = {} } = action;
      
      if (!type) {
        continue; // Skip actions without a type
      }
      
      console.log(`[API DEBUG] Processing action type: ${type}, isEnabled: ${isEnabled}`);
      console.log(`[API DEBUG] Action config:`, JSON.stringify(config, null, 2));

      // Check if the action configuration already exists
      const existingAction = await prisma.actionConfiguration.findFirst({
        where: {
          agentId,
          actionType: type,
        },
        include: {
          calendarConfiguration: type === 'calendar',
        },
      });
      
      if (existingAction) {
        console.log(`[API DEBUG] Found existing action: ${existingAction.id}`);
        if (existingAction.calendarConfiguration) {
          console.log(`[API DEBUG] With calendar configuration: ${existingAction.calendarConfiguration.id}`);
        }
      } else {
        console.log(`[API DEBUG] No existing action found for type: ${type}`);
      }

      // Create or update the action configuration
      let updatedAction;
      
      // Create a base config object without calendar-specific fields
      const baseConfig = { ...config };
      // Remove fields that will be stored specifically in calendar configuration
      if (type === 'calendar') {
        delete baseConfig.defaultCalendarId;
        delete baseConfig.askForDuration;
        delete baseConfig.askForNotes;
        delete baseConfig.defaultDuration;
        delete baseConfig.bufferBetweenAppointments;
        delete baseConfig.maxBookingsPerSlot;
        delete baseConfig.minimumAdvanceNotice;
        delete baseConfig.requirePhoneNumber;
        delete baseConfig.defaultLocation;
        delete baseConfig.bookingPrompt;
        delete baseConfig.confirmationMessage;
      }
      
      if (existingAction) {
        // Update the existing action configuration
        updatedAction = await prisma.actionConfiguration.update({
          where: {
            id: existingAction.id,
          },
          data: {
            isEnabled,
            config: baseConfig, // Store only the base config, not calendar specific fields
          },
        });
        
        console.log(`[API DEBUG] Updated action configuration: ${updatedAction.id}`);
        
        // Handle calendar-specific configuration
        if (type === 'calendar') {
          if (existingAction.calendarConfiguration) {
            // Update existing calendar configuration
            console.log(`[API DEBUG] Updating existing calendar configuration`);
            console.log(`[API DEBUG] defaultCalendarId:`, config.defaultCalendarId);
            const updatedCalendarConfig = await prisma.calendarActionConfiguration.update({
              where: {
                id: existingAction.calendarConfiguration.id,
              },
              data: {
                defaultCalendarId: config.defaultCalendarId || null,
                askForDuration: config.askForDuration !== undefined ? config.askForDuration : true,
                askForNotes: config.askForNotes !== undefined ? config.askForNotes : true,
                defaultDuration: config.defaultDuration || 30,
                bufferBetweenAppointments: config.bufferBetweenAppointments || 15,
                maxBookingsPerSlot: config.maxBookingsPerSlot || 1,
                minimumAdvanceNotice: config.minimumAdvanceNotice || 60,
                requirePhoneNumber: config.requirePhoneNumber !== undefined ? config.requirePhoneNumber : true,
                defaultLocation: config.defaultLocation || null,
                bookingPrompt: config.bookingPrompt || null,
                confirmationMessage: config.confirmationMessage || null,
              },
            });
            console.log(`[API DEBUG] Updated calendar configuration:`, updatedCalendarConfig);
          } else {
            // Create new calendar configuration
            console.log(`[API DEBUG] Creating new calendar configuration for existing action`);
            console.log(`[API DEBUG] defaultCalendarId:`, config.defaultCalendarId);
            const newCalendarConfig = await prisma.calendarActionConfiguration.create({
              data: {
                actionConfigurationId: updatedAction.id,
                defaultCalendarId: config.defaultCalendarId || null,
                askForDuration: config.askForDuration !== undefined ? config.askForDuration : true,
                askForNotes: config.askForNotes !== undefined ? config.askForNotes : true,
                defaultDuration: config.defaultDuration || 30,
                bufferBetweenAppointments: config.bufferBetweenAppointments || 15,
                maxBookingsPerSlot: config.maxBookingsPerSlot || 1,
                minimumAdvanceNotice: config.minimumAdvanceNotice || 60,
                requirePhoneNumber: config.requirePhoneNumber !== undefined ? config.requirePhoneNumber : true,
                defaultLocation: config.defaultLocation || null,
                bookingPrompt: config.bookingPrompt || null,
                confirmationMessage: config.confirmationMessage || null,
              },
            });
            console.log(`[API DEBUG] Created calendar configuration:`, newCalendarConfig);
          }
        }
      } else {
        // Create a new action configuration
        console.log(`[API DEBUG] Creating new action configuration`);
        updatedAction = await prisma.actionConfiguration.create({
          data: {
            agentId,
            actionType: type,
            isEnabled,
            config: baseConfig, // Store only the base config
          },
        });
        
        console.log(`[API DEBUG] Created action configuration: ${updatedAction.id}`);
        
        // Handle calendar-specific configuration
        if (type === 'calendar') {
          console.log(`[API DEBUG] Creating calendar configuration for new action`);
          console.log(`[API DEBUG] defaultCalendarId:`, config.defaultCalendarId);
          const newCalendarConfig = await prisma.calendarActionConfiguration.create({
            data: {
              actionConfigurationId: updatedAction.id,
              defaultCalendarId: config.defaultCalendarId || null,
              askForDuration: config.askForDuration !== undefined ? config.askForDuration : true,
              askForNotes: config.askForNotes !== undefined ? config.askForNotes : true,
              defaultDuration: config.defaultDuration || 30,
              bufferBetweenAppointments: config.bufferBetweenAppointments || 15,
              maxBookingsPerSlot: config.maxBookingsPerSlot || 1,
              minimumAdvanceNotice: config.minimumAdvanceNotice || 60,
              requirePhoneNumber: config.requirePhoneNumber !== undefined ? config.requirePhoneNumber : true,
              defaultLocation: config.defaultLocation || null,
              bookingPrompt: config.bookingPrompt || null,
              confirmationMessage: config.confirmationMessage || null,
            },
          });
          console.log(`[API DEBUG] Created calendar configuration:`, newCalendarConfig);
        }
      }
      
      results.push(updatedAction);
    }

    // Remove action configurations that are not in the actions array
    const actionTypes = actions.map(action => action.type || action.actionType);
    console.log(`[API DEBUG] Keeping action types:`, actionTypes);
    
    // Don't delete other action types that aren't in this update
    // await prisma.actionConfiguration.deleteMany({
    //   where: {
    //     agentId,
    //     NOT: {
    //       actionType: {
    //         in: actionTypes,
    //       },
    //     },
    //   },
    // });

    return NextResponse.json(results);
  } catch (error) {
    console.error('[API DEBUG] Error updating action configurations:', error);
    return NextResponse.json(
      { error: 'Failed to update action configurations', details: error.message || String(error) },
      { status: 500 }
    );
  }
} 