"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Icons } from "@/components/icons";
import { Modal, Button, TextInput, Textarea, Select, Checkbox, RangeSlider } from "flowbite-react";
import { toast } from "@/components/ui/use-toast";

export function LinkRepCreationModal({ isOpen, onClose }) {
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);

    const nextStep = () => setStep((prev) => Math.min(prev + 1, 4));
    const prevStep = () => setStep((prev) => Math.max(prev - 1, 1));

    const finishSetup = () => {
        setIsLoading(true);
        toast({
            title: "LinkRep Created",
            description: "Your LinkRep has been successfully created.",
            variant: "success",
        });
        setTimeout(() => {
            setIsLoading(false);
            onClose();
        }, 2000);
    };

    return (
        <Modal show={isOpen} onClose={onClose} size="lg" popup={true}>
            <Modal.Header>
                <span className="text-xl font-semibold">Create a New LinkRep</span>
            </Modal.Header>
            <Modal.Body>
                {step === 1 && <Step1 />}
                {step === 2 && <Step2 />}
                {step === 3 && <Step3 />}
                {step === 4 && <Step4 />}
            </Modal.Body>
            <Modal.Footer>
                <div className="flex justify-between w-full">
                    <Button color="gray" onClick={prevStep} disabled={step === 1}>
                        Back
                    </Button>
                    {step < 4 ? (
                        <Button onClick={nextStep}>Next</Button>
                    ) : (
                        <Button onClick={finishSetup} disabled={isLoading}>
                            {isLoading ? "Loading..." : "Finish"}
                        </Button>
                    )}
                </div>
            </Modal.Footer>
        </Modal>
    );
}

function Step1() {
    return (
        <div>
            <h3 className="text-lg font-semibold mb-4">Step 1: LinkRep</h3>
            <TextInput label="Display Name" placeholder="Enter display name" helperText="The name that will identify your LinkRep." />
            <TextInput label="Welcome Message" placeholder="Enter welcome message" helperText="The welcome message sent to users." />
            <Textarea label="Default Prompt" placeholder="Enter default prompt" helperText="This gives purpose and identity to your LinkRep." />
            <TextInput label="Chatbot Error Message" placeholder="Enter error message" helperText="Displayed when the chatbot encounters an error." />
            <Select label="Language" helperText="Choose the primary language for your LinkRep.">
                <option>English</option>
                <option>Spanish</option>
            </Select>
        </div>
    );
}

function Step2() {
    return (
        <div>
            <h3 className="text-lg font-semibold mb-4">Step 2: LLM</h3>
            <Select label="OpenAI Model" helperText="Choose the AI model.">
                <option>GPT-3.5</option>
                <option>GPT-4</option>
                <option>GPT-4 Turbo</option>
            </Select>
            <Select label="Choose Brain File" helperText="Used for content retrieval.">
                <option>File1.pdf</option>
                <option>File2.pdf</option>
            </Select>
            <TextInput label="Tokens Per Response" type="number" placeholder="Enter number of tokens" helperText="Enable longer or shorter responses." />
            <TextInput label="Temperature" type="number" step="0.1" placeholder="Enter temperature value" helperText="Adjust creativity in responses." />
        </div>
    );
}

function Step3() {
    return (
        <div>
            <h3 className="text-lg font-semibold mb-4">Step 3: Call</h3>
            <Select label="Phone Number" helperText="Choose or buy a phone number.">
                <option>+1234567890</option>
                <option>+0987654321</option>
            </Select>
            <Select label="Voice" helperText="Select the voice for your LinkRep.">
                <option>Voice1</option>
                <option>Voice2</option>
            </Select>
            <Select label="Response Rate" helperText="Adjust response latency and patience.">
                <option>Rapid</option>
                <option>Normal</option>
                <option>Patient</option>
            </Select>
            <Checkbox label="Check if User is Still There" helperText="Agent will check for user presence after inactivity." />
            <TextInput label="Message to Customer" placeholder="Enter message" helperText="Message to verify if user is online." />
            <RangeSlider label="Invoke message after (seconds)" min={1} max={6} helperText="Seconds to wait before asking." />
            <RangeSlider label="Hang Up After Silence of" min={3} max={30} helperText="Seconds of silence before hanging up." />
            <Textarea label="Call Hang Up Message" placeholder="Enter hang up message" helperText="Final message before ending the call." />
            <RangeSlider label="Call Termination" min={30} max={900} helperText="Maximum call duration in seconds." />
        </div>
    );
}

function Step4() {
    return (
        <div>
            <h3 className="text-lg font-semibold mb-4">Step 4: Actions and Integrations</h3>
            <Select label="Choose Action" helperText="Select and configure actions for your LinkRep.">
                <option>Generate Leads</option>
                <option>Schedule Appointment</option>
                <option>Take Orders</option>
            </Select>
            <Button color="gray" className="mt-4">Add Action</Button>
        </div>
    );
}
