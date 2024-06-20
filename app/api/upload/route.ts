import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from '@/lib/db';
import OpenAI from 'openai';
import { getUserSubscriptionPlan } from '@/lib/subscription';
import { RequiresHigherPlanError } from '@/lib/exceptions';
import { fileTypes as codeTypes } from '@/lib/validations/codeInterpreter';
import { fileTypes as searchTypes } from '@/lib/validations/fileSearch';
import formidable from 'formidable';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false,
  },
};

export const POST = async (request: Request) => {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return new Response("Unauthorized", { status: 403 });
    }

    const { user } = session;
    const subscriptionPlan = await getUserSubscriptionPlan(user.id);
    const count = await db.file.count({
      where: {
        userId: user.id,
      },
    });

    if (count >= subscriptionPlan.maxFiles) {
      throw new RequiresHigherPlanError();
    }

    const form = formidable({
      uploadDir: "/tmp",
      keepExtensions: true,
    });

    const parseForm = () => {
      return new Promise<{ fields: formidable.Fields; files: formidable.Files }>((resolve, reject) => {
        form.parse(request, (err, fields, files) => {
          if (err) reject(err);
          resolve({ fields, files });
        });
      });
    };

    const { fields, files } = await parseForm();
    const file = files.file as formidable.File;
    const filename = file.originalFilename;

    if (!filename) {
      return new Response('Missing filename', { status: 400 });
    }

    const validExtensions = [...codeTypes, ...searchTypes];
    if (!validExtensions.includes(filename.split('.').pop()!)) {
      return new Response(`Invalid file extension, check the documentation for more information.`, { status: 400 });
    }

    const fileStream = fs.createReadStream(file.filepath);
    const blob = await put(filename, fileStream, {
      access: 'public',
    });

    const openAIConfig = await db.openAIConfig.findUnique({
      select: {
        globalAPIKey: true,
        id: true,
      },
      where: {
        userId: session?.user?.id
      }
    });

    if (!openAIConfig?.globalAPIKey) {
      return new Response("Missing OpenAI API key. Add your API key in the Settings tab.", { status: 400, statusText: "Missing OpenAI API key" });
    }

    const openai = new OpenAI({
      apiKey: openAIConfig?.globalAPIKey
    });

    const openaiFile = await openai.files.create(
      { file: await fetch(blob.url), purpose: 'assistants' }
    );

    await db.file.create({
      data: {
        name: filename,
        blobUrl: blob.url,
        openAIFileId: openaiFile.id,
        userId: session?.user?.id,
      }
    });

    return NextResponse.json({ url: blob.url }, { status: 201 });
  } catch (error) {
    if (error instanceof RequiresHigherPlanError) {
      return new Response("Requires Higher plan", { status: 402 });
    }

    console.error(error);
    return new Response(null, { status: 500 });
  }
};
