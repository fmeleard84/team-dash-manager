/**
 * Vaya Platform Knowledge Base
 * This database contains all information about how the platform works
 */

export interface KnowledgeCategory {
  title: string;
  description: string;
  details: string;
  workflows?: string[];
  tips?: string[];
  relatedFeatures?: string[];
}

export const PLATFORM_KNOWLEDGE: Record<string, KnowledgeCategory> = {
  // Main features
  reactflow: {
    title: "ReactFlow - Team Composition",
    description: "Visual interface for composing and configuring project teams",
    details: `
ReactFlow is the central tool for defining a project's human resources:
- Drag & drop interface to add professional profiles
- Seniority configuration (Junior, Medior, Senior, Expert)
- Required skills definition
- Spoken languages configuration
- Automatic budget calculation based on profiles
- Visual validation of team composition
- Predefined templates for different types of projects
    `,
    workflows: [
      "Open an existing Project or create a New project",
      "Access the 'Team' tab or click on 'Compose team'",
      "Drag and drop professional profiles from the palette",
      "Configure each resource (seniority, skills, languages)",
      "Validate the composition when all positions are filled",
      "Launch the search for matching candidates"
    ],
    tips: [
      "Use templates to save time",
      "Budget adjusts automatically based on profiles",
      "Check seniority consistency in the team"
    ],
    relatedFeatures: ["projects", "hr_resource_assignments", "candidate_matching"]
  },

  Kanban: {
    title: "Kanban - Task Management",
    description: "Visual dashboard for project task tracking",
    details: `
Kanban allows visual and collaborative task management:
- Customizable columns (To do, In progress, In review, Done)
- Quick task card creation
- Assignment to team members
- Priority definition (Low, Medium, High, Urgent)
- Due date addition
- Comments and attachments on cards
- Filtering by assignee, priority or status
- Drag & drop to change task status
    `,
    workflows: [
      "Access Kanban from the main menu or project",
      "Click '+' in a column to create a task",
      "Fill in title, description and assign to a member",
      "Set priority and due date if necessary",
      "Drag and drop cards between columns to change their status",
      "Double-click on a card to see details"
    ],
    tips: [
      "Use color labels to categorize tasks",
      "WIP (Work In Progress) limit prevents overload",
      "Urgent tasks appear at the top of columns"
    ],
    relatedFeatures: ["projects", "Planning", "team_collaboration"]
  },

  planning: {
    title: "Planning - Project Calendar",
    description: "Calendar view of all Project events and milestones",
    details: `
Planning centralizes all project temporal events:
- Monthly, weekly or daily view
- Meeting creation with participants
- Project milestone definition
- Recurring events
- Automatic notifications before events
- Synchronization with external calendars (Google, Outlook)
- View by project or global view all projects
- Color code by event type
    `,
    workflows: [
      "Open Planning from the menu or a specific project",
      "Choose the view (month, week, day)",
      "Click on a date to create an event",
      "Define the type (meeting, milestone, deadline)",
      "Add participants from the Project Team",
      "Configure reminders and Notifications",
      "Save the event"
    ],
    tips: [
      "Kickoff events are automatically created at project start",
      "Use week view for better visibility",
      "Schedule conflicts are automatically detected"
    ],
    relatedFeatures: ["project_events", "meetings", "milestones"]
  },

  messages: {
    title: "Messages - Team Communication",
    description: "Integrated messaging system for project communication",
    details: `
Messaging enables smooth communication within the team:
- Automatic channels per project
- Direct messages between members
- File and document sharing
- @ mentions to notify
- Discussion threads
- History search
- Integration with other tools (tasks, planning)
- Push and email notifications
    `,
    workflows: [
      "Access Messages from the menu or project",
      "Select the project channel or a contact",
      "Type the message in the text area",
      "Use @ to mention a member",
      "Attach files with the paperclip button",
      "Send with Enter or the send button"
    ],
    tips: [
      "Create threads to organize discussions",
      "Shared files are automatically added to Drive",
      "Use /commands for quick actions"
    ],
    relatedFeatures: ["Drive", "Notifications", "team_collaboration"]
  },

  drive: {
    title: "Drive - File Storage",
    description: "Shared cloud storage space for Project documents",
    details: `
Drive centralizes all project documents:
- Customizable folder structure
- Drag & drop upload
- Automatic file versioning
- Document preview (PDF, images, videos)
- Selective sharing with permissions
- Search within document content
- Storage quotas per project
- Optional local synchronization
- Trash with restore capability
    `,
    workflows: [
      "Open Drive from the menu or Project",
      "Create folders to organize files",
      "Drag and drop files or click Upload",
      "Double-click to preview",
      "Right-click to Share or Download",
      "Use the search bar to find documents"
    ],
    tips: [
      "Large files are automatically compressed",
      "Trash keeps files for 30 days",
      "Enable synchronization for offline access"
    ],
    relatedFeatures: ["Messages", "Wiki", "project_files"]
  },

  wiki: {
    title: "Wiki - Project Documentation",
    description: "Collaborative Project knowledge base",
    details: `
Wiki allows structured project documentation:
- Markdown editor with real-time preview
- Hierarchical page structure
- Documentation templates
- Change history
- Page comments
- Full-text search
- PDF export of documentation
- Inter-page links and cross-references
    `,
    workflows: [
      "Access Wiki from the Project",
      "Create a new page or section",
      "Use the markdown editor to write",
      "Structure with headings and subheadings",
      "Add links to other pages",
      "Save and publish the page",
      "Invite for review if necessary"
    ],
    tips: [
      "Use templates to start quickly",
      "The summary is automatically generated",
      "Drive images can be directly embedded"
    ],
    relatedFeatures: ["Drive", "Documentation", "knowledge_management"]
  },

  // Business processes
  project_creation: {
    title: "Project Creation",
    description: "Complete process for creating a new project",
    details: `
Project creation follows a structured workflow:
1. Definition of basic information (title, description, dates)
2. Budget and constraints configuration
3. Team composition in ReactFlow
4. Validation and launch of candidate search
5. Acceptance tracking
6. Kickoff and operational start
    `,
    workflows: [
      "Click on 'New project' in the dashboard",
      "Fill in general project information",
      "Define budget and key dates",
      "Compose the Team in ReactFlow",
      "Validate and launch Candidate search",
      "Wait for Candidate responses",
      "Once the team is complete, launch the kickoff",
      "Collaborative tools are then automatically activated"
    ],
    tips: [
      "Prepare your project brief before starting",
      "Budget influences candidate matching",
      "Kickoff activates all collaborative tools"
    ],
    relatedFeatures: ["reactflow", "candidate_matching", "project_kickoff"]
  },

  candidate_matching: {
    title: "Candidate Matching",
    description: "Matching system between project needs and candidate profiles",
    details: `
Automatic matching finds the best candidates for your project:
- Multi-criteria analysis (profession, seniority, skills, languages, availability)
- Calculated compatibility score
- Automatic notifications to qualified candidates
- Response tracking (accepted, declined, pending)
- Automatic replacement if declined
- Final validation before start
    `,
    workflows: [
      "Define needs in ReactFlow",
      "Launch candidate search",
      "System notifies matching candidates",
      "Track responses in the dashboard",
      "Replace declines if necessary",
      "Validate the complete Team",
      "Proceed to Project kickoff"
    ],
    tips: [
      "Be precise in required Skills",
      "Allow time for responses (48-72h)",
      "Keep backup Candidates"
    ],
    relatedFeatures: ["hr_resource_assignments", "candidate_profiles", "Notifications"]
  },

  project_status: {
    title: "Project Status",
    description: "Understanding the different project states",
    details: `
Projects go through different statuses:
- PAUSE: Project created but team incomplete
- ATTENTE-TEAM: Not all candidates have accepted yet
- PLAY: Active project with collaborative tools enabled
- COMPLETED: Project finished

Only projects with PLAY status have access to collaborative tools.
    `,
    workflows: [
      "Creation → Status: PAUSE",
      "Candidate search → Status: PAUSE",
      "Candidates accept → Status: ATTENTE-TEAM",
      "Kickoff launched → Status: PLAY",
      "Project Completed → Status: COMPLETED"
    ],
    tips: [
      "Kickoff is crucial to activate tools",
      "A Project can be Paused again if needed",
      "COMPLETED Projects remain accessible"
    ],
    relatedFeatures: ["projects", "project_orchestrator", "project_events"]
  },

  // Roles and permissions
  roles: {
    title: "Roles and Permissions",
    description: "Platform Role System",
    details: `
Three main roles exist:
- CLIENT: Creates and manages projects, composes teams
- CANDIDATE: Receives proposals, participates in projects
- ADMIN: Complete platform management

Each role has specific permissions and an adapted interface.
    `,
    workflows: [
      "Registration determines the initial role",
      "Permissions are applied automatically",
      "The interface adapts according to the role",
      "Admins can modify roles"
    ],
    tips: [
      "A user can only have one Role",
      "Role change requires admin intervention",
      "Permissions are managed by RLS in Supabase"
    ],
    relatedFeatures: ["authentication", "Profilees", "Permissions"]
  }
};

// Helper function to search the knowledge base
export function searchKnowledge(query: string): KnowledgeCategory[] {
  const searchTerms = query.toLowerCase().split(' ');
  const results: Array<{ category: KnowledgeCategory; score: number }> = [];
  
  Object.values(PLATFORM_KNOWLEDGE).forEach(category => {
    let score = 0;
    const searchableText = `${category.title} ${category.description} ${category.details}`.toLowerCase();
    
    searchTerms.forEach(term => {
      if (searchableText.includes(term)) {
        score += 1;
      }
    });
    
    if (score > 0) {
      results.push({ category, score });
    }
  });
  
  return results
    .sort((a, b) => b.score - a.score)
    .map(r => r.category);
}

// Export categories for UI usage
export const KNOWLEDGE_CATEGORIES = Object.keys(PLATFORM_KNOWLEDGE);