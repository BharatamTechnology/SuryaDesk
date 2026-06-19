import React, { useMemo } from 'react';
import { Lead } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'; // Need to make sure I have these or use standard divs
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";

interface CapacityMISProps {
  leads: Lead[];
}

export default function CapacityMIS({ leads }: CapacityMISProps) {
  
  const getCapacity = (lead: Lead) => {
    const kw = parseFloat(lead.finalKw || lead.requiredKw || "0");
    return isNaN(kw) ? 0 : kw;
  };

  const formatKW = (kw: number) => kw.toFixed(2);

  const stats = useMemo(() => {
    let totalWon = 0;
    let implemented = 0;
    let pending = 0; // Won but not past step 8
    let inProgress = 0; // Won, past step 8, but not completed

    leads.forEach((l) => {
        if (l.status === 'Won' || l.status === 'Converted' || l.status === 'Completed') {
            const kw = getCapacity(l);
            totalWon += kw;

            if (l.status === 'Completed') {
                implemented += kw;
            } else {
                // Check if past Step 8 (Store Incharge)
                const isPastStep8 = l.step8Status === 'Completed';
                if (!isPastStep8) {
                    pending += kw;
                } else {
                    inProgress += kw;
                }
            }
        }
    });

    return { totalWon, implemented, pending, inProgress };
  }, [leads]);

  const statusData = useMemo(() => {
    const groups: { [key: string]: number } = {};
    leads.forEach(l => {
        const status = l.status || 'Other';
        groups[status] = (groups[status] || 0) + getCapacity(l);
    });
    return Object.entries(groups).map(([name, value]) => ({ name, value }));
  }, [leads]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-100">
            <h3 className="text-xs font-bold text-slate-500 uppercase">Total Won Capacity</h3>
            <p className="text-2xl font-black text-slate-900 mt-1">{formatKW(stats.totalWon)} KW</p>
        </div>
        <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-100">
            <h3 className="text-xs font-bold text-slate-500 uppercase">Implemented Capacity</h3>
            <p className="text-2xl font-black text-green-600 mt-1">{formatKW(stats.implemented)} KW</p>
        </div>
        <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-100">
            <h3 className="text-xs font-bold text-slate-500 uppercase">Pending Capacity</h3>
            <p className="text-2xl font-black text-amber-600 mt-1">{formatKW(stats.pending)} KW</p>
        </div>
        <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-100">
            <h3 className="text-xs font-bold text-slate-500 uppercase">In Progress Capacity</h3>
            <p className="text-2xl font-black text-indigo-600 mt-1">{formatKW(stats.inProgress)} KW</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-md font-bold mb-4">Capacity by Status</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#4f46e5" />
                </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Placeholder for Trends - requires date parsing logic similar to MISReport */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-md font-bold mb-4">Capacity Trends (Placeholder)</h3>
          <p className="text-sm text-slate-500">Trend chart implementation would go here, utilizing timeline data.</p>
        </div>
      </div>
    </div>
  );
}
