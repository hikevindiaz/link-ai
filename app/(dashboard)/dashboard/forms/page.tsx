'use client';

import { useState } from 'react';
import { useSession } from "next-auth/react";
import { Button } from "@/components/Button";
import { RiAddLine } from "@remixicon/react";
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

  return (
    <div className="flex h-full">
      {/* Left Sidebar */}
      <FormsSidebar
        forms={forms}
        selectedForm={selectedForm}
        isLoading={isLoading}
        onSelectForm={setSelectedForm}
        onCreateForm={() => setIsCreateDialogOpen(true)}
        onDeleteForm={setFormToDelete}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
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