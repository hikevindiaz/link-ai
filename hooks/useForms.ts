import { useState, useEffect } from 'react';
import { toast } from 'sonner';

export interface FormField {
  id: string;
  name: string;
  description: string;
  type: string;
  required: boolean;
  options?: string[];
  position: number;
}

export interface Form {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive';
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  fields: FormField[];
  _count?: {
    submissions: number;
  };
}

export interface FormSubmission {
  id: string;
  formId: string;
  formName?: string;
  chatbotId: string;
  chatbotName: string;
  threadId?: string;
  createdAt: Date;
  data: Record<string, string>;
}

export function useForms(userId?: string) {
  const [forms, setForms] = useState<Form[]>([]);
  const [selectedForm, setSelectedForm] = useState<Form | null>(null);
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch all forms
  const fetchForms = async () => {
    if (!userId) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/forms');
      if (!response.ok) {
        throw new Error('Failed to fetch forms');
      }
      
      const data = await response.json();
      setForms(data);
    } catch (error) {
      console.error('Error fetching forms:', error);
      toast.error('Failed to load forms');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch submissions for a specific form
  const fetchSubmissions = async (formId: string) => {
    try {
      const response = await fetch(`/api/forms/${formId}/submissions`);
      if (!response.ok) {
        throw new Error('Failed to fetch submissions');
      }
      
      const data = await response.json();
      setSubmissions(data);
    } catch (error) {
      console.error('Error fetching submissions:', error);
      toast.error('Failed to load submissions');
    }
  };

  // Create a new form
  const createForm = async (formData: any) => {
    try {
      console.log('Creating form with data:', JSON.stringify(formData, null, 2));
      
      const response = await fetch('/api/forms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      const responseData = await response.json();
      
      if (!response.ok) {
        console.error('Server response:', responseData);
        throw new Error(responseData.error || 'Failed to create form');
      }
      
      setForms(prevForms => [responseData, ...prevForms]);
      return responseData;
    } catch (error) {
      console.error('Error creating form:', error);
      throw error;
    }
  };

  // Update an existing form
  const updateForm = async (formId: string, formData: any) => {
    try {
      const response = await fetch(`/api/forms/${formId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update form');
      }
      
      const updatedForm = await response.json();
      
      setForms(prevForms => 
        prevForms.map(form => 
          form.id === formId ? updatedForm : form
        )
      );
      
      if (selectedForm?.id === formId) {
        setSelectedForm(updatedForm);
      }
      
      return updatedForm;
    } catch (error) {
      console.error('Error updating form:', error);
      throw error;
    }
  };

  // Delete a form
  const deleteForm = async (formId: string) => {
    try {
      const response = await fetch(`/api/forms/${formId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete form');
      }
      
      setForms(prevForms => prevForms.filter(form => form.id !== formId));
      
      if (selectedForm?.id === formId) {
        setSelectedForm(null);
      }
    } catch (error) {
      console.error('Error deleting form:', error);
      throw error;
    }
  };

  // Load forms when userId changes
  useEffect(() => {
    if (userId) {
      fetchForms();
    }
  }, [userId]);

  // Load submissions when selectedForm changes
  useEffect(() => {
    if (selectedForm) {
      fetchSubmissions(selectedForm.id);
    } else {
      setSubmissions([]);
    }
  }, [selectedForm]);

  return {
    forms,
    selectedForm,
    submissions,
    isLoading,
    setSelectedForm,
    fetchForms,
    createForm,
    updateForm,
    deleteForm,
  };
} 