"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ButtonProps, buttonVariants } from "@/components/ui/button";
import { Icons } from "@/components/icons";
import { LinkRepCreationModal } from "@/components/LinkRepCreationModal"; // Import the modal

interface ChatbotCreateButtonProps extends ButtonProps {}

export function ChatbotCreateButton({
    className,
    variant,
    ...props
}: ChatbotCreateButtonProps) {
    const [isModalOpen, setIsModalOpen] = React.useState(false); // State to manage modal visibility

    return (
        <>
            <button
                className={cn(
                    buttonVariants({ variant }),
                    className
                )}
                onClick={() => setIsModalOpen(true)} // Open modal on click
                {...props}
            >
                <Icons.add className="mr-2 h-4 w-4" />
                New LinkRep
            </button>
            {isModalOpen && (
                <LinkRepCreationModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
            )}
        </>
    );
}
