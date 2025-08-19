import { motion } from 'framer-motion';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend: string;
  trendUp: boolean;
}

const StatsCard = ({ title, value, icon: Icon, trend, trendUp }: StatsCardProps) => {
  return (
    <motion.div
      className="hover-lift hover-glow"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Card className="glass-card p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-muted-foreground text-sm font-medium mb-1">
              {title}
            </p>
            <p className="text-3xl font-bold gradient-text">
              {value}
            </p>
          </div>
          
          <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center pulse-glow">
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>
        
        <div className="flex items-center mt-4">
          <div className={`flex items-center text-sm ${
            trendUp ? 'text-green-500' : 'text-red-500'
          }`}>
            {trendUp ? (
              <TrendingUp className="w-4 h-4 mr-1" />
            ) : (
              <TrendingDown className="w-4 h-4 mr-1" />
            )}
            {trend}
          </div>
          <span className="text-muted-foreground text-sm ml-2">
            vs last month
          </span>
        </div>
      </Card>
    </motion.div>
  );
};

export default StatsCard;