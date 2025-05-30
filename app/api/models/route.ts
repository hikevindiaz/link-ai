import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use the correct model name that OpenAI recognizes
    const modelName = "gpt-4.1-mini-2025-04-14";
    
    // Check if the model exists
    let model = await prisma.chatbotModel.findFirst({
      where: {
        name: modelName,
      },
      select: {
        id: true,
        name: true,
      },
    });

    // If the model doesn't exist, create it
    if (!model) {
      console.log(`Creating model: ${modelName}`);
      model = await prisma.chatbotModel.create({
        data: {
          name: modelName,
        },
        select: {
          id: true,
          name: true,
        },
      });
    }

    // Check if there are any other models with version-specific names that need to be updated
    const versionSpecificModels = await prisma.chatbotModel.findMany({
      where: {
        name: {
          contains: "gpt-4.1-mini-2025-04-14-",
        },
        NOT: {
          name: modelName,
        },
      },
    });

    // Update any version-specific models to the correct name
    if (versionSpecificModels.length > 0) {
      console.log(`Updating ${versionSpecificModels.length} version-specific models to: ${modelName}`);
      for (const specificModel of versionSpecificModels) {
        await prisma.chatbotModel.update({
          where: {
            id: specificModel.id,
          },
          data: {
            name: modelName,
          },
        });
      }
    }

    // Return only the correct model
    return NextResponse.json([model]);
  } catch (error) {
    console.error("Error fetching models:", error);
    return NextResponse.json(
      { error: `Failed to fetch models: ${error}` },
      { status: 500 }
    );
  }
}
