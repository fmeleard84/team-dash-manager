/**
 * Export centralisé de toutes les fonctions tools
 */

// Knowledge & Platform
export {
  explain_platform_feature,
  search_knowledge,
  get_contextual_help,
  type ExplainFeatureResult,
  type SearchKnowledgeResult
} from './platform-knowledge';

// Team Composition
export {
  compose_team,
  suggest_team_member,
  type TeamMember,
  type TeamComposition,
  type ComposeTeamResult
} from './team-composer';

// Meeting Management
export {
  create_meeting,
  find_available_slot,
  create_kickoff_meeting,
  type MeetingData,
  type AvailableSlot,
  type CreateMeetingResult,
  type FindSlotResult
} from './meeting-manager';

// Task Management
export {
  add_task,
  update_task_status,
  get_project_status,
  list_projects,
  type TaskData,
  type ProjectStatus,
  type AddTaskResult,
  type UpdateTaskResult,
  type ProjectStatusResult,
  type ProjectListResult
} from './task-manager';

// Navigation & UI
export {
  navigate_to,
  show_notification,
  open_modal,
  update_ui_state,
  type NavigationResult,
  type NotificationResult
} from './navigation-ui';

// Import all functions first
import * as platformKnowledge from './platform-knowledge';
import * as teamComposer from './team-composer';
import * as meetingManager from './meeting-manager';
import * as taskManager from './task-manager';
import * as navigationUI from './navigation-ui';

// Map des fonctions par nom pour exécution dynamique
export const TOOL_FUNCTIONS: Record<string, Function> = {
  // Knowledge
  'explain_platform_feature': platformKnowledge.explain_platform_feature,
  'search_knowledge': platformKnowledge.search_knowledge,
  
  // Team
  'compose_team': teamComposer.compose_team,
  'suggest_team_member': teamComposer.suggest_team_member,
  
  // Meetings
  'create_meeting': meetingManager.create_meeting,
  'find_available_slot': meetingManager.find_available_slot,
  
  // Tasks
  'add_task': taskManager.add_task,
  'update_task_status': taskManager.update_task_status,
  'get_project_status': taskManager.get_project_status,
  'list_projects': taskManager.list_projects,
  
  // Navigation
  'navigate_to': navigationUI.navigate_to,
  'show_notification': navigationUI.show_notification
};

/**
 * Exécuter une fonction tool par son nom
 */
export async function executeTool(
  toolName: string,
  parameters: any
): Promise<any> {
  const toolFunction = TOOL_FUNCTIONS[toolName];
  
  if (!toolFunction) {
    throw new Error(`Tool function '${toolName}' not found`);
  }
  
  try {
    return await toolFunction(parameters);
  } catch (error) {
    console.error(`Error executing tool '${toolName}':`, error);
    throw error;
  }
}

/**
 * Valider qu'un tool existe
 */
export function isValidTool(toolName: string): boolean {
  return toolName in TOOL_FUNCTIONS;
}