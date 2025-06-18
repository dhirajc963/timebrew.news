import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Coffee, Settings, Sparkles, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { AnimatedGradientText } from '@/components/magicui/animated-gradient-text';
import { BorderBeam } from '@/components/magicui/border-beam';
import { ShinyButton } from '@/components/magicui/shiny-button';

const Dashboard: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen py-16 md:py-0 pt-23 md:pt-32 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Welcome Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-12 text-center"
        >
          <AnimatedGradientText className="inline-flex items-center space-x-2 px-4 py-2 rounded-full border border-primary/50 bg-primary/20 backdrop-blur-sm text-primary mb-6">
            <Coffee className="w-4 h-4" />
            <span className="text-sm font-medium">Dashboard</span>
          </AnimatedGradientText>
          
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Welcome back, <span className="text-gradient-green">{user?.firstName || 'Brewer'}</span>!
          </h1>
          <p className="text-xl text-muted-foreground">
            Your personalized news dashboard is brewing...
          </p>
        </motion.div>

        {/* Dashboard Content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {/* Coming Soon Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="md:col-span-3 relative group"
          >
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-accent/20 rounded-2xl blur-xl opacity-75"></div>
            
            <div className="relative bg-card/80 backdrop-blur-xl border border-border rounded-xl p-8 shadow-xl">
              <BorderBeam />
              
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Dashboard Coming Soon</h2>
                  <p className="text-muted-foreground mb-4">
                    We're brewing up something special for you. The full dashboard experience will be ready soon!
                  </p>
                  
                  <div className="flex flex-wrap gap-3">
                    <div className="flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-sm">
                      <Coffee className="w-4 h-4" />
                      <span>Personalized Brews</span>
                    </div>
                    <div className="flex items-center gap-2 bg-purple-500/10 text-purple-500 px-3 py-1.5 rounded-full text-sm">
                      <Sparkles className="w-4 h-4" />
                      <span>AI Curation</span>
                    </div>
                    <div className="flex items-center gap-2 bg-amber-500/10 text-amber-500 px-3 py-1.5 rounded-full text-sm">
                      <Clock className="w-4 h-4" />
                      <span>Scheduled Delivery</span>
                    </div>
                  </div>
                </div>
                
                <ShinyButton className="whitespace-nowrap flex items-center justify-center gap-2 [&>span]:!flex [&>span]:!items-center [&>span]:!justify-center [&>span]:!gap-2">
                  <Settings className="w-4 h-4" />
                  <span>Manage Settings</span>
                </ShinyButton>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;