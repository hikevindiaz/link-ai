import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function GET() {
  try {
    // Get the API key from environment variables
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    
    if (!OPENAI_API_KEY) {
      console.error("OpenAI API key is not configured");
      return NextResponse.json({
        success: false,
        message: "OpenAI API key is not configured in environment variables",
      }, { status: 500 });
    }

    // Create a new OpenAI client with the global API key
    const client = new OpenAI({
      apiKey: OPENAI_API_KEY,
    });

    // Test the Assistants API
    console.log("Testing Assistants API...");
    
    let assistant;
    let thread;
    let run;
    
    try {
      // Step 1: Create a test assistant
      assistant = await client.beta.assistants.create({
        name: "Test Assistant",
        instructions: "You are a test assistant to verify the API is working.",
        model: "gpt-4o",
      });
      console.log(`Created test assistant: ${assistant.id}`);
      
      // Step 2: Create a thread
      thread = await client.beta.threads.create();
      console.log(`Created test thread: ${thread.id}`);
      
      // Step 3: Add a message to the thread
      await client.beta.threads.messages.create(thread.id, {
        role: "user",
        content: "Hello, this is a test message. Please respond with 'The Assistants API is working correctly.'",
      });
      console.log("Added test message to thread");
      
      // Step 4: Run the assistant
      run = await client.beta.threads.runs.create(thread.id, {
        assistant_id: assistant.id,
      });
      console.log(`Created run: ${run.id}`);
      
      // Step 5: Wait for the run to complete
      let runStatus = await client.beta.threads.runs.retrieve(thread.id, run.id);
      console.log(`Initial run status: ${runStatus.status}`);
      
      const startTime = Date.now();
      const maxWaitTime = 30000; // 30 seconds max wait time
      
      while (runStatus.status !== 'completed') {
        // Check for failure states
        if (
          runStatus.status === 'failed' ||
          runStatus.status === 'cancelled' ||
          runStatus.status === 'expired'
        ) {
          console.error(`Run failed with status: ${runStatus.status}`);
          
          // Clean up
          if (assistant) {
            await client.beta.assistants.del(assistant.id).catch(err => 
              console.error(`Failed to delete assistant: ${err}`)
            );
          }
          
          return NextResponse.json({
            success: false,
            message: `Run failed with status: ${runStatus.status}`,
            runStatus: runStatus,
          }, { status: 500 });
        }
        
        // Check for timeout
        if (Date.now() - startTime > maxWaitTime) {
          console.error(`Run timed out after ${maxWaitTime}ms`);
          
          // Clean up
          if (assistant) {
            await client.beta.assistants.del(assistant.id).catch(err => 
              console.error(`Failed to delete assistant: ${err}`)
            );
          }
          
          return NextResponse.json({
            success: false,
            message: "Run timed out",
          }, { status: 504 });
        }
        
        // Wait before polling again
        await new Promise((resolve) => setTimeout(resolve, 1000));
        runStatus = await client.beta.threads.runs.retrieve(thread.id, run.id);
        console.log(`Updated run status: ${runStatus.status}`);
      }
      
      // Step 6: Get the messages
      const messages = await client.beta.threads.messages.list(thread.id);
      console.log(`Retrieved ${messages.data.length} messages from thread`);
      
      // Step 7: Extract the assistant's response
      const assistantMessage = messages.data.find(msg => msg.role === 'assistant');
      let messageContent = '';
      
      if (assistantMessage && assistantMessage.content && assistantMessage.content.length > 0) {
        const contentBlock = assistantMessage.content[0];
        if (contentBlock.type === 'text') {
          messageContent = contentBlock.text.value;
        }
      }
      
      // Step 8: Clean up
      await client.beta.assistants.del(assistant.id);
      console.log("Deleted test assistant");
      
      return NextResponse.json({
        success: true,
        message: "OpenAI Assistants API is working correctly",
        response: messageContent,
        assistantId: assistant.id,
        threadId: thread.id,
        runId: run.id,
      });
    } catch (apiError) {
      console.error("OpenAI API error:", apiError);
      
      // Clean up if assistant was created
      if (assistant) {
        await client.beta.assistants.del(assistant.id).catch(err => 
          console.error(`Failed to delete assistant during error cleanup: ${err}`)
        );
      }
      
      return NextResponse.json({
        success: false,
        message: "Error while testing OpenAI Assistants API",
        error: apiError instanceof Error ? apiError.message : String(apiError),
        details: apiError,
      }, { status: 500 });
    }
  } catch (error) {
    console.error("OpenAI Assistants API test error:", error);
    
    return NextResponse.json({
      success: false,
      message: "Failed to test OpenAI Assistants API",
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
} 