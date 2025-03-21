import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export default function LegalModal() {
  const [isPrivacyOpen, setPrivacyOpen] = useState(false);
  const [isTermsOpen, setTermsOpen] = useState(false);

  return (
    <div className="fixed bottom-4 right-4 flex flex-col gap-2">
      <Button onClick={() => setPrivacyOpen(true)}>Privacy Policy</Button>
      <Button onClick={() => setTermsOpen(true)}>Terms & Conditions</Button>

      {isPrivacyOpen && (
        <Modal onClose={() => setPrivacyOpen(false)} title="Privacy Policy">
          <PrivacyPolicyContent />
        </Modal>
      )}

      {isTermsOpen && (
        <Modal onClose={() => setTermsOpen(false)} title="Terms & Conditions">
          <TermsConditionsContent />
        </Modal>
      )}
    </div>
  );
}

function Modal({ onClose, title, children }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="overflow-y-auto max-h-[70vh] p-6">
          {children}
        </CardContent>
        <CardFooter>
          <Button onClick={onClose}>Close</Button>
        </CardFooter>
      </Card>
    </div>
  );
}

function PrivacyPolicyContent() {
  return (
    <div className="space-y-4">
      <p><strong>DBA:</strong> Link AI, a division of EVERMEDIA Corp.</p>
      <p><strong>Address:</strong> PO BOX 1964, Guayama PR 00785</p>

      <h3 className="font-semibold text-lg">1. Information We Collect</h3>
      <p>We collect personal information like your name, email, and payment details. We also collect usage data for service improvement.</p>

      <h3 className="font-semibold text-lg">2. How We Use Your Information</h3>
      <p>We use your data to provide and improve our services, process payments via Stripe, and prevent fraud.</p>

      <h3 className="font-semibold text-lg">3. Sharing Your Information</h3>
      <p>We only share data with trusted partners like Twilio, Stripe, and OpenAI. We do not sell your data.</p>

      <h3 className="font-semibold text-lg">4. Your Rights</h3>
      <p>You may request access, modification, or deletion of your data by contacting us at support@getlinkai.com.</p>
    </div>
  );
}

function TermsConditionsContent() {
  return (
    <div className="space-y-4">
      <p><strong>DBA:</strong> Link AI, a division of EVERMEDIA Corp.</p>
      <p><strong>Address:</strong> PO BOX 1964, Guayama PR 00785</p>

      <h3 className="font-semibold text-lg">1. Services Overview</h3>
      <p>Link AI provides automation tools for customer service, lead generation, and appointment management.</p>

      <h3 className="font-semibold text-lg">2. User Accounts</h3>
      <p>Users must be 18+ and are responsible for their account security.</p>

      <h3 className="font-semibold text-lg">3. Payment Terms</h3>
      <p>Subscriptions are billed monthly via Stripe and are non-refundable.</p>

      <h3 className="font-semibold text-lg">4. Limitation of Liability</h3>
      <p>Link AI is provided &quot;as-is.&quot; We are not liable for indirect damages.</p>
    </div>
  );
}
