"use client"

import Code from "@/components/Code"
import {
  RiCustomerService2Line,
  RiMicLine,
  RiMessage2Line,
  RiRobot2Line,
} from "@remixicon/react"
import { Badge } from "../badge"
import CodeExampleTabs from "./CodeExampleTabs"

const code = `// Example of a customer conversation with LinkRep AI
Customer: "I need to change my appointment from tomorrow to Friday"

LinkRep: "I'd be happy to help you reschedule your appointment. 
I see you have an appointment scheduled for tomorrow at 2:00 PM.
Would you like to move this to Friday? We have availability 
at 10:00 AM, 1:30 PM, and 3:45 PM."

Customer: "3:45 PM works for me"

LinkRep: "Perfect! I've rescheduled your appointment to Friday
at 3:45 PM. You should receive a confirmation email shortly.
Is there anything else I can help you with today?"

Customer: "No that's all, thanks!"

LinkRep: "You're welcome! Have a great day and we look forward 
to seeing you on Friday at 3:45 PM."
`

const code2 = `// Example of how to customize your LinkRep AI agent
const linkRep = new LinkAI({
  name: "Customer Support Rep",
  personality: "friendly, professional, efficient",
  knowledge: [
    "company_faq.pdf",
    "product_catalog.json",
    "pricing_plans.json"
  ],
  businessHours: {
    weekdays: "9:00-17:00",
    weekend: "closed"
  },
  integrations: [
    {
      type: "calendar",
      provider: "google",
      permissions: ["read", "write"]
    },
    {
      type: "crm",
      provider: "salesforce",
      permissions: ["read"]
    }
  ],
  handoffRules: [
    {
      condition: "intent == 'billing_dispute'",
      action: "transfer_to_human"
    }
  ]
});
`

const features = [
  {
    name: "Intelligent Conversations",
    description:
      "Natural language understanding that comprehends complex customer requests and responds appropriately.",
    icon: RiRobot2Line,
  },
  {
    name: "Multi-channel Support",
    description:
      "Seamless experience across web chat, voice calls, SMS, and email.",
    icon: RiMessage2Line,
  },
  {
    name: "Natural Voice",
    description:
      "Human-like voice with natural pauses, intonation, and emotional understanding.",
    icon: RiMicLine,
  },
  {
    name: "Human Handoff",
    description:
      "Smart escalation to human agents when needed, with full conversation context.",
    icon: RiCustomerService2Line,
  },
]

export default function CodeExample() {
  return (
    <section
      aria-labelledby="code-example-title"
      className="mx-auto mt-28 w-full max-w-6xl px-3"
    >
      <Badge>AI Powered</Badge>
      <h2
        id="code-example-title"
        className="mt-2 inline-block bg-gradient-to-br from-gray-900 to-gray-800 bg-clip-text py-2 text-4xl font-bold tracking-tighter text-transparent sm:text-6xl md:text-6xl dark:from-gray-50 dark:to-gray-300"
      >
        Intelligent agents <br /> that understand context
      </h2>
      <p className="mt-6 max-w-2xl text-lg text-gray-600 dark:text-gray-400">
        Link AI agents understand the full context of conversations, remember previous interactions, and respond naturally to customer inquiries.
      </p>
      <CodeExampleTabs
        tab1={
          <Code code={code} lang="javascript" copy={false} className="h-[31rem]" />
        }
        tab2={
          <Code
            code={code2}
            lang="javascript"
            copy={false}
            className="h-[31rem]"
          />
        }
      />
      <dl className="mt-24 grid grid-cols-4 gap-10">
        {features.map((item) => (
          <div
            key={item.name}
            className="col-span-full sm:col-span-2 lg:col-span-1"
          >
            <div className="w-fit rounded-lg p-2 shadow-md shadow-neutral-400/30 ring-1 ring-black/5 dark:shadow-neutral-600/30 dark:ring-white/5">
              <item.icon
                aria-hidden="true"
                className="size-6 text-neutral-600 dark:text-neutral-400"
              />
            </div>
            <dt className="mt-6 font-semibold text-gray-900 dark:text-gray-50">
              {item.name}
            </dt>
            <dd className="mt-2 leading-7 text-gray-600 dark:text-gray-400">
              {item.description}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
