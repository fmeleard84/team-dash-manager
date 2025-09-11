import { RealtimeAgent, RealtimeSession } from '@openai/agents/realtime';

console.log('Testing imports...');
console.log('RealtimeAgent:', typeof RealtimeAgent);
console.log('RealtimeSession:', typeof RealtimeSession);

try {
  const agent = new RealtimeAgent({
    name: 'Test Agent',
    instructions: 'You are a helpful assistant.'
  });
  console.log('Agent created:', agent);
  
  const session = new RealtimeSession(agent, {
    model: 'gpt-4o-realtime-preview'
  });
  console.log('Session created:', session);
  
} catch (error) {
  console.error('Error:', error);
}