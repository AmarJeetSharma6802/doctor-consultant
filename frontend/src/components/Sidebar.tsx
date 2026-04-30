import { LayoutDashboard, Calendar, User, LogOut, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import React from 'react';

const NavItem = ({ icon: Icon, label, active = false, onClick }: { icon: any, label: string, active?: boolean, onClick?: () => void }) => (
  <motion.div
    whileHover={{ x: 4 }}
    onClick={onClick}
    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
      active ? 'bg-indigo-600/20 text-indigo-400 font-semibold border-r-2 border-indigo-600' : 'text-slate-400 hover:text-slate-200'
    }`}
  >
    <Icon size={20} />
    <span className="flex-1">{label}</span>
    {active && <ChevronRight size={14} />}
  </motion.div>
);

export const Sidebar = () => {
  return (
    <div className="w-64 h-screen border-r border-white/10 p-6 flex flex-col gap-8 bg-black/20 backdrop-blur-xl">
      <div className="flex items-center gap-3 px-2">
        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-lg">A</div>
        <h1 className="text-xl font-bold tracking-tight">Appointly</h1>
      </div>
      
      <nav className="flex-1 flex flex-col gap-2">
        <NavItem icon={LayoutDashboard} label="Dashboard" active />
        <NavItem icon={Calendar} label="Appointments" />
        <NavItem icon={User} label="Find Doctors" />
      </nav>

      <div className="border-t border-white/10 pt-6">
        <NavItem icon={LogOut} label="Sign Out" />
      </div>
    </div>
  );
};
