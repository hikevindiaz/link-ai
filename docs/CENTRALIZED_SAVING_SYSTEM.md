# Centralized Saving System Implementation Guide

## Overview

This guide explains how to implement the centralized state management system for tracking unsaved changes (isDirty) and displaying a universal saving card across your agent configuration pages.

## Components Created

### 1. AgentConfigProvider (`hooks/use-agent-config.tsx`)
- Centralized context provider for agent configuration state
- Handles `isDirty` calculation using deep comparison
- Manages saving state and error handling
- Provides hooks for field-specific updates

### 2. UniversalSavingCard (`components/universal-saving-card.tsx`)
- Reusable saving card component
- Can be positioned anywhere in the layout
- Handles save/discard actions with proper animations
- Supports different themes and states

### 3. ActionsTabRefactored (`components/agents/tabs/actions-tab-refactored.tsx`)
- Example implementation of the actions tab using the centralized system
- Demonstrates how to use the context hooks
- Shows simplified state management

## Key Features

### ✅ Centralized State Management
- Single source of truth for agent configuration data
- Automatic `isDirty` calculation using deep comparison
- Consistent save/discard behavior across all tabs

### ✅ Reusable Saving Card
- Can be placed in layouts for global visibility
- Supports different positions (fixed-bottom, fixed-top, relative)
- Handles all save states (idle, saving, success, error)

### ✅ Type Safety
- Full TypeScript support with proper type inference
- Helper hooks for specific field updates
- Error handling with proper typing

## Implementation Steps

### Step 1: Replace Current Actions Tab

Replace the current actions tab import in your `agent-settings.tsx`:

```tsx
// Old import
import { ActionsTab } from "@/components/agents/tabs/actions-tab"

// New import  
import { ActionsTabRefactored } from "@/components/agents/tabs/actions-tab-refactored"
import { AgentConfigProvider } from "@/hooks/use-agent-config"
```

### Step 2: Wrap Your Agent Settings with the Provider

```tsx
export function AgentSettings({ agent, onSave, ... }) {
  return (
    <AgentConfigProvider initialAgent={agent}>
      <div className="flex flex-col h-full">
        {/* Your existing agent settings content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="actions">Actions</TabsTrigger>
            {/* Other tabs */}
          </TabsList>
          
          <TabsContent value="actions">
            <ActionsTabRefactored />
          </TabsContent>
        </Tabs>
      </div>
    </AgentConfigProvider>
  )
}
```

### Step 3: Add Universal Saving Card to Layout

You can place the saving card anywhere in your layout:

```tsx
import { UniversalSavingCard } from "@/components/universal-saving-card"
import { useAgentConfig } from "@/hooks/use-agent-config"

export function YourLayout() {
  const { isDirty, isSaving, saveStatus, errorMessage, save, resetToInitialData } = useAgentConfig()

  return (
    <div>
      {/* Your layout content */}
      
      <UniversalSavingCard
        isDirty={isDirty}
        isSaving={isSaving}
        saveStatus={saveStatus}
        errorMessage={errorMessage}
        onSave={handleSave}
        onDiscard={resetToInitialData}
        position="fixed-bottom" // or "fixed-top" or "relative"
      />
    </div>
  )
}
```

## Usage Patterns

### Basic Field Updates

```tsx
function YourComponent() {
  const { updateCurrentData } = useAgentConfig()
  
  const handleFieldChange = (value: string) => {
    updateCurrentData({ fieldName: value })
  }
  
  return (
    <input onChange={(e) => handleFieldChange(e.target.value)} />
  )
}
```

### Field-Specific Hook

```tsx
function YourComponent() {
  const [fieldValue, setFieldValue, isFieldDirty] = useAgentConfigField('fieldName', 'defaultValue')
  
  return (
    <div>
      <input 
        value={fieldValue} 
        onChange={(e) => setFieldValue(e.target.value)} 
      />
      {isFieldDirty && <span>This field has unsaved changes</span>}
    </div>
  )
}
```

### Custom Save Logic

```tsx
function YourComponent() {
  const { save, currentData } = useAgentConfig()
  
  const handleSave = async () => {
    await save(async (updatedAgent) => {
      // Your custom save logic here
      const response = await fetch(`/api/agents/${updatedAgent.id}`, {
        method: 'PATCH',
        body: JSON.stringify(updatedAgent)
      })
      
      if (!response.ok) {
        throw new Error('Failed to save')
      }
    })
  }
  
  return <button onClick={handleSave}>Save</button>
}
```

## Migration Guide

### From Current Implementation

1. **Identify State Variables**: Look for local state variables like `isLoading`, `isSaving`, `hasChanged`, etc.

2. **Replace with Context**: Replace these with the centralized context hooks:
   ```tsx
   // Old
   const [hasChanged, setHasChanged] = useState(false)
   const [isSaving, setIsSaving] = useState(false)
   
   // New
   const { isDirty, isSaving, updateCurrentData } = useAgentConfig()
   ```

3. **Update Field Handlers**: Replace direct state updates with context updates:
   ```tsx
   // Old
   const handleFieldChange = (value) => {
     setFieldValue(value)
     setHasChanged(true)
   }
   
   // New
   const handleFieldChange = (value) => {
     updateCurrentData({ fieldName: value })
   }
   ```

4. **Replace Save Logic**: Use the centralized save function:
   ```tsx
   // Old
   const handleSave = async () => {
     setIsSaving(true)
     try {
       await onSave(data)
       setHasChanged(false)
     } catch (error) {
       // handle error
     } finally {
       setIsSaving(false)
     }
   }
   
   // New
   const handleSave = async () => {
     await save(async (updatedAgent) => {
       await onSave(updatedAgent)
     })
   }
   ```

## Benefits

### 🎯 Consistency
- All tabs use the same save/discard behavior
- Consistent UI/UX across the application
- Single source of truth for state management

### 🚀 Performance
- Efficient deep comparison for dirty state calculation
- Memoized context values to prevent unnecessary re-renders
- Optimized update patterns

### 🛠️ Developer Experience
- Type-safe hooks and components
- Easy to test and debug
- Clear separation of concerns
- Reusable across different pages

### 📦 Scalability
- Easy to add new tabs and fields
- Centralized error handling
- Consistent validation patterns
- Simple to extend with new features

## Next Steps

1. **Test the Actions Tab**: Verify the refactored actions tab works correctly
2. **Migrate Other Tabs**: Apply the same pattern to other tabs (Agent, Channels, LLM, Call)
3. **Add Global Saving Card**: Place the universal saving card in your main layout
4. **Add Validation**: Extend the system to include field validation
5. **Add Auto-save**: Implement auto-save functionality using the centralized system

## API Reference

### AgentConfigProvider Props
- `children`: ReactNode - Child components
- `initialAgent`: Agent - Initial agent data

### useAgentConfig Hook Returns
- `initialData`: Agent | null - Unchanged data from server
- `currentData`: Agent | null - Current modified data
- `isDirty`: boolean - Whether there are unsaved changes
- `isSaving`: boolean - Whether save is in progress
- `saveStatus`: 'idle' | 'saving' | 'success' | 'error' - Current save state
- `errorMessage`: string - Error message if save failed
- `setInitialData`: (data: Agent) => void - Set initial data
- `updateCurrentData`: (updates: Partial<Agent>) => void - Update current data
- `resetToInitialData`: () => void - Reset to initial state
- `save`: (saveFunction: (data: Agent) => Promise<void>) => Promise<void> - Save data
- `clearSaveStatus`: () => void - Clear save status

### UniversalSavingCard Props
- `isDirty`: boolean - Whether there are unsaved changes
- `isSaving`: boolean - Whether save is in progress
- `saveStatus`: 'idle' | 'saving' | 'success' | 'error' - Current save state
- `errorMessage`: string - Error message if save failed
- `onSave`: () => void - Save callback
- `onDiscard`: () => void - Discard callback
- `position`: 'fixed-bottom' | 'fixed-top' | 'relative' - Card position
- `className`: string - Additional CSS classes 