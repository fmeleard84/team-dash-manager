import React from 'react';
import { AnimatedBackground } from '@/components/ui/animated-background';
import { AIAssistantManager } from '@/components/admin/AIAssistantManager';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Bot } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AdminAssistant() {
  const navigate = useNavigate();

  return (
    <AnimatedBackground variant="subtle" speed="slow">
      <div className="min-h-screen p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(-1)}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
                  <Bot className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">Assistant IA - Administration</h1>
                  <p className="text-sm text-muted-foreground">
                    Gérez les FAQ, prompts et suivez l'activité de l'assistant vocal
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <AIAssistantManager />
        </div>
      </div>
    </AnimatedBackground>
  );
}