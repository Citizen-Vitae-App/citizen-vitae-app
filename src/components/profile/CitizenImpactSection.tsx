import { TrendingUp } from 'lucide-react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from 'recharts';

interface RadarDataItem {
  id: string;
  name: string;
  icon: string;
  color: string;
  count: number;
}

interface CitizenImpactSectionProps {
  radarData: RadarDataItem[];
  totalMissions: number;
  isEligible: boolean;
}

export function CitizenImpactSection({
  radarData,
  totalMissions,
  isEligible,
}: CitizenImpactSectionProps) {
  // Only render if eligible (>= 10 missions, >= 5 causes)
  if (!isEligible) {
    return null;
  }

  // Prepare data for radar chart
  const maxCount = Math.max(...radarData.map((d) => d.count), 1);
  const chartData = radarData.map((d) => ({
    subject: d.name,
    value: d.count,
    fullMark: maxCount,
  }));

  return (
    <section className="mb-6">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-muted-foreground" />
        Mon impact citoyen
      </h2>

      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex flex-col md:flex-row items-center gap-6">
          {/* Stats */}
          <div className="text-center md:text-left">
            <p className="text-4xl font-bold text-primary">{totalMissions}</p>
            <p className="text-sm text-muted-foreground">
              mission{totalMissions > 1 ? 's' : ''} certifiée{totalMissions > 1 ? 's' : ''}
            </p>
          </div>

          {/* Radar Chart */}
          <div className="flex-1 w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={chartData} cx="50%" cy="50%" outerRadius="80%">
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                />
                <PolarRadiusAxis
                  angle={30}
                  domain={[0, maxCount]}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                />
                <Radar
                  name="Missions"
                  dataKey="value"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.4}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </section>
  );
}
