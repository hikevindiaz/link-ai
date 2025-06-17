'use client';

import { useState, useEffect } from 'react';
import { useSession } from "next-auth/react";
import { Button } from "@/components/Button";
import { RiAddLine } from "@remixicon/react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { FormsSidebar } from "@/components/forms/FormsSidebar";
import { FormsEmptyState } from "@/components/forms/FormsEmptyState";
import { FormSubmissionsView } from "@/components/forms/FormSubmissionsView";
import { CreateFormDialog } from "@/components/forms/CreateFormDialog";
import { FormSettingsDialog } from "@/components/forms/FormSettingsDialog";
import { FormIntegrationsDialog } from "@/components/forms/FormIntegrationsDialog";
import { SubmissionDetailsDialog } from "@/components/forms/SubmissionDetailsDialog";
import { DeleteFormDialog } from "@/components/forms/DeleteFormDialog";
import { useForms, Form, FormSubmission } from "@/hooks/useForms";

export default function FormsPage() {
  const { data: session } = useSession();
  const { 
    forms, 
    selectedForm, 
    submissions,
    isLoading, 
    setSelectedForm,
    createForm,
    deleteForm
  } = useForms(session?.user?.id);

  const [selectedSubmission, setSelectedSubmission] = useState<FormSubmission | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [isIntegrationsDialogOpen, setIsIntegrationsDialogOpen] = useState(false);
  const [isSubmissionDialogOpen, setIsSubmissionDialogOpen] = useState(false);
  const [formToDelete, setFormToDelete] = useState<Form | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Add mobile responsiveness state
  const [isMobileView, setIsMobileView] = useState(false);
  const [showFormDetailsOnMobile, setShowFormDetailsOnMobile] = useState(false);
  
  // Check for mobile view on mount and window resize
  useEffect(() => {
    const checkMobileView = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    
    // Initial check
    checkMobileView();
    
    // Set up listener for window resize
    window.addEventListener('resize', checkMobileView);
    
    return () => {
      window.removeEventListener('resize', checkMobileView);
    };
  }, []);
  
  // Update mobile view state when form is selected
  useEffect(() => {
    if (isMobileView && selectedForm) {
      setShowFormDetailsOnMobile(true);
    }
  }, [selectedForm, isMobileView]);

  const handleCreateForm = async (formData: any) => {
    try {
      await createForm(formData);
      toast.success("Form created successfully");
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Error creating form:', error);
      toast.error("Failed to create form");
    }
  };

  const handleDeleteForm = async () => {
    if (!formToDelete) return;
    
    setIsDeleting(true);
    
    try {
      await deleteForm(formToDelete.id);
      
      // If the deleted form was selected, clear the selection
      if (selectedForm?.id === formToDelete.id) {
        setSelectedForm(null);
        if (isMobileView) {
          setShowFormDetailsOnMobile(false);
        }
      }
      
      toast.success("Form deleted successfully");
    } catch (error) {
      console.error('Error deleting form:', error);
      toast.error("Failed to delete form");
    } finally {
      setIsDeleting(false);
      setFormToDelete(null);
    }
  };

  const handleViewSubmission = (submission: FormSubmission) => {
    setSelectedSubmission(submission);
    setIsSubmissionDialogOpen(true);
  };
  
  // Handle selecting a form
  const handleSelectForm = (form: Form) => {
    setSelectedForm(form);
    
    // On mobile, show the form details panel
    if (isMobileView) {
      setShowFormDetailsOnMobile(true);
    }
  };
  
  // Handle going back to the forms list on mobile
  const handleBackToList = () => {
    setShowFormDetailsOnMobile(false);
  };

  return (
    <div className="flex h-full">
      {/* Left Sidebar */}
      {(!isMobileView || (isMobileView && !showFormDetailsOnMobile)) && (
        <FormsSidebar
          forms={forms}
          selectedForm={selectedForm}
          isLoading={isLoading}
          onSelectForm={handleSelectForm}
          onCreateForm={() => setIsCreateDialogOpen(true)}
          onDeleteForm={setFormToDelete}
          className={isMobileView ? 'w-full' : ''}
        />
      )}

      {/* Main Content */}
      {(!isMobileView || (isMobileView && showFormDetailsOnMobile)) && (
        <div className="flex-1 overflow-auto">
          {isMobileView && showFormDetailsOnMobile && (
            <div className="border-b border-neutral-200 dark:border-neutral-800 p-2">
              <Button
                variant="ghost"
                onClick={handleBackToList}
                className="flex items-center text-neutral-600 dark:text-neutral-300"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to forms
              </Button>
            </div>
          )}
          
          {selectedForm ? (
            <FormSubmissionsView
              form={selectedForm}
              submissions={submissions}
              onViewSubmission={handleViewSubmission}
              onOpenSettings={() => setIsSettingsDialogOpen(true)}
              onOpenIntegrations={() => setIsIntegrationsDialogOpen(true)}
            />
          ) : (
            <FormsEmptyState
              hasExistingForms={forms.length > 0}
              onCreateForm={() => setIsCreateDialogOpen(true)}
            />
          )}
        </div>
      )}

      {/* Dialogs */}
      <CreateFormDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onCreateForm={handleCreateForm}
      />

      <FormSettingsDialog
        open={isSettingsDialogOpen}
        onOpenChange={setIsSettingsDialogOpen}
        form={selectedForm}
      />

      {selectedForm && (
        <FormIntegrationsDialog
          open={isIntegrationsDialogOpen}
          onOpenChange={setIsIntegrationsDialogOpen}
          form={selectedForm}
        />
      )}

      <SubmissionDetailsDialog
        open={isSubmissionDialogOpen}
        onOpenChange={setIsSubmissionDialogOpen}
        submission={selectedSubmission}
      />

      <DeleteFormDialog
        open={!!formToDelete}
        onOpenChange={(open) => !open && setFormToDelete(null)}
        isDeleting={isDeleting}
        onDelete={handleDeleteForm}
        onCancel={() => setFormToDelete(null)}
      />
    </div>
  );
} 