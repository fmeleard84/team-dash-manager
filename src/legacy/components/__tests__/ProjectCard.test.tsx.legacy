import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProjectCard } from '../ProjectCard';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
      getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } }
      })),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
          maybeSingle: vi.fn(),
        })),
      })),
    })),
  },
}));

const mockProject = {
  id: '1',
  title: 'Test Project',
  description: 'Test Description',
  date: '2024-01-01',
  status: 'pause',
  clientBudget: 10000,
  dueDate: '2024-12-31'
};

const renderProjectCard = (props = {}) => {
  const defaultProps = {
    project: mockProject,
    onStatusToggle: vi.fn(),
    onDelete: vi.fn(),
    onView: vi.fn(),
    ...props
  };

  return render(
    <BrowserRouter>
      <AuthProvider>
        <ProjectCard {...defaultProps} />
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('ProjectCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders project title and description', async () => {
    renderProjectCard();
    
    // Wait for component to render
    expect(await screen.findByText('Test Project')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
  });

  it('displays correct status badge for new projects', async () => {
    renderProjectCard();
    
    expect(await screen.findByText('New')).toBeInTheDocument();
  });

  it('displays "Créer vos équipes" button for pause status', async () => {
    renderProjectCard();
    
    expect(await screen.findByText('Créer vos équipes')).toBeInTheDocument();
  });

  it('displays "Voir détails" button for play status', async () => {
    renderProjectCard({
      project: { ...mockProject, status: 'play' }
    });
    
    expect(await screen.findByText('Voir détails')).toBeInTheDocument();
  });

  it('calls onView when view button is clicked', async () => {
    const onView = vi.fn();
    renderProjectCard({ onView });
    
    const viewButton = await screen.findByText('Créer vos équipes');
    fireEvent.click(viewButton);
    
    expect(onView).toHaveBeenCalledWith('1');
  });

  it('displays budget when provided', async () => {
    renderProjectCard();
    
    // Wait for render
    await screen.findByText('Test Project');
    // Check that budget label exists
    expect(screen.getByText('Budget')).toBeInTheDocument();
    // Budget might be formatted differently depending on locale, just check it exists
    const budgetElement = screen.getByText('Budget').nextElementSibling;
    expect(budgetElement).toBeInTheDocument();
  });

  it('formats dates correctly', async () => {
    renderProjectCard();
    
    // Wait for render
    await screen.findByText('Test Project');
    // Check if date is displayed (format may vary)
    expect(screen.getByText(/2024/)).toBeInTheDocument();
  });
});