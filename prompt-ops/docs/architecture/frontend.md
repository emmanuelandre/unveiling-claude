# Frontend Architecture

## Overview

The frontend is a React 18 application built with TypeScript, using Vite for development and builds. It follows a feature-based architecture with shared components and global state management via Zustand.

## Project Structure

```
src/
├── main.tsx                    # Application entry point
├── App.tsx                     # Root component with routing
├── index.css                   # Global styles (Tailwind)
├── components/
│   ├── ui/                     # Shared UI components
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Modal.tsx
│   │   ├── Card.tsx
│   │   ├── Dropdown.tsx
│   │   ├── Table.tsx
│   │   ├── Tabs.tsx
│   │   ├── Toast.tsx
│   │   └── Skeleton.tsx
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   ├── MainLayout.tsx
│   │   └── AuthLayout.tsx
│   └── shared/
│       ├── ErrorBoundary.tsx
│       ├── LoadingSpinner.tsx
│       └── ProtectedRoute.tsx
├── features/
│   ├── auth/
│   │   ├── components/
│   │   │   ├── LoginForm.tsx
│   │   │   └── SignupForm.tsx
│   │   ├── hooks/
│   │   │   └── useAuth.ts
│   │   ├── api/
│   │   │   └── authApi.ts
│   │   └── store/
│   │       └── authStore.ts
│   ├── playground/
│   │   ├── components/
│   │   │   ├── PromptEditor.tsx
│   │   │   ├── ModelSelector.tsx
│   │   │   ├── ResponsePanel.tsx
│   │   │   ├── VariablesPanel.tsx
│   │   │   └── ExecutionHistory.tsx
│   │   ├── hooks/
│   │   │   ├── usePromptExecution.ts
│   │   │   └── useStreaming.ts
│   │   └── api/
│   │       └── promptApi.ts
│   ├── workflows/
│   │   ├── components/
│   │   │   ├── WorkflowCanvas.tsx
│   │   │   ├── NodePalette.tsx
│   │   │   ├── NodeConfigPanel.tsx
│   │   │   └── ExecutionViewer.tsx
│   │   ├── nodes/
│   │   │   ├── PromptNode.tsx
│   │   │   ├── ConditionNode.tsx
│   │   │   ├── LoopNode.tsx
│   │   │   └── ParallelNode.tsx
│   │   └── hooks/
│   │       └── useWorkflow.ts
│   ├── analytics/
│   │   ├── components/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── KPICard.tsx
│   │   │   ├── UsageChart.tsx
│   │   │   └── CostBreakdown.tsx
│   │   └── hooks/
│   │       └── useAnalytics.ts
│   └── admin/
│       ├── components/
│       │   ├── UserManagement.tsx
│       │   ├── ModelRegistry.tsx
│       │   └── OrgSettings.tsx
│       └── hooks/
│           └── useAdmin.ts
├── hooks/
│   ├── useDebounce.ts
│   ├── useLocalStorage.ts
│   └── useMediaQuery.ts
├── lib/
│   ├── api.ts                  # Axios instance with interceptors
│   ├── queryClient.ts          # React Query configuration
│   └── utils.ts                # Utility functions
├── stores/
│   ├── authStore.ts            # Auth state
│   ├── uiStore.ts              # UI state (theme, sidebar)
│   └── notificationStore.ts    # Toast notifications
├── types/
│   ├── api.ts                  # API response types
│   ├── models.ts               # Domain models
│   └── index.ts                # Type exports
└── constants/
    ├── routes.ts               # Route definitions
    └── config.ts               # App configuration
```

## Technology Stack

| Category | Library | Purpose |
|----------|---------|---------|
| Framework | React 18 | UI library |
| Language | TypeScript | Type safety |
| Build | Vite | Fast dev server, optimized builds |
| Styling | TailwindCSS | Utility-first CSS |
| State | Zustand | Global state management |
| Data Fetching | React Query | Server state, caching |
| HTTP | Axios | API requests |
| Routing | React Router v6 | Client-side routing |
| Forms | React Hook Form | Form management |
| Validation | Zod | Schema validation |
| Editor | Monaco Editor | Prompt editing |
| Canvas | React Flow | Workflow builder |
| Charts | Recharts | Analytics visualization |

## State Management

### Zustand Stores

```typescript
// stores/authStore.ts
interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: async (credentials) => {
        const { data } = await authApi.login(credentials);
        set({
          user: data.user,
          token: data.accessToken,
          isAuthenticated: true,
        });
      },

      logout: () => {
        set({ user: null, token: null, isAuthenticated: false });
      },

      refreshToken: async () => {
        const { data } = await authApi.refresh();
        set({ token: data.accessToken });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token }),
    }
  )
);
```

### React Query for Server State

```typescript
// features/playground/api/promptApi.ts
export const promptKeys = {
  all: ['prompts'] as const,
  lists: () => [...promptKeys.all, 'list'] as const,
  list: (filters: PromptFilters) => [...promptKeys.lists(), filters] as const,
  details: () => [...promptKeys.all, 'detail'] as const,
  detail: (id: string) => [...promptKeys.details(), id] as const,
};

export const usePrompts = (filters: PromptFilters) => {
  return useQuery({
    queryKey: promptKeys.list(filters),
    queryFn: () => promptApi.list(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCreatePrompt = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: promptApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: promptKeys.lists() });
    },
  });
};
```

## Routing

### Route Configuration

```typescript
// App.tsx
const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      { index: true, element: <Navigate to="/playground" /> },
      { path: 'playground', element: <PlaygroundPage /> },
      { path: 'prompts', element: <PromptsPage /> },
      { path: 'prompts/:id', element: <PromptDetailPage /> },
      { path: 'workflows', element: <WorkflowsPage /> },
      { path: 'workflows/:id', element: <WorkflowBuilderPage /> },
      { path: 'analytics', element: <AnalyticsPage /> },
      { path: 'admin', element: <AdminPage /> },
    ],
  },
  {
    path: '/auth',
    element: <AuthLayout />,
    children: [
      { path: 'login', element: <LoginPage /> },
      { path: 'signup', element: <SignupPage /> },
    ],
  },
]);
```

### Protected Routes

```typescript
// components/shared/ProtectedRoute.tsx
export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
```

## Component Patterns

### Feature Component Structure

```typescript
// features/playground/components/PromptEditor.tsx
interface PromptEditorProps {
  value: string;
  onChange: (value: string) => void;
  variables?: Variable[];
  disabled?: boolean;
}

export const PromptEditor = ({
  value,
  onChange,
  variables = [],
  disabled = false,
}: PromptEditorProps) => {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  const handleEditorMount = (editor: monaco.editor.IStandaloneCodeEditor) => {
    editorRef.current = editor;
    // Configure syntax highlighting for template variables
  };

  return (
    <div className="relative h-full">
      <Editor
        value={value}
        onChange={(v) => onChange(v ?? '')}
        onMount={handleEditorMount}
        language="markdown"
        theme="vs-dark"
        options={{
          minimap: { enabled: false },
          wordWrap: 'on',
          readOnly: disabled,
        }}
      />
      {variables.length > 0 && (
        <VariableHints variables={variables} />
      )}
    </div>
  );
};
```

### Custom Hooks

```typescript
// features/playground/hooks/useStreaming.ts
export const useStreaming = () => {
  const [chunks, setChunks] = useState<string[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const startStream = useCallback(async (executionId: string) => {
    setIsStreaming(true);
    setChunks([]);
    setError(null);

    try {
      const eventSource = new EventSource(
        `/api/v1/executions/${executionId}/stream`
      );

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'token') {
          setChunks((prev) => [...prev, data.content]);
        } else if (data.type === 'done') {
          eventSource.close();
          setIsStreaming(false);
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
        setIsStreaming(false);
        setError(new Error('Stream connection failed'));
      };

      return () => eventSource.close();
    } catch (err) {
      setError(err as Error);
      setIsStreaming(false);
    }
  }, []);

  const output = useMemo(() => chunks.join(''), [chunks]);

  return { output, isStreaming, error, startStream };
};
```

## API Layer

### Axios Configuration

```typescript
// lib/api.ts
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 30000,
});

// Request interceptor for auth
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        await useAuthStore.getState().refreshToken();
        return api(originalRequest);
      } catch {
        useAuthStore.getState().logout();
        window.location.href = '/auth/login';
      }
    }

    return Promise.reject(error);
  }
);

export default api;
```

## Styling

### Tailwind Configuration

```javascript
// tailwind.config.js
module.exports = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          500: '#0ea5e9',
          900: '#0c4a6e',
        },
        surface: {
          light: '#ffffff',
          dark: '#1e1e1e',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
};
```

### Component Styling Pattern

```typescript
// components/ui/Button.tsx
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2',
  {
    variants: {
      variant: {
        primary: 'bg-primary-500 text-white hover:bg-primary-600',
        secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-100',
        ghost: 'hover:bg-gray-100 dark:hover:bg-gray-800',
        danger: 'bg-red-500 text-white hover:bg-red-600',
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4',
        lg: 'h-12 px-6 text-lg',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
}

export const Button = ({
  className,
  variant,
  size,
  isLoading,
  children,
  ...props
}: ButtonProps) => {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? <Spinner className="mr-2" /> : null}
      {children}
    </button>
  );
};
```

## Form Handling

### React Hook Form + Zod

```typescript
// features/playground/components/CreatePromptForm.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const createPromptSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  content: z.string().min(1, 'Content is required'),
  modelId: z.string().uuid('Invalid model'),
  variables: z.array(z.object({
    name: z.string(),
    defaultValue: z.string().optional(),
  })).optional(),
});

type CreatePromptInput = z.infer<typeof createPromptSchema>;

export const CreatePromptForm = ({ onSuccess }: { onSuccess: () => void }) => {
  const createPrompt = useCreatePrompt();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreatePromptInput>({
    resolver: zodResolver(createPromptSchema),
  });

  const onSubmit = async (data: CreatePromptInput) => {
    await createPrompt.mutateAsync(data);
    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="Name"
        {...register('name')}
        error={errors.name?.message}
      />
      <TextArea
        label="Content"
        {...register('content')}
        error={errors.content?.message}
      />
      <ModelSelect {...register('modelId')} error={errors.modelId?.message} />
      <Button type="submit" isLoading={isSubmitting}>
        Create Prompt
      </Button>
    </form>
  );
};
```

## Testing

### Component Testing

```typescript
// features/playground/components/__tests__/PromptEditor.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { PromptEditor } from '../PromptEditor';

describe('PromptEditor', () => {
  it('renders with initial value', () => {
    render(<PromptEditor value="Hello {{name}}" onChange={() => {}} />);
    expect(screen.getByText(/Hello/)).toBeInTheDocument();
  });

  it('calls onChange when content changes', async () => {
    const onChange = vi.fn();
    render(<PromptEditor value="" onChange={onChange} />);

    // Simulate editor change
    const editor = screen.getByRole('textbox');
    fireEvent.change(editor, { target: { value: 'New content' } });

    expect(onChange).toHaveBeenCalledWith('New content');
  });

  it('disables editor when disabled prop is true', () => {
    render(<PromptEditor value="" onChange={() => {}} disabled />);
    expect(screen.getByRole('textbox')).toBeDisabled();
  });
});
```

## Performance Optimization

- **Code Splitting**: Use `React.lazy()` for route-based splitting
- **Memoization**: Use `useMemo` and `useCallback` for expensive computations
- **Virtual Lists**: Use `react-virtual` for long lists
- **Image Optimization**: Lazy load images, use WebP format
- **Bundle Analysis**: Regular analysis with `vite-bundle-visualizer`

```typescript
// Route-based code splitting
const PlaygroundPage = lazy(() => import('./features/playground/PlaygroundPage'));
const WorkflowBuilderPage = lazy(() => import('./features/workflows/WorkflowBuilderPage'));
const AnalyticsPage = lazy(() => import('./features/analytics/AnalyticsPage'));
```
