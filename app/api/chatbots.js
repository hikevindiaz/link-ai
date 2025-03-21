// pages/api/chatbots.js

import { getSession } from "next-auth/react"
import { db } from "@/lib/db"

export default async function handler(req, res) {
  const session = await getSession({ req })

  if (!session) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  const chatbots = await db.chatbot.findMany({
    where: {
      userId: session.user.id,
    },
  })

  res.status(200).json(chatbots)
}